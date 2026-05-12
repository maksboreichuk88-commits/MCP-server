# Program Rules

- one day at a time
- one narrow goal per day
- no skipping verification
- no broadening product scope
- no overclaiming security
- no blurring public/current and local-only
- no vague "cleanup"
- no random feature drift

Additional execution rules:
- use the live checked-out repo state as truth, not stale plan text
- earlier reports may inform the day, but they do not auto-complete a day inside this system
- a day may be carried forward as `DONE` only when matching repo-local evidence already proves it on the same checked-out line and the current batch explicitly accepts that carry-forward
- only mark a day `DONE` here after it is explicitly executed under this system
- if a day is docs-only, keep verification proportional
- if a day touches runtime/test/verification harness logic, rerun the relevant local proof commands
- keep `Toolwall` for display framing and `toolwall` for technical/install truth
- keep the flagship workflow as the center of gravity for every day unless the day is explicitly about launch or discovery packaging
