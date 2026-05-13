#!/usr/bin/env node

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createAdminRouter } from './admin/index.js';
import { getCache, initializeCache } from './cache/index.js';
import { parseCliArgs, resolveTarget } from './cli-options.js';
import { startEmbeddedMcpServer } from './embedded/server.js';
import { astEgressFilter } from './middleware/ast-egress-filter.js';
import { errorHandler } from './middleware/error-handler.js';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { recordHttpMcpRequest } from './metrics/prometheus.js';
import { routeRequest } from './proxy/router.js';
import { sanitizeResponse } from './proxy/shadow-leak-sanitizer.js';
import { resolveProxyRuntimeConfig } from './runtime-config.js';
import { createStdioFirewallProxy } from './stdio/proxy.js';
import { auditLog } from './utils/auditLogger.js';
import { getPrimaryToolInvocation } from './utils/mcp-request.js';
import { loadGatewayConfig, startGatewayTargets, stopGatewayTargets } from './gateway-config.js';

const DEFAULT_GATEWAY_PORT = parseInt(process.env.PORT ?? process.env.MCP_PORT ?? '3000', 10);
const DEFAULT_CACHE_TTL = parseInt(process.env.MCP_CACHE_TTL_SECONDS ?? '300', 10) * 1000;
const DEFAULT_CACHE_DIR = process.env.MCP_CACHE_DIR ?? path.join(process.cwd(), '.mcp-cache');

const printHelp = (): void => {
  process.stdout.write(`Toolwall

Usage:
  toolwall
  toolwall -- node target.js
  toolwall --target "node target.js"
  toolwall --config targets.json

Modes:
  no target supplied      start the bundled standalone MCP server
  target supplied         wrap a downstream MCP server behind the fail-closed stdio firewall
  --config supplied       start an HTTP security gateway for multiple MCP targets

Standalone tools:
  firewall_status         runtime status and deployment flags
  firewall_usage          launch guidance for standalone and downstream proxy mode

Environment:
  PROXY_AUTH_TOKEN        Optional NHI secret for fail-closed auth
  MCP_TARGET_COMMAND      Protected target command for MCP client configs
  MCP_TARGET_ARGS_JSON    JSON array of target args for MCP_TARGET_COMMAND
  MCP_TARGET_ARGS         Space-delimited fallback for target args
  MCP_TARGET              Full target command string fallback
  MCP_TARGET_TIMEOUT_MS   Downstream response timeout in milliseconds
  MCP_ADMIN_ENABLED       Start admin API/dashboard when set to true
  MCP_ADMIN_PORT          Admin API port, default 9090
  MCP_CACHE_DIR           Persistent cache directory
  MCP_CACHE_TTL_SECONDS   Persistent cache TTL in seconds
`);
};

const startGateway = async (configPath: string): Promise<void> => {
  const targets = loadGatewayConfig(configPath);
  const runningTargets = startGatewayTargets(targets);

  initializeCache({
    serverId: process.env.MCP_SERVER_ID ?? 'gateway',
    l1: { maxSize: 1000, ttlMs: DEFAULT_CACHE_TTL },
    l2: { dbPath: DEFAULT_CACHE_DIR, ttlMs: DEFAULT_CACHE_TTL },
    alwaysCacheTools: ['read_file', 'read', 'open_file', 'list_directory', 'list_files', 'search_files', 'search'],
    neverCacheTools: ['write_file', 'write', 'create_file', 'execute_command', 'execute'],
  });

  const app = express();
  const rateLimiter = createRateLimiter({
    windowMs: 60000,
    maxRequests: 100,
  });

  app.use(express.json({ strict: true, limit: '1mb' }));
  app.use(createAdminRouter());
  app.use('/mcp', rateLimiter);
  app.post('/mcp', (_req, _res, next) => { recordHttpMcpRequest(); next(); });
  app.use('/mcp', astEgressFilter);

  app.post('/mcp', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const tool = getPrimaryToolInvocation(body);

      if (!tool?.name) {
        res.status(400).json({
          error: { code: 'INVALID_MCP_REQUEST', message: 'Fail-Closed' },
        });
        return;
      }

      const toolArgs = tool.arguments ?? {};
      const cache = getCache();
      const cachedResponse = cache?.get(tool.name, toolArgs);
      if (cachedResponse !== undefined) {
        res.setHeader('X-Proxy-Cache', 'HIT');
        res.status(200).json(cachedResponse);
        return;
      }

      const result = await routeRequest(tool.name, body);
      const sanitizedBody = sanitizeResponse(result.body);

      if (result.status >= 200 && result.status < 300) {
        cache?.set(tool.name, toolArgs, sanitizedBody);
      }

      res.setHeader('X-Proxy-Cache', 'MISS');
      res.status(result.status).json(sanitizedBody);
    } catch (error: unknown) {
      next(error);
    }
  });

  app.use(errorHandler);

  const server = app.listen(DEFAULT_GATEWAY_PORT, () => {
    auditLog('MCP_GATEWAY_STARTED', {
      port: DEFAULT_GATEWAY_PORT,
      targets: targets.map((target) => ({ name: target.name, port: target.port })),
    });
  });

  const shutdown = (): void => {
    stopGatewayTargets(runningTargets);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const main = async (): Promise<void> => {
  const cli = parseCliArgs(process.argv.slice(2));

  if (cli.help) {
    printHelp();
    return;
  }

  if (cli.embeddedTarget) {
    await startEmbeddedMcpServer();
    return;
  }

  if (cli.configPath) {
    await startGateway(cli.configPath);
    return;
  }

  const target = resolveTarget(cli);
  const runtimeConfig = resolveProxyRuntimeConfig(process.env);

  if (!target) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const proxy = createStdioFirewallProxy({
    targetCommand: target.targetCommand,
    targetArgs: target.targetArgs,
    adminEnabled: process.env.MCP_ADMIN_ENABLED === 'true' || process.env.ADMIN_ENABLED === 'true',
    adminPort: runtimeConfig.adminPort,
    cacheDir: process.env.MCP_CACHE_DIR ?? process.env.CACHE_DIR,
    cacheTtlSeconds: runtimeConfig.cacheTtlSeconds,
    targetTimeoutMs: runtimeConfig.targetTimeoutMs,
    verbose: cli.verbose || process.env.MCP_VERBOSE === 'true' || process.env.VERBOSE === 'true',
    proxyAuthToken: process.env.PROXY_AUTH_TOKEN,
  });

  const shutdown = async (): Promise<void> => {
    await proxy.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  await proxy.start();
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(message + '\n');
  process.exit(1);
});
