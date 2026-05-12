## Distribution Notes

This repo ships as an npm package and the release line is only considered clean when the tag, GitHub Release, and npm version all match.

Current package surface:

- install entry points are `npx -y toolwall` and `npm install -g toolwall`
- current release-candidate version is `2.2.6`
- intended first public publish path is unscoped `toolwall` only
- unscoped `toolwall` publishability is still not proven from the current evidence
- tarball docs are intentionally limited to install, proof, and operator-reference pages; launch, grounded-planning, and benchmark-only docs stay out
- the full validation environment can be reproduced with `docker compose up --build`
- tests, demo paths, and benchmark corpus live in this repository
- the npm tarball is smoke-tested before publication
- guided setup and audit requests are routed through the public GitHub issue chooser and `docs/GUIDED_SETUP_AND_AUDITS.md`

The runtime stays intentionally narrow:

- insert it between an MCP client and a local tool server over stdio
- reuse the same trust gates in the HTTP harness when needed
- keep the trust logic auditable in a small TypeScript codebase

Release work is gated by:

- one exact package-name choice per release cut; the current intended choice is unscoped `toolwall` only
- semver-tagged releases
- local verification on the release commit
- local package metadata assertions before publish
- direct release-time proof that unscoped `toolwall` is publishable before any public publish claim
- pre-publish release parity checks for `package.json.version`, semver tag, and expected repo lineage
- repeatable benchmark output
- tarball smoke execution of the packaged CLI
- CI publication of evidence artifacts
- post-publish verification that npm `repository`, `homepage`, `bugs`, and `gitHead` match `shleder/toolwall`
- parity across the git tag, GitHub Release, and published npm version
- synced package docs for install, config, and runtime behavior
- a public repo story that stays narrow: risky local MCP tool calls first, broader control-plane stories second

Useful follow-up docs:

- risk model: `docs/RISK_MODEL.md`
- client config examples: `docs/CLIENT_CONFIG_EXAMPLES.md`
- runtime contract: `docs/RUNTIME_CONTRACT.md`
- verification guide: `docs/VERIFICATION_GUIDE.md`
- guided setup and audits: `docs/GUIDED_SETUP_AND_AUDITS.md`

Future decision note:

- if unscoped `toolwall` still cannot be published later, stop and make a new explicit operator decision in a later batch rather than silently switching package names inside the current release cut
