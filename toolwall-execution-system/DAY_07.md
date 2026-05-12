# Day 07 - Build One Strong Demo Scenario

Why this day matters in the full project picture:
- the project needs one memorable, repeatable demonstration of the flagship workflow

Exact goal:
- define and document one strong demo scenario that shows allow, cache, and deny behavior on the stdio filesystem/search path

Unlock condition:
- the project has one primary demo story instead of scattered proof snippets

In scope:
- demo scenario narrative
- any tiny coupled doc updates needed to keep the proof story aligned

Out of scope:
- multiple demos
- broad benchmark redesign
- new workflow families

Files to inspect first:
- `scripts/stdio-demo.mjs`
- `docs/DEMO_RUN_TRANSCRIPT.md`
- `README.md`
- `docs/PROXY_SETUP.md`
- `examples/README.md`

Expected deliverable:
- one strong primary demo scenario

Required verification:
- `git diff --check`
- `npm run demo:stdio`

Key risks:
- turning the demo into a benchmark or launch essay
- drifting away from filesystem/search-over-stdio

Truth constraints:
- demo text must match the actual local proof behavior

Product constraints:
- one primary demo only

Success condition:
- later proof pack and launch texts can anchor on this same demo
