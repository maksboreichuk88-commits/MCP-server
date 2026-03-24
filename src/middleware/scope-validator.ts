import { Request, Response, NextFunction } from 'express';
import { auditLogWithSIEM } from '../utils/auditLogger.js';

interface ToolEntry {
  name?: string;
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

export const scopeValidator = (req: Request, res: Response, next: NextFunction): void => {
  const availableScopes = req.nhiScopes ?? [];
  const body = req.body as Record<string, unknown>;
  const tools = extractToolsFromBody(body);

  if (tools.length === 0) {
    next();
    return;
  }

  for (const tool of tools) {
    const toolName = tool.name;
    if (!toolName) continue;

    const requiredScope = `tools.${toolName}`;

    if (!availableScopes.includes(requiredScope) && !availableScopes.includes('tools.*')) {
      auditLogWithSIEM('MISSING_SCOPE', {
        reason: 'Agent attempted to call a tool without the required NHI scope',
        toolName,
        requiredScope,
        availableScopes,
        ip: req.ip,
      });

      res.status(403).json({
        error: {
          code: 'MISSING_SCOPE',
          message: `Fail-Closed: NHI token lacks the required scope '${requiredScope}' for tool '${toolName}'.`,
        },
      });
      return;
    }
  }

  next();
};
