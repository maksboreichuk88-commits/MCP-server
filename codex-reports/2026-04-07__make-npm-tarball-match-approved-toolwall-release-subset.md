# Make npm Tarball Match Approved Toolwall Release Subset

Created: 2026-04-07
Updated: 2026-04-07

## 1. STATE

- Status: DONE
- Task: make the real npm tarball match the approved first Toolwall release-candidate subset without publishing
- Actual repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Current branch: `project/tests-first-quality`
- Current HEAD: `2ed9ec5 docs(pr): Sync review boundary truth`
- Starting blocker from the latest NO-GO:
  - the isolated release cut itself was clean, but `npm pack --dry-run --json` still shipped files outside the intended first-release boundary
  - the concrete leak examples were benchmark-only docs plus extra `dist` outputs pulled in by the broad package payload contract

## 2. CURRENT TARBALL DRIFT

Pre-edit drift was compared from the real `npm pack --dry-run --json` inventory, not from source assumptions.

### Extra dist outputs that should not ship

- all `dist/**/*.js.map` source maps
- `dist/index.js`
- `dist/middleware/error-handler.js`
- `dist/middleware/mcpColorBoundary.js`
- `dist/types/index.js`

### Extra docs that should not ship

- `docs/STDIO_BENCHMARK_GUIDE.md`
- `docs/STDIO_BENCHMARK_SNAPSHOT.json`

### Anything else unexpected

- the shipped README and proof docs still referenced benchmark-only docs that were no longer appropriate for the npm tarball
- earlier same-day release notes treated some compiled outputs as unintended, but direct runtime-closure inspection showed that several of those files are required by the current packaged CLI/proxy contract and cannot be removed without changing runtime behavior

## 3. REQUIRED SHIP SET

The final required tarball is now explicit and split into three exact classes.

### Root/support payload

- `.env.example`
- `CHANGELOG.md`
- `LICENSE`
- `README.md`
- `SECURITY.md`
- `SUPPORT.md`
- `package.json`

### Install/proof/operator docs

- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `docs/EVIDENCE_BUNDLE.md`
- `docs/GUIDED_SETUP_AND_AUDITS.md`
- `docs/LIMITS_AND_NON_GOALS.md`
- `docs/PROXY_SETUP.md`
- `docs/QUICKSTART.md`
- `docs/RISK_MODEL.md`
- `docs/RISK_SUMMARY.md`
- `docs/RUNTIME_CONTRACT.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/WORKFLOW_HARDENING.md`

### Runtime closure required by the current packaged CLI/lib contract

- `dist/admin/index.js`
- `dist/cache/index.js`
- `dist/cache/l1-cache.js`
- `dist/cache/l2-cache.js`
- `dist/cli-options.js`
- `dist/cli.js`
- `dist/embedded/server.js`
- `dist/errors.js`
- `dist/lib.js`
- `dist/mcp-tool-schemas.js`
- `dist/metrics/prometheus.js`
- `dist/middleware/ast-egress-filter.js`
- `dist/middleware/color-boundary.js`
- `dist/middleware/nhi-auth-validator.js`
- `dist/middleware/preflight-validator.js`
- `dist/middleware/rate-limiter.js`
- `dist/middleware/schema-validator.js`
- `dist/middleware/scope-validator.js`
- `dist/proxy/circuit-breaker.js`
- `dist/proxy/router.js`
- `dist/proxy/shadow-leak-sanitizer.js`
- `dist/proxy/types.js`
- `dist/runtime-config.js`
- `dist/stdio/proxy.js`
- `dist/utils/auditLogger.js`
- `dist/utils/mcp-request.js`

## 4. PAYLOAD CONTROL STRATEGY

Chosen mechanism: tighten `package.json.files` to an explicit file allowlist, then sync guardrails and packaged docs.

Why this was the narrowest correct fix:

- it removed tarball drift without changing the build layout
- it avoided `.npmignore` pattern ambiguity against a mixed workspace
- it kept the publish path aimed at unscoped `toolwall`
- it allowed direct exclusion of benchmark-only docs, source maps, and unused `dist` outputs
- it preserved current packaged runtime behavior

Important direct finding:

- several earlier-suspected compiled outputs are required by the current packaged CLI/lib closure
- removing `dist/mcp-tool-schemas.js`, `dist/metrics/prometheus.js`, `dist/middleware/color-boundary.js`, `dist/middleware/preflight-validator.js`, `dist/middleware/rate-limiter.js`, or `dist/proxy/shadow-leak-sanitizer.js` would require runtime/package-contract restructuring beyond this batch
- those files therefore moved from “suspected drift” into the explicit required ship set

Non-goals kept intact:

- no publish
- no tag creation
- no package-name fallback switch
- no broad runtime refactor
- no docs-wide cleanup outside tarball-truth alignment

## 5. CHANGED FILES

Repo-tracked files changed in this task:

- `package.json`
- `scripts/assert-package-metadata.mjs`
- `tests/release-guardrails.test.ts`
- `README.md`
- `docs/EVIDENCE_BUNDLE.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/SHIP_CHECKLIST.md`

Reporting and memory files changed in this task:

- `toolwall/codex-reports/2026-04-07__make-npm-tarball-match-approved-toolwall-release-subset.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
- `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
- `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\BD\04-done\done-log.md`
- `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\BD\06-decisions\decision-log.md`

## 6. VERIFICATION

Required serial verification was rerun after the packaging/docs changes and all commands passed:

- `npm run build`
- `npm run typecheck`
- `npm run assert:package-metadata`
- `npm test`
- `npm run pack:dry-run`
- `npm run pack:smoke`
- `npm run demo:stdio`

Grounded verification results:

- `assert:package-metadata` passed for `toolwall@2.2.6`
- `npm test` passed with `16` suites / `129` tests
- `npm run pack:smoke` passed for the tarball
- `npm run demo:stdio` passed with the expected allow/cache/block flow
- final `npm pack --dry-run --json` produced `45` tarball entries

## 7. FINAL TARBALL RESULT

Removed from the tarball:

- benchmark-only docs:
  - `docs/STDIO_BENCHMARK_GUIDE.md`
  - `docs/STDIO_BENCHMARK_SNAPSHOT.json`
- unused runtime outputs:
  - `dist/index.js`
  - `dist/middleware/error-handler.js`
  - `dist/middleware/mcpColorBoundary.js`
  - `dist/types/index.js`
- all `dist/**/*.js.map` source maps

What remains:

- the root/support payload
- the install/proof/operator docs listed in Section 3
- the explicit current runtime closure required by the packaged CLI/lib contract

Does the final tarball match the approved release subset?

- Yes, after aligning the package contract to the explicit required ship set and removing the benchmark/docs/maps/unused-output drift.
- No publish action was taken.

## 8. NO-GO BLOCKER OR SUCCESS SUMMARY

Final result: SUCCESS

What changed materially:

- the npm tarball is now defined by an explicit post-build allowlist instead of a broad `dist` include
- benchmark-only docs are now repo-local rather than npm-shipped
- the tarball no longer carries source maps or unused runtime outputs
- package truth, guardrails, and packaged docs now describe the same boundary

Important boundary note:

- the earlier NO-GO is cleared for tarball-shape drift, not for publishability
- unscoped `toolwall` registry viability is still a separate release-time question

## 9. REPORT FILES

- `toolwall/codex-reports/2026-04-07__make-npm-tarball-match-approved-toolwall-release-subset.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`

## 10. NEXT LOCAL BATCH

- rerun the release-source decision against the now-correct tarball boundary before any new tag/publish attempt
- keep the unscoped `toolwall` publishability check explicit and separate from tarball-shape proof
