import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const MCP_PID_FILE = path.join(os.tmpdir(), 'claude-flow-mcp.pid');

const writePidFile = (): void => {
  const tmp = `${MCP_PID_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, String(process.pid), 'utf8');
  fs.renameSync(tmp, MCP_PID_FILE);
};

const removePidFile = (): void => {
  try { fs.unlinkSync(MCP_PID_FILE); } catch { }
};

interface PackageManifest {
  name?: string;
  version?: string;
}

const readPackageManifest = (): PackageManifest => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.resolve(currentDir, '../../package.json');

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PackageManifest;
  } catch {
    return {};
  }
};

const manifest = readPackageManifest();
const packageName = manifest.name ?? 'toolwall';
const packageVersion = manifest.version ?? '0.0.0';

const adminEnabled = (): boolean => {
  return process.env['MCP_ADMIN_ENABLED'] === 'true' || process.env['ADMIN_ENABLED'] === 'true';
};

const createTextContent = (text: string) => {
  return [{ type: 'text' as const, text }];
};

export const startEmbeddedMcpServer = async (): Promise<void> => {
  const server = new McpServer({
    name: packageName,
    version: packageVersion,
  });

  server.registerTool(
    'firewall_status',
    {
      description: 'Return runtime status for the bundled standalone MCP server exposed by toolwall.',
    },
    async () => {
      const status = {
        packageName,
        version: packageVersion,
        mode: 'standalone',
        transport: 'stdio',
        adminEnabled: adminEnabled(),
        proxyAuthConfigured: Boolean(process.env['PROXY_AUTH_TOKEN']),
        targetConfigured: Boolean(
          process.env['MCP_TARGET_COMMAND']?.trim() ||
          process.env['MCP_TARGET_ARGS_JSON']?.trim() ||
          process.env['MCP_TARGET_ARGS']?.trim() ||
          process.env['MCP_TARGET']?.trim(),
        ),
        nodeVersion: process.version,
      };

      return {
        content: createTextContent(
          [
            `${packageName} ${packageVersion}`,
            'Mode: standalone embedded MCP server',
            'Transport: stdio',
            `Admin enabled: ${status.adminEnabled}`,
            `Proxy auth configured: ${status.proxyAuthConfigured}`,
          ].join('\n'),
        ),
        structuredContent: status,
      };
    },
  );

  server.registerTool(
    'firewall_usage',
    {
      description: 'Return launch guidance for standalone mode and downstream proxy mode.',
    },
    async () => {
      const usage = {
        standaloneCommand: 'npx toolwall',
        proxyMode: {
          command: 'npx toolwall',
          env: [
            'PROXY_AUTH_TOKEN',
            'MCP_TARGET_COMMAND',
            'MCP_TARGET_ARGS_JSON',
            'MCP_TARGET_ARGS',
            'MCP_TARGET',
          ],
        },
      };

      return {
        content: createTextContent(
          [
            'Standalone mode:',
            '  npx toolwall',
            '',
            'Protected downstream proxy mode:',
            '  command: npx toolwall',
            '  env: PROXY_AUTH_TOKEN + one of MCP_TARGET_COMMAND/MCP_TARGET',
          ].join('\n'),
        ),
        structuredContent: usage,
      };
    },
  );

  writePidFile();

  const cleanup = (): void => { removePidFile(); };
  process.once('exit', cleanup);
  process.once('SIGINT', () => { cleanup(); process.exit(0); });
  process.once('SIGTERM', () => { cleanup(); process.exit(0); });

  const transport = new StdioServerTransport();
  await server.connect(transport);
};
