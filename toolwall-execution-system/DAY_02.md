# Day 02 - Consolidate One Coherent Local Boundary

Why this day matters in the full project picture:
- every later day depends on knowing which dirty files belong to the active product boundary and which files are reporting-only

Exact goal:
- classify the live dirty working tree into one explicit local boundary with no silent deferred product/runtime files

Unlock condition:
- the working tree has one grounded boundary description and that description matches live `git status`

In scope:
- re-read dirty files
- group them by runtime/test/docs/reporting
- decide what belongs inside the active local boundary

Out of scope:
- rewriting the runtime
- launch copy
- README/quickstart polish

Files to inspect first:
- `git status --short --branch`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/NEXT_BATCH_RECOMMENDATION.md`
- `scripts/stdio-demo.mjs`
- `scripts/pack-smoke.mjs`

Expected deliverable:
- one explicit boundary statement that later days can inherit

Required verification:
- git audit commands
- `git diff --check`
- if the boundary statement forces truth-doc edits only: no full suite by default

Key risks:
- stale assumptions about deferred files
- accidentally flattening reporting-only files into product scope

Truth constraints:
- boundary decisions must be based on the live tree, not earlier notes alone

Product constraints:
- boundary must remain subordinate to the flagship stdio workflow

Success condition:
- Day 2 produces one live, explicit local boundary with no hidden carryover files
