# Verify npm Reality And Prepare Toolwall Publish Boundary

Created: 2026-04-07
Updated: 2026-04-07

## 1. STATE

- Status: DONE
- Task: verify npm/public package reality for the Toolwall rename, separate local truth from public truth, and decide the publish posture
- Actual repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Workspace root used to start the session: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP`
- Important grounding note: the workspace root is **not** a git repository; the real git repository is the nested `toolwall` directory
- Current branch: `project/tests-first-quality`
- Current HEAD: `2ed9ec5 docs(pr): Sync review boundary truth`
- Working tree status: still mixed
- Publish-boundary status: not a clean commit-ready worktree; the current tree still mixes the intended Toolwall rename/publish surfaces with unrelated runtime, harness, launch, and report changes

## 2. LOCAL PACKAGE STATE

Local package metadata currently claims:

- package name: `toolwall`
- version: `2.2.5`
- description: `Fail-closed stdio firewall for risky local MCP JSON-RPC tool calls`
- main/export root: `dist/lib.js`
- bin: `toolwall -> dist/cli.js`
- files/include rules:
  - `dist`
  - `docs`
  - `.env.example`
  - `LICENSE`
  - `README.md`
  - `CHANGELOG.md`
  - `SECURITY.md`
  - `SUPPORT.md`
- repository URL: `git+https://github.com/shleder/toolwall.git`
- homepage: `https://github.com/shleder/toolwall#readme`
- bugs URL: `https://github.com/shleder/toolwall/issues`
- publishConfig: `access = public`
- node engine: `>=20.0.0`

Current publish/release script shape:

- `prepare`: `npm run build`
- `assert:package-metadata`: asserts local package truth against `toolwall`
- `pack:dry-run`: `npm pack --dry-run`
- `pack:smoke`: packaged tarball smoke test via `toolwall`
- `demo:stdio`: repo-local stdio proof path
- `verify:all`: local verification suite plus UI build/lint
- `prepublishOnly`: `npm run assert:package-metadata && npm run verify:all && npm run pack:dry-run && npm run pack:smoke`
- `verify:release-parity`: verifies tag/repo lineage before publish
- `verify:registry-metadata`: verifies npm metadata after publish

Important local release-boundary fact:

- the local package version is still `2.2.5`
- tag `v2.2.5` already exists on old public history at commit `ee73cd1f415f5380dd617a36d3afa1d554d3a8ba`
- current `HEAD` is not tagged and is not that commit

## 3. OLD PUBLIC PACKAGE STATE

### PUBLIC CONFIRMED

Direct registry checks confirmed:

- package name: `mcp-transport-firewall`
- current public version: `2.2.5`
- repository URL: `git+https://github.com/shleder/mcp-transport-firewall.git`
- homepage: `https://github.com/shleder/mcp-transport-firewall#readme`
- dist-tags:
  - `latest = 2.2.5`
- `npm owner ls mcp-transport-firewall` resolves and shows:
  - `maksiph14 <maksboreichuk88@gmail.com>`
- `npm access get status mcp-transport-firewall` returns `public`

Conclusion:

- the old package is still the live public npm line
- the old package is still the only publicly confirmed package identity for this product

## 4. TARGET PACKAGE STATE

### PUBLIC NOT AVAILABLE

Direct registry resolution for the target name currently fails:

- `npm view toolwall name version repository.url homepage dist-tags --json`
- result: `E404 Not Found - GET https://registry.npmjs.org/toolwall`

This confirms:

- `toolwall` is **not publicly resolvable** from this environment right now

### PUBLIC CONFIRMED

- `npm whoami` succeeds
- authenticated npm user: `maksiph14`
- `npm ping` succeeds against `https://registry.npmjs.org/`

This confirms:

- npm authentication exists in this environment
- the registry is reachable

### CANNOT CONFIRM

The following are **not** proven by the current environment:

- whether the unscoped package name `toolwall` is truly available for new public publish
- whether `toolwall` is blocked, privately held elsewhere, or reserved by npm policy
- whether the current authenticated user can publish `toolwall`

Important npm CLI ambiguity:

- the user-requested command `npm access ls-packages` fails with `EUSAGE` because this npm CLI does not support that literal subcommand
- corrected commands `npm access list packages --json` and `npm access list packages maksiph14 --json` both fail with `E403`
- `npm access get status toolwall` returns `toolwall: private`, but the same command returns `private` for a random obviously fake package name too

