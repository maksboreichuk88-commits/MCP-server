import { parseIntEnv, SECURITY_DEFAULTS } from './security-constants.js';

export interface ProxyRuntimeConfig {
  adminPort: number;
  cacheTtlSeconds: number;
  targetTimeoutMs: number;
}

export const resolveProxyRuntimeConfig = (env: NodeJS.ProcessEnv): ProxyRuntimeConfig => {
  return {
    adminPort: parseIntEnv(env['MCP_ADMIN_PORT'] ?? env['ADMIN_PORT'], {
      fallback: 9090,
      min: 1,
      max: 65535,
    }),
    cacheTtlSeconds: parseIntEnv(env['MCP_CACHE_TTL_SECONDS'] ?? env['CACHE_TTL_SECONDS'], {
      fallback: SECURITY_DEFAULTS.defaultCacheTtlSeconds,
      min: 1,
      max: 86400,
    }),
    targetTimeoutMs: parseIntEnv(env['MCP_TARGET_TIMEOUT_MS'], {
      fallback: SECURITY_DEFAULTS.targetTimeoutMs,
      min: 1,
      max: 300000,
    }),
  };
};
