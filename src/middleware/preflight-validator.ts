import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auditLogWithSIEM } from '../utils/auditLogger.js';

const PreflightIdSchema = z.string().uuid();

const preflightRegistry = new Map<string, number>();
const consumedRegistry = new Map<string, number>();
const CONSUMED_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const cleanupExpired = (): void => {
  const now = Date.now();
  for (const [id, expiry] of consumedRegistry) {
    if (now > expiry) {
      consumedRegistry.delete(id);
    }
  }
  for (const [id, expiry] of preflightRegistry) {
    if (now > expiry) {
      preflightRegistry.delete(id);
    }
  }
};

setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);

export const registerPreflight = (id: string, ttlMs = CONSUMED_TTL_MS): void => {
  const parsed = PreflightIdSchema.parse(id);
  preflightRegistry.set(parsed, Date.now() + ttlMs);
};

export const clearPreflightRegistries = (): void => {
  preflightRegistry.clear();
  consumedRegistry.clear();
};

export const getPreflightStats = (): { pending: number; consumed: number } => {
  cleanupExpired();
  return {
    pending: preflightRegistry.size,
    consumed: consumedRegistry.size,
  };
};

interface ToolMeta {
  color?: string;
}

interface ToolEntry {
  name?: string;
  _meta?: ToolMeta;
  preflightId?: string;
}

const extractToolsFromBody = (body: Record<string, unknown>): ToolEntry[] => {
  if (Array.isArray(body.tools)) {
    return body.tools as ToolEntry[];
  }
  if (body.params && typeof body.params === 'object' && !Array.isArray(body.params)) {
    const params = body.params as Record<string, unknown>;
    if (Array.isArray(params.tools)) {
      return params.tools as ToolEntry[];
    }
  }
  return [];
};

export const preflightValidator = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const body = req.body as Record<string, unknown>;
    const tools = extractToolsFromBody(body);

    if (tools.length === 0) {
      next();
      return;
    }

    for (const tool of tools) {
      const color = tool._meta?.color;

      if (color !== 'blue') {
        continue;
      }

      const preflightId = tool.preflightId;

      if (!preflightId || typeof preflightId !== 'string') {
        auditLogWithSIEM('PREFLIGHT_REQUIRED', {
          reason: 'Blue tool invoked without preflightId',
          toolName: tool.name ?? 'unknown',
          ip: req.ip,
        });
        res.status(403).json({
          error: {
            code: 'PREFLIGHT_REQUIRED',
            message: `Fail-Closed: Blue tool "${tool.name ?? 'unknown'}" requires a valid preflightId.`,
          },
        });
        return;
      }

      if (consumedRegistry.has(preflightId)) {
        auditLogWithSIEM('PREFLIGHT_REPLAY_BLOCKED', {
          reason: 'Replay attack: preflightId has already been consumed',
          preflightId,
          toolName: tool.name ?? 'unknown',
          ip: req.ip,
        });
        res.status(403).json({
          error: {
            code: 'PREFLIGHT_ALREADY_USED',
            message: 'Fail-Closed: this preflightId has already been used. Replay attacks are blocked.',
          },
        });
        return;
      }

      const expiry = preflightRegistry.get(preflightId);
      if (!expiry || Date.now() > expiry) {
        auditLogWithSIEM('PREFLIGHT_NOT_FOUND', {
          reason: 'preflightId not found or expired',
          preflightId,
          toolName: tool.name ?? 'unknown',
          ip: req.ip,
        });
        res.status(403).json({
          error: {
            code: 'PREFLIGHT_NOT_FOUND',
            message: 'Fail-Closed: preflightId is not registered or has expired. Request denied.',
          },
        });
        return;
      }

      preflightRegistry.delete(preflightId);
      consumedRegistry.set(preflightId, Date.now() + CONSUMED_TTL_MS);
    }

    next();
  } catch (error: unknown) {
    auditLogWithSIEM('PREFLIGHT_VALIDATION_ERROR', {
      reason: error instanceof Error ? error.message : 'Unknown preflight error',
      ip: req.ip,
    });
    res.status(403).json({
      error: {
        code: 'PREFLIGHT_VALIDATION_ERROR',
        message: 'Preflight validation failed. Request denied (Fail-Closed).',
      },
    });
  }
};
