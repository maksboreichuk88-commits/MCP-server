# Launch Texts

Updated: 2026-04-06

Use this file as the first public-text pack for Toolwall.

Truth rule before using any text below:

- local product name: `Toolwall`
- local package / install / CLI identity: `toolwall`
- do not present that local rename as `public/current` until release proof exists
- do not imply push, merge, tag, release, or publish unless those facts are separately confirmed at the time of posting

## One-Line Description

Toolwall is a fail-closed boundary for one local MCP filesystem/search workflow over `stdio`.

## Short Launch Blurb

Toolwall puts a narrow fail-closed boundary in front of risky local MCP tool calls. The current repo focuses on one real proof path: a local filesystem/search-style workflow over `stdio`, with packaged smoke checks, a reproducible demo, and explicit limits instead of broad security claims.

## GitHub / Repo Intro Variant

Toolwall helps you keep one local MCP workflow narrow, inspectable, and fail-closed where it matters. It is not a broad MCP platform. It is a proof-first transport boundary around one local filesystem/search-over-stdio path, with a short demo path, packaged smoke coverage, and explicit non-goals.

## Short Social Variant

Built Toolwall: a fail-closed boundary for one local MCP filesystem/search workflow over stdio. Narrow scope, real demo path, packaged smoke proof, explicit limits. Local package/install name: `toolwall`.

## Longer Social Variant

I narrowed the Toolwall story down to one thing that is easy to inspect and easy to verify: a fail-closed boundary in front of one local MCP filesystem/search workflow over `stdio`.

The repo now points to one short proof path, one deeper verification path, one explicit limits surface, and one compact proof pack. The local package/install/CLI identity is `toolwall`.

## Proof Bullets

Use these when you need compact supporting points:

- short local proof path: `npm install && npm run build && npm run demo:stdio`
- deeper local proof path: `typecheck`, package metadata, tests, `pack:dry-run`, `pack:smoke`
- packaged smoke proof exists for tarball-installed behavior
- limits are explicit: no broad platform story, no full semantic safety claim, no sandboxing claim

## Do Not Say

- that the system guarantees all MCP traffic is safe
- that the local rename is already public/current
- that the current local branch state is already public/current
- that Toolwall is a broad control plane or hosted platform
