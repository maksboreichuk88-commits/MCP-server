import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDirPath, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const demoTargetPath = path.join(repoRoot, 'examples', 'demo-target.js');
const npmCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npxCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
const tempPackDirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-pack-smoke-'));
const npmInvocation = process.platform === 'win32'
  ? {
      command: process.execPath,
      prefixArgs: [npmCliPath],
    }
  : {
      command: 'npm',
      prefixArgs: [],
    };
const npxInvocation = process.platform === 'win32'
  ? {
      command: process.execPath,
      prefixArgs: [npxCliPath],
    }
  : {
      command: 'npx',
      prefixArgs: [],
    };

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const publishedCliName = Object.keys(packageJson.bin ?? {})[0];
const cliPath = packageJson.bin?.[publishedCliName];

if (typeof cliPath !== 'string') {
  throw new Error('Missing bin entry in package.json.');
}

const formatFailure = (label, command, args, stdout, stderr, message) => {
  const renderedCommand = [command, ...args].join(' ');
  const sections = [`${label} failed.`, `Command: ${renderedCommand}`];

  if (message) {
    sections.push(`Reason: ${message}`);
  }

  if (stdout) {
    sections.push(`stdout:\n${stdout}`);
  }

  if (stderr) {
    sections.push(`stderr:\n${stderr}`);
  }

  return sections.join('\n');
};

const runCommand = (label, invocation, args, env = {}) => {
  let stdout = '';
  let stderr = '';

  try {
    const result = spawnSync(
      invocation.command,
      [...invocation.prefixArgs, ...args],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          ...env,
        },
        encoding: 'utf8',
        timeout: 120000,
      }
    );
    stdout = result.stdout ?? '';
    stderr = result.stderr ?? '';

    if (result.error) {
      throw result.error;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
      const error = new Error(`Command failed with exit code ${result.status}`);
      error.stdout = stdout;
      error.stderr = stderr;
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error && typeof error === 'object') {
      stdout = typeof error.stdout === 'string' ? error.stdout : stdout;
      stderr = typeof error.stderr === 'string' ? error.stderr : stderr;
    }
    throw new Error(
      formatFailure(label, invocation.command, [...invocation.prefixArgs, ...args], stdout, stderr, message),
    );
  }

  return { stdout, stderr };
};

const ensureSuccess = (label, args, env = {}, matcher) => {
  const { stdout, stderr } = runCommand(label, npxInvocation, args, env);

  if (matcher && !matcher(stdout, stderr)) {
    throw new Error(
      formatFailure(
        `${label} output assertion`,
        npxInvocation.command,
        [...npxInvocation.prefixArgs, ...args],
        stdout,
        stderr,
        'command succeeded but output did not match expectations',
      ),
    );
  }
};

const createPackedTarball = () => {
  // Pack into a unique temp directory so Windows does not reuse a stale repo-root tarball path between runs.
  const { stdout, stderr } = runCommand(
    'npm pack --json',
    npmInvocation,
    ['pack', '--json', '--pack-destination', tempPackDirPath],
  );

  let tarballName;

  try {
    const parsed = JSON.parse(stdout);
    tarballName = parsed?.[0]?.filename;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      formatFailure('npm pack JSON parse', npmInvocation.command, [...npmInvocation.prefixArgs, 'pack', '--json', '--pack-destination', tempPackDirPath], stdout, stderr, message),
    );
  }

  if (typeof tarballName !== 'string' || tarballName.length === 0) {
    throw new Error(
      formatFailure(
        'npm pack output validation',
        npmInvocation.command,
        [...npmInvocation.prefixArgs, 'pack', '--json', '--pack-destination', tempPackDirPath],
        stdout,
        stderr,
        'npm pack did not return a tarball filename',
      ),
    );
  }

  const tarballPath = path.join(tempPackDirPath, tarballName);
  if (!fs.existsSync(tarballPath)) {
    throw new Error(
      formatFailure(
        'tarball existence check',
        npmInvocation.command,
        [...npmInvocation.prefixArgs, 'pack', '--json', '--pack-destination', tempPackDirPath],
        stdout,
        stderr,
        `expected tarball was not found at ${tarballPath}`,
      ),
    );
  }

  return { tarballName, tarballPath };
};

const ensureStandaloneMcpServer = async (tarballPath) => {
  const transport = new StdioClientTransport({
    command: npxInvocation.command,
    args: [...npxInvocation.prefixArgs, '--yes', `--package=${tarballPath}`, publishedCliName],
    cwd: repoRoot,
    env: {
      ...process.env,
      MCP_ADMIN_ENABLED: 'false',
    },
    stderr: 'pipe',
  });

  const client = new Client(
    { name: 'pack-smoke', version: '1.0.0' },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);
    if (!toolNames.includes('firewall_status') || !toolNames.includes('firewall_usage')) {
      throw new Error(`Standalone mode did not expose the expected bundled tools. Saw: ${toolNames.join(', ')}`);
    }

    const status = await client.callTool({
      name: 'firewall_status',
      arguments: {},
    });

    const textBlock = status.content.find((item) => item.type === 'text');
    if (!textBlock || !textBlock.text.includes('standalone embedded MCP server')) {
      throw new Error('Standalone bundled tool did not return the expected status text.');
    }
  } finally {
    await client.close();
  }
};

const main = async () => {
  const { tarballName, tarballPath } = createPackedTarball();

  ensureSuccess(
    'tarball help smoke test',
    ['--yes', `--package=${tarballPath}`, publishedCliName, '--help'],
    {},
    (stdout) => stdout.includes('Toolwall') && stdout.includes('Usage:'),
  );

  ensureSuccess(
    'env-based target resolution smoke test',
    ['--yes', `--package=${tarballPath}`, publishedCliName],
    {
      PROXY_AUTH_TOKEN: '12345678901234567890123456789012',
      MCP_TARGET_COMMAND: process.execPath,
      MCP_TARGET_ARGS_JSON: JSON.stringify([demoTargetPath]),
      MCP_ADMIN_ENABLED: 'false',
    },
  );

  await ensureStandaloneMcpServer(tarballPath);

  console.log(`package smoke passed for ${tarballName}`);
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  fs.rmSync(tempPackDirPath, { recursive: true, force: true });
}
