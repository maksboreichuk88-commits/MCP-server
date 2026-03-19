/**
 * Append-only audit logger for security events.
 * Implements immutable, timestamped logging as required by security-constitution.md.
 * Logs are written to stdout (structured JSON) AND optionally appended to a file.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface AuditEntry {
  timestamp: string;
  eventType: "CROSS_TOOL_HIJACK" | "AUTH_FAILURE" | "SCHEMA_VIOLATION" | "SHADOWLEAK" | "FIREWALL_BLOCK";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  clientId: string;
  detail: string;
  requestId?: string | number;
}

const LOG_DIR = path.resolve(process.cwd(), "audit-logs");

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Appends a structured audit entry to the immutable log.
 * This function never throws — logging failures are written to stderr
 * but NEVER suppress the original security event.
 */
export function appendAuditLog(entry: AuditEntry): void {
  const line = JSON.stringify(entry) + "\n";

  // Always emit to stderr for SIEM ingestion
  process.stderr.write(`[AUDIT] ${line}`);

  try {
    ensureLogDir();
    const filename = `audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    fs.appendFileSync(path.join(LOG_DIR, filename), line, "utf-8");
  } catch (fsErr) {
    // Log file write failure must NOT suppress the security event
    process.stderr.write(`[AUDIT-FS-ERROR] Failed to write audit log: ${String(fsErr)}\n`);
  }
}
