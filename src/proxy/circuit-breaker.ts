import { auditLog } from '../utils/auditLogger.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  totalCalls: number;
}

export class CircuitBreaker {
  private name: string;
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private halfOpenMaxCalls: number;
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private halfOpenCalls = 0;
  private openedAt: number | null = null;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold;
    this.resetTimeoutMs = config.resetTimeoutMs;
    this.halfOpenMaxCalls = config.halfOpenMaxCalls;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (this.openedAt && Date.now() - this.openedAt > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        auditLog('CIRCUIT_HALF_OPEN', { name: this.name });
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();

    if (state === 'OPEN') {
      throw new CircuitOpenError(`Circuit '${this.name}' is OPEN. Failure threshold: ${this.failureThreshold}`);
    }

    if (state === 'HALF_OPEN') {
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        throw new CircuitOpenError(`Circuit '${this.name}' is in HALF_OPEN state with max calls reached.`);
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccess = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      this.halfOpenCalls = 0;
      auditLog('CIRCUIT_CLOSED', { name: this.name });
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      auditLog('CIRCUIT_OPENED', {
        name: this.name,
        failures: this.failures,
        threshold: this.failureThreshold,
      });
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.lastSuccess = null;
    this.halfOpenCalls = 0;
    this.openedAt = null;
    auditLog('CIRCUIT_RESET', { name: this.name });
  }

  getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalCalls: this.failures + this.successes,
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export const getOrCreateCircuitBreaker = (config: CircuitBreakerConfig): CircuitBreaker => {
  const existing = circuitBreakers.get(config.name);
  if (existing) return existing;

  const cb = new CircuitBreaker(config);
  circuitBreakers.set(config.name, cb);
  return cb;
};

export const getCircuitBreaker = (name: string): CircuitBreaker | undefined => {
  return circuitBreakers.get(name);
};

export const removeCircuitBreaker = (name: string): boolean => {
  return circuitBreakers.delete(name);
};

export const getAllCircuitBreakerStats = (): CircuitBreakerStats[] => {
  return Array.from(circuitBreakers.values()).map(cb => cb.getStats());
};
