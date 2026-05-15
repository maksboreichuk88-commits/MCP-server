import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { Readable, Writable } from 'node:stream';
import { initializeCache } from '../cache/index.js';
import { stopAdminServer, startAdminServer } from '../admin/index.js';
import { EpistemicSecurityException, TrustGateError } from '../errors.js';
import { validateAstEgress } from '../middleware/ast-egress-filter.js';
import { parseNhiAuthorizationHeader } from '../middleware/nhi-auth-validator.js';
import { validatePreflight } from '../middleware/preflight-validator.js';
import { checkRateLimit, resolveRateLimitConfig, type RateLimitConfig } from '../middleware/rate-limiter.js';
import { validateScopes } from '../middleware/scope-validator.js';
import { sanitizeResponse } from '../proxy/shadow-leak-sanitizer.js';
import { parseIntEnv, resolveSnippetMaxLength, SECURITY_DEFAULTS } from '../security-constants.js';
import { auditLog } from '../utils/auditLogger.js';
import { buildJsonRpcErrorResponse, type JsonRpcId } from '../utils/json-rpc.js';
import { extractAuthorizationFromBody, extractToolInvocations, getPrimaryToolInvocation, isRecord } from '../utils/mcp-request.js';

type SessionColor = 'red' | 'blue' | null;

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
  rateLimit?: Pick<RateLimitConfig, 'windowMs' | 'maxRequests'>;
}

export interface StdioFirewallProxy {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const isJsonRpcRequest = (value: unknown): value is JsonRpcRequest => {
  if (!isRecord(value)) return false;
  return value['jsonrpc'] === '2.0' && typeof value['method'] === 'string';
};

const isJsonRpcResponse = (value: unknown): value is JsonRpcResponse => {
  if (!isRecord(value)) return false;
  return value['jsonrpc'] === '2.0' && Object.prototype.hasOwnProperty.call(value, 'id') &&
    (Object.prototype.hasOwnProperty.call(value, 'result') || Object.prototype.hasOwnProperty.call(value, 'error'));
};

const extractStdioAuthorization = (message: JsonRpcRequest): string | undefined => {
  const fromBody = extractAuthorizationFromBody(message as unknown as Record<string, unknown>);
  if (fromBody) return fromBody;

  if (!isRecord(message['params']) || !isRecord(message['params']['_meta'])) {
    return undefined;
  }

  const authorization = message['params']['_meta']['authorization'];
  return typeof authorization === 'string' ? authorization : undefined;
};

const parseStdioAuthScopes = (proxyAuthToken: string | undefined, message: JsonRpcRequest): string[] => {
  if (!proxyAuthToken) return [];
  const parsed = parseNhiAuthorizationHeader(extractStdioAuthorization(message), proxyAuthToken, 'stdio');
  return parsed.scopes;
};

const createSnippet = (message: JsonRpcRequest): string => {
  const tool = getPrimaryToolInvocation(message as unknown as Record<string, unknown>);
  try {
    return JSON.stringify(tool?.arguments ?? message.params ?? {}).slice(0, resolveSnippetMaxLength());
  } catch {
    return String(tool?.name ?? message.method).slice(0, resolveSnippetMaxLength());
  }
};

const validateColorBoundary = (message: JsonRpcRequest, sessionColor: SessionColor): SessionColor => {
  const tools = extractToolInvocations(message as unknown as Record<string, unknown>);
  const reds = tools.filter((tool) => tool._meta?.color === 'red').map((tool) => tool.name ?? 'unknown');
  const blues = tools.filter((tool) => tool._meta?.color === 'blue').map((tool) => tool.name ?? 'unknown');

  if (reds.length > 0 && blues.length > 0) {
    throw new TrustGateError(
      `Cross-Tool Hijack Attempt detected: ${[...reds, ...blues].join(', ')}`,
      'CROSS_TOOL_HIJACK_ATTEMPT',
      403,
      { redTools: reds, blueTools: blues },
    );
  }

  const requestColor: SessionColor = reds.length > 0 ? 'red' : blues.length > 0 ? 'blue' : null;
  if (requestColor !== null && sessionColor !== null && requestColor !== sessionColor) {
    throw new TrustGateError(
      `Cross-Tool Hijack Attempt detected: ${tools.map((tool) => tool.name ?? 'unknown').join(', ')}`,
      'CROSS_TOOL_HIJACK_ATTEMPT',
      403,
      { sessionColor, requestColor },
    );
  }

  return requestColor ?? sessionColor;
};

const getSecurityErrorCode = (error: unknown): string => {
  if (error instanceof EpistemicSecurityException || error instanceof TrustGateError) {
    return error.code;
  }

  return 'SECURITY_VALIDATION_FAILED';
};

const getSecurityErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Fail-Closed: security validation failed.';
};

