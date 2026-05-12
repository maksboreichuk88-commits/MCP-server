import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { Readable, Writable } from 'node:stream';
import { initializeCache } from '../cache/index.js';
import { stopAdminServer, startAdminServer } from '../admin/index.js';
import { sanitizeResponse } from '../proxy/shadow-leak-sanitizer.js';
import { auditLog } from '../utils/auditLogger.js';
import { getPrimaryToolInvocation, isRecord } from '../utils/mcp-request.js';

const OOM_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const DEFAULT_TARGET_TIMEOUT_MS = 30000;
const TARGET_UNAVAILABLE_CODE = -32004;

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface PendingRequest {
  id: JsonRpcId;
  toolName?: string;
  cacheParams?: unknown;
  timeout: NodeJS.Timeout;
}

export interface StdioFirewallOptions {
  targetCommand: string;
  targetArgs: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: Readable;
  output?: Writable;
  errorOutput?: Writable;
  serverId?: string;
  cacheDir?: string;
  cacheTtlSeconds?: number;
  adminEnabled?: boolean;
  adminPort?: number;
  targetTimeoutMs?: number;
}

const isJsonRpcRequest = (value: unknown): value is JsonRpcRequest => {
  if (!isRecord(value)) return false;
  return value.jsonrpc === '2.0' && typeof value.method === 'string';
};

const isJsonRpcResponse = (value: unknown): value is JsonRpcResponse => {
  if (!isRecord(value)) return false;
  return value.jsonrpc === '2.0' && Object.prototype.hasOwnProperty.call(value, 'id') &&
    (Object.prototype.hasOwnProperty.call(value, 'result') || Object.prototype.hasOwnProperty.call(value, 'error'));
};

const buildRpcErrorResponse = (id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0', id, error: { code, message, data },
});

