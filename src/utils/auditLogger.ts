import fs from 'fs';
import path from 'path';
import { createSecurityLogStore, type SecurityLogStore } from '../cache/l2-cache.js';

const logFilePath = path.join(process.cwd(), 'audit.log');

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
logStream.on('error', () => {});
process.once('exit', () => { logStream.end(); });

export type AuditEvent = {
  timestamp: string;
  event: string;
  ip?: string;
  reason?: string;
  [key: string]: unknown;
};

export interface BlockedRequestReasonCount {
  code: string;
  count: number;
}

export interface BlockedRequestSample {
  timestamp: string;
  event: string;
  code: string;
  reason?: string;
  ip?: string;
  path?: string;
  tool?: string;
  snippet?: string;
}

export interface SecurityEvent {
  timestamp: string;
  reason: string;
  tool: string;
  snippet: string;
}

export interface BlockedRequestMetrics {
  total: number;
  lastBlockedAt: string | null;
  byCode: BlockedRequestReasonCount[];
  recent: BlockedRequestSample[];
}

const blockedMetricsState = {
  total: 0,
  lastBlockedAt: null as string | null,
  byCode: new Map<string, number>(),
  recent: [] as BlockedRequestSample[],
  recentLimit: 10,
};

let securityLogStore: SecurityLogStore | null = null;

const createEntry = (timestamp: string, event: string, details: Record<string, unknown>): string => {
  return JSON.stringify({ timestamp, event, ...details });
};

const readStringDetail = (details: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
};

const inferBlockedCode = (event: string, details: Record<string, unknown>): string | null => {
  if (typeof details['code'] === 'string' && details['code'].length > 0) {
    return details['code'];
  }

  if (event === 'AUTH_FAILURE' || event === 'UNAUTHORIZED') {
    return 'AUTH_FAILURE';
  }

  if (event === 'SHADOWLEAK_BLOCKED_STDIO') {
    return 'SHADOWLEAK_DETECTED';
  }

  return null;
};

const toSnippet = (details: Record<string, unknown>): string | undefined => {
  const explicit = readStringDetail(details, ['snippet', 'url', 'targetUrl', 'path']);
  if (explicit) {
    return explicit.slice(0, 240);
  }

  const nested = details['details'];
  if (nested !== undefined) {
    try {
      return JSON.stringify(nested).slice(0, 240);
    } catch {
      return String(nested).slice(0, 240);
    }
  }

  return undefined;
};

const getSecurityLogStore = (): SecurityLogStore => {
  if (!securityLogStore) {
    securityLogStore = createSecurityLogStore({
      dbPath: process.env['MCP_CACHE_DIR'] ?? process.env['CACHE_DIR'],
    });
  }

  return securityLogStore;
};

export const configureSecurityLogStore = (dbPath?: string): void => {
  securityLogStore?.close();
  securityLogStore = createSecurityLogStore({ dbPath });
};

export const closeSecurityLogStore = (): void => {
  securityLogStore?.close();
  securityLogStore = null;
};

const recordSecurityLog = (timestamp: string, event: string, code: string, details: Record<string, unknown>): void => {
  try {
    getSecurityLogStore().insert({
      timestamp,
      reason: typeof details['reason'] === 'string' ? details['reason'] : code,
      tool: readStringDetail(details, ['tool', 'toolName']) ?? 'unknown',
      snippet: toSnippet(details) ?? event,
      code,
      event,
    });
  } catch {}
};

const recordBlockedRequest = (timestamp: string, event: string, details: Record<string, unknown>): void => {
  const code = inferBlockedCode(event, details);
  if (!code) return;

  blockedMetricsState.total += 1;
  blockedMetricsState.lastBlockedAt = timestamp;
  blockedMetricsState.byCode.set(code, (blockedMetricsState.byCode.get(code) ?? 0) + 1);
  blockedMetricsState.recent.unshift({
    timestamp,
    event,
    code,
    reason: typeof details['reason'] === 'string' ? details['reason'] : undefined,
    ip: typeof details['ip'] === 'string' ? details['ip'] : undefined,
    path: typeof details['path'] === 'string' ? details['path'] : undefined,
    tool: readStringDetail(details, ['tool', 'toolName']),
    snippet: toSnippet(details),
  });

  if (blockedMetricsState.recent.length > blockedMetricsState.recentLimit) {
    blockedMetricsState.recent.length = blockedMetricsState.recentLimit;
  }

  recordSecurityLog(timestamp, event, code, details);
};

export const auditLog = (event: string, details: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  const entry = createEntry(timestamp, event, details) + '\n';
  logStream.write(entry);
  process.stderr.write(entry);
  recordBlockedRequest(timestamp, event, details);
};

export const writeAuditLog = (event: string, details: Record<string, unknown>): void => {
  auditLog(event, details);
};

export const getBlockedRequestMetrics = (): BlockedRequestMetrics => ({
  total: blockedMetricsState.total,
  lastBlockedAt: blockedMetricsState.lastBlockedAt,
  byCode: Array.from(blockedMetricsState.byCode.entries()).map(([code, count]) => ({ code, count })),
  recent: [...blockedMetricsState.recent],
});

export const getRecentSecurityEvents = (limit = 5): SecurityEvent[] => {
  try {
    return getSecurityLogStore().listRecent(limit).map((event) => ({
      timestamp: event.timestamp,
      reason: event.reason,
      tool: event.tool,
      snippet: event.snippet,
    }));
  } catch {
    return [];
  }
};

export const clearSecurityEvents = (): number => {
  try {
    return getSecurityLogStore().clear();
  } catch {
    return 0;
  }
};

export const resetBlockedRequestMetrics = (): void => {
  blockedMetricsState.total = 0;
  blockedMetricsState.lastBlockedAt = null;
  blockedMetricsState.byCode.clear();
  blockedMetricsState.recent.length = 0;
};

export const auditLogWithSIEM = auditLog;
