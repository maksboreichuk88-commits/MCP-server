# Launch Texts (v2.2.8)

Public-text pack for the Toolwall `v2.2.8` release.

Tone constraint:

- factual, technical, no marketing language
- claims are bounded by `docs/EVIDENCE_BUNDLE.md` and `docs/LIMITS_AND_NON_GOALS.md`
- repository: `https://github.com/shleder/toolwall`
- npm package: `@maksiph14/toolwall`

Reading rule before reuse:

- do not extend any claim beyond the evidence bundle
- do not drop the limits / non-goals references

## 1. OpenAI Codex Application Pitch

Modern AI coding agents execute tools locally over the Model Context Protocol (MCP): file reads, shell commands, HTTP fetches, and database queries. Each `tools/call` argument and each tool response is an unmonitored data path. Without a transport-layer control, an agent can be steered by indirect prompt injection or by malicious tool input into reading sensitive paths (`.env`, `.ssh/`), running shell substitution, exfiltrating data through short-chunk URL parameters (ShadowLeak), or chaining red/blue tools across an unverified trust boundary.

Toolwall is a fail-closed gateway for local MCP traffic. It runs as an inspectable boundary in front of a downstream MCP target on `stdio` and as an HTTP gateway for registered routes. Before forwarding, every `tools/call` is checked by AST-egress filters (sensitive paths, shell substitution, ShadowLeak URL patterns, instruction-override text), NHI authorization, tool-scope validation, color-boundary checks, and preflight validation for high-trust tools. The latest `npm run benchmark:stdio` run reports `0` false positives, `0` false negatives, and `verdict: passed` on a 19-case corpus covering `SENSITIVE_PATH_BLOCKED`, `SHADOWLEAK_DETECTED`, `SHELL_INJECTION_BLOCKED`, `EPISTEMIC_CONTRADICTION_DETECTED`, `PREFLIGHT_REQUIRED`, and `CROSS_TOOL_HIJACK_ATTEMPT`. We are requesting access to the OpenAI Codex AI auditor because we need a continuous adversarial stress test of these filters against bypass and false-negative discovery. Our protected scope is the local developer file system, so any uncaught bypass class (path normalization tricks, alternative encodings, multi-step tool chains, novel injection phrasings) maps directly to disclosure of developer secrets and source code. A model-driven auditor running in parallel with our static corpus is the missing piece for ongoing filter pressure.

## 2. Hacker News / Reddit Post

**Title:** Show HN: Toolwall – A fail-closed firewall for local AI agents (MCP)

**Body:**

AI coding agents (Claude Code, Cursor, Windsurf, Codex CLI, Copilot CLI) increasingly get terminal and filesystem access through the Model Context Protocol. The risk surface is concrete: an agent can be coaxed into `read_file("/user/.env")`, into a shell-substitution command, or into a fetch URL whose query string is a covert exfiltration channel (ShadowLeak-style short-chunk parameters). Most current setups proxy this traffic without inspecting it.

Toolwall takes a different approach. Instead of passing requests through, every `tools/call` is parsed and run through layered checks before the downstream target sees it: AST egress filtering on tool arguments (sensitive paths, shell substitution, ShadowLeak URL shapes, instruction-override text), NHI authorization on a `Bearer` envelope, tool-scope validation (`tools.<name>` or `tools.*`), a color boundary that rejects mixed red/blue tool calls, and preflight validation for high-trust tools (`execute_command`, `fetch_url`, `write_file`, `write`, `create_file`). Defaults are fail-closed: missing auth, missing scope, missing preflight, or any AST hit returns an explicit error code (`AUTH_FAILURE`, `MISSING_SCOPE`, `PREFLIGHT_REQUIRED`, `SENSITIVE_PATH_BLOCKED`, `SHADOWLEAK_DETECTED`, `SHELL_INJECTION_BLOCKED`, `EPISTEMIC_CONTRADICTION_DETECTED`, `CROSS_TOOL_HIJACK_ATTEMPT`).

Current numbers from `npm run benchmark:stdio` on a 19-case evidence corpus: 24 requests, 14 blocked, 10 allowed, 5 cache hits, `0` false positives, `0` false negatives, `verdict: passed`. v2.2.8 also adds a per-target/tool rate limiter (HTTP `429` and JSON-RPC `-32029 RATE_LIMIT_EXCEEDED`), a SQLite-backed security event history under `/data/.mcp-cache`, and a Node 20 multistage Docker build with a Compose service that mounts `toolwall-data:/data` so audit history survives container restarts.

Honest scope (from `docs/LIMITS_AND_NON_GOALS.md`): Toolwall is a transport-layer control. It does not do kernel, VM, or container sandboxing, and it does not inspect the memory of the agent or the downstream tool process. It does not claim semantic detection of every prompt-injection variant. Strict schema enforcement applies only to registered tool contracts; unknown tools without a registered schema still pass through.

If you build agent tooling or do offensive AI security work, please try to break the filters: run the corpus, write new bypass cases, propose path-normalization or encoding tricks that should land as `SENSITIVE_PATH_BLOCKED` or `SHADOWLEAK_DETECTED` but currently slip through. Repo: `https://github.com/shleder/toolwall`. Evidence pack: `docs/EVIDENCE_BUNDLE.md`. Limits: `docs/LIMITS_AND_NON_GOALS.md`. Bypass reports should use the security issue template instead of public exploit threads.

## 3. Release Note / Twitter (<= 280 chars)

```
Toolwall v2.2.8: fail-closed MCP gateway.
- AST egress filters (paths, shell, ShadowLeak)
- per-target/tool rate limiter
- SQLite audit history
- Node 20 Docker + Compose volume
- benchmark: 0 false positives, 0 false negatives
github.com/shleder/toolwall
```

Length check: 255 characters including newlines (within the 280-character limit).
