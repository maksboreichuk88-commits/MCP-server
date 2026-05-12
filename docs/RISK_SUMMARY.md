This repository inserts a fail-closed control at the stdio transport boundary for MCP `tools/call` traffic.

Protected assets:

- local files and secrets reachable through tool arguments
- high-trust mutation and execution capabilities
- integrity of multi-tool plans
- response material that flows back into the client context

Primary attack classes in scope:

- missing or invalid shared-secret authorization
- scope escalation across tool boundaries
- mixed red/blue trust-domain execution
- missing or replayed preflight approval for blue actions
- schema-smuggled or undeclared tool arguments
- ShadowLeak-style exfiltration markers
- sensitive-path and shell-injection markers in request strings
- unsafe response material returned from downstream tools

Current request-side protections remain selective:

- stdio auth and scope checks are conditional on configured shared-secret auth, not universal always-on gates
- preflight is selective for explicit `blue` tools and current default high-trust tool families
- schema enforcement is selective for registered tool contracts
- indirect prompt-injection / egress blocking remains heuristic / pattern-based, not full semantic prevention

Current decision gates:

| Gate | Decision |
|---|---|
| `nhi-auth-validator` | shared secret and declared scopes |
| `scope-validator` | tool is inside the declared scope set |
| `color-boundary` | trust domains are not mixed or flipped |
| `ast-egress-filter` | request strings do not match deny markers |
| `preflight-validator` | blue action has a valid one-time preflight ID |
| `schema-validator` | registered tool args match a strict contract |

Failure mode:

- if a gate cannot validate the request, the request is denied instead of forwarded
- if a downstream response is returned, it is sanitized before re-entry
- current response-side sanitization is narrow and pattern-based: it masks sensitive keyed fields, redacts stack traces / sensitive paths / IPs / emails, and redacts explicit plain-text bearer headers or inline secret assignments when they appear directly in downstream strings
