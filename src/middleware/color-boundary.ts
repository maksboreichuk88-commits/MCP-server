import { NextFunction, Request, Response } from 'express';

type SessionColor = 'red' | 'blue' | null;
const sessionColors = new Map<string, SessionColor>();

const extractTools = (body: Record<string, unknown>): Array<{ name: string; color: string | null }> => {
  const results: Array<{ name: string; color: string | null }> = [];

  const addTool = (name: string, meta: unknown) => {
    const metaRecord = meta as Record<string, unknown> | undefined;
    const _meta = metaRecord?._meta as Record<string, unknown> | undefined;
    const color = _meta?.color as string | undefined;
    results.push({ name, color: color ?? null });
  };

  const params = body.params as Record<string, unknown> | undefined;

  if (params?.tools && Array.isArray(params.tools)) {
    for (const t of params.tools as Array<Record<string, unknown>>) {
      addTool(String(t.name ?? ''), t);
    }
    return results;
  }

  if (params?.name) {
    const color = (params._meta as Record<string, unknown> | undefined)?.color as string | undefined;
    results.push({ name: String(params.name), color: color ?? null });
    return results;
  }

  if (body.tools && Array.isArray(body.tools)) {
    for (const t of body.tools as Array<Record<string, unknown>>) {
      addTool(String(t.name ?? ''), t);
    }
    return results;
  }

  return results;
};

export const mcpColorBoundary = (req: Request, res: Response, next: NextFunction): void => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const ip = req.ip ?? 'unknown';
  const tools = extractTools(body);

  if (tools.length === 0) {
    next();
    return;
  }

  const reds = tools.filter(t => t.color === 'red').map(t => t.name);
  const blues = tools.filter(t => t.color === 'blue').map(t => t.name);

  if (reds.length > 0 && blues.length > 0) {
    const all = [...reds, ...blues];
    process.stderr.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'CROSS_TOOL_HIJACK',
      ip,
      redTools: reds,
      blueTools: blues,
    }) + '\n');
    res.status(403).json({
      error: {
        code: 'CROSS_TOOL_HIJACK',
        message: `Cross-Tool Hijack Attempt detected: ${all.join(', ')}`,
      },
    });
    return;
  }

  const sessionColor = sessionColors.get(ip) ?? null;
  const requestColor: SessionColor = reds.length > 0 ? 'red' : blues.length > 0 ? 'blue' : null;

  if (requestColor !== null && sessionColor !== null && requestColor !== sessionColor) {
    const all = tools.map(t => t.name);
    process.stderr.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'CROSS_TOOL_HIJACK',
      ip,
      sessionColor,
      requestColor,
    }) + '\n');
    res.status(403).json({
      error: {
        code: 'CROSS_TOOL_HIJACK',
        message: `Cross-Tool Hijack Attempt detected: ${all.join(', ')}`,
      },
    });
    return;
  }

  if (requestColor !== null) {
    sessionColors.set(ip, requestColor);
  }

  next();
};

export const clearColorSessions = (): void => {
  sessionColors.clear();
};

export const colorBoundary = mcpColorBoundary;
