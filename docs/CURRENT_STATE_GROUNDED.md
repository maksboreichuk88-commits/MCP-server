# Current State Grounded

Updated: 2026-04-06

## public/current

- the only confirmed published npm line is still the pre-rename `2.2.5` release track
- the renamed `toolwall` package identity is local-only in this batch until a future publish proves it
- latest GitHub release is `v2.2.5`, published at `2026-03-31T19:48:11Z`
- `origin/main` is commit `597c7e3` (`ci(actions): Update workflows for Node 24 (#48)`)

Grounded implication:

- the public package line is still `2.2.5`
- the public default-branch code is newer than the public package, so `public/current package` and `public/current main` are not the same thing

## open/draft PR state

Confirmed via local `gh` on `2026-04-02`:

- `#49` draft: `docs(public): tighten human-facing security copy`
- `#50` draft: `chore(repo): normalize public copy and verification naming`
- `#51` draft: `ref(runtime): normalize operator-facing security language`
- `#52` draft: `docs(support): tighten workflow intake surface`
- `#53` draft: `docs(workflow): center proof on filesystem/search path`

These PRs are public on GitHub, but they are not merged and they do not change the published npm state.

## local-only

- checked-out branch: `project/tests-first-quality`
- the current checked-out tip at this review boundary is `2ed9ec5 docs(pr): Sync review boundary truth`
- `origin/project/tests-first-quality` also points to `2ed9ec5`
- re-read `git status --short --branch` for the exact ahead count on the current tip
- re-read `git status --short --branch` before treating this file as an exact clean-boundary snapshot; local-only working-tree truth can move ahead of the last committed review boundary
- current local-only stack already includes:
  - package install proof
  - grounded docs
  - public proof surface
  - policy/rules hardening
  - benchmark/evidence alignment
  - docs/examples alignment
  - repo-surface truth-sync
  - durable operator state for secondary surfaces
  - expanded flagship schema coverage
  - short-chunk ShadowLeak hardening
  - release-boundary convergence
  - first-read Toolwall cleanup for external review prep
  - publication-review truth fix for the checked-out branch boundary
- current local-only packets already include these recent unpublished commits:
  - `1d194f2 test(packaging): Lock packaged install contract`
  - `6d530b6 docs(grounding): reconcile local architecture and current state`
  - `e076e53 docs(public): sharpen install and workflow proof surface`
  - `46c04db feat(policy): Harden flagship workflow trust rules`
  - `25c1743 docs(evidence): Align benchmark with preflight hardening`
  - `24e8eb4 docs(examples): Clarify flagship proof path`
  - `8897a6b docs(truth): Sync repo surface with verified local workflow`
  - `672bf38 feat(state): Persist secondary-surface route registry`
  - `1c05fbd feat(schema): Expand flagship tool contract coverage`
  - `d71a736 feat(egress): Harden short-chunk ShadowLeak detection`
  - `dbb35d5 docs(release): Converge local stack for future release boundary`
  - `fa26c69 docs(readme): Clean first-read surface and remove logo`
  - `06e0245 docs(pr): Final review-readiness fix`
  - `2ed9ec5 docs(pr): Sync review boundary truth`
- separate unpublished local branch: `project/naming-and-ci-discipline` at `ebbdd73`

## convergence status

### already coherent in the checked-out branch

- one primary product story: a protected local filesystem/search MCP workflow over `stdio`
- package install proof, packaged proxy smoke coverage, and repo-local demo proof all exist on the same branch
- policy hardening, evidence alignment, docs/examples alignment, and runtime truth-sync already landed together in local-only form
- the secondary HTTP/admin route registry is now restart-durable without broadening the flagship stdio story
- the current working-tree contract keeps preflight registrations, consumed preflight replay state, color sessions, and tenant rate-limit config intentionally process-local
- strict schema coverage expanded only for common safe filesystem sibling tools
- ShadowLeak detection now blocks repeated short query chunks under one key without widening the safe search/read path
- current response-side sanitization also redacts explicit plain-text bearer headers and inline secret assignments before downstream strings re-enter the caller context
- the README and first-read repo surface now use one unified local identity: `Toolwall` / `toolwall`

### still fragmented or intentionally separate

- the current local stack is still unpublished local-only work
- `project/naming-and-ci-discipline` remains a separate hygiene branch and should not be treated as if it already merged into this line
- workflow display-name and artifact-label renames from that branch are still optional, not part of the current runtime proof

### blockers before a meaningful future `2.2.6` discussion

