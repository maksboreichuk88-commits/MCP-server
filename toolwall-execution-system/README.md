# Toolwall 14-Day Execution System

This directory is the controlled execution layer for driving Toolwall through one grounded 14-day program.

It exists to prevent:
- stale planning that does not match the checked-out repo
- vague next-step language that never turns into execution
- scope drift away from the flagship local filesystem/search-over-stdio workflow

How to use it:
1. Read `PROGRAM_STATUS.md`.
2. Read the current `DAY_XX.md`.
3. Open `prompts/DAY_XX.txt`.
4. Re-check live repo truth before acting.
5. Execute only that day boundary.
6. Verify proportionally and update canonical repo-local reporting.

Grounding rule:
- this system is based on the real checked-out local state
- it does not treat stale reports or stale pack files as authoritative by themselves
- each day is marked `DONE` here only after it is explicitly executed under this system or deliberately carried forward from matching repo-local evidence on the same checked-out line

Creation baseline:
- repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- branch: `project/tests-first-quality`
- audited HEAD: `2ed9ec5`
- audited date: `2026-04-06`

This folder is internal execution infrastructure, not a public artifact.
