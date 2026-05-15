import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { z } from 'zod';
import { splitCommandString } from './cli-options.js';
import { registerRoute } from './proxy/router.js';
import { SECURITY_DEFAULTS } from './security-constants.js';
import { auditLog } from './utils/auditLogger.js';

const GatewayTargetSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  port: z.number().int().min(1).max(65535),
  timeoutMs: z.number().int().min(100).max(30000).optional(),
  headers: z.record(z.string()).optional(),
}).strict();

const GatewayConfigSchema = z.object({
  targets: z.array(GatewayTargetSchema).optional(),
  servers: z.array(GatewayTargetSchema).optional(),
}).strict().refine((config) => (config.targets?.length ?? config.servers?.length ?? 0) > 0, {
  message: 'Expected at least one target in "targets" or "servers"',
});

export type GatewayTargetConfig = z.infer<typeof GatewayTargetSchema>;

export interface RunningGatewayTarget {
  config: GatewayTargetConfig;
  process: ChildProcess;
}

export interface GatewayTargetStatus {
  name: string;
  port: number;
  status: 'online' | 'offline';
  reason?: string;
  updatedAt: string;
}

const gatewayTargetStatuses = new Map<string, GatewayTargetStatus>();

const updateGatewayTargetStatus = (
  target: Pick<GatewayTargetConfig, 'name' | 'port'>,
  status: GatewayTargetStatus['status'],
  reason?: string,
): void => {
  gatewayTargetStatuses.set(target.name, {
    name: target.name,
    port: target.port,
    status,
    reason,
    updatedAt: new Date().toISOString(),
  });
};

export const getGatewayTargetStatuses = (): GatewayTargetStatus[] => {
  return [...gatewayTargetStatuses.values()].sort((left, right) => left.name.localeCompare(right.name));
};

export const loadGatewayConfig = (configPath: string): GatewayTargetConfig[] => {
  const absolutePath = path.resolve(configPath);
  const rawConfig = fs.readFileSync(absolutePath, 'utf8');
  const parsedJson = JSON.parse(rawConfig);
  const parsedConfig = GatewayConfigSchema.parse(parsedJson);
  return parsedConfig.targets ?? parsedConfig.servers ?? [];
};

export const startGatewayTargets = (targets: GatewayTargetConfig[]): RunningGatewayTarget[] => {
  const usedNames = new Set<string>();
  const usedPorts = new Set<number>();
  const runningTargets: RunningGatewayTarget[] = [];

  for (const target of targets) {
    if (usedNames.has(target.name)) {
      updateGatewayTargetStatus(target, 'offline', 'Duplicate target name in config');
      auditLog('GATEWAY_TARGET_CONFIG_WARNING', {
        reason: `Duplicate target name in config: ${target.name}`,
        toolName: target.name,
        port: target.port,
      });
      continue;
    }
    if (usedPorts.has(target.port)) {
      updateGatewayTargetStatus(target, 'offline', 'Duplicate target port in config');
      auditLog('GATEWAY_TARGET_CONFIG_WARNING', {
        reason: `Duplicate target port in config: ${target.port}`,
        toolName: target.name,
        port: target.port,
      });
      continue;
    }

    usedNames.add(target.name);
    usedPorts.add(target.port);

    let commandParts: string[];
    try {
      commandParts = splitCommandString(target.command);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid target command';
      updateGatewayTargetStatus(target, 'offline', reason);
      auditLog('GATEWAY_TARGET_CONFIG_WARNING', {
        reason,
        toolName: target.name,
        command: target.command,
        port: target.port,
      });
      continue;
    }

    if (commandParts.length === 0) {
      updateGatewayTargetStatus(target, 'offline', 'Invalid empty target command');
      auditLog('GATEWAY_TARGET_CONFIG_WARNING', {
        reason: `Invalid command for target ${target.name}`,
        toolName: target.name,
        command: target.command,
        port: target.port,
      });
      continue;
    }

    let targetProcess: ChildProcess;
    try {
      targetProcess = spawn(commandParts[0], [...commandParts.slice(1), ...(target.args ?? [])], {
        cwd: process.cwd(),
        env: { ...process.env, PORT: String(target.port), MCP_PORT: String(target.port) },
        stdio: 'inherit',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Failed to spawn target process';
      updateGatewayTargetStatus(target, 'offline', reason);
      auditLog('GATEWAY_TARGET_START_FAILED', {
        reason,
        toolName: target.name,
        command: target.command,
        port: target.port,
      });
      continue;
    }

    registerRoute(target.name, {
      url: `http://localhost:${target.port}/mcp`,
      timeoutMs: target.timeoutMs ?? SECURITY_DEFAULTS.routeDefaultTimeoutMs,
      headers: target.headers,
    });
    updateGatewayTargetStatus(target, 'online');

    auditLog('GATEWAY_TARGET_STARTED', {
      toolName: target.name,
      command: target.command,
      port: target.port,
    });

    targetProcess.on('error', (error) => {
      updateGatewayTargetStatus(target, 'offline', error.message);
      auditLog('GATEWAY_TARGET_START_FAILED', {
        reason: error.message,
        toolName: target.name,
        command: target.command,
        port: target.port,
      });
    });

    targetProcess.on('close', (code) => {
      updateGatewayTargetStatus(target, 'offline', `Target exited with code ${code ?? 'unknown'}`);
      auditLog('GATEWAY_TARGET_STOPPED', {
        toolName: target.name,
        port: target.port,
        code,
      });
    });

    runningTargets.push({ config: target, process: targetProcess });
  }

  return runningTargets;
};

export const stopGatewayTargets = (targets: RunningGatewayTarget[]): void => {
  for (const target of targets) {
    if (!target.process.killed) {
      target.process.kill('SIGTERM');
    }
  }
};
