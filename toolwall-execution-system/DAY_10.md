# Day 10 - Assemble The Launch-Ready Proof Pack

Why this day matters in the full project picture:
- launch requires one compact set of proof artifacts, not a hunt across the whole repo

Exact goal:
- assemble the smallest strong proof pack for the flagship workflow

Unlock condition:
- one reader can reach proof, verification, and limits from one compact entry set

In scope:
- proof-pack assembly
- evidence entry points
- doc linking and structure

Out of scope:
- new runtime features
- new benchmark scope

Files to inspect first:
- `docs/EVIDENCE_BUNDLE.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `docs/STDIO_BENCHMARK_GUIDE.md`
- `docs/STDIO_BENCHMARK_SNAPSHOT.json`

Expected deliverable:
- one launch-ready proof pack

Required verification:
- `git diff --check`
- rerun only the proof commands directly referenced if their story changes

Key risks:
- proof pack becoming bloated or vague
- mixing local-only proof with public/current release claims

Truth constraints:
- the proof pack must label local-only proof clearly

Product constraints:
- proof pack must stay subordinate to the one flagship workflow

Success condition:
- Day 11 and Day 12 can point to one compact proof surface
