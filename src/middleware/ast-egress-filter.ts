import { NextFunction, Request, Response } from 'express';
import { EpistemicSecurityException } from '../errors.js';
import { extractToolInvocations, isRecord } from '../utils/mcp-request.js';

const SENSITIVE_PATH_PATTERNS = [
  /\.env(\.|$)/i,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\.ssh\//i,
  /id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
];

const SHELL_INJECTION_PATTERNS = [
  /\$\([^)]+\)/,
  /`[^`]+`/,
  /;\s*rm\s/i,
  /\|\s*sh\b/i,
  /&&\s*curl\b/i,
];

const EPISTEMIC_PHRASES = [
  /i(?:'m| am) uncertain/i,
  /i(?:'m| am) not sure/i,
  /i cannot (confirm|verify|guarantee)/i,
  /ignore previous instructions/i,
  /disregard (your|the) (previous|prior|above)/i,
  /forget (everything|all) (above|prior|previous)/i,
  /you are now/i,
  /new (persona|role|identity)/i,
];

const isShadowLeakUrl = (url: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const params = [...parsed.searchParams.entries()];
  if (params.length === 0) return false;

  const singleCharParams = params.filter(([k]) => k.length === 1);
  if (singleCharParams.length >= 3) return true;

  const valueLengths = params.map(([, v]) => v.length);
  const shortValues = valueLengths.filter(len => len <= 2);
  const byKey = new Map<string, number>();
  for (const [k] of params) {
    byKey.set(k, (byKey.get(k) ?? 0) + 1);
  }
  const repeatedKeys = [...byKey.values()].filter(count => count > 1);
  if (repeatedKeys.length > 0 && shortValues.length >= 4) return true;

  return false;
};

const checkArguments = (toolName: string, args: Record<string, unknown>): EpistemicSecurityException | null => {
  for (const [, value] of Object.entries(args)) {
    if (typeof value !== 'string') continue;

    if ((toolName === 'fetch_url' || toolName === 'fetch') && isShadowLeakUrl(value)) {
      return new EpistemicSecurityException(
        `ShadowLeak exfiltration pattern detected in URL: ${value}`,
        'SHADOWLEAK_DETECTED',
      );
    }

    for (const pattern of SENSITIVE_PATH_PATTERNS) {
      if (pattern.test(value)) {
        return new EpistemicSecurityException(
          `Sensitive path access blocked: ${value}`,
          'SENSITIVE_PATH_BLOCKED',
        );
      }
    }

    for (const pattern of SHELL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        return new EpistemicSecurityException(
          `Shell injection pattern detected: ${value}`,
          'SHELL_INJECTION_BLOCKED',
        );
      }
    }

    for (const pattern of EPISTEMIC_PHRASES) {
      if (pattern.test(value)) {
        return new EpistemicSecurityException(
          `Epistemic contradiction or prompt injection detected: ${value}`,
          'EPISTEMIC_CONTRADICTION_DETECTED',
        );
      }
    }
  }
  return null;
};

export const validateAstEgress = (body: Record<string, unknown>): void => {
  const tools = extractToolInvocations(body);

  for (const tool of tools) {
    if (!tool.name || !isRecord(tool.arguments)) {
      continue;
    }

    const error = checkArguments(tool.name, tool.arguments);
    if (error) {
      throw error;
    }
  }
};

export const astEgressFilter = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    validateAstEgress(body);
  } catch (error) {
    next(error);
    return;
  }

  next();
};
