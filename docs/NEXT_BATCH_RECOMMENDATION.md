# Next Batch Recommendation

Updated: 2026-04-02

## Chosen Batch

Name: `branch convergence and repo-surface coherence`

## Why This Is The Best ROI

- the checked-out branch already contains the current local-only proof stack:
  - package install proof
  - grounded docs
  - public proof surface
  - policy/rules hardening
  - benchmark/evidence alignment
  - docs/examples alignment
- the highest remaining risk is fragmented truth across `project/tests-first-quality`, `project/naming-and-ci-discipline`, and the existing draft PR lines
- another isolated docs-only or packaging-only packet would add more surface area without reducing that fragmentation
- the next meaningful release discussion should sit on one coherent branch, not on scattered local and draft packets

## Recommended Scope

- decide how `project/tests-first-quality` should converge with `project/naming-and-ci-discipline`
- carry over only the low-risk subset that improves repo truth without renaming package, repo, bin, or env vars
- keep README, runtime docs, and proof docs centered on one local filesystem/search stdio workflow
- keep `Toolwall` as display/planning only until a later display-copy batch
- avoid new runtime features unless a factual fix is required

## Why The Other Top 2 Options Lose

### 1. broader display-name rollout

- `Toolwall` is still a planning/display boundary, not a technical identity migration
- broader naming rollout before branch convergence would add churn faster than clarity

### 2. monetization or audience-growth work

- repo truth and branch coherence still come first
- pushing growth or monetization on top of mixed local, draft, and public state would amplify confusion instead of trust
