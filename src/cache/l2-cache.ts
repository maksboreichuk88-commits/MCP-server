import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SECURITY_DEFAULTS } from '../security-constants.js';

export interface L2CacheConfig {
  dbPath: string;
  ttlMs: number;
  maxEntries?: number;
  cleanupIntervalMs?: number;
}

export interface L2Cache {
  generateKey: (serverId: string, method: string, params: unknown) => string;
  get: (key: string) => unknown | undefined;
  set: (key: string, value: unknown, ttlMs?: number) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  cleanupExpired: () => number;
  stats: () => { entries: number; expiredEntries: number };
  close: () => void;
}

export interface SecurityLogEntry {
  timestamp: string;
  reason: string;
  tool: string;
  snippet: string;
  code?: string;
  event?: string;
}

export interface SecurityLogStore {
  insert: (entry: SecurityLogEntry) => void;
  listRecent: (limit?: number) => SecurityLogEntry[];
  clear: () => number;
  cleanupExpired: () => number;
  close: () => void;
}

export interface SecurityLogStoreConfig {
  dbPath: string;
  ttlMs: number;
  maxEntries: number;
  cleanupIntervalMs: number;
}

export const SECURITY_LOG_TTL_MS = SECURITY_DEFAULTS.securityLogTtlMs;

const resolveDbFile = (dbPath?: string): string => {
  const dbDir = dbPath ?? path.join(process.cwd(), '.mcp-cache');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'mcp-cache-l2.sqlite');
};

