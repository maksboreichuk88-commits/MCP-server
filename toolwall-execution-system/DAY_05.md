# Day 05 - Write A Dead-Simple Quickstart

Why this day matters in the full project picture:
- a launch-ready repo needs one short path from first read to first proof

Exact goal:
- create a dead-simple quickstart that inherits README truth and gets a new user to the flagship proof path fast

Unlock condition:
- a new reader can see one short install-and-try flow without reading the whole docs tree

In scope:
- quickstart doc or tightly scoped README-linked quickstart section
- only the shortest safe path

Out of scope:
- full advanced configuration coverage
- multiple workflow families
- admin/control-plane onboarding

Files to inspect first:
- `README.md`
- `docs/PROXY_SETUP.md`
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/DEMO_RUN_TRANSCRIPT.md`

Expected deliverable:
- one dead-simple quickstart tied to the flagship proof path

Required verification:
- `git diff --check`
- `npm run demo:stdio` if the quickstart claims or expected output wording change

Key risks:
- turning quickstart into an encyclopedic setup guide
- mixing fallback/HTTP/admin surfaces into the first try path

Truth constraints:
- quickstart must describe the checked-out proof truthfully

Product constraints:
- one install path, one proof path

Success condition:
- the quickstart reduces time-to-first-proof instead of adding more narrative weight
