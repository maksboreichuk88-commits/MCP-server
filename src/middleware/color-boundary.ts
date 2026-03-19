/**
 * mcpColorBoundary — MCP Colors Semantic Isolation Middleware.
 * 
 * Implements the deterministic check from security-constitution.md:
 * If RED (untrusted external) and BLUE (critical system) tools are
 * requested simultaneously, the request is Hard Halted with HTTP 403
 * and the event is written to the immutable audit log.
 * 
 * This is the primary defense against Cross-Tool Hijacking attacks.
 */
import type { Request, Response, NextFunction } from "express";
import { appendAuditLog } from "../audit/logger.js";
import { CrossToolHijackAttempt } from "../errors.js";
import type { ToolColor } from "../transport/schemas.js";

interface ToolEntry {
  name: string;
  _meta?: {
    color?: ToolColor;
  };
}

/**
 * Extracts tool entries from the request body.
 * Supports both single-tool calls (tools/call) and batch tool lists.
 */
function extractToolEntries(body: Record<string, unknown>): ToolEntry[] {
  const tools: ToolEntry[] = [];

  // Case 1: Single tool call with _meta.color
  if (typeof body.name === "string" && body._meta && typeof body._meta === "object") {
    tools.push(body as unknown as ToolEntry);
  }

  // Case 2: params contains tool info
  if (body.params && typeof body.params === "object") {
    const params = body.params as Record<string, unknown>;
    if (typeof params.name === "string" && params._meta && typeof params._meta === "object") {
      tools.push(params as unknown as ToolEntry);
    }
    // Case 3: Array of tools in params.tools
    if (Array.isArray(params.tools)) {
      for (const t of params.tools) {
        if (t && typeof t === "object" && typeof (t as Record<string, unknown>).name === "string") {
          tools.push(t as ToolEntry);
        }
      }
    }
  }

  // Case 4: Top-level tools array
  if (Array.isArray(body.tools)) {
    for (const t of body.tools) {
      if (t && typeof t === "object" && typeof (t as Record<string, unknown>).name === "string") {
        tools.push(t as ToolEntry);
      }
    }
  }

  return tools;
}

/**
 * Express middleware: mcpColorBoundary
 */
export function mcpColorBoundary(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== "object") {
      return next();
    }

    const tools = extractToolEntries(body);
    if (tools.length === 0) {
      return next();
    }

    const redTools: string[] = [];
    const blueTools: string[] = [];

    for (const tool of tools) {
      const color = tool._meta?.color;
      if (color === "red") redTools.push(tool.name);
      if (color === "blue") blueTools.push(tool.name);
    }

    // ── HARD HALT: Simultaneous Red + Blue = Cross-Tool Hijacking ──
    if (redTools.length > 0 && blueTools.length > 0) {
      const error = new CrossToolHijackAttempt(redTools, blueTools);

      appendAuditLog({
        timestamp: new Date().toISOString(),
        eventType: "CROSS_TOOL_HIJACK",
        severity: "CRITICAL",
        clientId: (req.query.clientId as string) || req.ip || "unknown",
        detail: error.message,
        requestId: (body.id as string | number) ?? undefined,
      });

      res.status(403).json({
        jsonrpc: "2.0",
        id: (body.id as string | number) ?? null,
        error: {
          code: -32001,
          message: error.message,
        },
      });
      return;
    }

    next();
  } catch (err) {
    // Fail-Closed: any error in color boundary analysis = block
    appendAuditLog({
      timestamp: new Date().toISOString(),
      eventType: "CROSS_TOOL_HIJACK",
      severity: "HIGH",
      clientId: (req.query?.clientId as string) || "unknown",
      detail: `Color boundary middleware internal error: ${String(err)}`,
    });

    res.status(500).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal Security Error (Fail-Closed). Request terminated.",
      },
    });
  }
}
