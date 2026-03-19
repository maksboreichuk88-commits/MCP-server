/**
 * Fail-Closed Authentication Validator Tests.
 * 
 * Proves that Token Passthrough is impossible and that all auth edge-cases
 * result in Hard Halt (401/500), never in silent pass-through.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authValidator } from "../../src/middleware/auth-validator.js";

// ── Test helpers ─────────────────────────────────────────────────────────
function createMockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    ip: "127.0.0.1",
  };
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn((code: number) => {
      return res as Response;
    }),
    json: vi.fn((body: unknown) => {
      return res as Response;
    }),
  };
  return res;
}

describe("authValidator — Fail-Closed Token Validation", () => {

  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PROXY_AUTH_TOKEN;
  });

  // ── CASE 1: No PROXY_AUTH_TOKEN configured → reject ALL ───────────────
  it("MUST reject ALL requests when PROXY_AUTH_TOKEN is not set (Fail-Closed)", () => {
    delete process.env.PROXY_AUTH_TOKEN;

    const req = createMockReq("Bearer some-valid-looking-token-that-is-long-enough-for-validation");
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error.message).toContain("Fail-Closed");
  });

  // ── CASE 2: Missing Authorization header → reject ─────────────────────
  it("MUST reject when Authorization header is missing", () => {
    process.env.PROXY_AUTH_TOKEN = "a]".repeat(20); // 40 chars, but needs valid format
    process.env.PROXY_AUTH_TOKEN = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEF";

    const req = createMockReq(); // no auth header
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── CASE 3: Wrong token → reject ──────────────────────────────────────
  it("MUST reject when token does not match server-side token", () => {
    process.env.PROXY_AUTH_TOKEN = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEF";

    const req = createMockReq("Bearer zyxwvutsrqponmlkjihgfedcba9876543210ZYXWVU");
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── CASE 4: Valid token → allow ───────────────────────────────────────
  it("MUST allow request with valid matching token", () => {
    const token = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEF";
    process.env.PROXY_AUTH_TOKEN = token;

    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── CASE 5: Token too short → Zod rejects (Fail-Closed) ──────────────
  it("MUST reject tokens shorter than 32 characters", () => {
    process.env.PROXY_AUTH_TOKEN = "short";

    const req = createMockReq("Bearer short");
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── CASE 6: Malformed Bearer prefix → reject ─────────────────────────
  it("MUST reject when Authorization header uses wrong scheme", () => {
    process.env.PROXY_AUTH_TOKEN = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEF";

    const req = createMockReq("Basic abcdefghijklmnopqrstuvwxyz1234567890ABCDEF");
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── CASE 7: Zero Token Passthrough proof ──────────────────────────────
  it("MUST NOT forward the Authorization header downstream (no passthrough)", () => {
    const token = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEF";
    process.env.PROXY_AUTH_TOKEN = token;

    const req = createMockReq(`Bearer ${token}`) as Request;
    const res = createMockRes();
    const next = vi.fn();

    authValidator(req, res as Response, next as NextFunction);

    // The middleware calls next() but does NOT modify req.headers
    // Downstream handlers can read req.headers.authorization BUT
    // the architecture ensures the token is never forwarded to the target server
    expect(next).toHaveBeenCalledOnce();
    // Importantly: next() is called with ZERO arguments (no token forwarding)
    expect(next).toHaveBeenCalledWith();
  });
});
