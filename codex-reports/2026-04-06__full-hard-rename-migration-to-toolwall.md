# Full Hard Rename Migration To Toolwall

Created: 2026-04-06
Updated: 2026-04-06

## 1. STATE

- Status: DONE
- Scope: full local hard rename migration from `mcp-transport-firewall` to `Toolwall` / `toolwall`
- Verification status: the required serial command chain passed on the checked-out local boundary
- Public/current rollout status: not proven by this batch

## 2. REPO ROOT AND PARENT ROOT

- Repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Parent root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP`

## 3. ACTIVE OLD-NAME SURFACES

Pre-edit inventory found active old-name surfaces in:

- package/install/bin/docs/scripts/tests truth files across the repo
- workspace truth files in `BD`, `AGENTS.md`, `chatgpt-upload-pack`, and reporting instructions
- the local git remote target in `.git/config`
- the emitted UI bundle in `ui/dist`
- active operational docs such as `CHANGELOG.md` and `BD/08-ops/github-metadata-rename-commands.md`

Post-edit result:

- active package/install/bin/docs/scripts/tests/source/context surfaces are clean
- surviving old-name references are now expected only in legacy/public-history material, archives, or historical logs

## 4. RENAME IMPACT MATRIX

- MUST RENAME NOW:
  - package/install/bin identity
  - repo folder/root identity
  - active docs/scripts/tests/source/help text
  - active workspace truth layer
  - local git remote target
  - emitted UI bundle
- MAY KEEP AS LEGACY NOTE:
  - historical release notes
  - dated decision/done logs
  - archived handoff material
  - pre-rename public/current package references when explicitly labeled
- MUST NOT SURVIVE AFTER MIGRATION:
  - active `mcp-transport-firewall` package/bin/install wording
  - active old-name repo-folder references
  - active upload-pack/context-routing old-name truth
  - unlabeled old-name references in current repo/workspace surfaces

## 5. FOLDER RENAME PLAN

- Current folder observed during implementation: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Target folder: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Practical outcome:
  - the repo was already physically present under `toolwall` by the time implementation continued
  - all subsequent commands and edits were run from the new root
- Safe sequence used in practice:
  - detect the current git root
  - confirm the old folder path no longer existed
  - continue all work from the new `toolwall` root

## 6. CHANGED FILES

High-signal changed surfaces in this batch:

- repo identity/runtime/docs:
  - `package.json`
  - `package-lock.json`
  - `README.md`
  - `CHANGELOG.md`
  - `.github/ISSUE_TEMPLATE/config.yml`
  - docs, scripts, tests, source files already carrying the renamed local identity
- local git config:
  - `.git/config` local `origin` target updated to `https://github.com/shleder/toolwall.git`
- workspace truth layer:
  - `AGENTS.md`
  - `BD/01-project-and-links/official-links.md`
  - `BD/03-current-goals/current-focus.md`
  - `BD/04-done/done-log.md`
  - `BD/06-decisions/decision-log.md`
  - `BD/08-ops/github-metadata-rename-commands.md`
  - `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
  - `chatgpt-upload-pack/02_CURRENT_STATE.md`
  - `chatgpt-upload-pack/03_PRODUCT_DIRECTION.md`
  - `chatgpt-upload-pack/04_ARCHITECTURE_AND_RUNTIME.md`
  - `chatgpt-upload-pack/05_VERIFICATION_AND_RELEASE.md`
  - `chatgpt-upload-pack/06_REPO_TRUTH_AND_LIMITS.md`
  - `chatgpt-upload-pack/08_WORKSPACE_AND_REPORTING.md`
- repo-local reporting:
  - `toolwall/codex-reports/INDEX.md`
  - `toolwall/codex-reports/latest.md`
  - `toolwall/codex-reports/2026-04-06__full-hard-rename-migration-to-toolwall.md`

## 7. POST-RENAME SEARCH RESULTS

Reran searches for:

- `mcp-transport-firewall`
- `mcp transport firewall`
- `MCP Transport Firewall`

Result classification:

- active repo/workspace surfaces searched in this batch: clean
- remaining expected matches, if any, belong only to:
  - legacy/public-history notes
  - archive/history-only material
  - older historical logs

No active old-name bug was left on the searched current surfaces.

## 8. VERIFICATION

Executed serially from `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`:

1. `npm install`
2. `npm run build`
3. `npm run typecheck`
4. `npm run assert:package-metadata`
5. `npm test`
6. `npm run pack:dry-run`
7. `npm run pack:smoke`
8. `npm run demo:stdio`

Result:

- all commands passed
- `npm install` also reran the package `prepare` / build path successfully
- npm reported one high-severity dependency vulnerability during install; not addressed in this rename-only batch

## 9. TRUTH LAYER UPDATES

Updated to the new local truth:

- product name: `Toolwall`
- active local package/install/bin/repo-folder identity: `toolwall`
- old name allowed only as explicit legacy/public-history reference
- public/current npm and GitHub rollout kept separate from the local rename claim
- canonical durable repo reports now live under `toolwall/codex-reports/`

## 10. DEFERRED

- external/public rollout proof for GitHub and npm
- any public rename/publish/tag/release action
- non-rename dependency/security remediation unrelated to the migration

## 11. RISKS / OPEN QUESTIONS

- local `origin` now points to `https://github.com/shleder/toolwall.git`, but this batch does not prove that the public GitHub repo rename already exists
- package metadata now targets `toolwall`, but this batch does not prove a public npm `toolwall` package release exists
- historical logs and archives may still contain the old name; they are allowed only as explicit legacy/public-history material

## 12. REPORT FILES

- `toolwall/codex-reports/2026-04-06__full-hard-rename-migration-to-toolwall.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
