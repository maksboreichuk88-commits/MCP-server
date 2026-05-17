import { describe, expect, it, jest } from '@jest/globals';
import { ToolwallInterceptor, wrapToolWithToolwall } from '../src/index.js';

describe('ToolwallInterceptor', () => {
  it('passes clean LangChain tool calls through to the wrapped tool', async () => {
    const mockTool = {
      name: 'search_files',
      invoke: jest.fn(async (input: Record<string, unknown>) => ({
        ok: true,
        input,
      })),
    };
    const wrapped = new ToolwallInterceptor(mockTool);

    await expect(wrapped.invoke({ query: 'find README examples' })).resolves.toEqual({
      ok: true,
      input: { query: 'find README examples' },
    });
    expect(mockTool.invoke).toHaveBeenCalledTimes(1);
  });

  it('fails closed before invoking the wrapped tool when the AST filter blocks a payload', async () => {
    const mockTool = {
      name: 'read_file',
      invoke: jest.fn(async () => ({ ok: true })),
    };
    const wrapped = wrapToolWithToolwall(mockTool);

    await expect(wrapped.invoke({ path: '.env' })).rejects.toMatchObject({
      code: 'SENSITIVE_PATH_BLOCKED',
    });
    expect(mockTool.invoke).not.toHaveBeenCalled();
  });
});
