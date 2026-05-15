# Limits and Non-Goals

Toolwall is a local transport control. It is not a complete execution-security stack.

## What Toolwall Does Today

The current checked-out branch demonstrates:

- protected downstream MCP JSON-RPC traffic over `stdio`
- HTTP `/mcp` routing for registered targets
- fail-closed request inspection for configured auth, scope, color, egress, preflight, and registered schema checks
- packaged-install proof through `pack:smoke`
- response-side sanitization for a narrow set of explicit secret/path/header patterns
- bounded in-memory rate-limit state, stdio pending requests, sanitizer traversal, audit entries, and SQLite security-log rows

## Current Limits

- the primary enforcement path is `stdio`; the HTTP service is a compatibility harness, not the main product story
- strict schema enforcement applies only to registered tool contracts; unknown tools still remain passthrough
- the shared-secret auth envelope is not cryptographic attestation
- the current egress gate is recursive string inspection plus targeted pattern logic, not a full semantic parser
- response-side sanitization is narrow redaction, not full DLP
- cache behavior is optimized for allowlisted read-style tools only
- this repository is not presented as a broad MCP platform or hosted control plane
- preflight, consumed-preflight replay state, color session state, and tenant rate-limit overrides are process-local
- Docker hardening is process/container hygiene, not a sandbox guarantee

## Non-Goals

- cryptographic identity attestation for every actor in the chain
- kernel, VM, or container sandboxing
- complete semantic detection of every prompt-injection variant
- post-execution containment after a tool has already started
- universal coverage for every MCP deployment topology or custom tool contract
- process-memory inspection
- complete secret discovery in arbitrary output
- durable policy storage for tenant overrides, preflight IDs, or color-boundary sessions

## Practical Reading Rule

If a claim sounds broader than:

- local MCP transport control
- fail-closed request filtering
- bounded response-side redaction
- repeatable local proof paths

then it is outside the intended scope of this repository.
