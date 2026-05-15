import { Request, Response, NextFunction } from 'express';
import { EpistemicSecurityException, TrustGateError } from '../errors.js';
import { resolveSnippetMaxLength } from '../security-constants.js';
import { auditLogWithSIEM } from '../utils/auditLogger.js';
import { buildHttpErrorBody } from '../utils/json-rpc.js';
import { getPrimaryToolInvocation } from '../utils/mcp-request.js';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const tool = getPrimaryToolInvocation(body);
  const snippet = (() => {
    try {
      return JSON.stringify(tool?.arguments ?? {}).slice(0, resolveSnippetMaxLength());
    } catch {
      return String(tool?.name ?? req.path).slice(0, resolveSnippetMaxLength());
    }
  })();

  if (err instanceof EpistemicSecurityException) {
    auditLogWithSIEM('HARD_HALT', {
      reason: err.message,
      code: err.code,
      ip: req.ip,
      path: req.path,
      toolName: tool?.name,
      snippet,
    });

    res.status(403).json(buildHttpErrorBody(
      body,
      err.code,
      `Hard Halt Triggered: ${err.message}`,
      -32003,
    ));
    return;
  }

  if (err instanceof TrustGateError) {
    auditLogWithSIEM('TRUST_GATE_BLOCK', {
      reason: err.message,
      code: err.code,
      ip: req.ip,
      path: req.path,
      toolName: tool?.name,
      snippet,
      details: err.details,
    });

    res.status(err.status).json(buildHttpErrorBody(
      body,
      err.code,
      err.message,
      -32003,
      err.details,
    ));
    return;
  }

  auditLogWithSIEM('INTERNAL_SERVER_ERROR', {
    reason: err.message,
    ip: req.ip,
    path: req.path,
    stack: err.stack,
  });

  res.status(500).json(buildHttpErrorBody(
    body,
    'INTERNAL_SERVER_ERROR',
    'An unexpected internal error occurred (Fail-Closed).',
    -32603,
  ));
};
