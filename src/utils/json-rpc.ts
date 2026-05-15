import { isRecord } from './mcp-request.js';

export type JsonRpcId = string | number | null;

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: JsonRpcErrorObject;
}

export const extractJsonRpcId = (body: unknown): JsonRpcId => {
  if (!isRecord(body)) {
    return null;
  }

  const id = body['id'];
  if (typeof id === 'string' || typeof id === 'number' || id === null) {
    return id;
  }

  return null;
};

export const isJsonRpcLikeRequest = (body: unknown): boolean => {
  return isRecord(body) && body['jsonrpc'] === '2.0';
};

export const buildJsonRpcErrorResponse = (
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse => ({
  jsonrpc: '2.0',
  id,
  error: {
    code,
    message,
    ...(data !== undefined ? { data } : {}),
  },
});

export const buildHttpErrorBody = (
  body: unknown,
  code: string,
  message: string,
  rpcCode: number,
  data?: Record<string, unknown>,
): JsonRpcErrorResponse | { error: { code: string; message: string; data?: Record<string, unknown> } } => {
  if (isJsonRpcLikeRequest(body)) {
    return buildJsonRpcErrorResponse(extractJsonRpcId(body), rpcCode, message, {
      code,
      ...(data ?? {}),
    });
  }

  return {
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
};
