# Day 04 - Sharpen README Above The Fold

Why this day matters in the full project picture:
- the first visible repo screen is the highest-leverage trust surface once proof is freshly confirmed

Exact goal:
- make README answer in about 15 seconds what Toolwall is, who it is for, what it protects, how to try it, and what it does not claim

Unlock condition:
- the first screen is clear, narrow, and truthful

In scope:
- top-of-README wording
- tiny coupled truth-sync if the README would otherwise contradict one adjacent doc

Out of scope:
- full quickstart
- full limits pass
- new demo authoring

Files to inspect first:
- `README.md`
- `docs/CURRENT_STATE_GROUNDED.md`
- `docs/RUNTIME_CONTRACT.md`
- `docs/RISK_MODEL.md`
- `docs/LIMITS_AND_NON_GOALS.md`

Expected deliverable:
- one sharper above-the-fold README surface

Required verification:
- git audit commands
- `git diff --check`
- rerun `npm run demo:stdio` only if the proof path wording changes materially

Key risks:
- generic platform drift
- overclaiming security
- erasing the real install/package identity

Truth constraints:
- keep public/current and local-only distinct

Product constraints:
- keep the repo centered on one local filesystem/search MCP workflow over `stdio`

Success condition:
- README becomes a reliable foundation for Day 5 and Day 6
