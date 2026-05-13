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

const PREFLIGHT_REQUIRED_TOOLS = new Set(['execute_command', 'execute']);

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
  targetTimeoutMs?: number;
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
  verbose?: boolean;
  proxyAuthToken?: string;
  alwaysCacheTools?: string[];
  neverCacheTools?: string[];
}

export interface StdioFirewallProxy {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const isShadowLeakUrl = (url: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const params = [...parsed.searchParams.entries()];
  if (params.length === 0) return false;

  const singleCharParams = params.filter(([k]) => k.length === 1);
  if (singleCharParams.length >= 3) return true;

  const valueLengths = params.map(([, v]) => v.length);
  const shortValues = valueLengths.filter(len => len <= 2);
  const byKey = new Map<string, number>();
  for (const [k] of params) {
    byKey.set(k, (byKey.get(k) ?? 0) + 1);
  }
  const repeatedKeys = [...byKey.values()].filter(count => count > 1);
  if (repeatedKeys.length > 0 && shortValues.length >= 4) return true;

  return false;
};

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
  jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) },
});

const validateAuth = (proxyAuthToken: string | undefined, message: JsonRpcRequest): boolean => {
  if (!proxyAuthToken) return true;

  const params = message.params as Record<string, unknown> | undefined;
  const meta = params?._meta as Record<string, unknown> | undefined;
  const authorization = meta?.authorization as string | undefined;
  if (!authorization) return false;

  const bearerPrefix = 'Bearer ';
  if (!authorization.startsWith(bearerPrefix)) return false;

  try {
    const encoded = authorization.slice(bearerPrefix.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const payload = JSON.parse(decoded) as Record<string, unknown>;
    return payload.token === proxyAuthToken;
  } catch {
    return false;
  }
};

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
    alwaysCacheTools: options.alwaysCacheTools ?? ['read_file', 'read', 'open_file', 'list_directory', 'list_files', 'search_files', 'search'],
    neverCacheTools: options.neverCacheTools ?? ['write_file', 'write', 'create_file', 'execute_command', 'execute'],
  });

  let clientInterface: readline.Interface | null = null;
  let targetInterface: readline.Interface | null = null;
  let targetProcess: ChildProcessWithoutNullStreams | null = null;
  let stopped = false;
  let draining = false;

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

  const failAllPending = (code: number, message: string, data?: unknown): void => {
    for (const [key, pending] of pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(key);
      writeRawJson(buildRpcErrorResponse(pending.id, code, message, data));
    }
  };

  const terminateTarget = (): void => {
    targetInterface?.close();
    targetInterface = null;
    if (targetProcess && !targetProcess.killed) targetProcess.kill('SIGTERM');
  };

  const checkDrainComplete = (): void => {
    if (draining && pendingRequests.size === 0) {
      void stop();
    }
  };

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    failAllPending(-32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' });
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
    const tool = getPrimaryToolInvocation(message as unknown as Record<string, unknown>);

    if (message.method === 'tools/call' && !validateAuth(options.proxyAuthToken, message)) {
      auditLog('AUTH_FAILURE', {
        code: 'AUTH_FAILURE',
        reason: 'Missing or invalid NHI authorization',
        toolName: tool?.name,
        snippet: JSON.stringify(tool?.arguments ?? {}).slice(0, 240),
      });
      writeRawJson(buildRpcErrorResponse(requestId, -32001, 'Fail-Closed: authentication required.', { code: 'AUTH_FAILURE' }));
      return;
    }

    if (stopped || !targetProcess?.stdin.writable) {
      writeRawJson(buildRpcErrorResponse(requestId, -32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' }));
      return;
    }

    if (message.method === 'tools/call' && tool?.name) {
      if (PREFLIGHT_REQUIRED_TOOLS.has(tool.name)) {
        writeRawJson(buildRpcErrorResponse(requestId, -32002, 'Fail-Closed: preflight approval required.', { code: 'PREFLIGHT_REQUIRED' }));
        return;
      }

      if ((tool.name === 'fetch_url' || tool.name === 'fetch') && tool.arguments) {
        const args = tool.arguments as Record<string, unknown>;
        for (const val of Object.values(args)) {
          if (typeof val === 'string' && isShadowLeakUrl(val)) {
            auditLog('SHADOWLEAK_BLOCKED_STDIO', {
              code: 'SHADOWLEAK_DETECTED',
              reason: 'ShadowLeak exfiltration pattern detected',
              toolName: tool.name,
              url: val,
            });
            writeRawJson(buildRpcErrorResponse(requestId, -32003, 'Fail-Closed: ShadowLeak exfiltration pattern detected.', { code: 'SHADOWLEAK_DETECTED' }));
            return;
          }
        }
      }

      if (requestId !== null) {
        const cached = cacheManager.get(tool.name, tool.arguments ?? {});
        if (cached !== undefined) {
          writeRawJson({ jsonrpc: '2.0', id: requestId, result: cached });
          return;
        }
      }
    }

    if (requestId !== null) {
      const pendingTimeout = setTimeout(() => {
        const pending = clearPendingRequest(String(requestId));
        if (pending) {
          writeRawJson(buildRpcErrorResponse(pending.id, -32007, 'Fail-Closed: target response timed out.', {
            code: 'TARGET_RESPONSE_TIMEOUT',
            timeoutMs: targetTimeoutMs,
          }));
          checkDrainComplete();
        }
      }, targetTimeoutMs);
      pendingTimeout.unref?.();

      pendingRequests.set(String(requestId), {
        id: requestId,
        toolName: tool?.name,
        cacheParams: tool?.arguments ?? message.params,
        timeout: pendingTimeout,
        targetTimeoutMs,
      });
    }

    try {
      targetProcess.stdin.write(JSON.stringify(message) + '\n');
    } catch (error) {
      if (requestId !== null) clearPendingRequest(String(requestId));
      writeRawJson(buildRpcErrorResponse(requestId, -32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' }));
    }
  };

  const checkOomLimit = (id: JsonRpcId, payload: unknown): boolean => {
    const jsonStr = JSON.stringify(payload);
    const byteLength = Buffer.byteLength(jsonStr, 'utf8');

    if (byteLength > OOM_MAX_RESPONSE_BYTES) {
      auditLog('OOM_PROTECTION_TRIGGERED', { id, byteLength, limit: OOM_MAX_RESPONSE_BYTES });
      if (id !== null && id !== undefined) {
        writeRawJson(buildRpcErrorResponse(id, -32005, 'Fail-Closed: Response exceeds strict OOM size limit.', { limit: OOM_MAX_RESPONSE_BYTES }));
      }
      return false;
    }
    return true;
  };

  const handleTargetLine = (line: string): void => {
    if (stopped) return;

    const trimmed = line.trim();
    if (!trimmed) return;

    let message: unknown;
    try {
      message = JSON.parse(trimmed);
    } catch {
      failAllPending(-32006, 'Fail-Closed: downstream target emitted invalid JSON.', { code: 'TARGET_INVALID_JSON' });
      terminateTarget();
      checkDrainComplete();
      return;
    }

    if (!isJsonRpcResponse(message)) {
      const sanitized = sanitizeResponse(message);
      if (checkOomLimit(null, sanitized)) writeRawJson(sanitized);
      checkDrainComplete();
      return;
    }

    const pending = clearPendingRequest(String(message.id));
    if (!pending) {
      checkDrainComplete();
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, 'result')) {
      const sanitizedResult = sanitizeResponse(message.result);
      if (!checkOomLimit(message.id, sanitizedResult)) {
        checkDrainComplete();
        return;
      }

      if (pending?.toolName) {
        cacheManager.set(pending.toolName, pending.cacheParams ?? {}, sanitizedResult);
      }

      writeRawJson({ jsonrpc: '2.0', id: message.id, result: sanitizedResult });
      checkDrainComplete();
      return;
    }

    const sanitizedError = sanitizeResponse(message.error);
    if (!checkOomLimit(message.id, sanitizedError)) {
      checkDrainComplete();
      return;
    }

    writeRawJson({ jsonrpc: '2.0', id: message.id, error: sanitizedError });
    checkDrainComplete();
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
        if (draining || stopped) return;
        if (pendingRequests.size > 0) {
          draining = true;
          if (targetProcess?.stdin.writable) targetProcess.stdin.end();
        } else {
          void stop();
        }
      });
    },
    stop,
  };
};
