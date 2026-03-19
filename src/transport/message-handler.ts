/**
 * HTTP POST Message Handler — receives client-to-server JSON-RPC messages.
 * Implements strict Zod validation of the JSON-RPC envelope before processing.
 * Fail-Closed: any parse error = reject with structured error response.
 */
import type { Request, Response } from "express";
import type { SSEHandler } from "./sse-handler.js";
import { JsonRpcRequestSchema } from "./schemas.js";
import { appendAuditLog } from "../audit/logger.js";

export class MessageHandler {
  private readonly sse: SSEHandler;

  constructor(sse: SSEHandler) {
    this.sse = sse;
  }

  public handleClientMessage(req: Request, res: Response): void {
    const clientId = req.query.clientId as string;

    if (!clientId || typeof clientId !== "string") {
      res.status(400).json({
        jsonrpc: "2.0", id: null,
        error: { code: -32600, message: "Missing or invalid clientId query parameter." }
      });
      return;
    }

    // ── Strict JSON-RPC 2.0 Envelope Validation (Fail-Closed) ──
    const parseResult = JsonRpcRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const detail = parseResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");

      appendAuditLog({
        timestamp: new Date().toISOString(),
        eventType: "SCHEMA_VIOLATION",
        severity: "MEDIUM",
        clientId,
        detail: `JSON-RPC envelope validation failed: ${detail}`,
      });

      res.status(400).json({
        jsonrpc: "2.0", id: null,
        error: { code: -32600, message: `Invalid JSON-RPC request: ${detail}` }
      });
      return;
    }

    const validatedRequest = parseResult.data;

    console.log(`[MCP-POST] ✅ Valid request from ${clientId}: method=${validatedRequest.method}, id=${validatedRequest.id}`);

    // Acknowledge receipt — response will be streamed back via SSE
    res.status(202).json({ status: "accepted", id: validatedRequest.id });

    // Stub: echo back over SSE for architectural demonstration
    this.sse.sendToClient(clientId, {
      jsonrpc: "2.0",
      id: validatedRequest.id,
      result: { content: [{ type: "text", text: `Processed method: ${validatedRequest.method}` }] }
    });
  }
}
