import { Request, Response, NextFunction } from 'express';
import { EpistemicSecurityException, TrustGateError } from '../errors.js';
import { auditLogWithSIEM } from '../utils/auditLogger.js';
import { getPrimaryToolInvocation } from '../utils/mcp-request.js';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const tool = getPrimaryToolInvocation(body);

  if (err instanceof EpistemicSecurityException) {
    auditLogWithSIEM('HARD_HALT', {
      reason: err.message,
      code: err.code,
      ip: req.ip,
      path: req.path,
      toolName: tool?.name,
      snippet: JSON.stringify(tool?.arguments ?? {}).slice(0, 240),
    });

    res.status(403).json({
      error: {
        code: err.code,
        message: `Hard Halt Triggered: ${err.message}`,
      },
    });
    return;
  }

  if (err instanceof TrustGateError) {
    auditLogWithSIEM('TRUST_GATE_BLOCK', {
      reason: err.message,
      code: err.code,
      ip: req.ip,
      path: req.path,
      toolName: tool?.name,
      snippet: JSON.stringify(tool?.arguments ?? {}).slice(0, 240),
      details: err.details,
    });

    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  auditLogWithSIEM('INTERNAL_SERVER_ERROR', {
    reason: err.message,
    ip: req.ip,
    path: req.path,
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred (Fail-Closed).',
    },
  });
};
