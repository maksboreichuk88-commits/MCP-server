# Runtime Contract

This file defines runtime behavior for the checked-out Toolwall codebase.

## Supported entry points

```bash
npx -y @maksiph14/toolwall --help
npx -y @maksiph14/toolwall -- node C:/absolute/path/to/mcp-server.js
npm install -g @maksiph14/toolwall
toolwall -- node C:/absolute/path/to/mcp-server.js
```

## Runtime paths

| Path | Entrypoint | Behavior |
|---|---|---|
| stdio downstream proxy | `toolwall -- <target> [args...]` | starts `src/stdio/proxy.ts` and proxies MCP JSON-RPC over stdio |
| env-configured stdio proxy | `toolwall` plus target env vars | resolves target from environment |
| embedded fallback | no explicit target | starts bundled status/help tools through `src/embedded/server.ts` |
| HTTP gateway | `toolwall --config targets.json` | starts HTTP `/mcp` gateway for multiple configured targets |

Target resolution order:

1. explicit target after `--`
2. `--target "<command>"`
3. `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS_JSON`
4. `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS`
5. `MCP_TARGET`
6. embedded fallback target

## Inspected wire scope

- request inspection applies to JSON-RPC `tools/call`
- trust gates run before downstream execution
- non-`tools/call` JSON-RPC messages pass through the stdio proxy without trust-gate evaluation
- downstream JSON-RPC `result` and `error` payloads are size-checked before sanitization
- downstream payloads are sanitized before they return to the caller

## Trust-gate order

1. shared-secret authorization and scope extraction when `PROXY_AUTH_TOKEN` is configured
2. scope validation when auth is configured
3. AST egress validation
4. color-boundary validation
5. preflight validation for explicit `blue` actions and default high-trust tools
6. rate-limit check
7. cache lookup for cacheable tools
8. downstream forwarding

HTTP middleware may also run strict registered schema validation before route handling.

Blocked requests fail closed and are not forwarded.

## Denial surfaces

| Class | Code |
|---|---|
| invalid or missing auth | `AUTH_FAILURE` |
| missing tool scope | `MISSING_SCOPE` |
| mixed trust domains | `CROSS_TOOL_HIJACK_ATTEMPT` |
| missing approval for high-trust tools | `PREFLIGHT_REQUIRED` |
| expired or unknown approval | `PREFLIGHT_NOT_FOUND` |
| replayed approval | `PREFLIGHT_ALREADY_USED` |
| strict schema mismatch | `SCHEMA_VALIDATION_FAILED` |
| ShadowLeak URL exfiltration | `SHADOWLEAK_DETECTED` |
| sensitive path marker | `SENSITIVE_PATH_BLOCKED` |
| shell-injection marker | `SHELL_INJECTION_BLOCKED` |
| instruction-override marker | `EPISTEMIC_CONTRADICTION_DETECTED` |
| target/tool rate limit | `RATE_LIMIT_EXCEEDED` |

## Error response contract

Stdio failures are JSON-RPC 2.0 responses.

