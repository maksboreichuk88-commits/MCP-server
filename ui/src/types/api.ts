export interface CacheStats {
  size: number;
  items: number;
  hits: number;
  misses: number;
  tokenSavings: number;
}

export interface ProxyStats {
  uptime_seconds: number;
  counters: {
    mcp_total_requests?: number;
    mcp_blocked_covert?: number;
    mcp_intercepted_shadowleak?: number;
    [key: string]: number | undefined;
  };
  histograms: Record<string, unknown>;
  cache: {
    l1: CacheStats;
    l2: CacheStats;
  };
}

export interface ProxyConfigData {
  port: number;
  cacheTtl: number;
  circuitBreakerEnabled: boolean;
}
