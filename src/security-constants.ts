export interface IntEnvOption {
  fallback: number;
  min?: number;
  max?: number;
}

export const parseIntEnv = (rawValue: string | undefined, option: IntEnvOption): number => {
  if (!rawValue) {
    return option.fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return option.fallback;
  }

  if (option.min !== undefined && parsed < option.min) {
    return option.fallback;
  }

  if (option.max !== undefined && parsed > option.max) {
    return option.fallback;
  }

  return parsed;
};

export const SECURITY_DEFAULTS = {
  httpJsonLimitBytes: 1024 * 1024,
  snippetMaxLength: 240,
  defaultCacheTtlSeconds: 300,
  l1CacheMaxEntries: 1000,
  l2CacheMaxEntries: 10000,
  l2CleanupIntervalMs: 300_000,
  sqliteBusyTimeoutMs: 5000,
  securityLogTtlMs: 7 * 24 * 60 * 60 * 1000,
  securityLogMaxEntries: 10_000,
  securityLogCleanupIntervalMs: 300_000,
  auditLogMaxEntryBytes: 16 * 1024,
  auditLogBackpressureDropThreshold: 1024,
  blockedRecentLimit: 10,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 50,
  rateLimitMaxKeys: 10_000,
  rateLimitCleanupIntervalMs: 60_000,
  rateLimitMaxKeyLength: 512,
  tenantRateLimitMaxEntries: 1000,
  stdioMaxResponseBytes: 5 * 1024 * 1024,
  stdioMaxPendingRequests: 1000,
  stdioMaxLineBytes: 10 * 1024 * 1024,
  targetTimeoutMs: 30_000,
  routeDefaultTimeoutMs: 5000,
  targetResponseMaxBytes: 5 * 1024 * 1024,
  circuitFailureThreshold: 5,
  circuitResetTimeoutMs: 30_000,
  circuitHalfOpenMaxCalls: 1,
  sanitizerMaxDepth: 20,
  sanitizerMaxArrayItems: 1000,
  sanitizerMaxObjectKeys: 1000,
  sanitizerMaxStringLength: 1024 * 1024,
  webhookTimeoutMs: 2000,
} as const;

export const resolveHttpJsonLimit = (env: NodeJS.ProcessEnv = process.env): string => {
  const bytes = parseIntEnv(env['MCP_HTTP_JSON_LIMIT_BYTES'], {
    fallback: SECURITY_DEFAULTS.httpJsonLimitBytes,
    min: 1024,
    max: 10 * 1024 * 1024,
  });

  return `${bytes}b`;
};

export const resolveSnippetMaxLength = (env: NodeJS.ProcessEnv = process.env): number => {
  return parseIntEnv(env['MCP_SNIPPET_MAX_LENGTH'], {
    fallback: SECURITY_DEFAULTS.snippetMaxLength,
    min: 32,
    max: 4096,
  });
};

export const resolveWebhookUrl = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const raw = env['MCP_WEBHOOK_URL']?.trim();
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
};
