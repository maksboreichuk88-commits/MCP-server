# Finalize First Toolwall Release Candidate Boundary

Created: 2026-04-07
Updated: 2026-04-07

## 1. STATE

- Status: DONE
- Task: finalize the first Toolwall release-candidate boundary for publication readiness
- Actual repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Workspace root used to start the task: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP`
- Current branch: `project/tests-first-quality`
- Current HEAD: `2ed9ec5 docs(pr): Sync review boundary truth`
- Current mixed-tree status: still mixed; the whole working tree remains forbidden as a publish source
- Current release-candidate status: finalized as an exact dirty-file subset plus explicit operator choice between the primary and fallback package paths

## 2. CURRENT RELEASE-CANDIDATE BASELINE

- package name: `toolwall`
- package version: `2.2.6`
- package-lock root version: `2.2.6`
- bin: `toolwall -> dist/cli.js`
- repository URL: `git+https://github.com/shleder/toolwall.git`
- homepage: `https://github.com/shleder/toolwall#readme`
- bugs URL: `https://github.com/shleder/toolwall/issues`
- tarball docs allowlist: explicit install/proof/operator files only, not the full `docs/` tree
- current prepublish/release verification chain:
  - `prepare`: `npm run build`
  - `prepublishOnly`: `npm run assert:package-metadata && npm run verify:all && npm run pack:dry-run && npm run pack:smoke`
  - exact required serial verification for this release-candidate shaping task:
    - `npm run build`
    - `npm run typecheck`
    - `npm run assert:package-metadata`
    - `npm test`
    - `npm run pack:dry-run`
    - `npm run pack:smoke`
    - `npm run demo:stdio`

## 3. RELEASE-CANDIDATE FILES TO CUT NOW

Exact dirty files that belong in the finalized first Toolwall release-candidate boundary:

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

Boundary rule:

- this exact subset is the first Toolwall release candidate
- the whole dirty working tree is not the release candidate
- the version bump to `2.2.6` belongs to this boundary and is already applied

## 4. FILES THAT MUST STAY OUT

### non-release runtime work

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

### planning/launch copy

- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/guided-setup-request.yml`
- `ROADMAP.md`
- `docs/LAUNCH_TEXTS.md`

### reporting only

- `codex-reports/`

### historical/archive

- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_GROUNDED.md`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `docs/SYSTEM_OVERVIEW.md`
- `toolwall-execution-system/`

## 5. PRIMARY VS FALLBACK PACKAGE PATH

### Primary path

- package path: `toolwall`
- install impact:
  - `npx -y toolwall`
  - `npm install -g toolwall`
- current task result:
  - kept as the exact intended publish identity
  - no further package-surface rename work is required before tag/publish, only unscoped viability proof plus the operator decision

### Fallback path

- package path: `@maksiph14/toolwall`
- install impact:
  - `npx -y @maksiph14/toolwall`
  - `npm install -g @maksiph14/toolwall`
- bin impact:
  - CLI/bin can still remain `toolwall`
- exact diff required if fallback is chosen later, but intentionally not applied in this task:
  - `package.json`
  - `package-lock.json`
  - `scripts/assert-package-metadata.mjs`
  - `tests/release-guardrails.test.ts`
  - `.github/workflows/release-npm.yml`
  - install snippets in `README.md`, `docs/CLIENT_CONFIG_EXAMPLES.md`, `docs/PROXY_SETUP.md`, `docs/QUICKSTART.md`, `docs/DISTRIBUTION_NOTES.md`, and `docs/VERIFICATION_GUIDE.md`

## 6. FINAL DECISION

- exact final release-candidate version: `2.2.6`
- exact clean release boundary: the Section 3 file set only
- exact primary publish path: `toolwall`
- exact fallback publish path: `@maksiph14/toolwall`
- exact manual operator choice point:
  - after the current green local verification
  - before any tag, publish, or deprecation action
  - choose `toolwall` only if unscoped publishability is acceptably proved
  - otherwise stop the unscoped cut and apply the separate fallback diff for `@maksiph14/toolwall`

## 7. CHANGED FILES

Repo-tracked files changed in this task:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/SHIP_CHECKLIST.md`

Reporting and durable-memory files changed in this task:

- `toolwall/codex-reports/2026-04-07__finalize-first-toolwall-release-candidate-boundary.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
- `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
- `BD/04-done/done-log.md`
- `BD/06-decisions/decision-log.md`

## 8. VERIFICATION

Required serial verification was rerun after the version/docs updates and passed:

- `npm run build`
- `npm run typecheck`
- `npm run assert:package-metadata`
- `npm test`
- `npm run pack:dry-run`
- `npm run pack:smoke`
- `npm run demo:stdio`

Key verification facts:

- `assert:package-metadata` passed for `toolwall@2.2.6`
- `npm test` passed with `16` suites / `129` tests green
- `npm run pack:dry-run` produced `toolwall-2.2.6.tgz`
- dry-run tarball contents still exclude launch and grounded-planning docs
- `npm run pack:smoke` passed for `toolwall-2.2.6.tgz`
- `npm run demo:stdio` passed with the expected allow/cache/block output sequence

Not rerun in this task:

- `npm run benchmark:stdio -- --json --output evidence.json`

Why it was not rerun:

- this task changed package/release/docs surfaces only and did not change evidence-facing deny/output behavior

## 9. MANUAL OPERATOR CHOICE CHECKLIST

1. Reconfirm the operator wants to cut from the Section 3 boundary only.
2. Reconfirm the version is `2.2.6`.
3. Reconfirm the unscoped target is still the preferred path.
4. Manually prove or acceptably clear the unscoped publish question for `toolwall`.
5. If unscoped `toolwall` is viable, keep the current package identity as-is and continue to tag/publish from the verified boundary.
6. If unscoped `toolwall` is not viable, stop and apply the separate fallback diff for `@maksiph14/toolwall`.
7. Only after the package-path choice is explicit, create the local semver tag `v2.2.6`.
8. Run `npm run verify:release-parity -- --tag v2.2.6`.
9. Publish only from the clean release boundary.
10. Deprecate `mcp-transport-firewall` only after the chosen new package path is publicly live and installable.

## 10. RISKS / OPEN QUESTIONS

- the repo is still mixed overall, so careless staging can still leak out-of-boundary files into the release cut
- `toolwall` remains the right primary target, but unscoped publishability is still not proven by this task itself
- the fallback path is now exact, but it is intentionally not pre-applied; that means the operator still has one real package-path decision before tag/publish
- the current release workflow and assertions assume the package path chosen in this task; if fallback is selected later, the scoped diff must be applied coherently before any release attempt

## 11. REPORT FILES

- `toolwall/codex-reports/2026-04-07__finalize-first-toolwall-release-candidate-boundary.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`

## 12. NEXT LOCAL BATCH

- if the operator chooses `toolwall`: execute the actual tag/publish cut from the exact Section 3 boundary only
- if the operator chooses `@maksiph14/toolwall`: apply the separate scoped fallback diff, rerun the same serial verification chain, then cut the tag/publish boundary
