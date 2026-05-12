# Toolwall: Enterprise Security Firewall for MCP Agents

Data loss prevention (DLP), rate-limiting, and real-time audit logging for AI tool execution.

[![npm version](https://img.shields.io/npm/v/toolwall)](https://www.npmjs.com/package/toolwall)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Vulnerability Description

AI coding agents (e.g., Claude Code, Cursor, Windsurf, GitHub Copilot) execute tool commands locally, including file reads, shell execution, and database queries. The resulting output is transmitted to remote API endpoints, creating an unmonitored data exfiltration vector.

Execution path without Toolwall:
1. Agent invokes `read_file(".env")`
2. Local environment variables (`AWS_SECRET_ACCESS_KEY=AKIA...`) are retrieved.
3. Plaintext credentials are transmitted to the LLM provider’s API.
4. Production credentials are inadvertently recorded in third-party logs.
5. The transaction occurs without developer notification.

This vector compromises infrastructure secrets, personally identifiable information (PII), and proprietary architecture configurations. Unauthorized transmission of this data violates SOC 2, HIPAA, and PCI DSS compliance requirements.

Toolwall mitigates this vulnerability by operating as an invisible STDIO proxy between the AI agent and the Model Context Protocol (MCP) server. Outbound responses are processed through a DLP engine prior to agent delivery. Sensitive data is redacted (`[REDACTED]`), preventing external transmission while maintaining functional API responses for the agent.

---

## Core Technical Features

### Shadow Leak Sanitizer (DLP Engine)

The system performs recursive JSON traversal to execute real-time Data Loss Prevention on all outbound MCP responses. Redaction operates at two layers:

| Layer | Target Pattern | Action |
|-------|----------------|--------|
| Key-Level | `token`, `secret`, `password`, `apiKey`, `authorization`, `credential`, `privateKey`, `accessToken`, `refreshToken`, `sessionId` | Value replaced with `[REDACTED]` |
| Value-Level | Bearer Tokens (`Authorization: Bearer sk-...`) | Token redaction |
| Value-Level | Inline Secrets (`AWS_SECRET_ACCESS_KEY=AKIA...`) | Value redaction |
| Value-Level | IP Addresses (`192.168.1.100`) | Masked as `[REDACTED_IP]` |
| Value-Level | Email/PII (`user@domain.com`) | Masked as `[REDACTED_EMAIL]` |
| Value-Level | Infrastructure Paths (`.env`, `.ssh/`, `.aws/`) | Masked as `[REDACTED_PATH]` |
| Value-Level | Stack Traces | Redacted |

Application-level paths (e.g., `/api/v1/users`) bypass redaction.

---

### Fail-Closed Proxy Architecture

All error states resolve to a denied response. Passthrough and silent dropping are explicitly prohibited.

| Failure Condition | System Behavior |
|-------------------|-----------------|
| Target MCP server termination | Pending requests return `TARGET_UNAVAILABLE` error |
| Invalid JSON emission by target | Target process terminates; requests fail safely |
| Response timeout (default 30s) | `Fail-Closed` error returned |
| Client disconnection | Target stdin closes; proxy shuts down cleanly |
| Input JSON parse failure | `Parse error` (code `-32700`) returned |

All denials conform to the JSON-RPC 2.0 specification.

---

### Resource Guard (OOM Protection)

Mitigates memory exhaustion vulnerabilities by enforcing a strict 5 MB limit per response payload.

Unlike truncation methods that yield invalid JSON and cause client hanging, Toolwall discards oversized buffers and returns a compliant error:

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

The client receives a parseable error structure, preventing application instability.

---

### Audit Logging

All tool invocations, DLP redaction events, and blocked requests are recorded to `audit.log` in structured JSON format:

```json
{"timestamp":"2026-05-12T17:42:00.000Z","event":"RESPONSE_SANITIZED","type":"object","config":{}}
{"timestamp":"2026-05-12T17:42:01.000Z","event":"OOM_PROTECTION_TRIGGERED","id":42,"byteLength":6291456,"limit":5242880}
```

Compatible with Azure Monitor, Splunk, Datadog, and any SIEM that ingests structured JSON. A Prometheus metrics endpoint (`/metrics`) is exposed for telemetry.

Exported metrics: `mcp_firewall_blocked_requests_total`, `mcp_firewall_cache_hits_total`, `mcp_firewall_stdio_requests_total`.

---

## System Architecture

```text
[AI Agent] <---(STDIO)---> [Toolwall Proxy] <---(STDIO)---> [MCP Server]
```

Request Lifecycle:

1. Agent transmits a JSON-RPC request to the Toolwall `stdin`.
2. Toolwall validates JSON structure and JSON-RPC 2.0 compliance.
3. Cache lookup executes (L1 in-memory LRU, then L2 SQLite on-disk).
4. Cache hit: immediate response returned; target server is bypassed.
5. Cache miss: request is forwarded to the target server `stdin`.
6. Target response undergoes OOM validation (5 MB threshold).
7. Shadow Leak Sanitizer redacts secrets and PII.
8. Sanitized response is cached and output to the agent `stdout`.

Zero configuration is required on the agent or server interfaces.

---

## Deployment Configuration

### Zero-Dependency Binary

Toolwall is distributed as a statically linked executable via `bun build --compile`. The binary encapsulates the runtime environment, dependencies, and application logic. It operates independently of `node_modules`, `package.json`, and the `npm` registry, facilitating deployment in air-gapped environments.

Build:

```bash
bun install
bun run build:bin
```

Run:

```bash
./toolwall --target "npx @modelcontextprotocol/server-everything"
```

### Client Configuration (Claude Code / Cursor)

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

### Telemetry and Administration

```bash
MCP_ADMIN_ENABLED=true ADMIN_TOKEN=<32_byte_minimum_token> ./toolwall --target "node my-mcp-server.js"
```

---

## Enterprise Governance

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TARGET_COMMAND` | -- | Target MCP server executable |
| `MCP_TARGET_TIMEOUT_MS` | `30000` | Target response timeout prior to fail-closed state |
| `MCP_ADMIN_ENABLED` | `false` | Enable Administration API and Prometheus telemetry |
| `MCP_ADMIN_PORT` | `9090` | Administration API port assignment |
| `ADMIN_TOKEN` | -- | Bearer token for administrative operations (minimum 32 bytes) |
| `PROXY_AUTH_TOKEN` | -- | NHI authorization token for fail-closed authentication |
| `MCP_CACHE_TTL_SECONDS` | `300` | Cache entry Time-To-Live |

### Compliance Mapping

- **SOC 2 Type II**: Maintains an immutable audit trail for tool invocations and DLP events.
- **HIPAA**: Detects and redacts electronic Protected Health Information (ePHI) prior to egress.
- **PCI DSS**: Masks cryptographic material and access credentials.
- **Zero Trust**: Implements a fail-closed architecture requiring explicit validation for all transactions.

### Binary Distribution Properties

- Eliminates dependency resolution requirements on isolated networks.
- Removes `node_modules` supply-chain attack vectors.
- Provides a deterministic binary hash for configuration management.
- Standardizes deployment for SCCM, Microsoft Intune, and endpoint management systems.
- Supports Linux, macOS, and Windows environments.

---

## License

MIT