export const createStdioFirewallProxy = (options: StdioFirewallOptions) => {
  const input: Readable = options.input ?? process.stdin;
  const output: Writable = options.output ?? process.stdout;
  const errorOutput: Writable | undefined = options.errorOutput;

  const pendingRequests = new Map<string, PendingRequest>();
  const targetTimeoutMs = options.targetTimeoutMs ?? SECURITY_DEFAULTS.targetTimeoutMs;
  const rateLimitConfig = options.rateLimit ?? resolveRateLimitConfig(options.env);
  const maxPendingRequests = parseIntEnv(options.env?.['MCP_STDIO_MAX_PENDING_REQUESTS'] ?? process.env['MCP_STDIO_MAX_PENDING_REQUESTS'], {
    fallback: SECURITY_DEFAULTS.stdioMaxPendingRequests,
    min: 1,
    max: 100000,
  });
  const maxLineBytes = parseIntEnv(options.env?.['MCP_STDIO_MAX_LINE_BYTES'] ?? process.env['MCP_STDIO_MAX_LINE_BYTES'], {
    fallback: SECURITY_DEFAULTS.stdioMaxLineBytes,
    min: 1024,
    max: 50 * 1024 * 1024,
  });
  const maxResponseBytes = parseIntEnv(options.env?.['MCP_STDIO_MAX_RESPONSE_BYTES'] ?? process.env['MCP_STDIO_MAX_RESPONSE_BYTES'], {
    fallback: SECURITY_DEFAULTS.stdioMaxResponseBytes,
    min: 1024,
    max: 50 * 1024 * 1024,
  });

  const serverId = options.serverId ?? `${options.targetCommand} ${options.targetArgs.join(' ')}`.trim();
  const cacheManager = initializeCache({
    serverId,
    l1: { maxSize: SECURITY_DEFAULTS.l1CacheMaxEntries, ttlMs: (options.cacheTtlSeconds ?? SECURITY_DEFAULTS.defaultCacheTtlSeconds) * 1000 },
    l2: { dbPath: options.cacheDir ?? path.join(process.cwd(), '.mcp-cache'), ttlMs: (options.cacheTtlSeconds ?? SECURITY_DEFAULTS.defaultCacheTtlSeconds) * 1000 },
    alwaysCacheTools: options.alwaysCacheTools ?? ['read_file', 'read', 'open_file', 'list_directory', 'list_files', 'search_files', 'search'],
    neverCacheTools: options.neverCacheTools ?? ['write_file', 'write', 'create_file', 'execute_command', 'execute'],
  });

  let clientInterface: readline.Interface | null = null;
  let targetInterface: readline.Interface | null = null;
  let targetProcess: ChildProcessWithoutNullStreams | null = null;
  let stopped = false;
  let draining = false;
  let stdioSessionColor: SessionColor = null;

  const writeRawJson = (message: unknown): void => {
    try {
      output.write(JSON.stringify(message) + '\n');
    } catch {}
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
      writeRawJson(buildJsonRpcErrorResponse(pending.id, code, message, data));
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

    if (Buffer.byteLength(trimmed, 'utf8') > maxLineBytes) {
      writeRawJson(buildJsonRpcErrorResponse(null, -32005, 'Fail-Closed: stdio request exceeds maximum line size.', {
        code: 'STDIO_REQUEST_TOO_LARGE',
        limit: maxLineBytes,
      }));
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(trimmed);
    } catch {
      writeRawJson(buildJsonRpcErrorResponse(null, -32700, 'Parse error'));
      return;
    }

    if (!isJsonRpcRequest(message)) {
      writeRawJson(buildJsonRpcErrorResponse(null, -32600, 'Invalid Request'));
      return;
    }

    const requestId = message.id ?? null;
    const tool = getPrimaryToolInvocation(message as unknown as Record<string, unknown>);
    let availableScopes: string[] = [];

    if (message.method === 'tools/call' && options.proxyAuthToken) {
      try {
        availableScopes = parseStdioAuthScopes(options.proxyAuthToken, message);
      } catch {
        auditLog('AUTH_FAILURE', {
          code: 'AUTH_FAILURE',
          reason: 'Missing or invalid NHI authorization',
          toolName: tool?.name,
          snippet: createSnippet(message),
        });
        writeRawJson(buildJsonRpcErrorResponse(requestId, -32001, 'Fail-Closed: authentication required.', { code: 'AUTH_FAILURE' }));
        return;
      }
    }

    if (stopped || !targetProcess?.stdin.writable) {
      writeRawJson(buildJsonRpcErrorResponse(requestId, -32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' }));
      return;
    }

    if (message.method === 'tools/call') {
      try {
        validateAstEgress(message as unknown as Record<string, unknown>);
        if (options.proxyAuthToken) {
          validateScopes(message as unknown as Record<string, unknown>, availableScopes, 'stdio');
        }
        stdioSessionColor = validateColorBoundary(message, stdioSessionColor);
        validatePreflight(message as unknown as Record<string, unknown>, 'stdio');
      } catch (error) {
        const code = getSecurityErrorCode(error);
        const messageText = getSecurityErrorMessage(error);
        if (error instanceof EpistemicSecurityException || code === 'CROSS_TOOL_HIJACK_ATTEMPT') {
          auditLog(code, {
            code,
            reason: messageText,
            toolName: tool?.name,
            snippet: createSnippet(message),
          });
        }
        writeRawJson(buildJsonRpcErrorResponse(requestId, -32003, messageText, { code }));
        return;
      }
    }

    if (message.method === 'tools/call' && tool?.name) {
      const rateLimitDecision = checkRateLimit({
        transport: 'stdio',
        identity: 'local-client',
        targetId: serverId,
        toolName: tool.name,
        path: 'stdio',
        snippet: createSnippet(message),
      }, rateLimitConfig);

      if (!rateLimitDecision.allowed) {
        writeRawJson(buildJsonRpcErrorResponse(requestId, -32029, 'Fail-Closed: too many requests for this target/tool.', {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitDecision.resetInSeconds,
          limit: rateLimitDecision.limit,
          remaining: rateLimitDecision.remaining,
        }));
        return;
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
      if (pendingRequests.size >= maxPendingRequests) {
        writeRawJson(buildJsonRpcErrorResponse(requestId, -32029, 'Fail-Closed: too many in-flight stdio requests.', {
          code: 'STDIO_PENDING_LIMIT_EXCEEDED',
          limit: maxPendingRequests,
        }));
        return;
      }

      const pendingTimeout = setTimeout(() => {
        const pending = clearPendingRequest(String(requestId));
        if (pending) {
          writeRawJson(buildJsonRpcErrorResponse(pending.id, -32007, 'Fail-Closed: target response timed out.', {
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
      const serializedMessage = JSON.stringify(message) + '\n';
      if (!targetProcess.stdin.write(serializedMessage)) {
        auditLog('STDIO_TARGET_BACKPRESSURE', {
          code: 'STDIO_TARGET_BACKPRESSURE',
          reason: 'Target stdin reported backpressure.',
          toolName: tool?.name,
          pendingRequests: pendingRequests.size,
        });
      }
    } catch (error) {
      if (requestId !== null) clearPendingRequest(String(requestId));
      writeRawJson(buildJsonRpcErrorResponse(requestId, -32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' }));
    }
  };

  const checkOomLimit = (id: JsonRpcId, payload: unknown): boolean => {
    let jsonStr: string;
    try {
      jsonStr = JSON.stringify(payload);
    } catch {
      if (id !== null && id !== undefined) {
        writeRawJson(buildJsonRpcErrorResponse(id, -32005, 'Fail-Closed: response is not serializable.', { code: 'TARGET_RESPONSE_UNSERIALIZABLE' }));
      }
      return false;
    }
    const byteLength = Buffer.byteLength(jsonStr, 'utf8');

    if (byteLength > maxResponseBytes) {
      auditLog('OOM_PROTECTION_TRIGGERED', { id, byteLength, limit: maxResponseBytes });
      if (id !== null && id !== undefined) {
        writeRawJson(buildJsonRpcErrorResponse(id, -32005, 'Fail-Closed: Response exceeds strict OOM size limit.', { limit: maxResponseBytes }));
      }
      return false;
    }
    return true;
  };

  const handleTargetLine = (line: string): void => {
    if (stopped) return;

    const trimmed = line.trim();
    if (!trimmed) return;

    if (Buffer.byteLength(trimmed, 'utf8') > maxLineBytes) {
      failAllPending(-32005, 'Fail-Closed: downstream target emitted an oversized JSON line.', {
        code: 'TARGET_RESPONSE_TOO_LARGE',
        limit: maxLineBytes,
      });
      terminateTarget();
      checkDrainComplete();
      return;
    }

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
      if (!checkOomLimit(message.id, message.result)) {
        checkDrainComplete();
        return;
      }

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

    if (!checkOomLimit(message.id, message.error)) {
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

    targetProcess.stderr.on('data', (chunk: Buffer) => {
      if (!options.verbose || !errorOutput) {
        return;
      }

      try {
        const text = chunk.toString('utf8').slice(0, resolveSnippetMaxLength());
        errorOutput.write(text);
      } catch {}
    });
    targetProcess.stderr.on('error', () => {});
    targetProcess.stdin.on('error', () => {
      failAllPending(-32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' });
    });

    targetInterface = readline.createInterface({ input: targetProcess.stdout, crlfDelay: Infinity });
    targetInterface.on('line', handleTargetLine);
    targetProcess.on('error', () => {
      failAllPending(-32004, 'Fail-Closed: target process is unavailable.', { code: 'TARGET_UNAVAILABLE' });
      targetProcess = null;
      targetInterface?.close();
      targetInterface = null;
    });
    targetProcess.on('close', () => {
      if (!stopped && pendingRequests.size > 0) {
        failAllPending(-32004, 'Fail-Closed: target process closed before responding.', { code: 'TARGET_CLOSED' });
      }
      targetProcess = null;
      targetInterface = null;
    });
  };

  return {
    start: async (): Promise<void> => {
      spawnTarget();
      if (options.adminEnabled) startAdminServer(options.adminPort ?? 9090);

      clientInterface = readline.createInterface({ input: input, crlfDelay: Infinity });
      clientInterface.on('line', (line) => {
        void handleClientLine(line).catch(() => {
          writeRawJson(buildJsonRpcErrorResponse(null, -32603, 'Fail-Closed: internal stdio proxy failure.', {
            code: 'STDIO_PROXY_INTERNAL_ERROR',
          }));
        });
      });
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
