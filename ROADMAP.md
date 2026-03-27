# Roadmap

This project is usable today as a fail-closed stdio firewall for MCP traffic. The items below track the next cleanup and hardening passes.

## Now

- restore GitHub-hosted CI so `main` and future pull requests show the same verification status as local runs
- reduce remaining dev-only `npm audit` noise in the Jest and tooling chain without destabilizing the runtime path

## Next

- broaden the schema registry and denial corpus for more common MCP tool contracts
- add more cross-platform operator notes for Windows and Linux client setups
- improve admin/dashboard visibility for blocked requests, cache behavior, and gate decisions

## Later

- publish a registry package when the install surface is stable enough to support a longer-lived package name
- expand reproducible benchmark coverage with larger corpora and versioned result snapshots
