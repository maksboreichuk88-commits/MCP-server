import { describe, expect, it } from '@jest/globals';
import { sanitizeResponse } from '../src/proxy/shadow-leak-sanitizer.js';

describe('shadow leak sanitizer', () => {
  it('redacts explicit secret assignments in plain-text output', () => {
    const sanitized = sanitizeResponse('OPENAI_API_KEY=sk-test-1234567890');

    expect(sanitized).toBe('OPENAI_API_KEY=[REDACTED]');
  });

  it('redacts bearer authorization headers in plain-text output', () => {
    const sanitized = sanitizeResponse('Authorization: Bearer super-secret-token-123');

    expect(sanitized).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts quoted JSON-style secret assignments inside strings', () => {
    const sanitized = sanitizeResponse('{"access_token":"abc-123-secret","safe":"ok"}');

    expect(sanitized).toBe('{"access_token":"[REDACTED]","safe":"ok"}');
  });

  it('keeps non-secret config metadata unchanged', () => {
    const sanitized = sanitizeResponse('PASSWORD_MIN_LENGTH=12');

    expect(sanitized).toBe('PASSWORD_MIN_LENGTH=12');
  });

  it('keeps ordinary prose about tokens unchanged', () => {
    const sanitized = sanitizeResponse('The token bucket rate limiter refills every second.');

    expect(sanitized).toBe('The token bucket rate limiter refills every second.');
  });

  it('keeps large harmless blobs unchanged', () => {
    const payload = 'x'.repeat(1024 * 1024);

    expect(sanitizeResponse(payload)).toBe(payload);
  });

  it('handles cyclic objects without recursive crashes', () => {
    const payload: Record<string, unknown> = { safe: 'ok' };
    payload['self'] = payload;

    const sanitized = sanitizeResponse(payload) as Record<string, unknown>;

    expect(sanitized['safe']).toBe('ok');
    expect(sanitized['self']).toBe('[CIRCULAR]');
  });

  it('truncates overly large secret-bearing strings before regex processing', () => {
    const payload = `OPENAI_API_KEY=${'x'.repeat(1024 * 1024 + 32)}`;
    const sanitized = sanitizeResponse(payload);

    expect(sanitized.startsWith('OPENAI_API_KEY=[REDACTED]')).toBe(true);
    expect(sanitized.length).toBeLessThan(payload.length);
  });
});
