This page collects the smallest public artifact set needed to inspect the repository without reading every source file first.

Current local evidence snapshot from the latest validation pass:

- `npm run demo:stdio` passed
- `npm run benchmark:stdio -- --json` passed
- benchmark totals: `17` cases, `22` requests, `0` false positives, `0` false negatives, `0` cache consistency failures

Artifact index:

| Artifact | Location | Reproduction |
|---|---|---|
| benchmark JSON snapshot | `docs/STDIO_BENCHMARK_SNAPSHOT.json` | `npm run benchmark:stdio -- --json > evidence.json` |
| architecture diagram | `docs/ARCHITECTURE.md` | tracked file |
| client configuration guide | `docs/CLIENT_CONFIGS.md` | tracked file |
| integration contract | `docs/INTEGRATION_CONTRACT.md` | tracked file |
| threat model | `docs/THREAT_MODEL.md` | tracked file |
| validation guide | `docs/VALIDATION_GUIDE.md` | tracked file |

Latest stdio demo summary:

- `npm run demo:stdio` passed
- first allow request reached the deterministic downstream target
- second identical allow request matched the first response from cache
- ShadowLeak sample was denied before downstream execution
- missing-auth sample was denied at the transport boundary

Validation path:

1. Run `npm run verify:all`.
2. Run `npm run benchmark:stdio -- --json > evidence.json`.
3. Run `npm run demo:stdio`.
4. Run `npm run pack:dry-run`.
5. Run `npm run pack:smoke`.
6. Compare the generated output with the tracked summaries in this directory.

Expected inspection outcomes:

- read-style allow cases are stable across repeats
- blocked cases fail with explicit denial codes
- mixed-trust and preflight failures are visible in the corpus
- the package surface still matches the documented npm contract
- the client configuration guide matches the current published package behavior
- the integration contract matches the current runtime and denial semantics
- the repository separates enforcement claims from limits
