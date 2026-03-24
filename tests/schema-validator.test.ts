import { jest, describe, it, expect } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSchemaValidator } from '../src/middleware/schema-validator.js';

function createMockReq(body: Record<string, unknown>): Partial<Request> {
  return {
    body,
    ip: '127.0.0.1',
    path: '/mcp',
  };
}

function createMockRes(): { res: Partial<Response>; statusCode: number; responseBody: unknown } {
  const state = { statusCode: 0, responseBody: null as unknown };
  const res: Partial<Response> = {
    status: jest.fn((code: number) => {
      state.statusCode = code;
      return res as Response;
    }),
    json: jest.fn((body: unknown) => {
      state.responseBody = body;
      return res as Response;
    }),
  };
  return { res, ...state };
}

describe('schema-validator (Progressive Disclosure)', () => {
  const registry = {
    'read_file': z.object({
      path: z.string().max(100),
    }).strict(),
  };

  const validator = createSchemaValidator(registry);

  it('allows valid arguments for a registered tool', () => {
    const req = createMockReq({
      method: 'tools/call',
      params: { name: 'read_file', arguments: { path: '/etc/config' } },
    });
    const { res } = createMockRes();
    const next = jest.fn();

    validator(req as Request, res as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks invalid arguments (wrong type) for a registered tool (Fail-Closed)', () => {
    const req = createMockReq({
      method: 'tools/call',
      params: { name: 'read_file', arguments: { path: 123 } }, // path should be string
    });
    const { res } = createMockRes();
    const next = jest.fn();

    validator(req as Request, res as Response, next as NextFunction);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks prompt injection (unexpected extra fields) via .strict()', () => {
    const req = createMockReq({
      method: 'tools/call',
      params: { name: 'read_file', arguments: { path: '/etc/config', ignore_previous_instructions: true } },
    });
    const { res } = createMockRes();
    const next = jest.fn();

    validator(req as Request, res as Response, next as NextFunction);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    
    // check that the message returns specific details
    const body = (res.json as jest.Mock).mock.calls[0][0] as { error: { message: string } };
    expect(body.error.message).toContain('Fail-Closed');
  });

  it('allows passthrough for unknown tools (if progressive disclosure only protects known boundaries)', () => {
    const req = createMockReq({
      method: 'tools/call',
      params: { name: 'unknown_tool', arguments: { malicious: 'data' } },
    });
    const { res } = createMockRes();
    const next = jest.fn();

    validator(req as Request, res as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
