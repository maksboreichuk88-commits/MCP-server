# Make Toolwall Rename Commit-Ready And Verify Public Reality

Created: 2026-04-06
Updated: 2026-04-06

## 1. STATE

- Status: DONE
- Scope: shape the completed local Toolwall hard rename into one explicit commit-ready boundary, separate local truth from public truth, and verify which GitHub/npm facts are actually public
- Local code/runtime/package surfaces were not edited in this shaping pass
- Repo-local report files were updated

## 2. LOCAL RENAME STATE

### Already renamed locally

- repo root is `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- `package.json` now exposes:
  - package name `toolwall`
  - bin `toolwall`
  - repo/homepage/bugs URLs pointing at `shleder/toolwall`
- local git remote `origin` is configured to `https://github.com/shleder/toolwall.git`
- active repo docs, install text, CLI/help text, tests, scripts, UI footer/help text, and repo-local reporting surfaces use `Toolwall` / `toolwall`
- the previously required local verification chain is already green on this checked-out local boundary

### Still dirty in the repo worktree

Current dirty tracked/untracked repo files fall into four buckets:

#### IN COMMIT-READY RENAME BOUNDARY

- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/guided-setup-request.yml`
- `.github/workflows/release-npm.yml`
- `CHANGELOG.md`
- `Dockerfile`
- `README.md`
- `ROADMAP.md`
- `SUPPORT.md`
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_GROUNDED.md`
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/EVIDENCE_BUNDLE.md`
- `docs/GUIDED_SETUP_AND_AUDITS.md`
- `docs/LIMITS_AND_NON_GOALS.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `docs/PROXY_SETUP.md`
- `docs/QUICKSTART.md`
- `docs/RISK_MODEL.md`
- `docs/RISK_SUMMARY.md`
- `docs/RUNTIME_CONTRACT.md`
- `docs/SHIP_CHECKLIST.md`
- `docs/SYSTEM_OVERVIEW.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/WORKFLOW_HARDENING.md`
- `examples/README.md`
- `package-lock.json`
- `package.json`
- `scripts/assert-package-metadata.mjs`
- `scripts/pack-smoke.mjs`
- `scripts/stdio-demo.mjs`
- `scripts/verify-release-parity.mjs`
- `src/cli.ts`
- `src/embedded/server.ts`
- `src/index.ts`
- `src/metrics/prometheus.ts`
- `tests/cli.test.ts`
- `tests/package-proxy-smoke.test.ts`
- `tests/release-guardrails.test.ts`
- `ui/README.md`
- `ui/src/pages/Dashboard.tsx`

Reason:

- these files directly express the active package/install/bin/repo identity, local proof path, local release/registry contract, or emitted Toolwall-facing text
- `scripts/pack-smoke.mjs` and `scripts/stdio-demo.mjs` are included because the current verified local boundary now depends on the kept verification harness behavior, not because they are product-feature work

#### DEFERRED

- `docs/LAUNCH_TEXTS.md`
- `toolwall-execution-system/**`
- `src/mcp-tool-schemas.ts`
- `src/middleware/color-boundary.ts`
- `src/middleware/preflight-validator.ts`
- `src/middleware/rate-limiter.ts`
- `src/proxy/shadow-leak-sanitizer.ts`
- `tests/admin.test.ts`
- `tests/preflight-validator.test.ts`
- `tests/schema-validator.test.ts`
- `tests/shadow-leak-sanitizer.test.ts`

Reason:

- these files describe or implement separate follow-up work already living in the dirty tree:
  - alias-only schema expansion
  - process-local state clarifications
  - response-side secret redaction hardening
  - launch/program execution artifacts
- they are explainable, but they do not belong to the smallest explicit Toolwall rename commit boundary

#### REPORTING ONLY

- `codex-reports/INDEX.md`
- `codex-reports/latest.md`
- `codex-reports/2026-04-06__full-hard-rename-migration-to-toolwall.md`
- `codex-reports/2026-04-06__make-toolwall-rename-commit-ready-and-verify-public-reality.md`

#### UNEXPECTED / NEEDS EXPLANATION

- none after direct inspection

### Still ambiguous locally

- the worktree is not physically isolated to the rename boundary yet; it still mixes the rename boundary with deferred non-rename technical work
- this means the rename is commit-ready conceptually, but not yet a clean all-files-in-working-tree single-commit state unless staging is selective

