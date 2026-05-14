# New-User Dry Run Report

Date: 2026-05-14

Scope:

- `README.md` Docker install path
- `README.md` architecture/review entry path
- `docs/QUICKSTART.md`
- `docs/ARCHITECTURE.md`
- `docker-compose.yml` as supporting configuration evidence

Execution mode:

- no code or existing documentation was changed
- `docker compose up --build toolwall` was not executed because it would build images, start a container, create/update Docker resources, and possibly pull/install dependencies
- the dry run follows only commands and links that are written in the current documentation
- missing steps were not inferred as successful setup steps

## Summary

The onboarding path is not complete for a new external user.

The Docker command is present, but the surrounding operational steps are incomplete. The local quickstart has a runnable proof sequence in principle, but it is not linked from the top README review entries and it has package identity ambiguity. The documentation does not clearly explain how a local agent such as Claude Code should connect to a Docker-started Toolwall instance.

## Step Log

### Step 1: Start from `README.md`

Observed top links:

- `How to Install (Docker)`
- `How it Works (Architecture)`
- `Proof of Security (Evidence Bundle)`

Result:

- the top-level review path points to Docker and architecture
- `docs/QUICKSTART.md` is not present in the initial review entry list
- a new user looking for the shortest local proof path may not discover the quickstart before trying Docker

Friction:

- the request path from repository landing page to first successful local proof is split between README and `docs/QUICKSTART.md`
- the README architecture link is a diagram, not an operational quickstart

### Step 2: Run Docker install command exactly as written

Command in README:

```bash
docker compose up --build toolwall
```

Configuration evidence from `docker-compose.yml`:

- service: `toolwall`
- container name: `toolwall`
- exposed ports: `3000:3000`, `9090:9090`
- volume: `toolwall-data:/data`
- defaults: `MCP_ADMIN_ENABLED=true`, `MCP_ADMIN_PORT=9090`, `MCP_CACHE_DIR=/data/.mcp-cache`
- default tokens are set through Compose interpolation:
  - `PROXY_AUTH_TOKEN=${PROXY_AUTH_TOKEN:-12345678901234567890123456789012}`
  - `ADMIN_TOKEN=${ADMIN_TOKEN:-abcdefghijklmnopqrstuvwxyz123456}`

Strict dry-run result:

- if the user is not already in a cloned repository root, the command has no defined working directory and will fail due to missing `docker-compose.yml`
- the README Docker section does not include `git clone`, `cd`, Docker version, Compose v2 requirement, or expected first-run duration
- the README Docker section does not define how to set secure `PROXY_AUTH_TOKEN` and `ADMIN_TOKEN` before first run
- the README Docker section does not show a success check such as `/health`, logs, or expected console output
- the README Docker section does not show a stop command or cleanup path

Friction:

- new user cannot validate whether the container is healthy from the README alone
- new user may start with default admin/proxy tokens without understanding that they are defaults
- new user does not know whether Docker mode is intended for demo, HTTP gateway use, dashboard review, or real local-agent protection

### Step 3: Inspect exposed surfaces after Docker start

README says:

| Port | Surface |
|---|---|
| `3000` | MCP HTTP gateway |
| `9090` | Admin API, dashboard, and metrics when enabled |

Strict dry-run result:

- exact dashboard URL is not stated
- exact health URL is not stated
- exact metrics URL is not stated
- admin authentication method is not stated in the Docker section
- no browser instruction is given for the dashboard
- no API request example is given for `/mcp`

Friction:

- the user sees port `9090`, but cannot tell whether to open `http://localhost:9090/`, `http://localhost:9090/dashboard`, `http://localhost:9090/api/stats`, or another path
- the user sees port `3000`, but cannot tell which MCP HTTP request to send or how target routing is configured

### Step 4: Determine whether Docker path protects a local Claude Code workflow

Observed README facts:

- Docker section exposes an HTTP gateway and admin/dashboard ports
- architecture states the primary path is stdio interception between MCP client and downstream MCP tool server
- README client config example uses a local executable:

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

Strict dry-run result:

- README does not show a Claude Code configuration that connects to the Docker container
- README does not state whether Claude Code should use stdio, HTTP, or a local wrapper command when Docker is running
- README does not show how a Docker container reaches a host-local MCP server or host-local filesystem target
- Docker Compose does not define `MCP_TARGET_COMMAND`, `MCP_TARGET_ARGS_JSON`, a mounted target script, or a gateway route file in the documented Docker section

