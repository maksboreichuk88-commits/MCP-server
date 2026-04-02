# Current State Grounded

Updated: 2026-04-02

## public/current

- npm `latest` is `2.2.5`
- `npm view mcp-transport-firewall version dist-tags --json` still returns version `2.2.5` and `latest: 2.2.5`
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
- `HEAD`: `24e8eb4 docs(examples): Clarify flagship proof path`
- branch state: ahead of `origin/main` by 6 unpublished commits
- working tree: clean
- current local-only stack already includes:
  - package install proof
  - grounded docs
  - public proof surface
  - policy/rules hardening
  - benchmark/evidence alignment
  - docs/examples alignment
- current local-only commits on the checked-out branch:
  - `1d194f2 test(packaging): Lock packaged install contract`
  - `6d530b6 docs(grounding): reconcile local architecture and current state`
  - `e076e53 docs(public): sharpen install and workflow proof surface`
  - `46c04db feat(policy): Harden flagship workflow trust rules`
  - `25c1743 docs(evidence): Align benchmark with preflight hardening`
  - `24e8eb4 docs(examples): Clarify flagship proof path`
- separate unpublished local branch: `project/naming-and-ci-discipline` at `ebbdd73`

## verified locally in the checked-out branch

- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline --decorate -n 20`
- `npm run assert:package-metadata`
- `npm test`
- `npm run demo:stdio`
- `npm run pack:dry-run`
- `npm run pack:smoke`

These checks confirm the current local-only branch behavior. They do not prove push, PR merge, release, or npm publication.

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

- the full six-commit `project/tests-first-quality` stack listed above
- naming-and-ci-discipline packet on `project/naming-and-ci-discipline`

### Planned-only

- `2.2.6` release/tag/publish
- any future branch-convergence batch that has not landed yet
- optional GitHub metadata cleanup batch from `BD/08-ops/github-metadata-cleanup-candidates.md`
- any Toolwall display-name rollout beyond planning artifacts

Important reconciliation rule:

- draft PR visibility is not merge or release proof
- the checked-out branch is the source of truth for local-only behavior
- `2.2.6` contents remain unconfirmed until a real release candidate exists

## Docs vs Runtime/Tests

### confirmed

- the operator-facing CLI path is the stdio proxy from `src/stdio/proxy.ts`
- when no explicit target is configured, `src/cli-options.ts` falls back to the current package entrypoint with `--embedded-target`
- the bundled embedded server in `src/embedded/server.ts` exposes `firewall_status` and `firewall_usage`
- trust gates in `src/stdio/proxy.ts` run in this order:
  1. auth extraction and scope validation
  2. color-boundary validation
  3. AST/egress validation
  4. preflight validation
  5. strict schema validation

### reconciled in this packet

- repo docs should describe the packaged embedded server as the fallback downstream target for the default CLI path, not as the default direct CLI path
- `docs/VERIFICATION_GUIDE.md` now reflects the local verification surface in the checked-out branch
- that local verification surface includes `scripts/assert-package-metadata.mjs`, expanded install-contract assertions in `tests/release-guardrails.test.ts`, and packaged downstream proof in `tests/package-proxy-smoke.test.ts`
- GitHub-visible docs can still lag this local grounded packet until it is pushed

### cannot confirm

- cannot confirm any unmerged branch behavior from GitHub state alone
- cannot confirm future `2.2.6` contents because no release/tag exists yet