HTTP `/mcp` failures use JSON-RPC 2.0 when the request body is JSON-RPC-like:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32004,
    "message": "Fail-Closed: target process is unavailable.",
    "data": {
      "code": "TARGET_UNAVAILABLE"
    }
  }
}
```

Non-JSON-RPC HTTP requests keep a plain error body:

```json
{
  "error": {
    "code": "INVALID_MCP_REQUEST",
    "message": "Fail-Closed"
  }
}
```

## Downstream failure behavior

| Failure | Behavior |
|---|---|
| invalid client JSON | JSON-RPC parse error `-32700` |
| invalid request shape | JSON-RPC invalid request `-32600` |
| target spawn failure | fail closed with `TARGET_UNAVAILABLE` |
| target invalid JSON | fail pending requests with `TARGET_INVALID_JSON` and terminate target |
| target timeout | fail request with `TARGET_RESPONSE_TIMEOUT` |
| target process close with pending requests | fail pending requests with `TARGET_CLOSED` |
| oversized stdio response | fail request with JSON-RPC code `-32005` |
| oversized HTTP target response | fail request with `TARGET_RESPONSE_TOO_LARGE` |

## Caching

Cacheable by default:

- `read_file`
- `read`
- `open_file`
- `list_directory`
- `list_files`
- `search_files`
- `search`

Never cached by default:

- `write_file`
- `write`
- `create_file`
- `execute_command`
- `execute`

L1 cache is in memory. L2 cache is SQLite under `MCP_CACHE_DIR` or `.mcp-cache`.

## Persistence

| State | Durability |
|---|---|
| L1 cache | process memory |
| L2 cache | SQLite |
| security event history | SQLite with TTL and max-row pruning |
| route registry | `route-registry.json` under cache root |
| preflight IDs | process memory |
| consumed preflight IDs | process memory |
| color-boundary session | process memory |
| tenant rate-limit overrides | process memory |

## Runtime variables

| Variable | Default | Mode | Behavior |
|---|---:|---|---|
| `PROXY_AUTH_TOKEN` | unset | stdio, HTTP | shared-secret auth |
| `MCP_TARGET_COMMAND` | unset | stdio | target executable |
| `MCP_TARGET_ARGS_JSON` | unset | stdio | JSON array target args |
| `MCP_TARGET_ARGS` | unset | stdio | space-delimited args |
| `MCP_TARGET` | unset | stdio | full command fallback |
| `MCP_TARGET_TIMEOUT_MS` | `30000` | stdio | downstream timeout |
| `MCP_CACHE_DIR` | `.mcp-cache` | stdio, HTTP | SQLite/cache root |
| `MCP_CACHE_TTL_SECONDS` | `300` | stdio, HTTP | cache TTL |
| `MCP_SERVER_ID` | `default` or `gateway` | cache | cache namespace |
| `MCP_ADMIN_ENABLED` | `false` | admin | starts admin API/dashboard |
| `MCP_ADMIN_PORT` | `9090` | admin | admin port |
| `MCP_ADMIN_CORS_ORIGIN` | `*` | admin | CORS origin |
| `ADMIN_TOKEN` | unset | admin | admin mutation bearer token |
| `MCP_PORT` | `3000` | HTTP | HTTP gateway port |
| `MCP_HTTP_JSON_LIMIT_BYTES` | `1048576` | HTTP/admin | JSON body limit |
| `MCP_SNIPPET_MAX_LENGTH` | `240` | logging | snippet cap |
| `MCP_RATE_LIMIT_WINDOW_MS` | `60000` | all | rate-limit window |
| `MCP_RATE_LIMIT_MAX_REQUESTS` | `50` | all | max requests per key/window |
| `MCP_RATE_LIMIT_MAX_KEYS` | `10000` | all | max in-memory keys |
| `MCP_RATE_LIMIT_CLEANUP_INTERVAL_MS` | `60000` | all | cleanup cadence |
| `MCP_RATE_LIMIT_MAX_KEY_LENGTH` | `512` | all | raw key cap before hashing |
| `MCP_TENANT_RATE_LIMIT_MAX_ENTRIES` | `1000` | admin | max tenant overrides |
| `MCP_STDIO_MAX_PENDING_REQUESTS` | `1000` | stdio | max in-flight requests |
| `MCP_STDIO_MAX_LINE_BYTES` | `10485760` | stdio | max JSON line size |
| `MCP_STDIO_MAX_RESPONSE_BYTES` | `5242880` | stdio | max serialized response |
| `MCP_AUDIT_LOG_MAX_ENTRY_BYTES` | `16384` | logging | audit entry cap |

Legacy fallback variables still read by code: `PORT`, `ADMIN_ENABLED`, `ADMIN_PORT`, `CACHE_DIR`, `CACHE_TTL_SECONDS`, `VERBOSE`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.
