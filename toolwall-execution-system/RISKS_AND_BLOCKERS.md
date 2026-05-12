# Risks And Blockers

## Technical Risks

- the current dirty tree may move while the 14-day system is being executed
- verification harness behavior can diverge from runtime behavior if docs and scripts are edited separately
- the stdio proof path can be weakened if launch-facing work rewrites examples without rerunning the matching proof

## Truth-Layer Risks

- stale upload-pack assumptions can conflict with live `git status`
- prior reports can be mistakenly treated as present proof for later days
- local-only verification can be accidentally written as public/current proof

## Verification Risks

- noisy or parallel command execution can produce misleading confidence
- docs-only passes may still need targeted reruns if they alter the claimed proof path
- packaging/install truth can drift if `README`, `package.json`, and `scripts/pack-smoke.mjs` stop agreeing

## Messaging Risks

- the repo can drift back into sounding like a generic MCP platform
- security language can overclaim beyond the current heuristic/pattern-based protections
- local rename truth can be confused with public/current release truth if rollout state is not labeled explicitly

## Launch Risks

- launch texts can outrun the verified repo surface
- discovery optimization can start promising breadth instead of one strong proof path
- the first launch wave can happen before the repo is understandable in one screen

## False-Positive / False-Claim Risks

- claiming full semantic safety
- claiming universal MCP coverage
- implying that unpublished local work is already in npm or `origin/main`
- implying that a first launch equals market validation

## Repo Ambiguity Risks

- mixed naming between Toolwall and `toolwall`
- mixed stories between stdio proxy, embedded fallback, and HTTP/admin secondary surfaces
- mixed state between old next-batch notes and the new execution-system sequence

## Current Known Blocker Pattern

The main blocker pattern is not lack of code.
It is contradiction between the live dirty tree, historical reports, and launch-facing surfaces.
