# Toolwall

Fail-closed security proxy for MCP (Model Context Protocol) tool calls.
Intercepts all JSON-RPC traffic between LLM agents and local infrastructure.
Strips secrets, enforces rate limits, blocks oversized payloads.
Zero trust. Zero configuration for the end user. One binary.

---

## Value Proposition

LLM coding agents (Claude Code, Cursor, Windsurf) execute arbitrary tool calls on local machines: reading files, running shell commands, accessing databases. Every tool response travels back to a remote API endpoint. This creates an uncontrolled exfiltration channel.

Toolwall eliminates this channel.

**Problem**: An LLM agent calls `read_file` on `.env`, receives `AWS_SECRET_ACCESS_KEY=AKIA...`, and sends the full content to the model provider's servers. The developer never sees this happen. The provider's logs now contain production credentials.

**Solution**: Toolwall sits between the agent and the MCP server as an invisible STDIO proxy. Every response passes through a DLP sanitizer before reaching the agent. Secrets are replaced with `[REDACTED]`. The agent receives a functional response. The credentials never leave the machine.

**What Toolwall protects against:**

- Exfiltration of API keys, tokens, passwords, and credentials from file reads
- Leakage of internal IP addresses, email addresses, and file paths
- Stack trace exposure revealing internal architecture to remote endpoints
- Denial-of-service via oversized responses that crash the agent's context window
- Uncontrolled request volume from compromised or misconfigured agents

**Who pays for this:**

- Engineering teams using AI coding assistants on machines with access to production secrets
- Enterprises with compliance requirements (SOC 2, HIPAA) that prohibit uncontrolled data egress
- DevOps teams deploying MCP servers in shared infrastructure

---

## Technical Architecture

### Request Lifecycle (STDIO Mode)

Toolwall operates as a man-in-the-middle on the STDIO channel between an MCP client and an MCP server. The client believes it is communicating directly with the server. The server believes it is communicating directly with the client. Toolwall is invisible to both.

```
MCP Client (Claude Code)
        |
        | stdin (JSON-RPC request)
        v
+------------------+
|    Toolwall       |
|  STDIO Proxy      |
|                  |
|  1. Parse JSON-RPC|
|  2. Cache lookup  |
|  3. Forward to    |
|     target stdin  |
|  4. Read target   |
|     stdout        |
|  5. OOM guard     |
|  6. DLP sanitize  |
|  7. Cache store   |
|  8. Return to     |
|     client stdout |
+------------------+
        |
        | stdin (JSON-RPC request, unmodified)
        v
  MCP Server (target process)
```

**Startup sequence:**

1. CLI parses target command from `--target` flag or `MCP_TARGET_COMMAND` environment variable
2. Toolwall spawns the target MCP server as a child process with piped stdio
3. Readline interfaces attach to both client stdin and target stdout
4. Admin HTTP server starts on port 9090 if `MCP_ADMIN_ENABLED=true`

**Inbound flow (client to target):**

1. Client sends a JSON-RPC line to Toolwall's stdin
2. Parser validates JSON structure and JSON-RPC 2.0 conformance
3. For `tools/call` requests: L1 (LRU in-memory) and L2 (SQLite on-disk) cache lookup
4. On cache hit: immediate response, target process never contacted
5. On cache miss: request forwarded to target's stdin, pending timeout registered

**Outbound flow (target to client):**

1. Target emits a JSON-RPC response line on stdout
2. Response matched to pending request by ID, timeout cleared
3. OOM guard checks serialized byte length against 5 MB hard limit
4. Shadow Leak Sanitizer strips secrets from the response body
5. Sanitized response cached (if tool is in the cacheable set)
6. Clean response written to client's stdout

### Fail-Closed Guarantee

Every failure mode results in a denied response, never a passthrough.

| Failure | Behavior |
|---|---|
| Target process crashes | All pending requests receive `TARGET_UNAVAILABLE` error |
| Target emits invalid JSON | Target terminated, pending requests failed |
| Target response timeout (30s default) | `TARGET_RESPONSE_TIMEOUT` error returned |
| Response exceeds 5 MB | Response discarded, `Response Too Large` error (code `-32000`) returned |
| Client disconnects | Target stdin closed, proxy shuts down |
| JSON parse error on client input | `Parse error` (code `-32700`) returned |

