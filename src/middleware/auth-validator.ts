/**
 * Fail-Closed Authentication Token Validator.
 * 
 * Implements the Zero Trust paradigm from security-constitution.md:
 * - Missing token → Hard Halt (401)
 * - Invalid format → Hard Halt (401)
 * - Token Passthrough is PROHIBITED: we never forward unvalidated tokens.
 * 
 * The token is validated against PROXY_AUTH_TOKEN env variable.
 * If PROXY_AUTH_TOKEN is not set, ALL requests are rejected (Fail-Closed).
 */
import type { Request, Response, NextFunction } from "express";
import { appendAuditLog } from "../audit/logger.js";
import { AuthenticationFailure } from "../errors.js";
import { AuthTokenSchema } from "../transport/schemas.js";
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  return timingSafeEqual(bufA, bufB);
}

export function authValidator(req: Request, res: Response, next: NextFunction): void {
  try {
    const expectedToken = process.env.PROXY_AUTH_TOKEN;

    // Fail-Closed: if no server-side token is configured, reject everything.
    if (!expectedToken || expectedToken.length === 0) {
      const err = new AuthenticationFailure("Server has no PROXY_AUTH_TOKEN configured. Fail-Closed enforced.");
      appendAuditLog({
        timestamp: new Date().toISOString(),
        eventType: "AUTH_FAILURE",
        severity: "CRITICAL",
        clientId: req.ip || "unknown",
        detail: err.message,
      });
      res.status(401).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: err.message },
      });
      return;
    }

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const err = new AuthenticationFailure("Missing or malformed Authorization header. Expected: Bearer <token>");
      appendAuditLog({
        timestamp: new Date().toISOString(),
        eventType: "AUTH_FAILURE",
        severity: "HIGH",
        clientId: req.ip || "unknown",
        detail: err.message,
      });
      res.status(401).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: err.message },
      });
      return;
    }

    const clientToken = authHeader.slice(7); // strip "Bearer "

    // Validate token format with Zod (Fail-Closed on parse error)
    const parseResult = AuthTokenSchema.safeParse(clientToken);
    if (!parseResult.success) {
      const detail = parseResult.error.issues.map(i => i.message).join("; ");
      const err = new AuthenticationFailure(`Token format violation: ${detail}`);
      appendAuditLog({
        timestamp: new Date().toISOString(),
        eventType: "AUTH_FAILURE",
        severity: "HIGH",
        clientId: req.ip || "unknown",
        detail: err.message,
      });
      res.status(401).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: err.message },
      });
      return;
    }

    // Constant-time comparison against expected token
    if (!safeCompare(clientToken, expectedToken)) {
      const err = new AuthenticationFailure("Invalid token. Access denied.");
      appendAuditLog({
        timestamp: new Date().toISOString(),
        eventType: "AUTH_FAILURE",
        severity: "CRITICAL",
        clientId: req.ip || "unknown",
        detail: err.message,
      });
      res.status(401).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: err.message },
      });
      return;
    }

    // Token is valid — proceed. Token is NOT forwarded downstream (no passthrough).
    next();
  } catch (err) {
    // Fail-Closed: any exception in auth = reject
    appendAuditLog({
      timestamp: new Date().toISOString(),
      eventType: "AUTH_FAILURE",
      severity: "CRITICAL",
      clientId: req.ip || "unknown",
      detail: `Auth validator internal error: ${String(err)}`,
    });
    res.status(500).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: "Internal Auth Error (Fail-Closed). Request terminated." },
    });
  }
}
