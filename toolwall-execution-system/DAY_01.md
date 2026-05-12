# Day 01 - Lock Pack-Smoke Harness Ownership

Why this day matters in the full project picture:
- the launch sequence cannot stay trustworthy if the packaged smoke harness is still treated as ambiguous, optional, or half-runtime/half-verification

Exact goal:
- resolve the role of `scripts/pack-smoke.mjs` against the current checked-out tree and lock it as part of the launch-prep truth layer

Unlock condition:
- the role of `scripts/pack-smoke.mjs` is explicit, repo-grounded, and no first-read/current-state surface contradicts that role

In scope:
- audit `scripts/pack-smoke.mjs`
- confirm how it is wired from `package.json`
- confirm where docs and reports describe it
- sync any contradiction between live code and current truth docs/reporting

Out of scope:
- broad runtime hardening
- new feature work
- rename work
- full verification rerun beyond what this day specifically requires

Files to inspect first:
- `package.json`
- `scripts/pack-smoke.mjs`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `codex-reports/2026-04-06__resolve-pack-smoke-harness-ownership-and-role.md`

Expected deliverable:
- one explicit current-day decision on `scripts/pack-smoke.mjs`
- any tiny coupled truth-sync needed to keep the repo honest

Required verification:
- `git rev-parse --show-toplevel`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline --decorate -n 20`
- `git diff --stat origin/main..HEAD`
- `git diff --check`
- if the script or its contract wording changes: `npm run typecheck`, `npm run pack:dry-run`, `npm run pack:smoke`

Key risks:
- treating a historical report as current truth without re-reading the live tree
- describing the harness as runtime logic instead of verification-layer code
- leaving docs out of sync with the script

Truth constraints:
- local-only proof is not public/current proof
- the package/install identity remains `toolwall`

Product constraints:
- stay centered on the flagship stdio filesystem/search workflow
- do not broaden the project story

Success condition:
- Day 1 ends with no ownership ambiguity left around `scripts/pack-smoke.mjs`
