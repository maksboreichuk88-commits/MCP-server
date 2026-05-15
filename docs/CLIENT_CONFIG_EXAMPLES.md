# Client Config Examples

- Package: `@maksiph14/toolwall`
- CLI binary: `toolwall`

Use stdio proxy mode when an MCP client should launch Toolwall and Toolwall should launch the downstream MCP server.

## Canonical downstream proxy

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

Target rules:

- prefer `npx -y @maksiph14/toolwall -- <target-command> <target-args>`
- use `--` to separate Toolwall arguments from downstream target arguments
- set `MCP_TARGET_TIMEOUT_MS` to override the default `30000` ms response timeout

If `PROXY_AUTH_TOKEN` is configured, each protected `tools/call` request must carry `_meta.authorization`.

## Environment target fallback

Use this when the client cannot pass target arguments after `--`.

```json
{
  "mcpServers": {
    "protected-local-tooling": {
      "command": "npx",
      "args": ["-y", "@maksiph14/toolwall"],
      "env": {
        "MCP_TARGET_COMMAND": "node",
        "MCP_TARGET_ARGS_JSON": "[\"C:/absolute/path/to/your-mcp-server.js\"]"
      }
    }
  }
}
```

Fallback order:

1. `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS_JSON`
2. `MCP_TARGET_COMMAND` plus `MCP_TARGET_ARGS`
3. `MCP_TARGET`

## Demo target

Use the repo-local target for a minimal reproducible check.

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

The demo target is not a full filesystem MCP server.

## High-trust tools

These default tool families require a valid `preflightId`:

- `execute_command`
- `execute`
- `fetch_url`
- `write_file`
- `write`
- `create_file`

The demo path uses `search_files` to avoid preflight setup.

## Embedded fallback

Use this only for packaged status and launch-guidance tools.

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

## CLI checks

```bash
npx --yes @maksiph14/toolwall --help
npx --yes @maksiph14/toolwall
npx --yes @maksiph14/toolwall -- node C:/absolute/path/to/your-mcp-server.js
```