## 3. COMMIT-READY CANDIDATES

The explicit Toolwall rename boundary should be staged from these groups only:

### Package / registry / release contract

- `package.json`
- `package-lock.json`
- `scripts/assert-package-metadata.mjs`
- `scripts/pack-smoke.mjs`
- `scripts/stdio-demo.mjs`
- `scripts/verify-release-parity.mjs`
- `.github/workflows/release-npm.yml`
- `tests/package-proxy-smoke.test.ts`
- `tests/release-guardrails.test.ts`

### Runtime / emitted identity text

- `src/cli.ts`
- `src/embedded/server.ts`
- `src/index.ts`
- `src/metrics/prometheus.ts`
- `tests/cli.test.ts`
- `Dockerfile`
- `ui/src/pages/Dashboard.tsx`

### Repo/docs/support discovery surfaces

- `README.md`
- `CHANGELOG.md`
- `ROADMAP.md`
- `SUPPORT.md`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/guided-setup-request.yml`
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_GROUNDED.md`
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/EVIDENCE_BUNDLE.md`
- `docs/GUIDED_SETUP_AND_AUDITS.md`
- `docs/LIMITS_AND_NON_GOALS.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `docs/PROXY_SETUP.md`
- `docs/QUICKSTART.md`
- `docs/RISK_MODEL.md`
- `docs/RISK_SUMMARY.md`
- `docs/RUNTIME_CONTRACT.md`
- `docs/SHIP_CHECKLIST.md`
- `docs/SYSTEM_OVERVIEW.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/WORKFLOW_HARDENING.md`
- `examples/README.md`
- `ui/README.md`

### Reporting-only files that can be staged with the boundary or as a tiny follow-up reporting commit

- `codex-reports/INDEX.md`
- `codex-reports/latest.md`
- `codex-reports/2026-04-06__full-hard-rename-migration-to-toolwall.md`
- `codex-reports/2026-04-06__make-toolwall-rename-commit-ready-and-verify-public-reality.md`

## 4. DEFERRED / HISTORY ONLY

### Deferred dirty files outside the commit-ready rename boundary

- `docs/LAUNCH_TEXTS.md`
- `toolwall-execution-system/**`
- `src/mcp-tool-schemas.ts`
- `src/middleware/color-boundary.ts`
- `src/middleware/preflight-validator.ts`
- `src/middleware/rate-limiter.ts`
- `src/proxy/shadow-leak-sanitizer.ts`
- `tests/admin.test.ts`
- `tests/preflight-validator.test.ts`
- `tests/schema-validator.test.ts`
- `tests/shadow-leak-sanitizer.test.ts`

### History-only layers that should remain untouched

- workspace `BD/04-done/*`
- workspace `BD/06-decisions/*`
- workspace `BD/07-research/*`
- `chatgpt-handoff-20/*`
- `chatgpt-upload-pack/archive/*`
- workspace-level historical `codex-reports/*`
- any dated audit/history file that refers to the old name as a past fact

### Remaining old-name classification after local rename

- `legacy note`: explicit public-history references only
- `archive/history only`: dated research/log/report layers
- `bug`: none found in the active searched surfaces

## 5. PUBLIC REALITY STATUS

### LOCAL CONFIRMED

- local repo root is already `toolwall`
- local package/install/bin identity is `toolwall`
- local `origin` is configured to `https://github.com/shleder/toolwall.git`
- local required verification for the rename boundary already passed earlier on 2026-04-06

### PUBLIC CONFIRMED

- unauthenticated GitHub access to `https://github.com/shleder/mcp-transport-firewall` works and still shows the public repo
- unauthenticated `git ls-remote https://github.com/shleder/mcp-transport-firewall.git` succeeds
- unauthenticated `git ls-remote https://github.com/shleder/toolwall.git` returns `Repository not found`
- `npm view mcp-transport-firewall name version description repository.url homepage dist-tags --json` succeeds and currently reports:
  - name `mcp-transport-firewall`
  - version `2.2.5`
  - `dist-tags.latest = 2.2.5`
  - repository/homepage still pointing at `shleder/mcp-transport-firewall`

### CANNOT CONFIRM

