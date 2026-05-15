import { afterEach, describe, expect, it } from '@jest/globals';
import {
  checkRateLimit,
  clearRateLimitState,
  resolveRateLimitConfig,
} from '../src/middleware/rate-limiter.js';
import { getBlockedRequestMetrics, resetBlockedRequestMetrics } from '../src/utils/auditLogger.js';

describe('rate limiter', () => {
  afterEach(() => {
    clearRateLimitState();
    resetBlockedRequestMetrics();
  });

  it('isolates limits per target/tool and records rate-limit audit events', () => {
    const config = { windowMs: 60000, maxRequests: 1 };

    const first = checkRateLimit({
      transport: 'http',
      identity: 'client-a',
      targetId: 'target-a',
      toolName: 'search_files',
      path: '/mcp',
    }, config);

    const blocked = checkRateLimit({
      transport: 'http',
      identity: 'client-a',
      targetId: 'target-a',
      toolName: 'search_files',
      path: '/mcp',
    }, config);

    const otherTool = checkRateLimit({
      transport: 'http',
      identity: 'client-a',
      targetId: 'target-a',
      toolName: 'read_file',
      path: '/mcp',
    }, config);

    const otherTarget = checkRateLimit({
      transport: 'http',
      identity: 'client-a',
      targetId: 'target-b',
      toolName: 'search_files',
      path: '/mcp',
    }, config);

    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(otherTool.allowed).toBe(true);
    expect(otherTarget.allowed).toBe(true);

    const metrics = getBlockedRequestMetrics();
    expect(metrics.byCode).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED', count: 1 }),
      ]),
    );
    expect(metrics.recent[0]).toEqual(
      expect.objectContaining({
        code: 'RATE_LIMIT_EXCEEDED',
        tool: 'search_files',
        path: '/mcp',
      }),
    );
  });

  it('resolves a 50 requests per minute default limit', () => {
    expect(resolveRateLimitConfig({})).toEqual({
      windowMs: 60000,
      maxRequests: 50,
    });
  });

  it('bounds the in-memory key store by evicting the oldest key', () => {
    const config = {
      windowMs: 60000,
      maxRequests: 1,
      maxKeys: 2,
      cleanupIntervalMs: 60000,
      maxKeyLength: 128,
    };

    expect(checkRateLimit({ key: 'client-a', transport: 'http' }, config).allowed).toBe(true);
    expect(checkRateLimit({ key: 'client-b', transport: 'http' }, config).allowed).toBe(true);
    expect(checkRateLimit({ key: 'client-c', transport: 'http' }, config).allowed).toBe(true);

    const clientAAfterEviction = checkRateLimit({ key: 'client-a', transport: 'http' }, config);

    expect(clientAAfterEviction.allowed).toBe(true);
    expect(clientAAfterEviction.count).toBe(1);
  });
});
