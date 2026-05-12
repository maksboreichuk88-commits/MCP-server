# Day 06 - Publish Explicit Limits And Non-Goals

Why this day matters in the full project picture:
- launch-ready proof loses credibility if the project never states what it does not do

Exact goal:
- make limits and non-goals explicit, concrete, and aligned with the actual runtime posture

Unlock condition:
- the repo can be read without inferring impossible guarantees

In scope:
- limits/non-goals wording
- truth-sync between README and limits doc if needed

Out of scope:
- runtime hardening to close every limit
- platform expansion

Files to inspect first:
- `docs/LIMITS_AND_NON_GOALS.md`
- `README.md`
- `docs/RISK_MODEL.md`
- `docs/RUNTIME_CONTRACT.md`

Expected deliverable:
- one limits/non-goals surface that prevents overclaiming

Required verification:
- `git diff --check`

Key risks:
- writing soft disclaimers instead of precise boundaries
- describing future plans as present capability

Truth constraints:
- stay honest about heuristic/pattern-based protection

Product constraints:
- limits should reinforce the narrow product story, not weaken it into vagueness

Success condition:
- later launch texts can reuse these boundaries without improvising
