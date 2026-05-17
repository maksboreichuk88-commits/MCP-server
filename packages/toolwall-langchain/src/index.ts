type ToolwallValidationBody = Record<string, unknown>;
type ToolwallValidator = (body: ToolwallValidationBody) => void | Promise<void>;

export type ToolwallCallable<TInput = unknown, TOutput = unknown, TConfig = unknown> =
  | ((input: TInput, config?: TConfig) => TOutput | Promise<TOutput>)
  | {
      name?: string;
      invoke?: (input: TInput, config?: TConfig) => TOutput | Promise<TOutput>;
      call?: (input: TInput, config?: TConfig) => TOutput | Promise<TOutput>;
      func?: (input: TInput, config?: TConfig) => TOutput | Promise<TOutput>;
    };

export interface ToolwallInterceptorOptions {
  toolName?: string;
  validator?: ToolwallValidator;
}

let cachedDefaultValidator: ToolwallValidator | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeArguments = (input: unknown): Record<string, unknown> => {
  if (isRecord(input)) {
    return input;
  }

  return { input };
};

const getCallableName = <TInput, TOutput, TConfig>(
  target: ToolwallCallable<TInput, TOutput, TConfig>,
  fallback: string,
): string => {
  if (typeof target === 'function') {
    return target.name || fallback;
  }

  return target.name || fallback;
};

const buildToolwallPayload = (toolName: string, input: unknown): ToolwallValidationBody => ({
  jsonrpc: '2.0',
  id: 'langchain-toolwall-interceptor',
  method: 'tools/call',
  params: {
    name: toolName,
    arguments: normalizeArguments(input),
  },
});

const loadDefaultValidator = async (): Promise<ToolwallValidator> => {
  if (cachedDefaultValidator) {
    return cachedDefaultValidator;
  }

  const coreExportPath = '@maksiph14/toolwall/middleware/ast-egress-filter';
  try {
    const toolwallCore = await import(coreExportPath) as { validateAstEgress?: ToolwallValidator };
    if (typeof toolwallCore.validateAstEgress === 'function') {
      cachedDefaultValidator = toolwallCore.validateAstEgress;
      return cachedDefaultValidator;
    }
  } catch {}

  const localCorePath = '../../../src/middleware/ast-egress-filter.js';
  const localCore = await import(localCorePath) as { validateAstEgress: ToolwallValidator };
  cachedDefaultValidator = localCore.validateAstEgress;
  return cachedDefaultValidator;
};

export class ToolwallInterceptor<TInput = unknown, TOutput = unknown, TConfig = unknown> {
  readonly name: string;

  private readonly target: ToolwallCallable<TInput, TOutput, TConfig>;
  private readonly validator?: ToolwallValidator;

  constructor(target: ToolwallCallable<TInput, TOutput, TConfig>, options: ToolwallInterceptorOptions = {}) {
    this.target = target;
    this.name = options.toolName ?? getCallableName(target, 'langchain_tool');
    this.validator = options.validator;
  }

  async invoke(input: TInput, config?: TConfig): Promise<TOutput> {
    await this.assertAllowed(input);
    return this.invokeTarget(input, config);
  }

  async call(input: TInput, config?: TConfig): Promise<TOutput> {
    return this.invoke(input, config);
  }

  async func(input: TInput, config?: TConfig): Promise<TOutput> {
    return this.invoke(input, config);
  }

  private async assertAllowed(input: TInput): Promise<void> {
    const validator = this.validator ?? await loadDefaultValidator();
    await validator(buildToolwallPayload(this.name, input));
  }

  private async invokeTarget(input: TInput, config?: TConfig): Promise<TOutput> {
    if (typeof this.target === 'function') {
      return this.target(input, config);
    }

    if (typeof this.target.invoke === 'function') {
      return this.target.invoke(input, config);
    }

    if (typeof this.target.call === 'function') {
      return this.target.call(input, config);
    }

    if (typeof this.target.func === 'function') {
      return this.target.func(input, config);
    }

    throw new Error('ToolwallInterceptor requires a callable LangChain tool or agent.');
  }
}

export const createToolwallInterceptor = <TInput = unknown, TOutput = unknown, TConfig = unknown>(
  target: ToolwallCallable<TInput, TOutput, TConfig>,
  options: ToolwallInterceptorOptions = {},
): ToolwallInterceptor<TInput, TOutput, TConfig> => {
  return new ToolwallInterceptor(target, options);
};

export const wrapToolWithToolwall = createToolwallInterceptor;
