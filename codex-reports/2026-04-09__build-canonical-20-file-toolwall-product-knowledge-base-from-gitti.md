# Codex Task Report

- Date: 2026-04-09
- Task: build a new canonical 20-file Toolwall product knowledge base from GITTI
- Status: DONE
- Main repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITTI\toolwall`
- Release worktree: `C:\Users\777\OneDrive\Desktop\Calculator\GITTI\toolwall-release-attempt-v2.2.6-20260407232747`
- Output root: `C:\Users\777\OneDrive\Desktop\Calculator\GITTI\product-knowledge-base`

## Scope

This batch created a curated product knowledge base for future sessions. It did not do runtime feature work, publish, push, merge, or broad repo restructuring.

The goal was not to dump the tree. The goal was to synthesize current product truth, runtime truth, proof path, release truth, and workspace protocol into one compact canonical layer.

## Sources Actually Used

Workspace and control:

- `AGENTS.md`
- `CLAUDE.md`
- `BD/00-index/README.md`
- `codex-context/README.md`
- `codex-context/CONTEXT_ROUTER.md`
- workspace `codex-reports/latest.md`
- selected `chatgpt-upload-pack/*`

Repo and runtime:

- `README.md`
- `package.json`
- `docs/QUICKSTART.md`
- `docs/PROXY_SETUP.md`
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/LIMITS_AND_NON_GOALS.md`
- `docs/RISK_MODEL.md`
- `docs/RUNTIME_CONTRACT.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/EVIDENCE_BUNDLE.md`
- `docs/SHIP_CHECKLIST.md`
- `src/cli.ts`
- `src/cli-options.ts`
- `src/runtime-config.ts`
- `src/stdio/proxy.ts`
- `src/mcp-tool-schemas.ts`
- `src/proxy/shadow-leak-sanitizer.ts`
- `src/embedded/server.ts`
- `examples/demo-target.js`
- `scripts/assert-package-metadata.mjs`
- `scripts/pack-smoke.mjs`
- `scripts/stdio-demo.mjs`
- `scripts/verify-release-parity.mjs`

Reports:

- `codex-reports/2026-04-07__finalize-first-toolwall-release-candidate-boundary.md`
- `codex-reports/2026-04-07__execute-first-real-unscoped-toolwall-publish-attempt.md`
- `codex-reports/2026-04-07__make-npm-tarball-match-approved-toolwall-release-subset.md`
- `codex-reports/2026-04-09__fix-prepublishonly-timeout-blocking-manual-publish-dry-run-for-toolwall-2.2.6.md`

Live public/current checks run in this batch:

- `npm view toolwall name version repository.url homepage dist-tags --json`
- `npm view mcp-transport-firewall name version repository.url homepage dist-tags --json`
- `gh repo view shleder/toolwall --json name,url,defaultBranchRef,homepageUrl,description,latestRelease`
- `git ls-remote --symref https://github.com/shleder/toolwall.git HEAD`
- `gh pr list --repo shleder/toolwall --limit 30 --json number,title,headRefName,baseRefName,isDraft,state,url`

Live local checks run in this batch:

- `git status --short --branch` in the main repo
- `git status --short --branch` in the release worktree
- `git branch --list` in the main repo
- `git branch --list` in the release worktree
- `npm whoami`
- `npm ping`

## Curation Rules Applied

- kept `public/current`, `local-only`, and `cannot confirm` separate
- did not bulk-copy full docs, tests, reports, or handoff history
- kept product value separate from operator machinery
- treated the main repo and the release worktree as different truth surfaces
- used old docs and upload-pack files only where they still matched current evidence

## Contradictions Resolved Explicitly

### 1. Public repo identity vs public npm identity

- `public/current` GitHub repo is already `toolwall`
- `public/current` npm still resolves only `mcp-transport-firewall@2.2.5`
- unscoped `toolwall` still returns `E404`

### 2. Main repo vs release-prep source

- main repo is the active development line and is dirty
- the latest green publish-like verification lives in the auxiliary release worktree
- the auxiliary worktree is also dirty, so the current green state is not yet a frozen release commit

### 3. Historical docs vs current release truth

- older files such as `docs/CURRENT_STATE_GROUNDED.md` and parts of `chatgpt-upload-pack` remain useful history
- they are not the active release truth on 2026-04-09

### 4. Workspace reporting vs repo-local reporting

- workspace `AGENTS.md` says workspace-level `codex-reports` is the active durable audit trail
- this task also explicitly requested one repo-local report
- result: wrote the canonical curation report in `toolwall/codex-reports/` and synced both repo-local and workspace-level `latest.md` and `INDEX.md`

## Deliverables Created

- new folder `C:\Users\777\OneDrive\Desktop\Calculator\GITTI\product-knowledge-base`
- exactly 20 canonical files inside that folder
- this repo-local curation report
- synced repo-local `codex-reports/INDEX.md`
- synced repo-local `codex-reports/latest.md`
- synced workspace `codex-reports/INDEX.md`
- synced workspace `codex-reports/latest.md`

## Verification

- file count check: `20`
- exact filename set check: passed
- required header-prefix check for all 20 files: passed

## Product-Core vs Operator-Only vs Archive/History

Product-core:

- `toolwall`
- `toolwall-release-attempt-v2.2.6-20260407232747`
- `product-knowledge-base`

Operator-only:

- `AGENTS.md`
- `CLAUDE.md`
- `BD`
- `codex-context`
- `codex-reports`
- bootstrap directories such as `.agents`, `.claude`, `.claude-flow`, `.codex`

Archive/history:

- `chatgpt-upload-pack`
- `migration-reports`
- older historical repo docs like `docs/CURRENT_STATE_GROUNDED.md`

## Outcome

The workspace now has one compact, future-facing Toolwall knowledge base that is current, source-backed, and explicit about where product truth ends and operator or archive material begins.
