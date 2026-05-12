# Cut Clean Toolwall Publish Candidate Boundary

Created: 2026-04-07
Updated: 2026-04-07

## 1. STATE

- Status: DONE
- Task: cut a clean Toolwall publish-candidate boundary, choose the release identity strategy, choose the next release version path, and make the publish boundary explicit
- Actual repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Current branch: `project/tests-first-quality`
- Current HEAD: `2ed9ec5 docs(pr): Sync review boundary truth`
- Working tree status: still mixed
- Important release truth:
  - the current **whole** working tree is **not** a publish candidate
  - this task narrowed the npm tarball surface so package publication no longer silently includes launch or grounded-planning docs
  - the old public npm line is still `mcp-transport-firewall@2.2.5`
  - unscoped `toolwall` is still not publicly resolvable from this environment

## 2. CURRENT RELEASE SURFACE

Current local package/release surface claims:

- package name: `toolwall`
- version: `2.2.5`
- bin: `toolwall -> dist/cli.js`
- repository URL: `git+https://github.com/shleder/toolwall.git`
- homepage: `https://github.com/shleder/toolwall#readme`
- bugs URL: `https://github.com/shleder/toolwall/issues`
- publish access: `public`

Current prepublish/release verification chain:

- `prepare`: `npm run build`
- `assert:package-metadata`: local package contract assertion
- `verify:all`: `npm run assert:package-metadata && npm run typecheck && npm run build && npm test && npm run demo:stdio && npm --prefix ui run build && npm --prefix ui run lint`
- `prepublishOnly`: `npm run assert:package-metadata && npm run verify:all && npm run pack:dry-run && npm run pack:smoke`
- `verify:release-parity`: local tag/repo lineage assertion
- `verify:registry-metadata`: post-publish npm metadata assertion

Current package surface improvement made in this task:

- `package.json.files` now ships only explicit install/proof/operator docs instead of the whole `docs/` tree
- `npm pack --dry-run` now excludes non-release docs such as `docs/LAUNCH_TEXTS.md`, `docs/CURRENT_STATE_GROUNDED.md`, `docs/NEXT_BATCH_RECOMMENDATION.md`, `docs/ARCHITECTURE.md`, and `docs/SYSTEM_OVERVIEW.md`

## 3. PUBLISH-CANDIDATE FILES

The first real Toolwall publish candidate should be cut from these surfaces only:

- Package/release contract: `package.json`, `package-lock.json`, `.github/workflows/release-npm.yml`, `scripts/assert-package-metadata.mjs`, `scripts/verify-release-parity.mjs`, `scripts/pack-smoke.mjs`, `scripts/stdio-demo.mjs`, `tests/release-guardrails.test.ts`, `tests/package-proxy-smoke.test.ts`
- Runtime/emitted Toolwall identity: `src/cli.ts`, `src/embedded/server.ts`, `src/index.ts`, `tests/cli.test.ts`
- Root public package docs: `README.md`, `CHANGELOG.md`, `SUPPORT.md`
- Packaged proof/install docs: `docs/CLIENT_CONFIG_EXAMPLES.md`, `docs/DEMO_RUN_TRANSCRIPT.md`, `docs/EVIDENCE_BUNDLE.md`, `docs/GUIDED_SETUP_AND_AUDITS.md`, `docs/LIMITS_AND_NON_GOALS.md`, `docs/PROXY_SETUP.md`, `docs/QUICKSTART.md`, `docs/RISK_MODEL.md`, `docs/RISK_SUMMARY.md`, `docs/RUNTIME_CONTRACT.md`, `docs/STDIO_BENCHMARK_GUIDE.md`, `docs/STDIO_BENCHMARK_SNAPSHOT.json`, `docs/VERIFICATION_GUIDE.md`, `docs/WORKFLOW_HARDENING.md`
- Repo-side proof/support docs that belong to the release cut even if they do not ship in the tarball: `docs/DISTRIBUTION_NOTES.md`, `docs/SHIP_CHECKLIST.md`, `examples/README.md`

Exact publish-candidate boundary rule:

