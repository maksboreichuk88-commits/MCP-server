import type { Middleware, MiddlewareContext } from "./pipeline.js";
import { logger } from "../logger.js";

interface LicenseCache {
  isValid: boolean;
  expiresAt: number;
}

let memoryCache: LicenseCache | null = null;

const TTL_VALID_MS = 12 * 60 * 60 * 1000; // 12 часов
const TTL_INVALID_MS = 60 * 1000; // 1 минута
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 часа Grace Period при недоступности API

export function createLicenseVerifier(
  licenseKey?: string,
  expectedProductId?: string
): Middleware {
  return async function licenseVerifier(ctx: MiddlewareContext, next: () => Promise<void>) {
    if (!licenseKey || !expectedProductId) {
      // Ключ не задан - если это Enterprise-версия, запрещаем запросы.
      // (или можно пропускать, если хотим сделать Enterprise опциональным - но по ТЗ это жесткий блок при отсутствии)
      logger.error("[LicenseVerifier] ENTERPRISE_LICENSE_KEY or ENTERPRISE_PRODUCT_ID not provided.");
      ctx.blocked = true;
      ctx.blockReason = "Missing Enterprise License Key or Product ID";
      throw new Error(`[LicenseVerifier] ${ctx.blockReason}`);
    }

    const now = Date.now();

    // Быстрый ответ из кэша (если он еще свежий)
    if (memoryCache && now < memoryCache.expiresAt) {
      if (!memoryCache.isValid) {
        ctx.blocked = true;
        ctx.blockReason = "Invalid Enterprise License Key";
        throw new Error(`[LicenseVerifier] ${ctx.blockReason}`);
      }
      return await next();
    }

    let validationFailed = false;
    let apiError = false;

    // Выполнение сетевого запроса к Lemon Squeezy
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 секунды таймаут

      const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ license_key: licenseKey }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Ошибка 5xx или 4xx расценивается как ошибка API
        logger.warn(`[LicenseVerifier] API responded with status ${response.status}`);
        if (response.status >= 500) {
            apiError = true;
        } else {
            validationFailed = true;
        }
      } else {
        const body = await response.json() as any;
        
        const isValid = body.valid === true;
        const productIdMatch = String(body.meta?.product_id) === String(expectedProductId);

        if (!isValid || !productIdMatch) {
            logger.warn(`[LicenseVerifier] Key invalid or product ID mismatch (expected: ${expectedProductId}, got: ${body.meta?.product_id})`);
            validationFailed = true;
        } else {
            // Ключ полностью валиден
            memoryCache = {
                isValid: true,
                expiresAt: now + TTL_VALID_MS
            };
            logger.info("[LicenseVerifier] Enterprise license key verified successfully.");
        }
      }
    } catch (err: unknown) {
      let isTimeout = false;
      if (err instanceof Error) {
         if (err.name === "AbortError" || err.message.includes("fetch failed")) {
             isTimeout = true;
         }
      }
      logger.error("[LicenseVerifier] Network error during validation:", err);
      console.error("FETCH ERROR:", err);
      apiError = true; // Сетевая ошибка (таймаут, DNS и т.д.)
    }

    // Обработка Grace Period
    if (apiError && !validationFailed) {
      if (memoryCache && memoryCache.isValid) {
        // Ранее был валидный, но время истекло. Продлеваем до 24ч (от оригинального времени expiration)
        const graceLimit = memoryCache.expiresAt - TTL_VALID_MS + TTL_VALID_MS + GRACE_PERIOD_MS;
        if (now < graceLimit) {
            logger.warn("[LicenseVerifier] Validation API unavailable. Using Grace Period cache.");
            // Не обновляем expiresAt, чтобы продолжать долбить API при каждом запросе, но пускать трафик
            return await next();
        } else {
            validationFailed = true;
            logger.error("[LicenseVerifier] Grace Period expired. Blocking requests.");
        }
      } else {
        // Hard fail-closed при первом запуске
        validationFailed = true;
        logger.error("[LicenseVerifier] Validation API unavailable and no prior valid cache. Hard fail-closed.");
      }
    }

    if (validationFailed) {
      memoryCache = {
          isValid: false,
          expiresAt: now + TTL_INVALID_MS
      };
      
      ctx.blocked = true;
      ctx.blockReason = "Invalid Enterprise License Key";
      throw new Error(`[LicenseVerifier] ${ctx.blockReason}`);
    }

    await next();
  };
}

// Экспорт для возможности сброса в тестах
export function _resetCache() {
    memoryCache = null;
}
