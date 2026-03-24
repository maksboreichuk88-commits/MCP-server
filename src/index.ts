import './types/express.js';
import express from 'express';
import { nhiAuthValidator } from './middleware/nhi-auth-validator.js';
import { scopeValidator } from './middleware/scope-validator.js';
import { mcpColorBoundary } from './middleware/color-boundary.js';
import { astEgressFilter } from './middleware/ast-egress-filter.js';
import { preflightValidator } from './middleware/preflight-validator.js';
import { createSchemaValidator } from './middleware/schema-validator.js';
import { errorHandler } from './middleware/error-handler.js';
import { z } from 'zod';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { startAdminServer } from './admin/index.js';
import { initializeCache } from './cache/index.js';
import { auditLog } from './utils/auditLogger.js';

const DEFAULT_ADMIN_PORT = parseInt(process.env.MCP_ADMIN_PORT ?? '9090', 10);
const DEFAULT_CACHE_TTL = parseInt(process.env.MCP_CACHE_TTL_SECONDS ?? '300', 10) * 1000;

const app = express();

app.use(express.json({
  strict: true,
  limit: '1mb'
}));

const rateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
});

app.use('/mcp', rateLimiter);

const mcpToolSchemas = {
  'read_file': z.object({
    path: z.string().max(1024),
  }).strict(),
  'write_file': z.object({
    path: z.string().max(1024),
    content: z.string().max(1024 * 1024 * 5), // 5MB max
  }).strict(),
  'execute_command': z.object({
    command: z.string().max(512),
    args: z.array(z.string().max(512)).max(50).optional(),
  }).strict(),
  'fetch_url': z.object({
    url: z.string().url().max(2048),
  }).strict(),
};

const progressiveDisclosureValidator = createSchemaValidator(mcpToolSchemas);

app.post('/mcp', nhiAuthValidator, scopeValidator, mcpColorBoundary, astEgressFilter, preflightValidator, progressiveDisclosureValidator, (req, res) => {
  res.status(200).json({ status: "success", data: "MCP Proxy Request Passed" });
});

app.get('/sse', nhiAuthValidator, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);
  
  const intervalId = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.use(errorHandler);

export default app;

if (process.env.NODE_ENV !== 'test') {
  initializeCache({
    serverId: process.env.MCP_SERVER_ID ?? 'default',
    l1: {
      maxSize: 1000,
      ttlMs: DEFAULT_CACHE_TTL,
    },
    l2: {
      dbPath: process.cwd(),
      ttlMs: DEFAULT_CACHE_TTL,
    },
    alwaysCacheTools: ['read_file', 'list_directory', 'search_files'],
    neverCacheTools: ['write_file', 'create_file', 'execute_command'],
  });

  const adminPort = process.env.MCP_ADMIN_ENABLED === 'true' ? DEFAULT_ADMIN_PORT : 0;
  if (adminPort > 0) {
    startAdminServer(adminPort);
  }

  app.listen(3000, () => {
    auditLog('MCP_PROXY_STARTED', {
      port: 3000,
      adminPort,
      cacheEnabled: true,
    });
    console.log('MCP Proxy Core listening on port 3000 (Protected Mode with NHI & ETT)');
    if (adminPort > 0) {
      console.log(`Admin API listening on port ${adminPort}`);
    }
  });
}
