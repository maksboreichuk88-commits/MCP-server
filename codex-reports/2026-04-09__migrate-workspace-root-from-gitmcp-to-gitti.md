# Codex Task Report

- Date: 2026-04-09
- Task: migrate Toolwall workspace root from `GITMCP` to `GITTI`
- Branch: `project/tests-first-quality`
- Status: DONE

## Scope

This batch migrated the verified Toolwall workspace from:

- `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP`

to:

- `C:\Users\777\OneDrive\Desktop\Calculator\GITTI`

while preserving the main `toolwall` repo, the auxiliary local release worktree, workspace memory surfaces, and the pre-existing Ruflo bootstrap already present in `GITTI`.

## Preserved

- workspace-root durable memory:
  - `BD`
  - `codex-context`
  - `chatgpt-upload-pack`
  - `chatgpt-handoff-20`
  - workspace `codex-reports`
- repo:
  - `toolwall`
  - `toolwall/.git`
  - `toolwall/codex-reports`
- auxiliary worktree:
  - `toolwall-release-attempt-v2.2.6-20260407232747`
- target bootstrap surfaces:
  - `CLAUDE.md`
  - `.agents`
  - `.claude`
  - `.claude-flow`
  - `.codex`
  - `.mcp.json`

## Excluded As Regenerable

- `toolwall/node_modules`
- `toolwall/dist`
- `toolwall/.mcp-cache`
- `toolwall/ui/node_modules`
- `toolwall/ui/dist`

## Additional Decisions

- source workspace-root `.git` was not migrated because it had zero commits and no remotes
- source workspace-root `skills` junction was not migrated because it pointed to global runtime state, not project-local data
- source workspace-root shortcut file was not migrated
- root `AGENTS.md` was merged and rewritten for the new workspace instead of copied blindly
- `CLAUDE.md` was rewritten so Ruflo bootstrap no longer treats the workspace root as the product repo

## Execution

1. Created a rollback backup of the target bootstrap state at:
   - `C:\Users\777\OneDrive\Desktop\Calculator\migration-backups\GITTI-pre-migration-20260409-132053`
2. Copied durable workspace directories into `GITTI`
3. Copied `toolwall` into `GITTI\toolwall` with verified regenerable outputs excluded
4. Copied the clean release worktree into `GITTI\toolwall-release-attempt-v2.2.6-20260407232747` with the same exclusions
5. Repaired Git worktree metadata inside the migrated repo so the auxiliary worktree points to `GITTI`, not `GITMCP`
6. Replaced root `AGENTS.md` and `CLAUDE.md` with workspace-aware versions

## Verification

Verified:

- `git rev-parse --show-toplevel` in `GITTI\toolwall`
- `git rev-parse --show-toplevel` in `GITTI\toolwall-release-attempt-v2.2.6-20260407232747`
- `git worktree list --porcelain` in `GITTI\toolwall`
- `git status --short --branch` in both migrated Git roots
- `git fsck --no-progress` in `GITTI\toolwall`
- critical path existence checks for:
  - root memory surfaces
  - repo docs/tests/scripts
  - repo-local report surfaces
- exclusion checks confirming the copied target does not contain the excluded caches/build outputs

Notes:

- `git fsck --no-progress` reported one dangling commit, which is non-fatal and did not prevent the repo from opening or the worktree from resolving correctly
- package/build/test commands were verified from `toolwall/package.json` but were not executed in this migration batch because dependency installs and build outputs were intentionally excluded
- the repo dirty state visible in `git status` was preserved from the source repo instead of normalized

## Result

The migrated workspace is structurally usable and keeps the workspace-root vs repo-root distinction intact inside `GITTI`.
