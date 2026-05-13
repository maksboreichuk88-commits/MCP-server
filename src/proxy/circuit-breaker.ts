export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerInstance {
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface CircuitBreakerStats {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
}

interface CircuitBreakerHandle {
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  reset: () => void;
}

interface CircuitBreakerInternalState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  halfOpenCallsAllowed: number;
  halfOpenSuccesses: number;
  resetTimer: NodeJS.Timeout | null;
}

const internalStates = new Map<string, CircuitBreakerInternalState>();
const handles = new Map<string, CircuitBreakerHandle>();

const getStats = (name: string, state: CircuitBreakerInternalState): CircuitBreakerStats => ({
  name,
  state: state.state,
  failures: state.failures,
});

export const getOrCreateCircuitBreaker = (options: CircuitBreakerOptions): CircuitBreakerInstance => {
  if (!internalStates.has(options.name)) {
    internalStates.set(options.name, {
      state: 'CLOSED',
      failures: 0,
      halfOpenCallsAllowed: 0,
      halfOpenSuccesses: 0,
      resetTimer: null,
    });
  }

  if (!handles.has(options.name)) {
    const transitionToOpen = (s: CircuitBreakerInternalState): void => {
      s.state = 'OPEN';
      s.halfOpenCallsAllowed = 0;
      s.halfOpenSuccesses = 0;
      if (s.resetTimer) clearTimeout(s.resetTimer);
      s.resetTimer = setTimeout(() => {
        s.state = 'HALF_OPEN';
        s.halfOpenCallsAllowed = options.halfOpenMaxCalls;
        s.halfOpenSuccesses = 0;
        s.resetTimer = null;
      }, options.resetTimeoutMs);
      s.resetTimer.unref?.();
    };

    const transitionToClosed = (s: CircuitBreakerInternalState): void => {
      s.state = 'CLOSED';
      s.failures = 0;
      s.halfOpenCallsAllowed = 0;
      s.halfOpenSuccesses = 0;
      if (s.resetTimer) { clearTimeout(s.resetTimer); s.resetTimer = null; }
    };

    const handle: CircuitBreakerHandle = {
      execute: async <T>(fn: () => Promise<T>): Promise<T> => {
        const s = internalStates.get(options.name)!;

        if (s.state === 'OPEN') {
          throw new CircuitOpenError(`Circuit breaker "${options.name}" is OPEN`);
        }

        if (s.state === 'HALF_OPEN') {
          if (s.halfOpenCallsAllowed <= 0) {
            throw new CircuitOpenError(`Circuit breaker "${options.name}" is HALF_OPEN with no slots`);
          }
          s.halfOpenCallsAllowed -= 1;
          try {
            const result = await fn();
            s.halfOpenSuccesses += 1;
            if (s.halfOpenSuccesses >= options.halfOpenMaxCalls) {
              transitionToClosed(s);
            }
            return result;
          } catch (error) {
            s.failures += 1;
            transitionToOpen(s);
            throw error;
          }
        }

        try {
          const result = await fn();
          s.failures = 0;
          return result;
        } catch (error) {
          s.failures += 1;
          if (s.failures >= options.failureThreshold) {
            transitionToOpen(s);
          }
          throw error;
        }
      },

      reset: (): void => {
        const s = internalStates.get(options.name);
        if (s) transitionToClosed(s);
      },
    };

    handles.set(options.name, handle);
  }

  return handles.get(options.name)!;
};

export const getCircuitBreaker = (name: string): CircuitBreakerHandle | null => {
  return handles.get(name) ?? null;
};

export const getAllCircuitBreakerStats = (): CircuitBreakerStats[] => {
  return Array.from(internalStates.entries()).map(([name, s]) => getStats(name, s));
};