- the candidate is the Toolwall identity/proof/release subset above
- the current mixed worktree is not itself the candidate
- a real release cut must stage or branch only this subset plus the eventual version bump/changelog entry

## 4. DEFERRED NON-RELEASE FILES

These dirty files must stay out of the first Toolwall publish candidate:

- Planning / launch collateral: `docs/LAUNCH_TEXTS.md`, `ROADMAP.md`
- Grounded/internal repo-truth docs: `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_GROUNDED.md`, `docs/CURRENT_STATE_GROUNDED.md`, `docs/NEXT_BATCH_RECOMMENDATION.md`, `docs/SYSTEM_OVERVIEW.md`
- Separate schema/policy/runtime batches: `src/mcp-tool-schemas.ts`, `src/metrics/prometheus.ts`, `src/middleware/color-boundary.ts`, `src/middleware/preflight-validator.ts`, `src/middleware/rate-limiter.ts`, `src/proxy/shadow-leak-sanitizer.ts`, `tests/admin.test.ts`, `tests/preflight-validator.test.ts`, `tests/schema-validator.test.ts`, `tests/shadow-leak-sanitizer.test.ts`, `Dockerfile`, `ui/README.md`, `ui/src/pages/Dashboard.tsx`
- GitHub intake templates: `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/guided-setup-request.yml`

Why these stay out:

- they are valid local work, but they are not required to define the first Toolwall package identity, tarball contract, or release gate
- mixing them into the first public Toolwall publish boundary would blur what the release actually means

Reporting only:

- `codex-reports/*`

Unexpected / needs explanation:

- `toolwall-execution-system/` is a separate execution-planning system and should stay outside the publish candidate

## 5. VERSIONING DECISION OPTIONS

### KEEP 2.2.5

Why:

- zero version churn

Risk:

- the old public npm line already owns `mcp-transport-firewall@2.2.5`
- tag `v2.2.5` already belongs to the historical public release boundary
- reusing `2.2.5` would create a false impression that the first Toolwall public line is the same release boundary

Appropriate or not:

- not appropriate

### BUMP TO NEXT PATCH/MINOR

Why:

- creates a new release boundary without pretending the old public `2.2.5` line and the first Toolwall line are the same thing
- preserves continuity of the existing product line while still separating the first Toolwall publish from the old public release
- the package-name shift already marks the public install change

Risk:

- requires disciplined changelog/version cut so `2.2.6` is clearly described as the first Toolwall public boundary, not a silent reuse of the old package line

Appropriate or not:

- appropriate
- exact recommendation: `2.2.6`

### BUMP TO NEW MAJOR

Why:

- gives the strongest visual separation from the old public line

Risk:

- overstates the magnitude of the runtime/API change for the current evidence
- the public install identity already changes via the package name itself, so a major bump adds extra drama without extra proof value

Appropriate or not:

- not the best fit for the current evidence

## 6. PACKAGE NAME DECISION OPTIONS

### `toolwall`

Why:

- already matches the local package/bin/docs/release surface
- preserves the intended clean install path: `npx -y toolwall`

Risk:

- current environment still cannot prove unscoped publishability
- `npm view toolwall` still returns `E404`, which proves only public non-resolution, not clean publish rights

Install impact:

- cleanest install and bin story

Publishable or fallback:

- target identity only for now, not proven publishable

### `@maksiph14/toolwall`

Why:

- strongest scoped fallback under the currently authenticated npm user `maksiph14`
- keeps product name `Toolwall` and bin name `toolwall`

Risk:

- introduces a scoped install path
- requires a separate package-surface edit pass if chosen

Install impact:

- `npx -y @maksiph14/toolwall`
- `npm install -g @maksiph14/toolwall`
- bin can still remain `toolwall`

Publishable or fallback:

- best operational fallback, not the primary recommendation

### `toolwall-mcp`

Why:

- keeps an unscoped package name while staying close to the brand

Risk:

- availability is also unproven
- creates extra rename churn without the certainty of the scoped fallback

Install impact:

- `npx -y toolwall-mcp`
- bin could still remain `toolwall`

