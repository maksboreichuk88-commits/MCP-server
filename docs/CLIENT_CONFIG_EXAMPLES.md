## Client Config Examples

The package name is `@maksiph14/toolwall`. The CLI binary name is `toolwall`.

Use this page when wiring `toolwall` into a local MCP setup.
The default path is the protected downstream proxy for one local filesystem/search-style workflow.
The main fit is one protected local filesystem/search workflow over `stdio`.

## Canonical protected downstream config

Use this when you already have an MCP server and want the firewall in front of it.

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

Target input notes:

- prefer `npx -y @maksiph14/toolwall -- <target-command> <target-args>` in client configs
- use `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS_JSON` when the client cannot pass arguments after `--`
- use `MCP_TARGET_ARGS` only when JSON array args are not available
- use `MCP_TARGET` only as a full-command fallback
- set `MCP_TARGET_TIMEOUT_MS` when you need a downstream timeout other than the default `30000`

If `PROXY_AUTH_TOKEN` is configured, client requests must carry `_meta.authorization` in the request body. See `scripts/stdio-demo.mjs` for a concrete Bearer envelope example.

## Proof-only demo target

Use this when you want the smallest reproducible protected workflow backed by the repo-local demo target.

```powershell
npx --yes @maksiph14/toolwall -- node C:/absolute/path/to/toolwall/examples/demo-target.js
```

Example request shape:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_files",
    "arguments": {
      "query": "TODO"
    },
    "_meta": {
      "authorization": "Bearer BASE64_JSON_TOKEN"
    }
  }
}
```

This is a demo path for proof and regression testing, not a full filesystem MCP server.

High-trust note:

- `execute_command`, `fetch_url`, `write_file`, `write`, and `create_file` are treated as high-trust tool families by default
- they require a valid `preflightId` even when the caller does not mark `_meta.color` as `blue`
- the short demo path intentionally sticks to safe `search_files`; use the benchmark corpus for the blocked high-trust path

## Secondary paths

### Embedded fallback path

Use this when you want the packaged status and launch-guidance tools without configuring another downstream target.

```json
{
  "mcpServers": {
    "toolwall": {
      "command": "npx",
      "args": ["-y", "@maksiph14/toolwall"]
    }
  }
}
```

This path:

- launches the normal CLI entrypoint
- falls back to the bundled `--embedded-target` path when no downstream target is configured
- exposes runtime status and launch guidance tools without another target command

### Direct terminal and CLI flow

```bash
npx --yes @maksiph14/toolwall --help
npx --yes @maksiph14/toolwall
npx --yes @maksiph14/toolwall -- node C:/absolute/path/to/your-mcp-server.js
```
