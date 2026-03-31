# Roadmap

This project is already usable as a fail-closed MCP transport firewall. The next steps are about keeping the stdio path solid, making release flow boring, and expanding useful coverage without bloating the core.

Near term:

- restore GitHub Actions release execution so benchmark artifacts and npm release checks run again
- complete trusted npm publication from tagged commits once hosted CI is healthy
- add more operator notes for Windows and Linux client setups
- keep benchmark snapshots and evidence docs aligned with the current package

Mid term:

- broaden the schema registry for more common MCP tool contracts
- improve dashboard visibility for gate decisions, blocked-request trends, and metrics scrape status
- add more denial-code regression cases for indirect prompt-injection traffic
- keep release checklists and provenance notes versioned with the release line

Later:

- keep benchmark snapshots comparable across releases
- add optional integrations for external metrics collectors and log pipelines without changing the fail-closed core
- document more deployment patterns for local tool servers and operator environments
