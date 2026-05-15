# Quickstart

Updated: 2026-05-15

Use this path to prove the stdio boundary with the repo-local demo target.

Prerequisites:

- Node.js `>=20.0.0`
- npm

## 1. Install dependencies

```bash
npm ci
```

## 2. Build

```bash
npm run build
```

## 3. Run the stdio demo

```bash
npm run demo:stdio
```

Expected output:

```text
stdio demo passed
allow: tool=search_files callCount=1
cache: second response matched first response for tool=search_files
block: ShadowLeak request denied with code=SHADOWLEAK_DETECTED
block: missing auth denied with code=AUTH_FAILURE
```

The demo verifies:

- safe `search_files` traffic reaches the downstream target
- repeated allow traffic can be served from cache
- exfiltration-shaped `fetch_url` traffic is denied before downstream execution
- missing-auth traffic fails closed

## 4. Wire a real downstream target

Replace the target command after `--` with your MCP server:

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

Use:

- `npx -y @maksiph14/toolwall` as the Toolwall package entry point
- `--` to separate Toolwall arguments from the downstream MCP target command
- `node C:/absolute/path/to/your-mcp-server.js` as the downstream target placeholder

Set `PROXY_AUTH_TOKEN` only when the agent can also send `_meta.authorization` in each protected `tools/call` request.

For more examples, see [CLIENT_CONFIG_EXAMPLES.md](CLIENT_CONFIG_EXAMPLES.md).

## 5. Docker path

Docker starts the HTTP gateway and admin/dashboard surfaces.

```bash
docker compose up -d --build toolwall
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:9090/api/stats
docker compose down
```

Docker Compose requires `PROXY_AUTH_TOKEN` and `ADMIN_TOKEN` in `.env`.

## 6. Run local validation

```bash
npm run typecheck
npm run build
npm run assert:package-metadata
npm test
npm run demo:stdio
npm run pack:dry-run
npm run pack:smoke
```

Use `npm run verify:all` for the full local chain, including UI build and lint.

## Scope

This quickstart does not prove:

- a public release happened
- every MCP tool family is covered equally
- complete semantic prompt-injection prevention
- post-execution containment after a tool has already started

See [LIMITS_AND_NON_GOALS.md](LIMITS_AND_NON_GOALS.md).