- cannot confirm that a public GitHub repo rename to `shleder/toolwall` already exists
- cannot confirm that `shleder/toolwall` is absent versus private; only public unauthenticated access failed from this environment
- cannot confirm that a public redirect from `shleder/mcp-transport-firewall` to `shleder/toolwall` exists, because the old public repo path itself still resolves directly
- cannot confirm public npm availability/ownership for `toolwall` beyond this fact:
  - unauthenticated `npm view toolwall ...` returned registry `E404`, which proves the package is not publicly resolvable from this environment right now
  - that does not prove whether the name is permanently available, privately held, or blocked by registry policy
- cannot confirm any public `toolwall` publish, tag, release, or deprecation notice for the old package

## 6. CHANGED FILES

This shaping pass changed:

- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
- `toolwall/codex-reports/2026-04-06__make-toolwall-rename-commit-ready-and-verify-public-reality.md`
- `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
- `BD/04-done/done-log.md`
- `BD/06-decisions/decision-log.md`

No repo runtime/package/test surface was edited in this shaping pass.

## 7. VERIFICATION

Because this pass changed reporting/memory files only, the full code/package verification chain was not rerun.

Verification actually performed in this pass:

- `git rev-parse --show-toplevel`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline --decorate -n 30`
- `git diff --stat origin/main..HEAD`
- `git diff --name-only`
- `git diff --stat`
- targeted `git diff` reads on representative rename and non-rename dirty files
- public GitHub checks:
  - `git ls-remote https://github.com/shleder/toolwall.git`
  - `git ls-remote https://github.com/shleder/mcp-transport-firewall.git`
- public npm checks:
  - `npm view toolwall ...`
  - `npm view mcp-transport-firewall ...`

Post-edit formatting check still required after report writes:

- `git diff --check`

## 8. MANUAL OPERATOR ACTIONS

### A. Turn the local rename into a real commit boundary

1. Stage only the commit-ready candidate files from Section 3.
2. Leave the deferred files from Section 4 unstaged.
3. Review the boundary with:
   - `git diff --cached --stat`
   - `git diff --cached`
4. If desired, stage reporting-only files with the same commit or as a tiny follow-up reporting commit.

### B. Confirm public GitHub reality

1. In a browser, check:
   - `https://github.com/shleder/mcp-transport-firewall`
   - `https://github.com/shleder/toolwall`
2. If the intended public repo is supposed to be `toolwall`, perform the actual GitHub repo rename or create the target repo.
3. Re-check unauthenticated public access:
   - `git ls-remote https://github.com/shleder/toolwall.git`
   - open `https://github.com/shleder/toolwall`
4. Only after that should repo metadata pointing to `shleder/toolwall` be described as `public/current`.

### C. Confirm public npm reality

1. Check current public registry state:
   - `npm view mcp-transport-firewall name version repository.url homepage dist-tags --json`
   - `npm view toolwall name version repository.url homepage dist-tags --json`
2. If `toolwall` is not publicly available, decide one of:
   - publish to `toolwall` after securing the name
   - choose a different public package name and update local metadata accordingly before publish
3. Only after the target name is truly available should the public publish happen.

### D. Publish sequencing if the operator chooses to roll out publicly later

1. confirm the public GitHub repo state first
2. ensure the staged commit boundary is committed
3. rerun the full release verification chain on the final intended publish commit
4. publish the new package identity
5. only after the new package is live, consider deprecating the old package line

### E. Old package deprecation, only if a new public package really exists

After a real public `toolwall` publish, optionally deprecate the old line with a message like:

- `npm deprecate mcp-transport-firewall@"<=2.2.5" "Renamed to toolwall. Use npm i -g toolwall or npx toolwall."`

Do not deprecate the old package before the replacement package is actually public and installable.

## 9. RISKS / OPEN QUESTIONS

- the local repo metadata now points at `shleder/toolwall`, but public GitHub access to that path is not proven
- the local package metadata now says `toolwall`, but public npm resolution for `toolwall` is not proven
- the worktree still mixes rename-ready files with deferred non-rename technical work, so a careless `git add .` would produce a misleading mixed commit
- the previous local hard rename report treated the local boundary as complete; this new pass clarifies that commit-ready staging still requires selective file boundaries because unrelated dirty work remains present

## 10. REPORT FILES

- `toolwall/codex-reports/2026-04-06__full-hard-rename-migration-to-toolwall.md`
- `toolwall/codex-reports/2026-04-06__make-toolwall-rename-commit-ready-and-verify-public-reality.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
