## Ship Checklist

Use this checklist before cutting a tagged release.

Release-candidate boundary:

- confirm the candidate still preserves one local filesystem/search MCP workflow over stdio as the primary story
- confirm `public/current` and `local-only` state are written separately in repo and handoff docs
- confirm the intended candidate is one coherent branch boundary, not a mental merge of unrelated draft PRs and side branches
- confirm any carry-over from `project/naming-and-ci-discipline` is limited to non-renaming hygiene or is explicitly deferred
- confirm the candidate version is `2.2.6`
- confirm the candidate still matches `codex-reports/2026-04-07__finalize-first-toolwall-release-candidate-boundary.md`
- confirm the intended first public package path is still unscoped `toolwall`
- do not silently introduce a different package path inside this release attempt

Pre-release:

- confirm `main` is the intended release source
- confirm docs still match runtime behavior
- update `CHANGELOG.md`, `package.json`, and `package-lock.json` together
- confirm the intended npm package path still matches the current plan: `toolwall`
- confirm the CLI entry points remain `toolwall`
- confirm `package.json` still points to `shleder/toolwall`
- confirm `gh repo view shleder/toolwall --json homepageUrl` does not point somewhere unrelated
- confirm the operator is still preparing unscoped `toolwall` only
- if unscoped publishability is not acceptably proven, stop and open a new explicit decision batch rather than changing names inside this release cut

Local verification:

- run `npm run build`
- run `npm run typecheck`
- run `npm run assert:package-metadata`
- run `npm test`
- run `npm run pack:dry-run`
- run `npm run pack:smoke`
- run `npm run demo:stdio`
- after creating the local semver tag, run `npm run verify:release-parity -- --tag vX.Y.Z`
- rerun `npm run benchmark:stdio -- --json --output evidence.json` only if evidence-facing deny/output behavior changed in the release candidate
- confirm benchmark totals still show `0` false positives, `0` false negatives, and `0` cache consistency failures when that benchmark rerun is required

Release surfaces:

- confirm `README.md`, `docs/CLIENT_CONFIG_EXAMPLES.md`, `docs/RUNTIME_CONTRACT.md`, and `docs/VERIFICATION_GUIDE.md` still reflect the current package
- confirm `npm pack --dry-run` excludes launch, grounded-planning, benchmark-only docs, and source maps that are not meant to ship in the tarball
- confirm Docker metadata and repo links point to the active repository
- confirm `gh release list --repo shleder/toolwall --limit 20` reflects the intended release line
- confirm `git tag --sort=-creatordate` reflects the intended release tag
- confirm the unscoped registry command matches the intended path: `npm view toolwall dist-tags --json`

Release cut:

- create and push the semver tag that matches `package.json`
- confirm the release workflow runs on the exact tagged commit
- confirm `gh release view vX.Y.Z --repo shleder/toolwall` resolves to the expected tag
- confirm the benchmark artifact is attached or uploaded by CI
- confirm the npm publish step uses the expected registry contract
- confirm the CI summary reports the same tag, package version, npm repository, npm homepage, npm bugs URL, and npm `gitHead`

Future decision note:

- if unscoped `toolwall` still cannot be published later, stop and make a new explicit operator decision in a later batch rather than silently changing package names inside the current release cut
