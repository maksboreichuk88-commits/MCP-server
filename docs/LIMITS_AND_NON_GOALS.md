This repository is a transport control. It does not claim to be a complete execution-security stack.

## What Toolwall Does Today

The current checked-out branch demonstrates:

- one protected local filesystem/search-style workflow over `stdio`
- fail-closed request inspection for configured auth, scope, color, egress, preflight, and registered schema checks
- packaged-install proof through `pack:smoke`
- response-side sanitization for a narrow set of explicit secret/path/header patterns

## Current Limits

- the primary enforcement path is `stdio`; the HTTP service is a compatibility harness, not the main product story
- strict schema enforcement applies only to registered tool contracts; unknown tools still remain passthrough
- the shared-secret auth envelope is not cryptographic attestation
- the current egress gate is recursive string inspection plus targeted pattern logic, not a full semantic parser
- response-side sanitization is narrow redaction, not full DLP
- cache behavior is optimized for allowlisted read-style tools only
- this repository is not presented as a broad MCP platform or hosted control plane

## Non-Goals

- cryptographic identity attestation for every actor in the chain
- kernel, VM, or container sandboxing
- complete semantic detection of every prompt-injection variant
- post-execution containment after a tool has already started
- universal coverage for every MCP deployment topology or custom tool contract

## Practical Reading Rule

If a claim sounds broader than:

- one local workflow
- one transport boundary
- one narrow, repeatable proof path

then it is outside the intended scope of this repository.
