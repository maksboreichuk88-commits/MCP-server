/**
 * MCP Proxy Server — Entry Point.
 * 
 * Assembles the Fail-Closed security pipeline:
 * 1. Auth Validator (Fail-Closed, no Token Passthrough)
 * 2. JSON Body Parser with 256KB limit
 * 3. mcpColorBoundary (Cross-Tool Hijack detection)
 * 4. HTTP/SSE Transport Handlers
 */
import express from "express";
import cors from "cors";
import { authValidator } from "./middleware/auth-validator.js";
import { mcpColorBoundary } from "./middleware/color-boundary.js";
import { SSEHandler } from "./transport/sse-handler.js";
import { MessageHandler } from "./transport/message-handler.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ── Global middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "256kb" })); // Hard limit against oversized payloads

// ── Security Pipeline ────────────────────────────────────────────────────
// SSE endpoint is exempt from auth (it establishes the connection)
const sseHandler = new SSEHandler();
const messageHandler = new MessageHandler(sseHandler);

app.get("/sse", (req, res) => {
  sseHandler.handleConnection(req, res);
});

// All POST /messages go through the full security pipeline:
// Auth → Color Boundary → Message Handler
app.post("/messages",
  authValidator,
  mcpColorBoundary,
  (req, res) => {
    messageHandler.handleClientMessage(req, res);
  }
);

// Health check (unauthenticated)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", clients: sseHandler.getClientCount() });
});

app.listen(PORT, () => {
  console.log(`🛡️  MCP Secure Proxy (Fail-Closed) running on http://localhost:${PORT}`);
  console.log(`   SSE Endpoint: GET /sse`);
  console.log(`   Message Endpoint: POST /messages`);
  console.log(`   Health: GET /health`);
});

export { app };
