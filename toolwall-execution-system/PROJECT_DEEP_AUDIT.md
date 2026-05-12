# Project Deep Audit

Audit date: `2026-04-06`

## Repository Identity

- Repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Current branch at audit start: `project/tests-first-quality`
- Current HEAD at audit start: `2ed9ec5 docs(pr): Sync review boundary truth`
- Product name: `Toolwall`
- Package / install / CLI / repo-folder identity: `toolwall`

## Local-Only vs Public/Current

### Public/current

- npm `latest`: `2.2.5`
- latest GitHub release: `v2.2.5`
- public default branch: `origin/main` at `597c7e3`

### Local-only

- checked-out branch is 14 commits ahead of `origin/main`
- working tree is dirty beyond `2ed9ec5`
- the checked-out boundary already contains unpublished runtime/test/doc work

Truth rule:
- public package, public default branch, and checked-out local state must stay explicitly separate

## Flagship Workflow

The flagship workflow is one local filesystem/search MCP workflow over `stdio`.

Current repo-grounded proof path:
- protected downstream proxy mode is the main operator-facing story
- embedded fallback exists, but it is secondary
- the stdio path remains the center of gravity for docs, demo, verification, and launch readiness

## Current Runtime Path

Primary runtime chain:
1. `src/cli.ts`
2. `src/cli-options.ts`
3. `src/runtime-config.ts`
4. `src/stdio/proxy.ts`

Current checked-out gate order:
- auth
- scope
- color
- ast/egress
- preflight
- schema
- cache/downstream

Important limit:
- auth/scope are conditional on configured auth state
- the protection posture is useful and fail-closed where implemented, but still policy/pattern-based rather than full semantic safety

## Current Verification Surface

Current local verification surface:
- `npm run assert:package-metadata`
- `npm run typecheck`
- `npm test`
- `npm run pack:dry-run`
- `npm run pack:smoke`
- `npm run demo:stdio`

Optional evidence command when deny/output behavior changes:
- `npm run benchmark:stdio -- --json --output evidence.json`

## Dirty Working Tree Reality At Audit Start

Dirty files observed before creating this execution system:
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `docs/RISK_MODEL.md`
- `docs/RISK_SUMMARY.md`
- `docs/RUNTIME_CONTRACT.md`
- `scripts/pack-smoke.mjs`
- `scripts/stdio-demo.mjs`
- `src/mcp-tool-schemas.ts`
- `src/middleware/color-boundary.ts`
- `src/middleware/preflight-validator.ts`
- `src/middleware/rate-limiter.ts`
- `src/proxy/shadow-leak-sanitizer.ts`
- `tests/admin.test.ts`
- `tests/preflight-validator.test.ts`
- `tests/schema-validator.test.ts`
- untracked `tests/shadow-leak-sanitizer.test.ts`
- reporting-only `codex-reports/*`

Interpretation:
- the current tree is not a clean archival snapshot
- there is one active local runtime/test/docs boundary that must be treated as real
- planning must target the live dirty state, not only the last commit object

## Current Strong Points

- one coherent flagship workflow already exists
- the packaging/install story is real and backed by packaged smoke coverage
- the repo has a meaningful stdio proof path
- the runtime/test line already includes narrow practical hardening
- display naming (`Toolwall`) is already separated from technical identity (`toolwall`)
- canonical repo-local reporting already exists under `codex-reports/`

## Current Weak Points

- checked-out truth is fragmented across prior reports, dirty files, grounded docs, and the active upload pack
- first-read repo surfaces still need a disciplined end-to-end launch system
- the launch story is still mostly local-only proof, not public/current proof
- secondary surfaces create scope-drift pressure if not tightly subordinated to the stdio story

## Current Critical Ambiguities

- how much of the historically completed Day 1-3 Toolwall program should count inside a fresh execution system
- how to preserve the current dirty boundary without flattening it into a clean-snapshot story
- how far the first public launch should go before any extra naming/CI hygiene carry-forward

## What Is Already Good Enough

- one narrow flagship workflow exists and is documentable
- the local package/install identity is now aligned with the active rename target and is stable enough to support launch prep
- the local verification surface is strong enough to support controlled repo-facing work
- `scripts/pack-smoke.mjs` has a grounded role as a kept verification harness

## What Still Blocks Public Readiness

- one unified execution program did not exist before this system
- README, quickstart, limits, demo, discovery, proof pack, and launch texts are not yet governed as one sequenced chain
- public/current and local-only narratives are still easy to blur unless every launch-facing artifact is rewritten with explicit truth discipline
- a full new-user dry run on the final launch surface has not yet been executed under this program

## What Still Blocks Revenue Readiness

- usefulness proof is stronger than demand proof
- there is no finished public-facing first launch wave yet
- there is no validated inbound workflow showing real user pull

Revenue readiness remains downstream of:
- repo coherence
- first launch execution
- real user feedback

## Audit Conclusion

Toolwall is not blocked by lack of substance.
It is blocked by lack of one disciplined execution spine that converts the current checked-out proof boundary into a coherent launch surface.
