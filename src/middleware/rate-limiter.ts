import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { parseIntEnv, SECURITY_DEFAULTS } from '../security-constants.js';
import { auditLogWithSIEM } from '../utils/auditLogger.js';
import { buildHttpErrorBody } from '../utils/json-rpc.js';
import { getPrimaryToolInvocation, isRecord } from '../utils/mcp-request.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxKeys?: number;
  cleanupIntervalMs?: number;
  maxKeyLength?: number;
  keyGenerator?: (req: Request) => string;
  targetResolver?: (req: Request, toolName?: string) => string | undefined;
}

export interface RateLimitContext {
  key?: string;
  transport: string;
  identity?: string;
  targetId?: string;
  toolName?: string;
  ip?: string;
  path?: string;
  snippet?: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  key: string;
  count: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  resetTime: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  updatedAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;

export const resolveRateLimitConfig = (env: NodeJS.ProcessEnv = process.env): Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> => ({
  windowMs: parseIntEnv(env['MCP_RATE_LIMIT_WINDOW_MS'] ?? env['RATE_LIMIT_WINDOW_MS'], {
    fallback: SECURITY_DEFAULTS.rateLimitWindowMs,
    min: 1000,
    max: 3600000,
  }),
  maxRequests: parseIntEnv(env['MCP_RATE_LIMIT_MAX_REQUESTS'] ?? env['RATE_LIMIT_MAX_REQUESTS'], {
    fallback: SECURITY_DEFAULTS.rateLimitMaxRequests,
    min: 1,
    max: 100000,
  }),
});

const resolveRateLimitStoreConfig = (env: NodeJS.ProcessEnv = process.env): Required<Pick<RateLimitConfig, 'maxKeys' | 'cleanupIntervalMs' | 'maxKeyLength'>> => ({
  maxKeys: parseIntEnv(env['MCP_RATE_LIMIT_MAX_KEYS'], {
    fallback: SECURITY_DEFAULTS.rateLimitMaxKeys,
    min: 1,
    max: 1_000_000,
  }),
  cleanupIntervalMs: parseIntEnv(env['MCP_RATE_LIMIT_CLEANUP_INTERVAL_MS'], {
    fallback: SECURITY_DEFAULTS.rateLimitCleanupIntervalMs,
    min: 1000,
    max: 3600000,
  }),
  maxKeyLength: parseIntEnv(env['MCP_RATE_LIMIT_MAX_KEY_LENGTH'], {
    fallback: SECURITY_DEFAULTS.rateLimitMaxKeyLength,
    min: 64,
    max: 4096,
  }),
});

const normalizeConfig = (
  config: Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> & Partial<Pick<RateLimitConfig, 'maxKeys' | 'cleanupIntervalMs' | 'maxKeyLength'>>,
): Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> & Required<Pick<RateLimitConfig, 'maxKeys' | 'cleanupIntervalMs' | 'maxKeyLength'>> => {
  const storeDefaults = resolveRateLimitStoreConfig();
  return {
    windowMs: Number.isFinite(config.windowMs) && config.windowMs > 0 ? config.windowMs : SECURITY_DEFAULTS.rateLimitWindowMs,
    maxRequests: Number.isFinite(config.maxRequests) && config.maxRequests > 0 ? config.maxRequests : SECURITY_DEFAULTS.rateLimitMaxRequests,
    maxKeys: Number.isFinite(config.maxKeys) && (config.maxKeys ?? 0) > 0 ? config.maxKeys as number : storeDefaults.maxKeys,
    cleanupIntervalMs: Number.isFinite(config.cleanupIntervalMs) && (config.cleanupIntervalMs ?? 0) > 0 ? config.cleanupIntervalMs as number : storeDefaults.cleanupIntervalMs,
    maxKeyLength: Number.isFinite(config.maxKeyLength) && (config.maxKeyLength ?? 0) > 0 ? config.maxKeyLength as number : storeDefaults.maxKeyLength,
  };
};

const cleanupExpiredEntries = (now: number): void => {
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

const cleanupExpiredEntriesIfDue = (now: number, cleanupIntervalMs: number): void => {
  if (now - lastCleanupAt < cleanupIntervalMs) {
    return;
  }

  cleanupExpiredEntries(now);
  lastCleanupAt = now;
};

const normalizeRateLimitKey = (key: string, maxKeyLength: number): string => {
  if (key.length <= maxKeyLength) {
    return key;
  }

  return `sha256:${createHash('sha256').update(key).digest('hex')}`;
};

const evictOldestEntries = (targetSize: number): void => {
  while (rateLimitStore.size > targetSize) {
    let oldestKey: string | null = null;
    let oldestUpdatedAt = Number.POSITIVE_INFINITY;

    for (const [key, entry] of rateLimitStore) {
      if (entry.updatedAt < oldestUpdatedAt) {
        oldestUpdatedAt = entry.updatedAt;
        oldestKey = key;
      }
    }

    if (!oldestKey) {
      return;
    }

    rateLimitStore.delete(oldestKey);
  }
};

export const buildRateLimitKey = (context: RateLimitContext): string => {
  const transport = context.transport || 'unknown';
  const identity = context.identity || 'anonymous';
  const targetId = context.targetId || 'unknown-target';
  const toolName = context.toolName || 'unknown-tool';
  return `${transport}:${identity}:${targetId}:${toolName}`;
};

export const checkRateLimit = (
  context: RateLimitContext,
  config: Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> & Partial<Pick<RateLimitConfig, 'maxKeys' | 'cleanupIntervalMs' | 'maxKeyLength'>> = resolveRateLimitConfig(),
): RateLimitDecision => {
  const { windowMs, maxRequests, maxKeys, cleanupIntervalMs, maxKeyLength } = normalizeConfig(config);
  const key = normalizeRateLimitKey(context.key ?? buildRateLimitKey(context), maxKeyLength);
  const now = Date.now();

  cleanupExpiredEntriesIfDue(now, cleanupIntervalMs);

  let entry = rateLimitStore.get(key);

  if (!entry && rateLimitStore.size >= maxKeys) {
    cleanupExpiredEntries(now);
    evictOldestEntries(Math.max(0, maxKeys - 1));
  }

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      updatedAt: now,
    };
  }

