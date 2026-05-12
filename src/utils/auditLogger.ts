import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'audit.log');

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

const createEntry = (timestamp: string, event: string, details: Record<string, unknown>): string => {
  return JSON.stringify({ timestamp, event, ...details });
};

const recordBlockedRequest = (timestamp: string, event: string, details: Record<string, unknown>): void => {
  const code = typeof details.code === 'string' ? details.code : null;
  if (!code) return;

  blockedMetricsState.total += 1;
  blockedMetricsState.lastBlockedAt = timestamp;
  blockedMetricsState.byCode.set(code, (blockedMetricsState.byCode.get(code) ?? 0) + 1);
  blockedMetricsState.recent.unshift({
    timestamp,
    event,
    code,
    reason: typeof details.reason === 'string' ? details.reason : undefined,
  });

  if (blockedMetricsState.recent.length > blockedMetricsState.recentLimit) {
    blockedMetricsState.recent.length = blockedMetricsState.recentLimit;
  }
};

export const auditLog = (event: string, details: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  const entry = createEntry(timestamp, event, details) + '\n';
  fs.appendFileSync(logFilePath, entry, { flag: 'a' });
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

export const resetBlockedRequestMetrics = (): void => {
  blockedMetricsState.total = 0;
  blockedMetricsState.lastBlockedAt = null;
  blockedMetricsState.byCode.clear();
  blockedMetricsState.recent.length = 0;
};
