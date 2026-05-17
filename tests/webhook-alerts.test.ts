import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  auditLog,
  closeSecurityLogStore,
  resetBlockedRequestMetrics,
} from '../src/utils/auditLogger.js';

const mutableGlobal = globalThis as typeof globalThis & { fetch?: typeof fetch };
const originalFetch = mutableGlobal.fetch;

const flushWebhookDispatch = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
};

const installFetchMock = (mockFetch: jest.Mock): void => {
  mutableGlobal.fetch = mockFetch as unknown as typeof fetch;
};

describe('webhook audit alerts', () => {
  afterEach(() => {
    delete process.env.MCP_WEBHOOK_URL;
    resetBlockedRequestMetrics();
    closeSecurityLogStore();
    jest.clearAllMocks();

    if (originalFetch) {
      mutableGlobal.fetch = originalFetch;
    } else {
      delete mutableGlobal.fetch;
    }
  });

  it('fires webhooks on blocked security requests', async () => {
    process.env.MCP_WEBHOOK_URL = 'https://hooks.example/security-alerts';
    const mockFetch = jest.fn(async () => new Response(null, { status: 204 }));
    installFetchMock(mockFetch);

    auditLog('HARD_HALT', {
      code: 'SHADOWLEAK_DETECTED',
      reason: 'ShadowLeak exfiltration pattern detected',
      toolName: 'fetch_url',
      snippet: 'https://evil.example/exfil?a=x&b=y&c=z',
    });

    await flushWebhookDispatch();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://hooks.example/security-alerts');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      event: 'HARD_HALT',
      code: 'SHADOWLEAK_DETECTED',
      toolName: 'fetch_url',
      snippet: 'https://evil.example/exfil?a=x&b=y&c=z',
    }));
  });

  it('does not fire webhooks on allowed audit events', async () => {
    process.env.MCP_WEBHOOK_URL = 'https://hooks.example/security-alerts';
    const mockFetch = jest.fn(async () => new Response(null, { status: 204 }));
    installFetchMock(mockFetch);

    auditLog('CACHE_HIT', {
      method: 'tools/call',
      toolName: 'read_file',
    });

    await flushWebhookDispatch();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not crash when webhook delivery fails', async () => {
    process.env.MCP_WEBHOOK_URL = 'https://hooks.example/security-alerts';
    const mockFetch = jest.fn(async () => {
      throw new Error('network down');
    });
    installFetchMock(mockFetch);

    expect(() => {
      auditLog('RATE_LIMIT_EXCEEDED', {
        code: 'RATE_LIMIT_EXCEEDED',
        reason: 'Fail-Closed: too many requests for this target/tool.',
        toolName: 'search_files',
        snippet: '{"query":"secret"}',
      });
    }).not.toThrow();

    await flushWebhookDispatch();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
