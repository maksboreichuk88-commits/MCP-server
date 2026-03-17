import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLicenseVerifier, _resetCache } from "../license-verifier.js";
import { MiddlewareContext } from "../pipeline.js";

const VALID_KEY = "test-valid-key";
const VALID_PRODUCT_ID = "12345";
const INVALID_KEY = "test-invalid-key";

// Создаем стаб для глобального fetch
const fetchStub = vi.fn();
global.fetch = fetchStub as any;

const nextFn = vi.fn().mockResolvedValue(undefined);

describe("Enterprise License Verifier", () => {
  beforeEach(() => {
    _resetCache();
    fetchStub.mockReset();
    nextFn.mockReset();
    nextFn.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const createCtx = (): MiddlewareContext => ({
    rawMessage: "{}",
    message: { jsonrpc: "2.0", id: 1, method: "test" },
    serverId: "test-server"
  });

  const nextFn = vi.fn().mockResolvedValue(undefined);

  it("should fail-closed if config is missing", async () => {
    const middleware = createLicenseVerifier();
    const ctx = createCtx();

    await expect(middleware(ctx, nextFn)).rejects.toThrow("Missing Enterprise License Key");
    expect(ctx.blocked).toBe(true);
    expect(nextFn).not.toHaveBeenCalled();
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("should validate successfully and cache valid response", async () => {
    fetchStub.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        meta: { product_id: VALID_PRODUCT_ID }
      })
    });

    const middleware = createLicenseVerifier(VALID_KEY, VALID_PRODUCT_ID);
    const ctx1 = createCtx();

    await middleware(ctx1, nextFn);
    
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(ctx1.blocked).toBeFalsy();

    // Второй вызов: берется из кэша
    const ctx2 = createCtx();
    await middleware(ctx2, nextFn);

    expect(fetchStub).toHaveBeenCalledTimes(1); // Запрос к API не делался
    expect(nextFn).toHaveBeenCalledTimes(2);
  });

  it("should fail-closed on API invalid response", async () => {
    fetchStub.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: false
      })
    });

    const middleware = createLicenseVerifier(INVALID_KEY, VALID_PRODUCT_ID);
    const ctx = createCtx();

    await expect(middleware(ctx, nextFn)).rejects.toThrow("Invalid Enterprise License Key");
    expect(ctx.blocked).toBe(true);
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should fail-closed if productId mismatches", async () => {
    fetchStub.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        meta: { product_id: "wrong-product-id" }
      })
    });

    const middleware = createLicenseVerifier(VALID_KEY, VALID_PRODUCT_ID);
    const ctx = createCtx();

    await expect(middleware(ctx, nextFn)).rejects.toThrow("Invalid Enterprise License Key");
    expect(ctx.blocked).toBe(true);
  });

  it("should allow grace period if API is down but cache was valid", async () => {
    // 1. Успешный первый вызов
    fetchStub.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        meta: { product_id: VALID_PRODUCT_ID }
      })
    });

    const middleware = createLicenseVerifier(VALID_KEY, VALID_PRODUCT_ID);
    const ctx1 = createCtx();
    await middleware(ctx1, nextFn);

    // Ускоряем время за пределы TTL (12 часов)
    vi.advanceTimersByTime(13 * 60 * 60 * 1000);

    // 2. Второе обращение, но API упал
    fetchStub.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const ctx2 = createCtx();
    await middleware(ctx2, nextFn);

    // Должен был быть вызов к API
    expect(fetchStub).toHaveBeenCalledTimes(2);
    // Но мы пропустили запрос дальше из-за Grace Period
    expect(nextFn).toHaveBeenCalledTimes(2);
    expect(ctx2.blocked).toBeFalsy();
  });
});
