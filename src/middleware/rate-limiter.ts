import { Request, Response, NextFunction } from 'express';
import { auditLogWithSIEM } from '../utils/auditLogger.js';
import { getPrimaryToolInvocation, isRecord } from '../utils/mcp-request.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
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
}

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 50;
const rateLimitStore = new Map<string, RateLimitEntry>();

const parseEnvInt = (rawValue: string | undefined, fallback: number, min: number, max: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

export const resolveRateLimitConfig = (env: NodeJS.ProcessEnv = process.env): Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> => ({
  windowMs: parseEnvInt(env.MCP_RATE_LIMIT_WINDOW_MS ?? env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS, 1000, 3600000),
  maxRequests: parseEnvInt(env.MCP_RATE_LIMIT_MAX_REQUESTS ?? env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT_MAX_REQUESTS, 1, 100000),
});

const normalizeConfig = (config: Pick<RateLimitConfig, 'windowMs' | 'maxRequests'>): Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> => ({
  windowMs: Number.isFinite(config.windowMs) && config.windowMs > 0 ? config.windowMs : DEFAULT_RATE_LIMIT_WINDOW_MS,
  maxRequests: Number.isFinite(config.maxRequests) && config.maxRequests > 0 ? config.maxRequests : DEFAULT_RATE_LIMIT_MAX_REQUESTS,
});

const cleanupExpiredEntries = (now: number): void => {
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
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
  config: Pick<RateLimitConfig, 'windowMs' | 'maxRequests'> = resolveRateLimitConfig(),
): RateLimitDecision => {
  const { windowMs, maxRequests } = normalizeConfig(config);
  const key = context.key ?? buildRateLimitKey(context);
  const now = Date.now();

  cleanupExpiredEntries(now);

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  entry.count++;
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
};

const createSnippet = (body: unknown): string | undefined => {
  try {
    return JSON.stringify(body).slice(0, 240);
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
  const { windowMs, maxRequests } = normalizeConfig(config);

  const cleanup = (): void => {
    cleanupExpiredEntries(Date.now());
  };

  const cleanupTimer = setInterval(cleanup, windowMs);
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
    }, { windowMs, maxRequests });

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', decision.remaining.toString());
    res.setHeader('X-RateLimit-Reset', decision.resetInSeconds.toString());

    if (!decision.allowed) {
      res.setHeader('Retry-After', decision.resetInSeconds.toString());
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Fail-Closed: Too many requests for this target/tool. Please slow down.',
          retryAfter: decision.resetInSeconds,
        },
      });
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
