export interface CacheStats {
  size: number;
  items: number;
  hits: number;
  misses: number;
  tokenSavings: number;
}

export interface ProxyStats {
  uptime: number;
  totalRequests: number;
  activeRequests: number;
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
