import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auditLogWithSIEM } from '../utils/auditLogger.js';

export type ToolSchemaRegistry = Record<string, z.ZodTypeAny>;

export const createSchemaValidator = (registry: ToolSchemaRegistry) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const body = req.body as Record<string, unknown>;

      if (body.method !== 'tools/call') {
        next();
        return;
      }

      let tools: Record<string, unknown>[] = [];
      if (Array.isArray(body.tools)) {
        tools = body.tools as Record<string, unknown>[];
      } else if (body.params && typeof body.params === 'object' && Array.isArray((body.params as Record<string, unknown>).tools)) {
        tools = (body.params as Record<string, unknown>).tools as Record<string, unknown>[];
      } else if (body.params && typeof body.params === 'object' && typeof (body.params as Record<string, unknown>).name === 'string') {
        // Single tool invocation pattern
        tools = [body.params as Record<string, unknown>];
      }

      if (tools.length === 0) {
        next();
        return;
      }

      for (const tool of tools) {
        const toolName = typeof tool.name === 'string' ? tool.name : undefined;
        const toolArgs = tool.arguments || {};

        if (!toolName) {
          continue;
        }

        const schema = registry[toolName];
        if (schema) {
          // Strict validation via provided schema
          schema.parse(toolArgs);
        }
        // If schema is not registered, we pass it through (or Fail-Closed based on policy, 
        // but for progressive disclosure we only strictly validate known registered tools).
      }

      next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const message = `Progressive Disclosure Violation: Tool arguments failed strict schema validation. ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`;
        
        auditLogWithSIEM('SCHEMA_VALIDATION_FAILED', {
          reason: message,
          ip: req.ip,
          path: req.path,
        });

        res.status(403).json({
          error: {
            code: 'SCHEMA_VALIDATION_FAILED',
            message: 'Fail-Closed: Payload arguments rejected due to strict schema mismatch or prompt injection. Access Denied.',
          },
        });
        return;
      }

      auditLogWithSIEM('INTERNAL_SERVER_ERROR', {
        reason: 'Unexpected error during schema validation',
        ip: req.ip,
      });

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during Progressive Disclosure validation.',
        },
      });
    }
  };
};
