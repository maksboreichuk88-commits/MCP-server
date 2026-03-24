import { auditLog } from '../utils/auditLogger.js';

const SENSITIVE_KEYS_PATTERNS: RegExp[] = [
  /token/i,
  /secret/i,
  /password/i,
  /key$/i,
  /api[_-]?key/i,
  /bearer/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session[_-]?id/i,
];

const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /\/etc\//i,
  /\.env$/i,
  /\.ssh\//i,
  /\.git\//i,
  /\/home\//i,
  /\/root\//i,
  /node_modules\//i,
  /\.npmrc/i,
  /\.aws\//i,
];

const STACK_TRACE_PATTERNS: RegExp[] = [
  /at\s+.*\s+\(.*\)/,
  /^\s*at\s+/m,
  /Error:\s*/,
  /Traceback \(most recent call last\)/,
];

const IP_ADDRESS_PATTERN = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const FILE_PATH_PATTERN = /\/[\w\-\.\/]+(?:[\w\-\.]+\/?)+/g;

export interface SanitizeConfig {
  removeStackTraces: boolean;
  removeFilePaths: boolean;
  removeIpAddresses: boolean;
  removeEmails: boolean;
  maskSensitiveValues: boolean;
}

const defaultConfig: SanitizeConfig = {
  removeStackTraces: true,
  removeFilePaths: true,
  removeIpAddresses: true,
  removeEmails: true,
  maskSensitiveValues: true,
};

const maskSensitiveKey = (key: string): string => {
  if (key.length <= 4) return '***';
  return key.slice(0, 2) + '*'.repeat(key.length - 4) + key.slice(-2);
};

const sanitizeValue = (value: unknown, config: SanitizeConfig): unknown => {
  if (typeof value === 'string') {
    let sanitized = value;

    if (config.removeStackTraces) {
      for (const pattern of STACK_TRACE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    }

    if (config.removeFilePaths) {
      sanitized = sanitized.replace(FILE_PATH_PATTERN, (match) => {
        for (const pattern of SENSITIVE_PATH_PATTERNS) {
          if (pattern.test(match)) {
            return '[REDACTED_PATH]';
          }
        }
        return match;
      });
    }

    if (config.removeIpAddresses) {
      sanitized = sanitized.replace(IP_ADDRESS_PATTERN, '[REDACTED_IP]');
    }

    if (config.removeEmails) {
      sanitized = sanitized.replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
    }

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, config));
  }

  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      let isSensitive = false;
      for (const pattern of SENSITIVE_KEYS_PATTERNS) {
        if (pattern.test(k)) {
          isSensitive = true;
          break;
        }
      }

      if (isSensitive && config.maskSensitiveValues) {
        sanitizedObj[k] = '[REDACTED]';
      } else {
        sanitizedObj[k] = sanitizeValue(v, config);
      }
    }
    return sanitizedObj;
  }

  return value;
};

export const sanitizeResponse = <T>(data: T, config: Partial<SanitizeConfig> = {}): T => {
  const finalConfig = { ...defaultConfig, ...config };
  const sanitized = sanitizeValue(data, finalConfig);

  auditLog('RESPONSE_SANITIZED', {
    type: typeof data,
    config: finalConfig,
  });

  return sanitized as T;
};

export class ResponseSanitizer {
  private config: SanitizeConfig;

  constructor(config: Partial<SanitizeConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  sanitize<T>(data: T): T {
    return sanitizeResponse(data, this.config);
  }

  setConfig(config: Partial<SanitizeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SanitizeConfig {
    return { ...this.config };
  }
}

export const createResponseSanitizer = (config?: Partial<SanitizeConfig>): ResponseSanitizer => {
  return new ResponseSanitizer(config);
};
