/**
 * Cross-Tool Hijack Attack Simulation Tests.
 * 
 * These tests mathematically prove that the mcpColorBoundary middleware
 * enforces a Hard Halt (HTTP 403) whenever RED and BLUE tools are
 * requested simultaneously — the core defense against Cross-Tool Hijacking.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { mcpColorBoundary } from "../../src/middleware/color-boundary";

// ── Test helpers ─────────────────────────────────────────────────────────
function createMockReq(body: Record<string, unknown>, query: Record<string, string> = {}): Partial<Request> {
  return {
    body,
    query,
    ip: "127.0.0.1",
  };
}

function createMockRes(): { res: Partial<Response>; statusCode: number; responseBody: unknown } {
  const state = { statusCode: 0, responseBody: null as unknown };
  const res: Partial<Response> = {
    status: vi.fn((code: number) => {
      state.statusCode = code;
      return res as Response;
    }),
    json: vi.fn((body: unknown) => {
      state.responseBody = body;
      return res as Response;
    }),
  };
  return { res, ...state };
}

// ── Test Suite ───────────────────────────────────────────────────────────
describe("mcpColorBoundary — Cross-Tool Hijack Detection", () => {

  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  // ── CASE 1: RED + BLUE → Hard Halt (403) ──────────────────────────────
  it("MUST return 403 when RED and BLUE tools are requested simultaneously", () => {
    const req = createMockReq({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        tools: [
          { name: "read_email", _meta: { color: "red" } },
          { name: "modify_database", _meta: { color: "blue" } },
        ],
      },
    });

    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    // PROOF: next() was never called → pipeline was halted
    expect(next).not.toHaveBeenCalled();

    // PROOF: HTTP 403 was returned
    expect(res.status).toHaveBeenCalledWith(403);

    // PROOF: error message contains CrossToolHijackAttempt
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error.message).toContain("Cross-Tool Hijack Attempt detected");
    expect(body.error.message).toContain("read_email");
    expect(body.error.message).toContain("modify_database");

    // PROOF: audit log was written
    expect(stderrSpy).toHaveBeenCalled();
    const auditOutput = (stderrSpy.mock.calls[0][0] as string);
    expect(auditOutput).toContain("CROSS_TOOL_HIJACK");
  });

  // ── CASE 2: Multiple RED + Multiple BLUE → Hard Halt ──────────────────
  it("MUST halt when multiple RED and multiple BLUE tools are mixed", () => {
    const req = createMockReq({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        tools: [
          { name: "parse_website", _meta: { color: "red" } },
          { name: "read_untrusted_doc", _meta: { color: "red" } },
          { name: "update_iam_policy", _meta: { color: "blue" } },
          { name: "delete_user", _meta: { color: "blue" } },
        ],
      },
    });

    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ── CASE 3: Only RED → PASS ───────────────────────────────────────────
  it("MUST allow request with only RED tools (no BLUE conflict)", () => {
    const req = createMockReq({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        tools: [
          { name: "read_email", _meta: { color: "red" } },
          { name: "parse_website", _meta: { color: "red" } },
        ],
      },
    });

    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── CASE 4: Only BLUE → PASS ──────────────────────────────────────────
  it("MUST allow request with only BLUE tools (no RED conflict)", () => {
    const req = createMockReq({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        tools: [
          { name: "modify_database", _meta: { color: "blue" } },
        ],
      },
    });

    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── CASE 5: GREEN tools → always safe ─────────────────────────────────
  it("MUST allow GREEN tools mixed with RED or BLUE without conflict", () => {
    const req = createMockReq({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        tools: [
          { name: "list_files", _meta: { color: "green" } },
          { name: "read_email", _meta: { color: "red" } },
        ],
      },
    });

    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
  });

  // ── CASE 6: Empty body → PASS (no tools to check) ────────────────────
  it("MUST pass through requests with no tool data", () => {
    const req = createMockReq({});
    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
  });

  // ── CASE 7: Single tool with color in params (flat format) ────────────
  it("MUST detect RED+BLUE even in flat params format with top-level tools array", () => {
    const req = createMockReq({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      tools: [
        { name: "fetch_url", _meta: { color: "red" } },
        { name: "write_config", _meta: { color: "blue" } },
      ],
    });

    const { res } = createMockRes();
    const next = vi.fn();

    mcpColorBoundary(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
