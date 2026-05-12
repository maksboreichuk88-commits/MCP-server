# Quickstart

Updated: 2026-04-06

Use this page when you want the shortest path from clone to a real local proof.

This quickstart is intentionally narrow:
- one local filesystem/search-style downstream target
- one protected `stdio` boundary
- one repo-local proof command sequence

## 1. Install Dependencies

```bash
npm install
```

## 2. Build The Current Tree

```bash
npm run build
```

## 3. Run The Flagship Proof Path

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

What this proves:

- safe `search_files` traffic reaches the downstream target
- repeated allow traffic can be cached without changing the answer
- exfiltration-shaped `fetch_url` traffic is denied before downstream execution
- missing-auth traffic is denied at the transport boundary

## 4. Wire A Real Downstream Target

After the demo path passes, switch from the repo demo target to your own local MCP server:

```json
{
  "mcpServers": {
    "protected-local-tooling": {
      "command": "npx",
      "args": ["-y", "toolwall"],
      "env": {
        "PROXY_AUTH_TOKEN": "replace-with-32-byte-secret",
        "MCP_TARGET_COMMAND": "node",
        "MCP_TARGET_ARGS_JSON": "[\"C:/absolute/path/to/your-mcp-server.js\"]"
      }
    }
  }
}
```

Use:
- `PROXY_AUTH_TOKEN` for the shared-secret auth envelope
- `MCP_TARGET_COMMAND` and `MCP_TARGET_ARGS_JSON` as the canonical downstream target inputs

For more examples, see [CLIENT_CONFIG_EXAMPLES.md](CLIENT_CONFIG_EXAMPLES.md).

## 5. Run The Deeper Local Checks

If the short proof path looks correct, run the deeper local verification chain:

```bash
npm run typecheck
npm run assert:package-metadata
npm test
npm run pack:dry-run
npm run pack:smoke
```

For the compact proof pack, use [EVIDENCE_BUNDLE.md](EVIDENCE_BUNDLE.md).

## 6. What This Quickstart Does Not Prove

This quickstart does not prove:

- a public release happened
- every MCP tool family is covered equally
- complete semantic prompt-injection prevention
- post-execution containment after a tool has already started

Those boundaries are intentional. See [LIMITS_AND_NON_GOALS.md](LIMITS_AND_NON_GOALS.md).