Publishable or fallback:

- third-choice fallback only

## 7. FINAL DECISION

Exact publish-candidate boundary:

- use the Toolwall identity/proof/release subset from Section 3
- keep all Section 4 files out of the first public Toolwall release cut
- the tarball boundary is now explicit in `package.json.files` and corresponding guardrails

Exact release version recommendation:

- `2.2.6`

Exact package-name recommendation:

- keep `toolwall` as the intended first public package identity
- do **not** publish yet from the current mixed tree
- if the operator still cannot prove unscoped viability at actual release cut time, stop and switch in a separate fallback pass to `@maksiph14/toolwall`

Release posture:

- **PREPARE TOOLWALL BUT WAIT**

## 8. CHANGED FILES

Repo-tracked package/release files changed in this task:

- `package.json`
- `scripts/assert-package-metadata.mjs`
- `tests/release-guardrails.test.ts`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/SHIP_CHECKLIST.md`

Reporting and durable-memory files changed in this task:

- `toolwall/codex-reports/2026-04-07__cut-clean-toolwall-publish-candidate-boundary.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
- `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
- `BD/04-done/done-log.md`
- `BD/06-decisions/decision-log.md`

## 9. VERIFICATION

Because repo-tracked package/release files changed, the required serial verification chain was rerun and passed:

- `npm run build`
- `npm run typecheck`
- `npm run assert:package-metadata`
- `npm test`
- `npm run pack:dry-run`
- `npm run pack:smoke`
- `npm run demo:stdio`

Important post-change proof:

- `npm pack --dry-run` now ships only the explicit Toolwall install/proof/operator docs
- the tarball no longer includes launch or grounded-planning docs

Additional checks performed:

- fresh npm/public checks for `mcp-transport-firewall`, `toolwall`, `@maksiph14/toolwall`, and `toolwall-mcp`
- `npm whoami`, `npm ping`, `npm owner ls ...`, `npm access list packages --json`
- `git diff --check` showed no whitespace errors; only existing CRLF warnings remain in the dirty tree

## 10. MANUAL PUBLISH-READINESS CHECKLIST

1. Cut a clean branch/staging boundary that contains only the publish-candidate files from Section 3.
2. Leave every Section 4 file out of that boundary.
3. Bump `package.json` and `package-lock.json` from `2.2.5` to `2.2.6`.
4. Add the `2.2.6` changelog entry that explicitly describes it as the first Toolwall public release boundary.
5. Re-run serially:
   - `npm run build`
   - `npm run typecheck`
   - `npm run assert:package-metadata`
   - `npm test`
   - `npm run pack:dry-run`
   - `npm run pack:smoke`
   - `npm run demo:stdio`
6. Verify unscoped name reality manually:
   - `npm view toolwall --json`
   - npm web UI while authenticated
7. Verify auth/publish posture manually:
   - `npm whoami`
   - confirm token/2FA/publish rights in npm account settings
8. If `toolwall` is still not provably viable, stop the unscoped cut and switch in a separate fallback edit pass to `@maksiph14/toolwall`.
9. If `toolwall` is viable, create the matching local tag `v2.2.6`.
10. Run:
    - `npm run verify:release-parity -- --tag v2.2.6`
11. Publish only from the clean release boundary.
12. Post-publish confirm:
    - `npm view toolwall name version repository.url homepage dist-tags --json`
    - or the scoped fallback package if that was the path used
13. Deprecate `mcp-transport-firewall` only after the new public package path is live and installable.

## 11. RISKS / OPEN QUESTIONS

- `npm view toolwall` still returns `E404`; this proves public non-resolution but not whether the name is truly available for publish
- the current local version is still `2.2.5`, so the release boundary is not yet version-cut
- the current working tree is still mixed; publish must not happen from the whole tree as-is
- the fallback package name is known (`@maksiph14/toolwall`), but it was intentionally not applied in this task because the operator has not yet chosen to abandon the unscoped target

## 12. REPORT FILES

- `toolwall/codex-reports/2026-04-07__cut-clean-toolwall-publish-candidate-boundary.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
