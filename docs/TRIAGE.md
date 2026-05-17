# Crash-Triage Protocol

Toolwall is in Launch Phase maintenance mode. This file tracks real user traffic issues and the required zero-day response path.

## Live Issue Tracker

| Date | Source (Reddit/HN) | Issue Type (False Positive / False Negative) | Payload Snippet | Status |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | Waiting for incoming reports |

## Zero-Day Patching Protocol

Step A: Isolate the user's payload.

Step B: Reproduce the crash/bypass locally using `scripts/stdio-demo.mjs`.

Step C: Add the failing payload as a strict test case in `tests/` or `evidence-corpus.json`.

Step D: Apply a surgical patch to `ast-egress-filter.ts` or `shadow-leak-sanitizer.ts` WITHOUT breaking the existing 136 tests.

## Maintenance Rules

- Do not write new features during crash-triage.
- Do not refactor the core architecture.
- Prioritize rapid fixes based on real user traffic.
- Keep every patch narrow, reproducible, and covered by a regression test.