export const createL2Cache = (config: Partial<L2CacheConfig> = {}): L2Cache => {
  const dbFile = resolveDbFile(config.dbPath);
  const db = new Database(dbFile);

  const ttlMs = config.ttlMs ?? SECURITY_DEFAULTS.defaultCacheTtlSeconds * 1000;
  const maxEntries = config.maxEntries ?? SECURITY_DEFAULTS.l2CacheMaxEntries;
  const cleanupIntervalMs = config.cleanupIntervalMs ?? SECURITY_DEFAULTS.l2CleanupIntervalMs;

  db.pragma('journal_mode = WAL');
  db.pragma(`busy_timeout = ${SECURITY_DEFAULTS.sqliteBusyTimeoutMs}`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  const stmtGet = db.prepare('SELECT value, expires_at, hit_count FROM cache_entries WHERE key = ?');
  const stmtUpdateHit = db.prepare('UPDATE cache_entries SET hit_count = hit_count + 1 WHERE key = ?');
  const stmtDelete = db.prepare('DELETE FROM cache_entries WHERE key = ?');
  const stmtInsert = db.prepare(`
    INSERT INTO cache_entries (key, value, created_at, expires_at, hit_count)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      expires_at = excluded.expires_at
  `);
  const stmtClear = db.prepare('DELETE FROM cache_entries');
  const stmtCleanup = db.prepare('DELETE FROM cache_entries WHERE expires_at <= ?');
  const stmtCount = db.prepare('SELECT COUNT(*) as count FROM cache_entries');
  const stmtCountExpired = db.prepare('SELECT COUNT(*) as count FROM cache_entries WHERE expires_at <= ?');
  const stmtEnforceLimit = db.prepare(`
    DELETE FROM cache_entries WHERE key IN (
      SELECT key FROM cache_entries
      ORDER BY hit_count ASC, expires_at ASC
      LIMIT ?
    )
  `);

  const cleanupIfNeeded = (): void => {
    const now = Date.now();
    stmtCleanup.run(now);

    try {
      const result = stmtCount.get() as { count: number };
      if (result.count > maxEntries) {
        const excess = result.count - maxEntries;
        stmtEnforceLimit.run(excess);
      }
    } catch {}
  };

  cleanupIfNeeded();

  const cleanupTimer = setInterval(cleanupIfNeeded, cleanupIntervalMs);
  cleanupTimer.unref();

  return {
    generateKey: (serverId: string, method: string, params: unknown): string => {
      const normalizedParams = typeof params === 'string' ? params : JSON.stringify(params);
      const payload = `${serverId}:${method}:${normalizedParams}`;
      return createHash('sha256').update(payload).digest('hex');
    },

    get: (key: string): unknown | undefined => {
      const row = stmtGet.get(key) as { value: string; expires_at: number; hit_count: number } | undefined;
      if (!row) {
        return undefined;
      }

      if (Date.now() > row.expires_at) {
        stmtDelete.run(key);
        return undefined;
      }

      stmtUpdateHit.run(key);
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    },

    set: (key: string, value: unknown, entryTtlMs?: number): void => {
      const now = Date.now();
      const expiresAt = now + (entryTtlMs ?? ttlMs);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      const existing = stmtGet.get(key) as { hit_count: number } | undefined;
      const hitCount = existing?.hit_count ?? 0;

      stmtInsert.run(key, serialized, now, expiresAt, hitCount);
    },

    has: (key: string): boolean => {
      const row = stmtGet.get(key) as { expires_at: number } | undefined;
      return row !== undefined && row.expires_at > Date.now();
    },

    delete: (key: string): boolean => {
      const result = stmtDelete.run(key);
      return result.changes > 0;
    },

    clear: (): void => {
      stmtClear.run();
    },

    cleanupExpired: (): number => {
      const result = stmtCleanup.run(Date.now());
      return result.changes;
    },

    stats: (): { entries: number; expiredEntries: number } => {
      const total = stmtCount.get() as { count: number };
      const expired = stmtCountExpired.get(Date.now()) as { count: number };
      return {
        entries: total.count,
        expiredEntries: expired.count,
      };
    },

    close: (): void => {
      clearInterval(cleanupTimer);
      db.close();
    },
  };
};

export const createSecurityLogStore = (
  config: Partial<SecurityLogStoreConfig> = {},
): SecurityLogStore => {
  const dbFile = resolveDbFile(config.dbPath);
  const db = new Database(dbFile);
  const ttlMs = config.ttlMs ?? SECURITY_LOG_TTL_MS;
  const maxEntries = config.maxEntries ?? SECURITY_DEFAULTS.securityLogMaxEntries;
  const cleanupIntervalMs = config.cleanupIntervalMs ?? SECURITY_DEFAULTS.securityLogCleanupIntervalMs;

  db.pragma('journal_mode = WAL');
  db.pragma(`busy_timeout = ${SECURITY_DEFAULTS.sqliteBusyTimeoutMs}`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      reason TEXT NOT NULL,
      tool TEXT NOT NULL,
      snippet TEXT NOT NULL,
      code TEXT,
      event TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_security_logs_expires_at ON security_logs(expires_at)
  `);

  const stmtInsert = db.prepare(`
    INSERT INTO security_logs (timestamp, created_at, expires_at, reason, tool, snippet, code, event)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const stmtListRecent = db.prepare(`
    SELECT timestamp, reason, tool, snippet, code, event
    FROM security_logs
    WHERE expires_at > ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  const stmtClear = db.prepare('DELETE FROM security_logs');
  const stmtCleanup = db.prepare('DELETE FROM security_logs WHERE expires_at <= ?');
  const stmtCount = db.prepare('SELECT COUNT(*) as count FROM security_logs');
  const stmtPruneOldest = db.prepare(`
    DELETE FROM security_logs WHERE id IN (
      SELECT id FROM security_logs
      ORDER BY created_at ASC, id ASC
      LIMIT ?
    )
  `);

  const cleanupIfNeeded = (): void => {
    stmtCleanup.run(Date.now());
    const count = stmtCount.get() as { count: number };
    if (count.count > maxEntries) {
      stmtPruneOldest.run(count.count - maxEntries);
    }
  };

  cleanupIfNeeded();

  const cleanupTimer = setInterval(cleanupIfNeeded, cleanupIntervalMs);
  cleanupTimer.unref();

  return {
    insert: (entry: SecurityLogEntry): void => {
      const parsedTimestamp = Date.parse(entry.timestamp);
      const createdAt = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

      stmtInsert.run(
        entry.timestamp,
        createdAt,
        createdAt + ttlMs,
        entry.reason,
        entry.tool,
        entry.snippet,
        entry.code ?? null,
        entry.event ?? null,
      );
      cleanupIfNeeded();
    },

    listRecent: (limit = 5): SecurityLogEntry[] => {
      cleanupIfNeeded();
      const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
      return stmtListRecent.all(Date.now(), safeLimit) as SecurityLogEntry[];
    },

    clear: (): number => {
      const result = stmtClear.run();
      return result.changes;
    },

    cleanupExpired: (): number => {
      const result = stmtCleanup.run(Date.now());
      return result.changes;
    },

    close: (): void => {
      clearInterval(cleanupTimer);
      db.close();
    },
  };
};