Interpretation:

- `npm access get status toolwall` is **not** reliable ownership proof here
- the environment proves auth, but does **not** prove publish rights or name availability for `toolwall`

## 5. PUBLISH BLOCKERS

- the working tree is still mixed and the whole repo is not one clean publish boundary
- the local package version is still `2.2.5`, while the old public line already owns the `v2.2.5` release/tag history
- current `HEAD` is not tagged, and a clean first Toolwall public release should not reuse the already-published `v2.2.5` release boundary
- `toolwall` is not publicly resolvable on npm right now (`npm view toolwall` returns `E404`)
- npm auth exists, but rights to publish `toolwall` are not proven from this environment
- release workflow and release docs are already shaped for future `toolwall` publication, but that is local preparation, not public reality

## 6. DECISION OPTIONS

### PUBLISH AS TOOLWALL NOW

Why:

- local package metadata, bin identity, publish scripts, and release checks are already shaped around `toolwall`

Risk:

- high risk of a false-start publish because the current environment does not prove rights/availability for the unscoped name
- high risk of a messy release because the worktree is still mixed and the version is still `2.2.5`

What must happen next:

- prove rights/availability for `toolwall`
- isolate the release candidate from unrelated dirty files
- bump to a new release version beyond the old public `2.2.5` line

### PREPARE TOOLWALL BUT WAIT

Why:

- local Toolwall identity is already in place and the package surface is close to a future clean publish boundary
- the old public line is still live
- the target public name is still not publicly resolvable
- auth exists but rights/availability are not proven

Risk:

- the rename remains locally ready but publicly incomplete for a bit longer
- repo/docs language must keep separating local and public truth to avoid confusion

What must happen next:

- keep Toolwall as the intended public identity
- prove the target name and publish rights explicitly
- cut a clean release candidate with a new version

### CHOOSE A DIFFERENT PACKAGE NAME

Why:

- use this only if the operator needs immediate public publication and `toolwall` cannot be secured quickly

Risk:

- breaks the desired package/install identity target
- adds another rename layer and extra doc/release churn

What must happen next:

- safest fallback strategy: publish under `@maksiph14/toolwall` while keeping product name `Toolwall` and bin name `toolwall`
- update install docs to `npx @maksiph14/toolwall` and `npm install -g @maksiph14/toolwall`
- keep unscoped `toolwall` only as a later reclaim/rename goal if it becomes available

## 7. FINAL DECISION

Decision: **PREPARE TOOLWALL BUT WAIT**

Why this is the grounded decision:

- local Toolwall package truth is already real
- the old public npm line `mcp-transport-firewall@2.2.5` is still live
- the target public package `toolwall` is not publicly resolvable right now
- current npm auth is real, but actual publish rights / name availability for `toolwall` are not proven
- the worktree is still mixed, and the current version still sits at `2.2.5`

This means:

- do **not** claim that public Toolwall already exists
- do **not** deprecate `mcp-transport-firewall` yet
- do **not** publish from the current mixed worktree without first proving name viability and cutting a new clean release boundary

## 8. CHANGED FILES

This task changed only reporting and durable memory files:

- `toolwall/codex-reports/2026-04-07__verify-npm-reality-and-prepare-toolwall-publish-boundary.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`
- `C:\Users\777\.codex\memories\GLOBAL_OPERATOR_MEMORY.md`
- `BD/04-done/done-log.md`
- `BD/06-decisions/decision-log.md`

No repo-tracked package, runtime, script, workflow, or release-surface file was edited in this task.

## 9. VERIFICATION

Because this was an npm/public reality pass plus reporting/memory updates only, the full code/package verification chain was **not** rerun.

Commands actually executed:

- `git rev-parse --show-toplevel`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline --decorate -n 30`
- `git diff --stat origin/main..HEAD`
- `git rev-list -n 1 v2.2.5`
- `git rev-parse HEAD`
- `git describe --tags --exact-match HEAD`
- `npm view mcp-transport-firewall name version repository.url homepage dist-tags --json`
- `npm view toolwall name version repository.url homepage dist-tags --json`
- `npm whoami`
- `npm access ls-packages` (failed: invalid CLI subcommand in this environment)
- `npm access list packages --json` (failed: `E403`)
- `npm access list packages maksiph14 --json` (failed: `E403`)
- `npm access get status toolwall`
- `npm access get status mcp-transport-firewall`
- `npm access get status definitely-not-a-real-package-name-toolwall-check-20260407`
- `npm owner ls toolwall` (failed: `E404`)
- `npm owner ls mcp-transport-firewall`
- `npm ping`
- direct file inspection of `package.json`, `package-lock.json`, release scripts, workflow files, `README.md`, `CHANGELOG.md`, and release docs

## 10. MANUAL OPERATOR ACTIONS

### How to verify package-name availability manually

1. Run:
   - `npm view toolwall --json`
2. If it still returns `E404`, treat the name as **not publicly resolvable**, not as automatically proven available.
3. Open the npm package page for `toolwall` in a browser while authenticated and confirm whether npm shows:
   - an existing package
   - a private/forbidden state
   - or no package at all
4. If needed, ask npm support or use a publish attempt from a disposable test branch/version only after the rest of the release boundary is clean.

### How to verify npm auth/publish rights manually

1. Run:
   - `npm whoami`
   - `npm owner ls mcp-transport-firewall`
2. Check your npm account in the web UI and confirm:
   - token type supports publish
   - 2FA mode is compatible with your intended publish flow
   - the user `maksiph14` is the intended publisher
3. If you expect package-ownership listings to work, retry a supported command:
   - `npm access list packages --json`
4. If that still returns `E403`, treat package-rights visibility as unresolved and fix account/org permissions before a real Toolwall publish attempt.

### Exact publish steps if Toolwall is viable

1. Prove the unscoped name `toolwall` is publishable by the current account.
2. Isolate the actual release candidate from unrelated dirty files.
3. Bump `package.json` and `package-lock.json` to a new version beyond the already-published `2.2.5` line.
4. Update `CHANGELOG.md` for that new version.
5. Run serially:
   - `npm run build`
   - `npm run typecheck`
   - `npm run assert:package-metadata`
   - `npm test`
   - `npm run pack:dry-run`
   - `npm run pack:smoke`
   - `npm run demo:stdio`
6. Create the matching semver tag for the new version.
7. Run:
   - `npm run verify:release-parity -- --tag vX.Y.Z`
8. Publish or push the tag only after the boundary is clean and verified.
9. Confirm post-publish reality:
   - `npm view toolwall name version repository.url homepage dist-tags --json`
   - `npm owner ls toolwall`

### Exact fallback steps if Toolwall is not viable

1. Do not keep chasing the unscoped name in the critical path.
2. Switch the package identity to the safest exact fallback:
   - package name: `@maksiph14/toolwall`
   - product/display name: `Toolwall`
   - bin identity: `toolwall`
3. Update:
   - `package.json`
   - `package-lock.json`
   - install docs
   - release docs
   - package metadata assertions
4. Verify the same full local release chain.
5. Publish the scoped package first.
6. Revisit unscoped `toolwall` later only if it becomes provably obtainable.

### Exact safe moment when old-package deprecation becomes appropriate

Deprecate `mcp-transport-firewall` only after **all** of the following are true:

- the new package path is real on npm
- `npm view toolwall ...` (or the chosen fallback package) resolves publicly to the intended version
- the packaged install path works from the public registry
- repository/homepage/bugs metadata for the new package are correct
- the public release note / tag / npm package all point at the same intended release boundary

Before that point:

- do **not** deprecate `mcp-transport-firewall`

## 11. RISKS / OPEN QUESTIONS

- `npm view toolwall` returning `E404` proves public non-resolution, but not whether the name is freely available for publish
- `npm access get status <name>` is misleading here and must not be treated as ownership proof
- the current release version is still `2.2.5`, so a clean first Toolwall public release needs a new version boundary
- the current worktree is still mixed, so any careless staging/publish attempt risks bundling unrelated files
- public GitHub rename truth is still secondary here, but package metadata points at `shleder/toolwall`, so that public repo path should still be verified before a real Toolwall release

## 12. REPORT FILES

- `toolwall/codex-reports/2026-04-07__verify-npm-reality-and-prepare-toolwall-publish-boundary.md`
- `toolwall/codex-reports/INDEX.md`
- `toolwall/codex-reports/latest.md`

