# Day 11 - Optimize GitHub Discovery Surface

Why this day matters in the full project picture:
- even strong proof will underperform if the repo discovery layer is unclear or noisy

Exact goal:
- make the GitHub-facing discovery surface support the launch-ready proof story

Unlock condition:
- a GitHub visitor can find what the project is and how to validate it without digging

In scope:
- README navigation
- doc entry-point structure
- issue/support/discovery pointers if needed

Out of scope:
- PR choreography
- release creation
- package publish

Files to inspect first:
- `README.md`
- `SUPPORT.md`
- `.github/ISSUE_TEMPLATE/*`
- proof-pack surface from Day 10

Expected deliverable:
- one GitHub-ready discovery surface

Required verification:
- `git diff --check`

Key risks:
- turning discovery work into marketing fluff
- accidentally reviving outdated support-program language

Truth constraints:
- discovery language must remain evidence-shaped and dry

Product constraints:
- discovery must still point to one product, not several stories

Success condition:
- the repo is easier to trust and easier to navigate
