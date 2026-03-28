import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const repoAuditLogPath = path.join(process.cwd(), 'audit.log');

describe('audit logger file output', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-audit-logger-test-'));
    fs.rmSync(repoAuditLogPath, { force: true });
    delete process.env.MCP_AUDIT_LOG_PATH;
    process.env.NODE_ENV = 'test';
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.MCP_AUDIT_LOG_PATH;
    delete process.env.NODE_ENV;
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(repoAuditLogPath, { force: true });
    jest.resetModules();
  });

  it('does not create audit.log in the repository root during tests when no explicit path is set', async () => {
    const module = await import('../src/utils/auditLogger.js');

    module.auditLog('TEST_EVENT', { source: 'jest' });

    expect(fs.existsSync(repoAuditLogPath)).toBe(false);
  });

  it('writes to MCP_AUDIT_LOG_PATH when configured', async () => {
    const customLogPath = path.join(tempDir, 'custom-audit.log');
    process.env.MCP_AUDIT_LOG_PATH = customLogPath;
    jest.resetModules();

    const module = await import('../src/utils/auditLogger.js');
    module.auditLog('TEST_EVENT', { source: 'jest' });

    expect(fs.existsSync(customLogPath)).toBe(true);
    expect(fs.readFileSync(customLogPath, 'utf8')).toContain('"event":"TEST_EVENT"');
  });
});