- use the current checked-out branch as one explicit push/PR review boundary instead of reopening scope with another implementation packet
- keep `public/current` and `local-only` state explicitly separate in repo and handoff docs
- either port only the non-renaming workflow hygiene worth carrying forward now, or explicitly defer the rest of the naming branch
- do not claim exact `2.2.6` contents until that future review boundary exists

## required verification boundary for this local stack

On 2026-04-06, Toolwall program Day 3 re-confirmed the current local boundary with a fresh serial rerun.

- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline --decorate -n 30`
- `npm run assert:package-metadata`
- `npm run typecheck`
- `npm test`
- `npm run pack:dry-run`
- `npm run demo:stdio`
- `npm run pack:smoke`
- rerun `npm run benchmark:stdio -- --json --output evidence.json` only when evidence-facing deny behavior or benchmark snapshot content changes

These checks confirm local branch behavior only. They do not prove push, PR merge, release, or npm publication.

## Packet Reconciliation

### Already public/current

- released package line `2.2.5`
- tag `v2.2.5`
- default branch `origin/main` at `597c7e3`

### Implemented and publicly visible, but not merged

- repo-baseline packet on `project/repo-baseline` / draft PR `#50`
- runtime-language packet on `project/product-runtime-language` / draft PR `#51`
- support-surface packet on `project/support-surface` / draft PR `#52`
- workflow-proof packet on `project/workflow-proof` / draft PR `#53`
- earlier public-copy cleanup on `cleanup/security-copy` / draft PR `#49`

### Implemented locally, not public

- the current `project/tests-first-quality` local-only stack, including the recent commits listed above
- the separate workflow-hygiene packet on `project/naming-and-ci-discipline`

### Planned-only

- `2.2.6` release/tag/publish
- any future push/PR phase that carries this local stack forward
- optional GitHub metadata cleanup batch from `BD/08-ops/github-metadata-cleanup-candidates.md`
- any Toolwall display-name rollout beyond planning artifacts

Important reconciliation rule:

- draft PR visibility is not merge or release proof
- the checked-out branch is the source of truth for local-only behavior
- `2.2.6` contents remain unconfirmed until a real future review boundary exists

## Docs vs Runtime/Tests

### confirmed

- the operator-facing CLI path is the stdio proxy from `src/stdio/proxy.ts`
- when no explicit target is configured, `src/cli-options.ts` falls back to the current package entrypoint with `--embedded-target`
- the bundled embedded server in `src/embedded/server.ts` exposes `firewall_status` and `firewall_usage`
- trust gates in `src/stdio/proxy.ts` run in this order:
  1. auth parsing and validation
  2. scope validation
  3. color-boundary validation
  4. AST/egress validation
  5. preflight validation
  6. strict schema validation
- stdio auth and scope remain conditional on configured `PROXY_AUTH_TOKEN` / `proxyAuthToken`; they are not universal always-on gates
- default high-trust preflight currently applies to `write_file`, `write`, `create_file`, `execute_command`, `execute`, and `fetch_url` even without explicit `blue`
- the strict schema registry now also covers `read_multiple_files` / `read_files`, `directory_tree`, `get_file_info`, and `list_allowed_directories`, while unknown tools still remain explicit passthrough
- downstream `result`, `error`, and non-JSON-RPC target output are sanitized before they re-enter the caller context
- current response-side redaction covers sensitive keyed fields, stack traces, sensitive paths, IP addresses, emails, plus narrow plain-text bearer-header and inline secret-assignment patterns

### reconciled in this packet

- repo docs should describe the packaged embedded server as the fallback downstream target for the default CLI path, not as the default direct CLI path
- the checked-out branch now also includes truth-synced repo surfaces, restart-durable secondary route registration, expanded safe schema coverage, and repeated short-chunk ShadowLeak blocking
- indirect prompt-injection and egress blocking remain heuristic / pattern-based; they should not be described as full semantic prevention
- the local verification surface still includes `scripts/assert-package-metadata.mjs`, expanded install-contract assertions in `tests/release-guardrails.test.ts`, and packaged downstream proof in `tests/package-proxy-smoke.test.ts`
- `scripts/pack-smoke.mjs` is now treated as a kept stable verification harness; it is verification-layer code rather than runtime logic, and it uses an isolated temp tarball path per run instead of reusing a repo-root tarball filename
- GitHub-visible docs can still lag this grounded local packet until it is pushed

### cannot confirm

- cannot confirm any unmerged branch behavior from GitHub state alone
- cannot confirm future `2.2.6` contents because no release/tag exists yet
