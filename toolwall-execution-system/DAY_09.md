# Day 09 - Clean Naming Without Breaking Install Truth

Why this day matters in the full project picture:
- a launch-ready repo needs one coherent active identity across product, package, install, and CLI surfaces

Exact goal:
- clean user-facing naming surfaces so active local truth converges on `Toolwall` / `toolwall`

Unlock condition:
- the active local tree uses one coherent name without misleading install/package surfaces

In scope:
- user-facing naming cleanup on first-read and launch-facing surfaces

Out of scope:
- package rename
- env var rename
- repository slug change
- CLI/bin rename

Files to inspect first:
- `README.md`
- quickstart surface
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/PROXY_SETUP.md`
- `package.json`

Expected deliverable:
- one cleaner naming layer with unified active local identity

Required verification:
- `git diff --check`
- rerun `npm run demo:stdio` only if install/proof path wording materially changes

Key risks:
- mixed public/local rollout wording
- stale legacy notes being mistaken for active truth

Truth constraints:
- local rename truth and public/current release truth must stay separate

Product constraints:
- naming cleanup must serve clarity, not branding theater

Success condition:
- users can understand the product name without losing the real install identity
