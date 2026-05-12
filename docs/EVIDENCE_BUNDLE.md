## Launch-Ready Proof Pack

This page collects the smallest artifact set needed to inspect the repo without reading every source file first.

If you only want the shortest proof-first review surface, start here:

1. [README.md](../README.md) for the first-read install and proof story
2. [docs/QUICKSTART.md](QUICKSTART.md) for the shortest local proof path
3. [docs/DEMO_RUN_TRANSCRIPT.md](DEMO_RUN_TRANSCRIPT.md) for the exact observed demo output
4. [docs/VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for the deeper verification map
5. [docs/LIMITS_AND_NON_GOALS.md](LIMITS_AND_NON_GOALS.md) for the explicit no-overclaim boundary

Current local evidence snapshot from the latest validation pass:

- `npm run demo:stdio` passed
- `npm run pack:dry-run` passed
- `npm run pack:smoke` passed

Benchmark evidence remains repo-local when deny/output behavior changes, but it is not the shortest first-review path for this proof pack and it is not part of the npm tarball.

Artifact index:

| Artifact | Location | Reproduction |
|---|---|---|
| stdio demo transcript | `docs/DEMO_RUN_TRANSCRIPT.md` | `npm run demo:stdio` |
| package install contract | `scripts/assert-package-metadata.mjs` + `tests/release-guardrails.test.ts` | `npm run assert:package-metadata` + `npm test` |
| packaged proxy proof | `tests/package-proxy-smoke.test.ts` | `npm run pack:smoke` |
| quickstart | `docs/QUICKSTART.md` | `npm install && npm run build && npm run demo:stdio` |
| client config guide | `docs/CLIENT_CONFIG_EXAMPLES.md` | tracked file |
| runtime contract | `docs/RUNTIME_CONTRACT.md` | tracked file |
| risk summary | `docs/RISK_SUMMARY.md` | tracked file |
| limits and non-goals | `docs/LIMITS_AND_NON_GOALS.md` | tracked file |

Validation path:

1. Run `npm run typecheck`.
2. Run `npm run assert:package-metadata`.
3. Run `npm test`.
4. Run `npm run demo:stdio`.
5. Run `npm run pack:dry-run`.
6. Run `npm run pack:smoke`.
7. Rerun `npm run benchmark:stdio -- --json --output evidence.json` only when benchmark-facing behavior changed.

Expected inspection outcomes:

- read-style allow cases are stable across repeats
- blocked cases fail with explicit denial codes
- ShadowLeak evidence includes both single-character and repeated short-chunk URL exfiltration
- mixed-trust and both default-high-trust plus `blue` preflight failures are visible in the corpus
- the package surface still matches the documented CLI entry points
- the packaged install contract is pinned in code and tests
- the client config guide matches the current package behavior
- the runtime contract matches the current denial semantics
- enforcement claims stay separate from limits

Truth note:

- this proof pack is local-only unless the checked-out state is separately pushed and made public
