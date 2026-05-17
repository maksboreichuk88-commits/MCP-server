type ToolwallValidationBody = Record<string, unknown>;
type ToolwallValidator = (body: ToolwallValidationBody) => void | Promise<void>;

export interface ToolwallVercelOptions {
  toolName?: string;
  validator?: ToolwallValidator;
}

export type VercelToolExecute<TArgs = unknown, TResult = unknown, TOptions = unknown> = (
  args: TArgs,
  options?: TOptions,
) => TResult | Promise<TResult>;

export type VercelToolDefinition<TArgs = unknown, TResult = unknown, TOptions = unknown> =
  Record<string, unknown> & {
    name?: string;
    execute?: VercelToolExecute<TArgs, TResult, TOptions>;
  };

export type VercelToolFactory<TDefinition, TTool> = (definition: TDefinition) => TTool;

let cachedDefaultValidator: ToolwallValidator | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeArguments = (args: unknown): Record<string, unknown> => {
  if (isRecord(args)) {
    return args;
  }

  return { input: args };
};

const resolveToolName = (
  definition: { name?: string },
  options: ToolwallVercelOptions,
): string => {
  return options.toolName ?? definition.name ?? 'vercel_ai_tool';
};

const buildToolwallPayload = (toolName: string, args: unknown): ToolwallValidationBody => ({
  jsonrpc: '2.0',
  id: 'vercel-ai-toolwall-interceptor',
  method: 'tools/call',
  params: {
    name: toolName,
    arguments: normalizeArguments(args),
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

const assertAllowed = async (
  toolName: string,
  args: unknown,
  validator?: ToolwallValidator,
): Promise<void> => {
  const validate = validator ?? await loadDefaultValidator();
  await validate(buildToolwallPayload(toolName, args));
};

export const withToolwall = <TArgs = unknown, TResult = unknown, TOptions = unknown>(
  definition: VercelToolDefinition<TArgs, TResult, TOptions>,
  options: ToolwallVercelOptions = {},
): VercelToolDefinition<TArgs, TResult, TOptions> => {
  const toolName = resolveToolName(definition, options);
  const originalExecute = definition.execute;

  return {
    ...definition,
    name: definition.name ?? toolName,
    execute: async (args: TArgs, executeOptions?: TOptions): Promise<TResult> => {
      await assertAllowed(toolName, args, options.validator);

      if (!originalExecute) {
        throw new Error('Toolwall Vercel AI wrapper requires an execute function.');
      }

      return originalExecute(args, executeOptions);
    },
  };
};

export const createToolwallToolFactory = <TDefinition extends VercelToolDefinition, TTool>(
  toolFactory: VercelToolFactory<TDefinition, TTool>,
  defaultOptions: ToolwallVercelOptions = {},
) => {
  return (
    definition: TDefinition,
    options: ToolwallVercelOptions = {},
  ): TTool => {
    return toolFactory(withToolwall(definition, { ...defaultOptions, ...options }) as TDefinition);
  };
};

export const createToolwallTool = createToolwallToolFactory;
export const toolwallTool = withToolwall;
