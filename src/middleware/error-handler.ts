import { Request, Response, NextFunction } from 'express';
import { RequestPolicyError, AccessPolicyError } from '../errors.js';
import { auditLogWithSIEM } from '../utils/auditLogger.js';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof RequestPolicyError) {
    auditLogWithSIEM('REQUEST_BLOCKED', {
      reason: err.message,
      code: err.code,
      ip: req.ip,
      path: req.path,
    });

    res.status(403).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof AccessPolicyError) {
    auditLogWithSIEM('SECURITY_POLICY_BLOCK', {
      reason: err.message,
      code: err.code,
      ip: req.ip,
      path: req.path,
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
      message: 'Internal server error. Request denied.',
    },
  });
};
