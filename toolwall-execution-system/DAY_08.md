# Day 08 - Truth-Sync First-Read Repo Surfaces

Why this day matters in the full project picture:
- README, quickstart, limits, and demo surfaces must agree before naming cleanup or launch packaging

Exact goal:
- sync the first-read repo surfaces so they tell one non-contradictory story

Unlock condition:
- a first reader does not hit conflicting wording between adjacent core docs

In scope:
- README
- quickstart surface
- limits surface
- demo/proof entry wording

Out of scope:
- deep runtime docs rewrite
- GitHub metadata work

Files to inspect first:
- `README.md`
- quickstart file from Day 5
- `docs/LIMITS_AND_NON_GOALS.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `docs/PROXY_SETUP.md`

Expected deliverable:
- one internally consistent first-read doc cluster

Required verification:
- `git diff --check`
- rerun only the proof command(s) whose claimed story changed

Key risks:
- small wording drift reintroducing contradiction
- hiding local-only/public-current distinctions

Truth constraints:
- sync wording to the checked-out branch, not to imagined future release state

Product constraints:
- keep first-read surfaces centered on the flagship workflow

Success condition:
- Day 9 can clean naming without first repairing doc contradictions
