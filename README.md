# Toolwall: Enterprise-Grade Security Firewall for MCP Agents

> **Prevent data leaks (DLP), enforce rate-limits, and audit every AI tool execution in real-time.**

[![npm version](https://img.shields.io/npm/v/toolwall)](https://www.npmjs.com/package/toolwall)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

Every AI coding agent — Claude Code, Cursor, Windsurf, GitHub Copilot — executes tool calls on your local machine: reading files, running shell commands, querying databases. Every response travels back to a remote API endpoint. **This is an uncontrolled data exfiltration channel.**

Here is what happens today, silently, on developer workstations across your organization:

```
Agent calls read_file(".env")
  → Response: AWS_SECRET_ACCESS_KEY=AKIA3X7...
  → Full content sent to model provider's API
  → Provider's logs now contain your production credentials
  → Developer never sees this happen
```

This is not a theoretical risk. It happens on every `read_file`, every `execute_command`, every `search_files` that touches infrastructure secrets, PII, or internal architecture details. SOC 2, HIPAA, PCI DSS — all violated in a single tool call.

**Toolwall eliminates this channel.** It sits between the agent and the MCP server as an invisible STDIO proxy. Every response passes through a DLP engine before reaching the agent. Secrets are replaced with `[REDACTED]`. Credentials never leave the machine. The agent receives a clean, functional response. Your compliance posture remains intact.

---

## Core Features

### 🛡️ Shadow Leak Sanitizer (DLP Engine)

Real-time Data Loss Prevention on every outbound MCP response. Recursive JSON traversal with dual-layer redaction:

| Layer | What It Catches | Action |
|-------|----------------|--------|
| **Key-Level** | `token`, `secret`, `password`, `apiKey`, `authorization`, `credential`, `privateKey`, `accessToken`, `refreshToken`, `sessionId` | Value → `[REDACTED]` |
| **Value-Level: Bearer Tokens** | `Authorization: Bearer sk-abc123...` | Token → `[REDACTED]` |
| **Value-Level: Inline Secrets** | `AWS_SECRET_ACCESS_KEY=AKIA3X7...` | Value → `[REDACTED]` |
| **Value-Level: IP Addresses** | `192.168.1.100`, `10.0.0.1` | → `[REDACTED_IP]` |
| **Value-Level: Email/PII** | `admin@corp.com` | → `[REDACTED_EMAIL]` |
| **Value-Level: Infra Paths** | `/home/user/.ssh/id_rsa`, `.env`, `.aws/` | → `[REDACTED_PATH]` |
| **Value-Level: Stack Traces** | `at Module._compile (node:internal/...)` | → `[REDACTED]` |

Application-level paths like `/api/v1/users` pass through unmodified. Zero false positives on business logic.

---

### 🔒 Fail-Closed Proxy

**Every failure mode results in a denied response. Never a passthrough. Never a silent drop.**

| Failure Scenario | Behavior |
|-----------------|----------|
| Target MCP server crashes | All pending requests → `TARGET_UNAVAILABLE` error |
| Target emits invalid JSON | Target process terminated, requests failed safely |
| Target response timeout (30s default) | `Fail-Closed` error returned |
| Client disconnects | Target stdin closed, proxy shuts down cleanly |
| JSON parse error on input | `Parse error` (code `-32700`) returned |

Every denial is a valid JSON-RPC 2.0 error. The MCP protocol contract is never violated.

---

### 🧱 Resource Guard (OOM Protection)

Prevents memory exhaustion attacks from oversized tool responses. Hard limit: **5 MB per response**.

Previous approaches truncated payloads at byte boundaries, producing invalid JSON that hung MCP clients. Toolwall discards the entire buffer and returns a well-formed error:

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "error": {
    "code": -32000,
    "message": "Response Too Large"
  }
}
```

The client receives a parseable error and can retry or report. No hangs. No crashes. No OOM kills.

---

### 📋 Audit Logging

Every tool invocation, every DLP redaction, every blocked request — logged to `audit.log` in structured JSON format:

```json
{"timestamp":"2026-05-12T17:42:00.000Z","event":"RESPONSE_SANITIZED","type":"object","config":{...}}
{"timestamp":"2026-05-12T17:42:01.000Z","event":"OOM_PROTECTION_TRIGGERED","id":42,"byteLength":6291456,"limit":5242880}
```

Built for compliance pipelines. Ship to Azure Monitor, Splunk, Datadog, or any SIEM that ingests structured JSON. Prometheus metrics endpoint (`/metrics`) included for real-time dashboarding.

**Exported metrics:** `mcp_firewall_blocked_requests_total`, `mcp_firewall_cache_hits_total`, `mcp_firewall_stdio_requests_total`, and more.

---

## Architecture

```
┌─────────────────┐          STDIO           ┌─────────────────┐          STDIO           ┌─────────────────┐
│                 │  ───── JSON-RPC ────────▶ │                 │  ───── JSON-RPC ────────▶ │                 │
│    AI Agent     │                           │  Toolwall Proxy │                           │   MCP Server    │
│  (Claude Code,  │  ◀──── Sanitized ──────  │                 │  ◀──── Raw Response ────  │   (any target)  │
│   Cursor, etc.) │       Response            │  DLP ∙ OOM ∙    │       from server         │                 │
│                 │                           │  Rate-Limit ∙   │                           │                 │
└─────────────────┘                           │  Audit Log      │                           └─────────────────┘
                                              └─────────────────┘
```

**Request lifecycle:**

1. Agent sends JSON-RPC request to Toolwall's stdin
2. Toolwall validates JSON structure and JSON-RPC 2.0 conformance
3. Cache lookup (L1 in-memory LRU → L2 SQLite on-disk)
4. On cache hit: immediate response, target server never contacted
5. On cache miss: request forwarded to target server's stdin
6. Target response passes through OOM guard (5 MB limit)
7. Shadow Leak Sanitizer strips all secrets and PII
8. Clean response cached and returned to agent's stdout

**The agent and the server never know Toolwall exists.** Zero configuration on either side.

---

## Deployment & Quick Start

### Zero-Dependency Binary

Toolwall compiles to a **single executable** via `bun build --compile`. The binary contains the entire runtime, all dependencies, and application code. No `node_modules`. No `package.json`. No `npm install`. One artifact for air-gapped networks, container images, VM golden images, and endpoint management systems.

**Build from source:**

```bash
bun install
bun run build:bin
```

**Run:**

```bash
./toolwall --target "npx @modelcontextprotocol/server-everything"
```

### Claude Code / Cursor MCP Configuration

```json
{
  "mcpServers": {
    "protected-server": {
      "command": "./toolwall",
      "args": ["--target", "npx @modelcontextprotocol/server-everything"]
    }
  }
}
```

### With Admin Dashboard & Monitoring

```bash
MCP_ADMIN_ENABLED=true ADMIN_TOKEN=<your-32-char-minimum-token> ./toolwall --target "node my-mcp-server.js"
```

---

## Enterprise Deployment

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TARGET_COMMAND` | — | Target MCP server command |
| `MCP_TARGET_TIMEOUT_MS` | `30000` | Response timeout before fail-closed |
| `MCP_ADMIN_ENABLED` | `false` | Enable Admin API + Prometheus endpoint |
| `MCP_ADMIN_PORT` | `9090` | Admin API port |
| `ADMIN_TOKEN` | — | Bearer token for admin operations (min 32 chars) |
| `PROXY_AUTH_TOKEN` | — | NHI auth token for fail-closed authentication |
| `MCP_CACHE_TTL_SECONDS` | `300` | Cache entry TTL |

### Compliance & Audit

- **SOC 2 Type II**: Full audit trail of every tool invocation and DLP event
- **HIPAA**: PII detection and redaction (emails, IPs) before data leaves the machine
- **PCI DSS**: Credential masking prevents cardholder data exposure via AI agents
- **Zero Trust**: Fail-closed architecture — no request passes without validation

### Binary Advantages for Enterprise

- ✅ No dependency resolution on air-gapped networks
- ✅ No `node_modules` supply-chain attack surface
- ✅ Deterministic binary hash for compliance audits
- ✅ Single artifact for SCCM, Intune, or any endpoint management system
- ✅ Works on Linux, macOS, and Windows

---

## License

MIT