No request is ever silently dropped. No response is ever silently truncated. Every denial is a valid JSON-RPC 2.0 error.

### OOM Protection

Previous implementations truncated oversized responses at the byte boundary, producing invalid JSON that hung the MCP client. Current implementation discards the entire response buffer and returns a well-formed error:

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

The MCP protocol contract is never violated. The client receives a parseable error and can retry or report.

---

## Shadow Leak Sanitizer

The DLP layer operates on every outbound response. It performs recursive traversal of the entire JSON payload and applies pattern-based redaction at two levels: structural (object keys) and textual (string values).

### Key-Level Redaction

Object keys matching any of the following patterns have their values replaced with `[REDACTED]`:

| Pattern | Matches |
|---|---|
| `/token/i` | `token`, `accessToken`, `refreshToken` |
| `/secret/i` | `clientSecret`, `secret_key` |
| `/password/i` | `password`, `db_password` |
| `/key$/i` | `apiKey`, `privateKey` |
| `/api[_-]?key/i` | `api_key`, `API-KEY`, `apikey` |
| `/authorization/i` | `authorization`, `Authorization` |
| `/credential/i` | `credential`, `credentials` |
| `/private[_-]?key/i` | `private_key`, `privateKey` |
| `/access[_-]?token/i` | `access_token`, `accessToken` |
| `/refresh[_-]?token/i` | `refresh_token` |
| `/session[_-]?id/i` | `session_id`, `sessionId` |

### Value-Level Redaction

String values are scanned for inline secrets and PII:

| Category | Action |
|---|---|
| Bearer tokens | `Authorization: Bearer sk-abc123` becomes `Authorization: Bearer [REDACTED]` |
| Inline assignments | `API_KEY=abc123` becomes `API_KEY=[REDACTED]` |
| IP addresses | `192.168.1.100` becomes `[REDACTED_IP]` |
| Email addresses | `admin@corp.com` becomes `[REDACTED_EMAIL]` |
| Sensitive file paths | `/home/user/.ssh/id_rsa` becomes `[REDACTED_PATH]` |
| Stack traces | `at Module._compile (node:...)` becomes `[REDACTED]` |

### Path Sensitivity

Not all file paths are redacted. Only paths matching infrastructure-sensitive patterns:

`/etc/`, `.env`, `.ssh/`, `.git/`, `/home/`, `/root/`, `node_modules/`, `.npmrc`, `.aws/`

Application-level paths like `/api/v1/users` pass through unmodified.

---

## Binary Distribution

Toolwall compiles to a single executable via `bun build --compile`. The resulting binary contains the entire Node.js runtime, all dependencies, and application code. No `node_modules`. No `package.json`. No `npm install`.

**Build:**

```bash
npm run build:bin
```

**Output:** a single `toolwall` executable (approximately 50-90 MB depending on platform).

**Deployment in a corporate environment:**

1. Copy the binary to the target machine
2. Place the `ui/dist` directory adjacent to the binary (for Admin UI)
3. Configure the MCP client to use Toolwall as the command wrapper

```json
{
  "mcpServers": {
    "protected-server": {
      "command": "/opt/toolwall/toolwall",
      "args": ["--target", "node /opt/mcp/server.js"]
    }
  }
}
```

**Advantages over npm distribution:**

- No dependency resolution on air-gapped networks
- No `node_modules` supply-chain attack surface
- Deterministic binary hash for compliance audits
- Single artifact for container images, VM golden images, and endpoint management systems

The binary auto-detects whether it runs inside a Bun-compiled context and resolves the Admin UI static assets relative to `process.execPath` rather than `process.cwd()`.

---

## Monitoring and Management

### Admin HTTP API

