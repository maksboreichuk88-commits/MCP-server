import express from 'express';
import path from 'node:path';
import { startAdminServer } from './admin/index.js';
import { getCache, initializeCache } from './cache/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { astEgressFilter } from './middleware/ast-egress-filter.js';
import { createRateLimiter, resolveRateLimitConfig } from './middleware/rate-limiter.js';
import { recordHttpMcpRequest } from './metrics/prometheus.js';
import { getRegisteredRoutes, routeRequest } from './proxy/router.js';
import { sanitizeResponse } from './proxy/shadow-leak-sanitizer.js';
import { auditLog } from './utils/auditLogger.js';
import { getPrimaryToolInvocation } from './utils/mcp-request.js';

const DEFAULT_PORT = parseInt(process.env['PORT'] ?? process.env['MCP_PORT'] ?? '3000', 10);
const DEFAULT_ADMIN_PORT = parseInt(process.env['MCP_ADMIN_PORT'] ?? '9090', 10);
const DEFAULT_CACHE_TTL = parseInt(process.env['MCP_CACHE_TTL_SECONDS'] ?? '300', 10) * 1000;
const DEFAULT_CACHE_DIR = process.env['MCP_CACHE_DIR'] ?? path.join(process.cwd(), '.mcp-cache');

const app = express();

app.use(express.json({ strict: true, limit: '1mb' }));

const rateLimiter = createRateLimiter({
  ...resolveRateLimitConfig(),
  targetResolver: (_req, toolName) => toolName ? getRegisteredRoutes().get(toolName)?.url : undefined,
});

app.use('/mcp', rateLimiter);
app.post('/mcp', (_req, _res, next) => { recordHttpMcpRequest(); next(); });
app.use('/mcp', astEgressFilter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'mcp-proxy',
    timestamp: new Date().toISOString(),
    adminEnabled: process.env['MCP_ADMIN_ENABLED'] === 'true',
  });
});

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

export default app;

if (process.env['NODE_ENV'] !== 'test') {
  initializeCache({
    serverId: process.env['MCP_SERVER_ID'] ?? 'default',
    l1: { maxSize: 1000, ttlMs: DEFAULT_CACHE_TTL },
    l2: { dbPath: DEFAULT_CACHE_DIR, ttlMs: DEFAULT_CACHE_TTL },
    alwaysCacheTools: ['read_file', 'read', 'open_file', 'list_directory', 'list_files', 'search_files', 'search'],
    neverCacheTools: ['write_file', 'write', 'create_file', 'execute_command', 'execute'],
  });

  const adminPort = process.env['MCP_ADMIN_ENABLED'] === 'true' ? DEFAULT_ADMIN_PORT : 0;
  if (adminPort > 0) {
    startAdminServer(adminPort);
  }

  app.listen(DEFAULT_PORT, () => {
    auditLog('MCP_PROXY_STARTED', { port: DEFAULT_PORT, adminPort, cacheDir: DEFAULT_CACHE_DIR });
  });
}
