# Toolwall

Fail-closed transport control for local MCP JSON-RPC tool traffic.

[![npm version](https://img.shields.io/npm/v/%40maksiph14%2Ftoolwall)](https://www.npmjs.com/package/@maksiph14/toolwall)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Entry points

- [Docker install](#docker-install)
- [npm stdio proxy](#npm-stdio-proxy)
- [Runtime modes](#runtime-modes)
- [Configuration](#configuration)
- [Architecture](docs/ARCHITECTURE.md)
- [Runtime contract](docs/RUNTIME_CONTRACT.md)
- [Evidence bundle](docs/EVIDENCE_BUNDLE.md)
- [Limits and non-goals](docs/LIMITS_AND_NON_GOALS.md)

## Runtime surfaces

| Surface | Purpose | Boundary |
|---|---|---|
| stdio proxy | Primary local MCP protection path | MCP client stdin/stdout to downstream MCP server stdin/stdout |
| HTTP `/mcp` gateway | Compatibility gateway for registered tools | HTTP JSON bodies routed to configured targets |
| Admin API/dashboard | Local operations and metrics | Secondary control plane on `MCP_ADMIN_PORT` |
| Prometheus metrics | Local telemetry | Admin surface at `/metrics` |

The stdio proxy is the primary security boundary. The HTTP gateway, admin API, dashboard, and metrics endpoint are secondary operator surfaces.

## Docker install

The repository ships a Node 20 multistage Docker build.

Runtime properties:

- builder image: `node:20-alpine`
- runner image: `node:20-alpine`
- runtime user: `node`
- entrypoint: `dumb-init --`
- command: `npm start`
- exposed ports: `3000`, `9090`
- persistent data: `/data/.mcp-cache`
- Compose volume: `toolwall-data:/data`
- Compose hardening: `init: true`, `cap_drop: [ALL]`, `no-new-privileges:true`

Prerequisites:

- Docker Engine with Docker Compose v2
- `.env` file with `PROXY_AUTH_TOKEN` and `ADMIN_TOKEN`

Clone the repository:

```bash
git clone https://github.com/shleder/toolwall.git
cd toolwall
```

Create `.env` in the repository root:

```env
PROXY_AUTH_TOKEN=12345678901234567890123456789012
ADMIN_TOKEN=abcdefghijklmnopqrstuvwxyz123456
```

Start the service:

```bash
docker compose up -d --build toolwall
```

Verify:

```bash
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:9090/health
curl -fsS http://localhost:9090/api/stats
```

Open the dashboard:

```text
http://localhost:9090
```

Admin mutation endpoints require:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

Stop:

```bash
docker compose down
```

## npm stdio proxy

Use this mode for local MCP clients that launch servers through `stdio`.

```json
{
  "mcpServers": {
    "protected-local-tooling": {
      "command": "npx",
      "args": [
        "-y",
        "@maksiph14/toolwall",
        "--",
        "node",
        "C:/absolute/path/to/your-mcp-server.js"
      ]
    }
  }
}
```

Everything after `--` is the downstream MCP target command.

Do not set `PROXY_AUTH_TOKEN` unless the client can send `_meta.authorization` in each protected `tools/call` request.

## Runtime modes

| Mode | Command | Behavior |
|---|---|---|
| stdio downstream proxy | `toolwall -- <target> [args...]` | Validates and forwards JSON-RPC traffic to the target process |
| env-configured stdio proxy | `toolwall` with `MCP_TARGET_COMMAND` | Resolves target from environment |
| embedded fallback | `toolwall` with no target | Starts bundled status/help MCP tools |
| HTTP gateway | `toolwall --config targets.json` | Starts HTTP `/mcp` gateway for configured targets |

Target resolution order:

1. arguments after `--`
2. `--target "<command>"`
3. `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS_JSON`
4. `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS`
5. `MCP_TARGET`
6. bundled embedded fallback

## Trust gates

For inspected `tools/call` requests, Toolwall applies fail-closed checks before downstream execution.

| Gate | Denial code |
|---|---|
| shared-secret auth | `AUTH_FAILURE` |
| tool scope | `MISSING_SCOPE` |
| color boundary | `CROSS_TOOL_HIJACK_ATTEMPT` |
| AST egress patterns | `SHADOWLEAK_DETECTED`, `SENSITIVE_PATH_BLOCKED`, `SHELL_INJECTION_BLOCKED`, `EPISTEMIC_CONTRADICTION_DETECTED` |
| high-trust preflight | `PREFLIGHT_REQUIRED`, `PREFLIGHT_NOT_FOUND`, `PREFLIGHT_ALREADY_USED` |
| strict registered tool schema | `SCHEMA_VALIDATION_FAILED` |
| rate limit | `RATE_LIMIT_EXCEEDED` |

Blocked requests are not forwarded to the downstream target.

## Response handling

Downstream `result` and `error` payloads are size-checked and sanitized before they return to the client.

Sanitizer bounds:

| Limit | Default |
|---|---:|
| maximum recursion depth | `20` |
| maximum array items traversed | `1000` |
| maximum object keys traversed | `1000` |
| maximum string processed by regex redaction | `1048576` bytes |

Stdio response size guard:

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "error": {
    "code": -32005,
    "message": "Fail-Closed: Response exceeds strict OOM size limit.",
    "data": {
      "limit": 5242880
    }
  }
}
```

## Error response shape

Stdio responses are JSON-RPC 2.0.

HTTP `/mcp` returns JSON-RPC 2.0 errors when the request body is JSON-RPC-like:

```json
{
  "jsonrpc": "2.0",
  "id": "route-miss-1",
  "error": {
    "code": -32004,
    "message": "Fail-Closed: tool \"search_files\" has no registered target server.",
    "data": {
      "code": "UNKNOWN_ROUTE"
    }
  }
}
```

Non-JSON-RPC HTTP requests keep the plain HTTP shape:

```json
{
  "error": {
    "code": "INVALID_MCP_REQUEST",
    "message": "Fail-Closed"
  }
}
```

## Persistence and logs

| Data | Location | Persistence |
|---|---|---|
| audit JSON lines | `audit.log` in process working directory | process-local file |
| L2 cache | `MCP_CACHE_DIR` or `.mcp-cache` | SQLite |
| security events | same SQLite database | retained by TTL and max-row pruning |
| route registry | `route-registry.json` under cache root | restored on process start |
| preflight IDs | memory | not durable |
| consumed preflight IDs | memory | not durable |
| color session state | memory | not durable |
| tenant rate-limit overrides | memory | not durable |

## Configuration

### Core environment variables

| Variable | Default | Surface | Behavior |
|---|---:|---|---|
| `PROXY_AUTH_TOKEN` | unset | stdio, HTTP | Enables shared-secret auth and scope extraction |
| `MCP_TARGET_COMMAND` | unset | stdio | Downstream target executable |
| `MCP_TARGET_ARGS_JSON` | unset | stdio | JSON array of target args |
| `MCP_TARGET_ARGS` | unset | stdio | Space-delimited target args fallback |
| `MCP_TARGET` | unset | stdio | Full target command fallback |
| `MCP_TARGET_TIMEOUT_MS` | `30000` | stdio | Downstream response timeout |
| `MCP_CACHE_DIR` | `.mcp-cache` | stdio, HTTP, Docker | L2 cache/security-log directory |
| `CACHE_DIR` | unset | stdio fallback | Legacy cache-dir fallback |
| `MCP_CACHE_TTL_SECONDS` | `300` | stdio, HTTP | Cache TTL in seconds |
| `CACHE_TTL_SECONDS` | unset | stdio fallback | Legacy cache-TTL fallback |
| `MCP_SERVER_ID` | `default` or `gateway` | cache | Cache key namespace |
| `MCP_VERBOSE` | `false` | stdio | Enables verbose stderr forwarding |
| `VERBOSE` | unset | stdio fallback | Legacy verbose fallback |

### HTTP/admin variables

| Variable | Default | Surface | Behavior |
|---|---:|---|---|
| `MCP_PORT` | `3000` | HTTP gateway | HTTP listener port |
| `PORT` | unset | HTTP fallback | Overrides `MCP_PORT` when set |
| `MCP_ADMIN_ENABLED` | `false` | admin | Enables admin API/dashboard |
| `ADMIN_ENABLED` | unset | admin fallback | Legacy admin-enable fallback |
| `MCP_ADMIN_PORT` | `9090` | admin | Admin listener port |
| `ADMIN_PORT` | unset | admin fallback | Legacy admin-port fallback |
| `ADMIN_TOKEN` | unset | admin | Bearer token for mutation endpoints |
| `MCP_ADMIN_CORS_ORIGIN` | `*` | admin | `Access-Control-Allow-Origin` |
| `MCP_HTTP_JSON_LIMIT_BYTES` | `1048576` | HTTP/admin | Express JSON body limit; valid range `1024` to `10485760` |

### Resource-limit variables

| Variable | Default | Behavior |
|---|---:|---|
| `MCP_SNIPPET_MAX_LENGTH` | `240` | Audit/error snippet length |
| `MCP_RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `RATE_LIMIT_WINDOW_MS` | unset | Legacy fallback for rate-limit window |
| `MCP_RATE_LIMIT_MAX_REQUESTS` | `50` | Requests per key/window |
| `RATE_LIMIT_MAX_REQUESTS` | unset | Legacy fallback for max requests |
| `MCP_RATE_LIMIT_MAX_KEYS` | `10000` | Maximum in-memory rate-limit keys |
| `MCP_RATE_LIMIT_CLEANUP_INTERVAL_MS` | `60000` | Rate-limit cleanup cadence |
| `MCP_RATE_LIMIT_MAX_KEY_LENGTH` | `512` | Maximum raw key length before hashing |
| `MCP_TENANT_RATE_LIMIT_MAX_ENTRIES` | `1000` | Maximum admin tenant override entries |
| `MCP_STDIO_MAX_PENDING_REQUESTS` | `1000` | Maximum in-flight stdio requests |
| `MCP_STDIO_MAX_LINE_BYTES` | `10485760` | Maximum stdio JSON line size |
| `MCP_STDIO_MAX_RESPONSE_BYTES` | `5242880` | Maximum serialized stdio response payload |
| `MCP_AUDIT_LOG_MAX_ENTRY_BYTES` | `16384` | Maximum serialized audit entry before truncation |

## Admin endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | no | Admin health |
| `GET /api/stats` | no | Dashboard stats payload |
| `GET /stats` | no | Same stats payload |
| `GET /metrics` | no | Prometheus text metrics |
| `GET /routes` | no | Registered routes |
| `POST /routes` | `ADMIN_TOKEN` | Register route |
| `DELETE /routes/:toolName` | `ADMIN_TOKEN` | Remove route |
| `DELETE /routes` | `ADMIN_TOKEN` | Clear routes |
| `POST /cache` | `ADMIN_TOKEN` | Initialize cache |
| `DELETE /cache` | `ADMIN_TOKEN` | Clear cache |
| `POST /preflight` | `ADMIN_TOKEN` | Register preflight ID |
| `DELETE /preflight` | `ADMIN_TOKEN` | Clear preflight registries |
| `POST /rate-limit/tenant` | `ADMIN_TOKEN` | Configure tenant rate limit override |
| `DELETE /rate-limit/tenant/:tenantId` | `ADMIN_TOKEN` | Remove tenant override |
| `DELETE /api/security-events` | `ADMIN_TOKEN` | Clear persisted security events |

## Local validation

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run demo:stdio
npm run pack:smoke
```

Full local verification:

```bash
npm run verify:all
```

## License

MIT