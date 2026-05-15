# Refactor Plan

This document tracks the five-phase cleanup and stabilization plan after the v2.2.8 release boundary.

## Phase 1: Dead Code & Artifact Purge

Status: completed.

Scope:

- remove confirmed orphaned source files
- remove stale generated artifacts and local logs from the working tree
- remove tracked dead assets only after reference checks
- keep all v2.2.8 release-critical code, tests, Docker configuration, package metadata, and base documentation intact
- verify with `npm run build`

## Phase 2: Infrastructure & Tooling

Status: completed.

Scope:

- tighten package scripts and release checks
- review CI workflow boundaries
- verify Docker and npm package paths remain reproducible
- keep Node.js and lockfile behavior deterministic

## Phase 3: Core Architecture & Security

Status: completed.

Scope:

- review transport boundaries
- review trust-gate composition
- harden bounded runtime state, SQLite/security logs, stdio proxy failures, JSON-RPC error boundaries, and sanitizer traversal
- preserve fail-closed behavior

## Phase 4: Documentation

Status: completed in this phase.

Scope:

- align user-facing setup documentation with the current package and repository identity
- keep architecture, quickstart, risk, limits, and runtime contract documentation concise
- remove stale references introduced by prior refactors

## Phase 5: QA & Validation

Status: pending.

Scope:

- run the full build/test/release verification path
- confirm Docker build behavior
- confirm npm package smoke behavior
- publish only after local and CI validation are green
