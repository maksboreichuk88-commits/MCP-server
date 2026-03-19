/**
 * SSE Handler — Server-Sent Events transport for MCP server-to-client communication.
 * Implements JSON smuggling protection via strict content-type enforcement
 * and connection-level isolation.
 */
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

interface SSEClient {
  id: string;
  response: Response;
  connectedAt: string;
}

export class SSEHandler {
  private readonly clients = new Map<string, SSEClient>();
  private readonly MAX_CLIENTS = 100; // OOM protection

  public handleConnection(req: Request, res: Response): void {
    // OOM protection: reject if too many concurrent SSE clients
    if (this.clients.size >= this.MAX_CLIENTS) {
      res.status(503).json({
        jsonrpc: "2.0", id: null,
        error: { code: -32000, message: "Too many concurrent connections." }
      });
      return;
    }

    const clientId = randomUUID();

    // Strict SSE headers — no content-type negotiation (anti-smuggling)
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    });

    this.clients.set(clientId, {
      id: clientId,
      response: res,
      connectedAt: new Date().toISOString(),
    });

    // Push the POST endpoint URI to the client as per MCP SSE specification
    res.write(`event: endpoint\ndata: /messages?clientId=${clientId}\n\n`);

    req.on("close", () => {
      this.clients.delete(clientId);
    });
  }

  public sendToClient(clientId: string, message: Record<string, unknown>): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Strict JSON serialization — no raw string passthrough (anti-smuggling)
    const serialized = JSON.stringify(message);
    client.response.write(`event: message\ndata: ${serialized}\n\n`);
    return true;
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}