export const createStdioFirewallProxy = (options: StdioFirewallOptions) => {
  const input: Readable = options.input ?? process.stdin;
  const output: Writable = options.output ?? process.stdout;
  const errorOutput: Writable = options.errorOutput ?? process.stderr;

  const pendingRequests = new Map<string, PendingRequest>();
  const targetTimeoutMs = options.targetTimeoutMs ?? DEFAULT_TARGET_TIMEOUT_MS;

  const serverId = options.serverId ?? `${options.targetCommand} ${options.targetArgs.join(' ')}`.trim();
  const cacheManager = initializeCache({
    serverId,
    l1: { maxSize: 1000, ttlMs: (options.cacheTtlSeconds ?? 300) * 1000 },
    l2: { dbPath: options.cacheDir ?? path.join(process.cwd(), '.mcp-cache'), ttlMs: (options.cacheTtlSeconds ?? 300) * 1000 },
    alwaysCacheTools: ['read_file', 'read', 'open_file', 'list_directory', 'list_files', 'search_files', 'search'],
    neverCacheTools: ['write_file', 'write', 'create_file', 'execute_command', 'execute'],
  });

  let clientInterface: readline.Interface | null = null;
  let targetInterface: readline.Interface | null = null;
  let targetProcess: ChildProcessWithoutNullStreams | null = null;
  let stopped = false;

  const writeRawJson = (message: unknown): void => {
    output.write(JSON.stringify(message) + '\n');
  };

  const clearPendingRequest = (requestId: string): PendingRequest | undefined => {
    const pending = pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(requestId);
    }
    return pending;
  };

  const terminateTarget = (): void => {
    targetInterface?.close();
    targetInterface = null;
    if (targetProcess && !targetProcess.killed) targetProcess.kill('SIGTERM');
  };

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    clientInterface?.close();
    terminateTarget();
    cacheManager.close();
    await stopAdminServer();
  };

  const handleClientLine = async (line: string): Promise<void> => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let message: unknown;
    try {
      message = JSON.parse(trimmed);
    } catch {
      writeRawJson(buildRpcErrorResponse(null, -32700, 'Parse error'));
      return;
    }

    if (!isJsonRpcRequest(message)) {
      writeRawJson(buildRpcErrorResponse(null, -32600, 'Invalid Request'));
      return;
    }

    const requestId = message.id ?? null;

    if (stopped || !targetProcess?.stdin.writable) {
      writeRawJson(buildRpcErrorResponse(requestId, TARGET_UNAVAILABLE_CODE, 'Fail-Closed'));
      return;
    }

    const tool = getPrimaryToolInvocation(message as Record<string, unknown>);
    if (message.method === 'tools/call' && tool?.name && requestId !== null) {
      const cached = cacheManager.get(tool.name, tool.arguments ?? {});
      if (cached !== undefined) {
        writeRawJson({ jsonrpc: '2.0', id: requestId, result: cached });
        return;
      }
    }

    if (requestId !== null) {
      const pendingTimeout = setTimeout(() => {
        const pending = clearPendingRequest(String(requestId));
        if (pending) {
          writeRawJson(buildRpcErrorResponse(pending.id, -32007, 'Fail-Closed'));
        }
      }, targetTimeoutMs);
      pendingTimeout.unref?.();

      pendingRequests.set(String(requestId), {
        id: requestId,
        toolName: tool?.name,
        cacheParams: tool?.arguments ?? message.params,
        timeout: pendingTimeout,
      });
    }

    try {
      targetProcess.stdin.write(JSON.stringify(message) + '\n');
    } catch (error) {
      if (requestId !== null) clearPendingRequest(String(requestId));
      writeRawJson(buildRpcErrorResponse(requestId, TARGET_UNAVAILABLE_CODE, 'write failed'));
    }
  };

  const checkOomLimit = (id: JsonRpcId, payload: unknown): boolean => {
    const jsonStr = JSON.stringify(payload);
    const byteLength = Buffer.byteLength(jsonStr, 'utf8');

    if (byteLength > OOM_MAX_RESPONSE_BYTES) {
      auditLog('OOM_PROTECTION_TRIGGERED', { id, byteLength, limit: OOM_MAX_RESPONSE_BYTES });
      if (id !== null && id !== undefined) {
         writeRawJson({
            jsonrpc: '2.0',
            id: id,
            error: {
               code: -32000,
               message: 'Response Too Large'
            }
         });
      }
      return false;
    }
    return true;
  };

  const handleTargetLine = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let message: unknown;
    try {
      message = JSON.parse(trimmed);
    } catch {
      terminateTarget();
      return;
    }

    if (!isJsonRpcResponse(message)) {
      const sanitized = sanitizeResponse(message);
      if (checkOomLimit(null, sanitized)) writeRawJson(sanitized);
      return;
    }

    const pending = clearPendingRequest(String(message.id));
    if (!pending) return;

    if (Object.prototype.hasOwnProperty.call(message, 'result')) {
      const sanitizedResult = sanitizeResponse(message.result);
      if (!checkOomLimit(message.id, sanitizedResult)) return;

      if (pending?.toolName) {
        cacheManager.set(pending.toolName, pending.cacheParams ?? {}, sanitizedResult);
      }

      writeRawJson({ jsonrpc: '2.0', id: message.id, result: sanitizedResult });
      return;
    }

    const sanitizedError = sanitizeResponse(message.error);
    if (!checkOomLimit(message.id, sanitizedError)) return;

    writeRawJson({ jsonrpc: '2.0', id: message.id, error: sanitizedError });
  };

  const spawnTarget = (): void => {
    targetProcess = spawn(options.targetCommand, options.targetArgs, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    targetInterface = readline.createInterface({ input: targetProcess.stdout, crlfDelay: Infinity });
    targetInterface.on('line', handleTargetLine);
    targetProcess.on('error', () => {
      targetProcess = null;
      targetInterface?.close();
      targetInterface = null;
    });
    targetProcess.on('close', () => {
      targetProcess = null;
      targetInterface = null;
    });
  };

  return {
    start: async (): Promise<void> => {
      spawnTarget();
      if (options.adminEnabled) startAdminServer(options.adminPort ?? 9090);

      clientInterface = readline.createInterface({ input: input, crlfDelay: Infinity });
      clientInterface.on('line', (line) => { void handleClientLine(line); });
      clientInterface.on('close', () => {
        if (targetProcess?.stdin.writable) targetProcess.stdin.end();
        void stop();
      });
    },
    stop,
  };
};
