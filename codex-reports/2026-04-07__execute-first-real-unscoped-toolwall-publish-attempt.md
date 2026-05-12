# Execute First Real Unscoped Toolwall Publish Attempt

Created: 2026-04-07
Updated: 2026-04-07

## 1. STATE

- Status: NO-GO
- Task: execute the first real unscoped `toolwall` publish attempt from the explicit `2.2.6` release-candidate boundary
- Actual repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Source branch at start: `project/tests-first-quality`
- Source HEAD at start: `2ed9ec5 docs(pr): Sync review boundary truth`
- Source mixed-tree status at start: still mixed; whole-tree publish remained forbidden
- Release attempt method: create an isolated temporary release worktree from `HEAD`, overlay only the grounded release-candidate subset, commit that subset locally, then run the required publish-gate checks there
- Temporary release worktree: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall-release-attempt-v2.2.6-20260407232747`
- Temporary release branch: `codex/release-attempt-toolwall-2.2.6`
- Temporary release commit: `fa57696 chore(release): prepare toolwall 2.2.6 publish attempt`

## 2. RELEASE SOURCE

The isolated release attempt used only the explicit release-candidate subset from the latest grounded reports:

- `.github/workflows/release-npm.yml`
- `CHANGELOG.md`
- `README.md`
- `SUPPORT.md`
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/EVIDENCE_BUNDLE.md`
- `docs/GUIDED_SETUP_AND_AUDITS.md`
- `docs/LIMITS_AND_NON_GOALS.md`
- `docs/PROXY_SETUP.md`
- `docs/QUICKSTART.md`
- `docs/RISK_MODEL.md`
- `docs/RISK_SUMMARY.md`
- `docs/RUNTIME_CONTRACT.md`
- `docs/SHIP_CHECKLIST.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/WORKFLOW_HARDENING.md`
- `examples/README.md`
- `package.json`
- `package-lock.json`
- `scripts/assert-package-metadata.mjs`
- `scripts/pack-smoke.mjs`
- `scripts/stdio-demo.mjs`
- `scripts/verify-release-parity.mjs`
- `src/cli.ts`
- `src/embedded/server.ts`
- `src/index.ts`
- `tests/cli.test.ts`
- `tests/package-proxy-smoke.test.ts`
- `tests/release-guardrails.test.ts`

Release-source integrity confirmed before the NO-GO gate:

- staged file list matched the release-source list above exactly
- `package.json` in the isolated cut resolved to:
  - `name = toolwall`
  - `version = 2.2.6`
  - `bin.toolwall = dist/cli.js`

## 3. MUST STAY OUT

The following files remained outside the approved release source and were not allowed to become part of the publish boundary:

- `Dockerfile`
- `src/mcp-tool-schemas.ts`
- `src/metrics/prometheus.ts`
- `src/middleware/color-boundary.ts`
- `src/middleware/preflight-validator.ts`
- `src/middleware/rate-limiter.ts`
- `src/proxy/shadow-leak-sanitizer.ts`
- `tests/admin.test.ts`
- `tests/preflight-validator.test.ts`
- `tests/schema-validator.test.ts`
- `tests/shadow-leak-sanitizer.test.ts`
- `ui/README.md`
- `ui/src/pages/Dashboard.tsx`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/guided-setup-request.yml`
- `ROADMAP.md`
- `docs/LAUNCH_TEXTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_GROUNDED.md`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `docs/SYSTEM_OVERVIEW.md`
- `toolwall-execution-system/`
- `codex-reports/` (reporting only)

## 4. PRE-PUBLISH CHECK RESULTS

### npm/package reality

- `npm whoami`
  - result: `maksiph14`
- `npm ping`
  - result: success (`PONG`)
- `npm view toolwall name version repository.url homepage dist-tags --json`
  - result: `E404`
  - meaning: `toolwall` was still not publicly resolvable from the registry in this environment
- `npm view mcp-transport-firewall name version repository.url homepage dist-tags --json`
  - result:
    - `name = mcp-transport-firewall`
    - `version = 2.2.5`
    - `repository.url = git+https://github.com/shleder/mcp-transport-firewall.git`
    - `homepage = https://github.com/shleder/mcp-transport-firewall#readme`
    - `dist-tags.latest = 2.2.5`

