import fs from 'fs';
import path from 'path';
import { createSecurityLogStore, type SecurityLogStore } from '../cache/l2-cache.js';
import {
  parseIntEnv,
  resolveSnippetMaxLength,
  resolveWebhookUrl,
  SECURITY_DEFAULTS,
} from '../security-constants.js';

const logFilePath = path.join(process.cwd(), 'audit.log');
const WEBHOOK_ALERT_TOKENS = [
  'AUTH_FAILURE',
  'BLOCK',
  'CROSS_TOOL_HIJACK',
  'DENY',
  'EPISTEMIC',
  'HARD_HALT',
  'MISSING_SCOPE',
  'PREFLIGHT_NOT_FOUND',
  'PREFLIGHT_REPLAY_BLOCKED',
  'PREFLIGHT_REQUIRED',
  'PREFLIGHT_VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'SCHEMA_VALIDATION_FAILED',
  'SHADOWLEAK',
  'TRUST_GATE',
  'UNAUTHORIZED',
];

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
let auditFileBackpressure = false;
let droppedAuditFileWrites = 0;
logStream.on('drain', () => {
  auditFileBackpressure = false;
  droppedAuditFileWrites = 0;
});
logStream.on('error', () => {
  auditFileBackpressure = true;
});
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

export interface WebhookAlertMetrics {
  alertsTriggeredTotal: number;
  dispatchFailuresTotal: number;
  lastDispatchAt: string | null;
  lastFailureAt: string | null;
}

const blockedMetricsState = {
  total: 0,
  lastBlockedAt: null as string | null,
  byCode: new Map<string, number>(),
  recent: [] as BlockedRequestSample[],
  recentLimit: SECURITY_DEFAULTS.blockedRecentLimit,
};

const webhookAlertMetricsState: WebhookAlertMetrics = {
  alertsTriggeredTotal: 0,
  dispatchFailuresTotal: 0,
  lastDispatchAt: null,
  lastFailureAt: null,
};

let securityLogStore: SecurityLogStore | null = null;

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...[TRUNCATED]`;
};

const toBoundedValue = (value: unknown, depth: number, seen: WeakSet<object>): unknown => {
  if (typeof value === 'string') {
    return truncateString(value, SECURITY_DEFAULTS.auditLogMaxEntryBytes);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  if (depth <= 0) {
    return '[TRUNCATED_DEPTH]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, SECURITY_DEFAULTS.sanitizerMaxArrayItems)
      .map((item) => toBoundedValue(item, depth - 1, seen));

    if (value.length > SECURITY_DEFAULTS.sanitizerMaxArrayItems) {
      items.push(`[TRUNCATED_ARRAY:${value.length - SECURITY_DEFAULTS.sanitizerMaxArrayItems}]`);
    }

    seen.delete(value);
    return items;
  }

  const bounded: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, SECURITY_DEFAULTS.sanitizerMaxObjectKeys);
  for (const [key, nested] of entries) {
    bounded[key] = toBoundedValue(nested, depth - 1, seen);
  }

  const keyCount = Object.keys(value).length;
  if (keyCount > SECURITY_DEFAULTS.sanitizerMaxObjectKeys) {
    bounded['__truncatedKeys'] = keyCount - SECURITY_DEFAULTS.sanitizerMaxObjectKeys;
  }

  seen.delete(value);
  return bounded;
};

const safeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(toBoundedValue(value, SECURITY_DEFAULTS.sanitizerMaxDepth, new WeakSet<object>()));
  } catch {
    return JSON.stringify('[UNSERIALIZABLE]');
  }
};

const getAuditLogMaxEntryBytes = (): number => {
  return parseIntEnv(process.env['MCP_AUDIT_LOG_MAX_ENTRY_BYTES'], {
    fallback: SECURITY_DEFAULTS.auditLogMaxEntryBytes,
    min: 1024,
    max: 1024 * 1024,
  });
};

const createEntry = (timestamp: string, event: string, details: Record<string, unknown>): string => {
  const serialized = safeJsonStringify({ timestamp, event, ...details });
  const maxBytes = getAuditLogMaxEntryBytes();

  if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) {
    return serialized;
  }

  return safeJsonStringify({
    timestamp,
    event,
    truncated: true,
    reason: 'Audit entry exceeded max serialized size.',
    snippet: truncateString(serialized, resolveSnippetMaxLength()),
  });
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
    return explicit.slice(0, resolveSnippetMaxLength());
  }

  const nested = details['details'];
  if (nested !== undefined) {
    return safeJsonStringify(nested).slice(0, resolveSnippetMaxLength());
  }

  return undefined;
};

const isWebhookAlertEntry = (entry: AuditEvent): boolean => {
  const code = typeof entry['code'] === 'string' ? entry['code'] : '';
  const action = `${entry.event} ${code}`.toUpperCase();
  return WEBHOOK_ALERT_TOKENS.some((token) => action.includes(token));
};

export const dispatchWebhook = async (entry: AuditEvent): Promise<void> => {
  try {
    const webhookUrl = resolveWebhookUrl();
    if (!webhookUrl || !isWebhookAlertEntry(entry) || typeof fetch !== 'function') {
      return;
    }

    const dispatchTimestamp = typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString();
    webhookAlertMetricsState.alertsTriggeredTotal += 1;
    webhookAlertMetricsState.lastDispatchAt = dispatchTimestamp;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, SECURITY_DEFAULTS.webhookTimeoutMs);

    if (typeof timeout === 'object') {
      timeout.unref();
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: safeJsonStringify(entry),
        signal: controller.signal,
      });
    } catch {
      webhookAlertMetricsState.dispatchFailuresTotal += 1;
      webhookAlertMetricsState.lastFailureAt = new Date().toISOString();
      // Observability failures must never affect proxy fail-closed behavior.
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Keep webhook dispatch strictly best-effort.
  }
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

const writeAuditFile = (entry: string): void => {
  if (auditFileBackpressure) {
    droppedAuditFileWrites = Math.min(
      droppedAuditFileWrites + 1,
      SECURITY_DEFAULTS.auditLogBackpressureDropThreshold,
    );
    return;
  }

  try {
    auditFileBackpressure = !logStream.write(entry);
  } catch {
    auditFileBackpressure = true;
  }
};

const writeAuditStderr = (entry: string): void => {
  try {
    process.stderr.write(entry);
  } catch {}
};

const recordBlockedRequest = (timestamp: string, event: string, details: Record<string, unknown>): string | null => {
  const code = inferBlockedCode(event, details);
  if (!code) return null;

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
  return code;
};

export const auditLog = (event: string, details: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  const entry = createEntry(timestamp, event, details) + '\n';
  writeAuditFile(entry);
  writeAuditStderr(entry);
  const code = recordBlockedRequest(timestamp, event, details);
  void dispatchWebhook({ timestamp, event, ...details, ...(code ? { code } : {}) });
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

export const getWebhookAlertMetrics = (): WebhookAlertMetrics => ({
  ...webhookAlertMetricsState,
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

export const resetWebhookAlertMetrics = (): void => {
  webhookAlertMetricsState.alertsTriggeredTotal = 0;
  webhookAlertMetricsState.dispatchFailuresTotal = 0;
  webhookAlertMetricsState.lastDispatchAt = null;
  webhookAlertMetricsState.lastFailureAt = null;
};

export const auditLogWithSIEM = auditLog;