Available when `MCP_ADMIN_ENABLED=true`. Runs on port `9090` (configurable via `MCP_ADMIN_PORT`). Protected by `ADMIN_TOKEN` (minimum 32 characters, Bearer auth).

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | No | Liveness check |
| `/stats` | GET | No | Aggregated stats (routes, cache, rate limits, blocked requests) |
| `/metrics` | GET | No | Prometheus-format metrics scrape endpoint |
| `/routes` | GET | No | List registered downstream routes |
| `/routes` | POST | Yes | Register a downstream HTTP tool route |
| `/routes/:toolName` | DELETE | Yes | Remove a route |
| `/routes` | DELETE | Yes | Clear all routes |
| `/cache/stats` | GET | No | L1/L2 cache hit ratios and entry counts |
| `/cache` | POST | Yes | Reinitialize cache with new config |
| `/cache` | DELETE | Yes | Clear all cache entries |
| `/rate-limit/stats` | GET | No | Global and per-tenant rate limit state |
| `/rate-limit/tenant` | POST | Yes | Configure per-tenant rate limits |
| `/rate-limit/tenant/:tenantId` | DELETE | Yes | Remove tenant rate limit |
| `/preflight/stats` | GET | No | Preflight token stats |
| `/preflight` | POST | Yes | Register a preflight token |
| `/preflight` | DELETE | Yes | Clear all preflight tokens |
| `/blocked-requests/stats` | GET | No | Blocked request breakdown by denial code |

### Prometheus Metrics

Exposed at `GET /metrics` in OpenMetrics text format. Scrape interval: any.

```
mcp_firewall_http_requests_total
mcp_firewall_stdio_requests_total
mcp_firewall_blocked_requests_total
mcp_firewall_blocked_requests_by_code_total{code="RATE_LIMIT_EXCEEDED"}
mcp_firewall_registered_routes
mcp_firewall_cache_hits_total
mcp_firewall_cache_misses_total
mcp_firewall_cache_l1_entries
mcp_firewall_cache_l2_entries
mcp_firewall_preflight_pending
mcp_firewall_preflight_consumed
```

### Admin UI

A React-based dashboard served as static files from the Admin HTTP server. Provides real-time visibility into:

- Active route registrations
- Cache hit/miss ratios
- Rate limit counters
- Blocked request history with denial codes

The UI is optional. All functionality is available via the REST API.

### Two-Tier Cache

| Tier | Backend | Eviction | Persistence |
|---|---|---|---|
| L1 | LRU in-memory (1000 entries default) | TTL + LRU | Process-local, lost on restart |
| L2 | SQLite on-disk (`.mcp-cache/` directory) | TTL | Survives restarts |

Read-heavy tools (`read_file`, `list_directory`, `search_files`) are cached by default. Write tools (`write_file`, `execute_command`) are never cached. Cache behavior is configurable per-tool via `alwaysCacheTools` and `neverCacheTools` arrays.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MCP_TARGET_COMMAND` | — | Target MCP server command |
| `MCP_TARGET_ARGS_JSON` | — | JSON array of target args |
| `MCP_TARGET` | — | Full target command string (fallback) |
| `MCP_TARGET_TIMEOUT_MS` | `30000` | Target response timeout |
| `MCP_ADMIN_ENABLED` | `false` | Enable Admin API |
| `MCP_ADMIN_PORT` | `9090` | Admin API port |
| `MCP_CACHE_DIR` | `.mcp-cache` | SQLite cache directory |
| `MCP_CACHE_TTL_SECONDS` | `300` | Cache entry TTL |
| `PROXY_AUTH_TOKEN` | — | NHI auth token for fail-closed auth |
| `ADMIN_TOKEN` | — | Admin API bearer token (min 32 chars) |
| `MCP_ADMIN_CORS_ORIGIN` | `*` | CORS origin for Admin API |
| `PORT` / `MCP_PORT` | `3000` | HTTP proxy port |

---

## Quick Start

**STDIO mode (wrap an MCP server):**

```bash
npx toolwall --target "node my-mcp-server.js"
```

**With admin dashboard:**

```bash
MCP_ADMIN_ENABLED=true ADMIN_TOKEN=your-32-char-minimum-secret-token npx toolwall --target "node my-mcp-server.js"
```

**Claude Code MCP config:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["toolwall", "--target", "node my-mcp-server.js"]
    }
  }
}
```

---

## License

MIT
