Use this checklist before creating a tagged public release.

Pre-release:

- confirm `main` is the intended release source
- confirm public docs still match actual runtime behavior
- update `CHANGELOG.md` and `package.json` version together
- confirm the npm package name and install contract remain `mcp-transport-firewall`
- confirm `package.json` still points to `shleder/mcp-transport-firewall`
- confirm `gh repo view shleder/mcp-transport-firewall --json homepageUrl` does not point to a different repository

Local verification:

- run `npm run assert:package-metadata`
- run `npm run verify:all`
- run `npm run demo:stdio`
- run `npm run benchmark:stdio -- --json > evidence.json`
- run `npm run pack:dry-run`
- run `npm run pack:smoke`
- after creating the local semver tag, run `npm run verify:release-parity -- --tag vX.Y.Z`
- confirm benchmark totals still show `0` false positives, `0` false negatives, and `0` cache consistency failures

Release surfaces:

- confirm `README.md`, `docs/CLIENT_CONFIGS.md`, `docs/INTEGRATION_CONTRACT.md`, and `docs/VALIDATION_GUIDE.md` still reflect the current package
- confirm `docs/STDIO_BENCHMARK_SNAPSHOT.json` is refreshed if the benchmark corpus changed
- confirm issue tracker state does not contradict current public claims
- confirm Docker metadata and repository links point to the active repository
- confirm `gh release list --repo shleder/mcp-transport-firewall --limit 20` reflects the intended release line
- confirm `git tag --sort=-creatordate` reflects the intended release tag
- confirm `npm view mcp-transport-firewall dist-tags --json` reflects the intended npm channel state

Tagged release:

- create and push the semver tag that matches `package.json`
- confirm the release workflow runs on the exact tagged commit
- confirm `gh release view vX.Y.Z --repo shleder/mcp-transport-firewall` resolves to the expected tag
- confirm the benchmark artifact is attached or uploaded by the hosted workflow
- confirm the npm publish step uses the expected public registry contract
- confirm the hosted workflow summary reports the same tag, package version, npm repository, npm homepage, npm bugs URL, and npm `gitHead`

Post-release:

- confirm `npm view mcp-transport-firewall version` returns the new version
- confirm `npm view mcp-transport-firewall repository homepage bugs maintainers gitHead --json` matches the intended release
- confirm `npx --yes mcp-transport-firewall --help` works from the public registry
- confirm the GitHub Release references the benchmark artifact
- release is not complete until `package.json.version`, git tag, GitHub Release tag, and npm `latest` all match