  entry.count++;
  entry.updatedAt = now;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, maxRequests - entry.count);
  const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
  const allowed = entry.count <= maxRequests;

  if (!allowed) {
    auditLogWithSIEM('RATE_LIMIT_EXCEEDED', {
      code: 'RATE_LIMIT_EXCEEDED',
      reason: 'Fail-Closed: too many requests for this target/tool.',
      key,
      count: entry.count,
      limit: maxRequests,
      windowMs,
      retryAfterSeconds: resetInSeconds,
      transport: context.transport,
      targetUrl: context.targetId,
      toolName: context.toolName,
      ip: context.ip,
      path: context.path,
      snippet: context.snippet,
    });
  }

  return {
    allowed,
    key,
    count: entry.count,
    limit: maxRequests,
    remaining,
    resetInSeconds,
    resetTime: entry.resetTime,
    windowMs,
  };
};

export const clearRateLimitState = (): void => {
  rateLimitStore.clear();
  lastCleanupAt = 0;
};

const createSnippet = (body: unknown): string | undefined => {
  try {
    return JSON.stringify(body).slice(0, SECURITY_DEFAULTS.snippetMaxLength);
  } catch {
    return undefined;
  }
};

const createDefaultKeyGenerator = (req: Request): string => {
  const scopes = req.nhiScopes ?? [];
  const scopeKey = scopes.length > 0 ? scopes.join(':') : 'anonymous';
  return `${req.ip}:${scopeKey}`;
};

export const createRateLimiter = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, maxKeys, cleanupIntervalMs, maxKeyLength } = normalizeConfig(config);

  const cleanup = (): void => {
    cleanupExpiredEntries(Date.now());
  };

  const cleanupTimer = setInterval(cleanup, cleanupIntervalMs);
  cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const body = isRecord(req.body) ? req.body : {};
    const tool = getPrimaryToolInvocation(body);
    const toolName = tool?.name;
    const scopes = req.nhiScopes ?? [];
    const scopeKey = scopes.length > 0 ? scopes.join(':') : 'anonymous';
    const targetId = config.targetResolver?.(req, toolName) ?? toolName ?? 'unknown-target';
    const key = config.keyGenerator?.(req) ?? buildRateLimitKey({
      transport: 'http',
      identity: createDefaultKeyGenerator(req),
      targetId,
      toolName,
    });
    const decision = checkRateLimit({
      key,
      transport: 'http',
      identity: `${req.ip}:${scopeKey}`,
      targetId,
      toolName,
      ip: req.ip,
      path: req.originalUrl || req.path,
      snippet: createSnippet(body),
    }, { windowMs, maxRequests, maxKeys, cleanupIntervalMs, maxKeyLength });

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', decision.remaining.toString());
    res.setHeader('X-RateLimit-Reset', decision.resetInSeconds.toString());

    if (!decision.allowed) {
      res.setHeader('Retry-After', decision.resetInSeconds.toString());
      res.status(429).json(buildHttpErrorBody(
        body,
        'RATE_LIMIT_EXCEEDED',
        'Fail-Closed: Too many requests for this target/tool. Please slow down.',
        -32029,
        { retryAfter: decision.resetInSeconds },
      ));
      return;
    }

    next();
  };
};

export interface TenantRateLimitConfig {
  tenantId: string;
  windowMs: number;
  maxRequests: number;
}

// Intentionally process-local: secondary-surface tenant overrides are not restart-durable.
const tenantConfigs = new Map<string, TenantRateLimitConfig>();

export const configureTenantRateLimit = (tenantId: string, config: Omit<TenantRateLimitConfig, 'tenantId'>): void => {
  const maxTenantConfigs = parseIntEnv(process.env['MCP_TENANT_RATE_LIMIT_MAX_ENTRIES'], {
    fallback: SECURITY_DEFAULTS.tenantRateLimitMaxEntries,
    min: 1,
    max: 100000,
  });

  if (!tenantConfigs.has(tenantId) && tenantConfigs.size >= maxTenantConfigs) {
    const oldestTenantId = tenantConfigs.keys().next().value as string | undefined;
    if (oldestTenantId) {
      tenantConfigs.delete(oldestTenantId);
    }
  }

  tenantConfigs.set(tenantId, { tenantId, ...config });
};

export const clearTenantRateLimitConfigs = (): void => {
  tenantConfigs.clear();
};

export const removeTenantRateLimit = (tenantId: string): boolean => {
  return tenantConfigs.delete(tenantId);
};

export const getRateLimitStats = (): {
  global: { entries: number; windowMs: number; maxRequests: number };
  tenants: Array<{ tenantId: string; windowMs: number; maxRequests: number }>;
} => {
  cleanupExpiredEntries(Date.now());
  const defaults = resolveRateLimitConfig();

  return {
    global: { entries: rateLimitStore.size, windowMs: defaults.windowMs, maxRequests: defaults.maxRequests },
    tenants: Array.from(tenantConfigs.values()).map(t => ({
      tenantId: t.tenantId,
      windowMs: t.windowMs,
      maxRequests: t.maxRequests,
    })),
  };
};