### release-source integrity

- exact staged release-candidate file list matched the approved subset in Section 2
- package metadata inside the isolated release cut remained:
  - `toolwall@2.2.6`
  - `toolwall -> dist/cli.js`

### pre-publish git sanity

- `git diff --check`
  - result: passed
- `git status --short --branch`
  - result after verification: clean temporary release branch

### publish-boundary gate failure

`npm pack --dry-run --json` proved that the publish tarball still pulled in files outside the approved release boundary. The most important unexpected entries were:

- `dist/mcp-tool-schemas.js`
- `dist/metrics/prometheus.js`
- `dist/middleware/color-boundary.js`
- `dist/middleware/preflight-validator.js`
- `dist/middleware/rate-limiter.js`
- `dist/proxy/shadow-leak-sanitizer.js`
- `docs/STDIO_BENCHMARK_GUIDE.md`
- `docs/STDIO_BENCHMARK_SNAPSHOT.json`

Meaning:

- the isolated git release cut itself was clean
- the effective npm publish payload was still broader than that cut
- the exact release source was therefore **not** the only source for the real publish artifact

## 5. VERIFICATION

To reproduce the release candidate cleanly inside the temporary release worktree, dependencies were installed first:

- `npm ci`
- `npm ci` inside `ui/`

Required serial local verification results:

- `npm run build`
  - passed
- `npm run typecheck`
  - passed
- `npm run assert:package-metadata`
  - passed
- `npm test`
  - passed
  - `15` suites, `119` tests
- `npm run pack:dry-run`
  - passed technically
  - but exposed the forbidden tarball leakage described in Section 4
- `npm run pack:smoke`
  - passed
- `npm run demo:stdio`
  - passed
- `git diff --check`
  - passed

Interpretation:

- code/runtime verification on the isolated release commit was green
- the release artifact boundary verification was **not** green

## 6. PUBLISH RESULT

- `v2.2.6` tag was **not** created
- `npm run verify:release-parity -- --tag v2.2.6` was **not** run
- `npm publish --access public` was **not** run
- no post-publish checks were run

Reason:

- the publish attempt hit an explicit NO-GO before tag/publish because the tarball boundary was broader than the approved release source

## 7. PUBLIC/CURRENT AFTERMATH

After the stopped attempt:

- public/current npm line remains `mcp-transport-firewall@2.2.5`
- public/current Toolwall package path is still **not confirmed**
- `npm view toolwall ...` still returned `E404`
- local-only release candidate remains `toolwall@2.2.6`
- the first real unscoped Toolwall publish is still pending a clean tarball-boundary fix

## 8. NO-GO BLOCKER OR SUCCESS SUMMARY

Final result: **NO-GO**

Exact blocker:

- the real npm publish payload could not be isolated to the approved release-candidate subset
- `npm pack --dry-run --json` proved that the tarball still included files outside the allowed boundary

Exact last successful step:

- `npm run demo:stdio`
- followed by a clean `git diff --check`

Why publish was stopped:

- the task explicitly forbids whole-tree or widened-boundary publish
- once the tarball proved broader than the grounded release cut, the publish attempt could no longer proceed truthfully
- no fallback package name was attempted

## 9. CHANGED FILES

This task changed only reporting and durable-memory files in the main workspace:

- `toolwall/codex-reports/2026-04-07__execute-first-real-unscoped-toolwall-publish-attempt.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
- `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
- `BD/04-done/done-log.md`
- `BD/06-decisions/decision-log.md`

The isolated temporary release worktree also received one local release-attempt commit for verification only:

- branch: `codex/release-attempt-toolwall-2.2.6`
- commit: `fa57696 chore(release): prepare toolwall 2.2.6 publish attempt`

No public push, PR, tag, or npm publish happened in this task.

## 10. REPORT FILES

- `toolwall/codex-reports/2026-04-07__execute-first-real-unscoped-toolwall-publish-attempt.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