Friction:

- it is not clear whether `docker compose up --build toolwall` alone creates a usable protected MCP target
- it is not clear how to connect a local agent to `localhost:3000`
- it is not clear how to preserve the primary stdio security boundary when Toolwall runs inside a container
- for host-local filesystem protection, the container boundary introduces volume/target visibility questions that are not documented in the README Docker path

Answer to explicit dry-run question:

- no, it is not clear from `README.md` how to connect a local agent such as Claude Code to the raised Docker container

### Step 5: Follow `docs/ARCHITECTURE.md`

Observed content:

- one Mermaid diagram
- primary path: MCP client or agent runtime -> `toolwall` -> local/downstream MCP tool server
- secondary observability surfaces: `/metrics`, `/stats`, admin API, dashboard

Strict dry-run result:

- the architecture page explains boundaries, not setup
- no commands are present
- no Docker-specific route is present
- no client configuration link is present
- no dashboard/admin URL is present

Friction:

- useful for orientation after setup
- insufficient as a first-run operational guide

### Step 6: Follow `docs/QUICKSTART.md`

Commands:

```bash
npm install
npm run build
npm run demo:stdio
```

Strict dry-run result:

- the sequence is explicit and has expected output
- Node version is not stated in the quickstart; `package.json` requires Node `>=20.0.0`
- no `npm --prefix ui install` is needed for this quickstart, but this is not explicitly stated
- the quickstart is a local repo proof path, not the Docker path

Friction:

- new user may not know Node 20 is required until npm or runtime fails
- the quickstart is not surfaced in README review entry points

### Step 7: Wire a real downstream target from Quickstart

Quickstart config:

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

Strict dry-run result:

- package identity is ambiguous: `package.json` says the npm package is `@maksiph14/toolwall`, while the quickstart and README badge use `toolwall`
- if the public package name is scoped, `npx -y toolwall` is not the same install target as `npx -y @maksiph14/toolwall`
- the config says requests must carry `_meta.authorization`, but it does not show where Claude Code users configure that Bearer envelope
- the config does not name the exact Claude Code config file path or setup command
- the placeholder `C:/absolute/path/to/your-mcp-server.js` assumes the user already has a local MCP server; no minimal external target recommendation is provided in this section

Friction:

- new user may copy the config and fail at package resolution
- new user may configure Toolwall but still fail all calls due to missing `_meta.authorization`
- new user may not know whether this config belongs in Claude Code, Cursor, Windsurf, or another MCP client

## Onboarding Gaps

1. README Docker install lacks repository clone / working-directory prerequisites.
2. README Docker install lacks Docker/Compose prerequisites and expected first-run behavior.
3. README Docker install lacks secure token setup instructions for `PROXY_AUTH_TOKEN` and `ADMIN_TOKEN`.
4. README Docker install lacks health-check, dashboard URL, metrics URL, and admin authentication examples.
5. README Docker install does not explain whether the container is demo-only, HTTP gateway mode, or a usable local-agent protection mode.
6. README does not explain how Claude Code connects to a Docker-started Toolwall instance.
7. README does not show a sample HTTP `/mcp` request or route registration flow for the Docker HTTP gateway.
8. Architecture page is useful as a diagram but not as an operational quickstart.
9. Quickstart is not linked from the README review entry points.
10. Quickstart omits the Node `>=20.0.0` prerequisite.
11. Quickstart uses `npx -y toolwall`, while `package.json` identifies the package as `@maksiph14/toolwall`.
12. Quickstart states that `_meta.authorization` is required when `PROXY_AUTH_TOKEN` is configured, but it does not show how a Claude Code user injects that authorization envelope.
13. Real-target setup assumes the user already has a local MCP server script and knows how to expose it to Toolwall.
14. Docker mode does not explain host filesystem/target visibility, which matters for local filesystem protection.

## What Worked

- The local proof path in `docs/QUICKSTART.md` is linear and has expected output.
- The architecture diagram clearly shows the intended stdio boundary.
- The Docker Compose service has persistent storage configured through `toolwall-data:/data`.
- The Docker Compose service exposes the documented ports `3000` and `9090`.

## Dry-Run Conclusion

The onboarding is not yet launch-ready for a cold external user.

The most important missing bridge is between the Docker command and actual protected agent use. A user can start a container, but the current README does not tell them how to verify the dashboard, how to authenticate to admin surfaces, how to register or target a downstream MCP server, or how Claude Code should connect to the running container.
