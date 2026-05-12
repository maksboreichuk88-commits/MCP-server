# Support

Before opening an issue, use the shortest self-check path:

- [docs/QUICKSTART.md](docs/QUICKSTART.md)
- [docs/DEMO_RUN_TRANSCRIPT.md](docs/DEMO_RUN_TRANSCRIPT.md)
- [docs/EVIDENCE_BUNDLE.md](docs/EVIDENCE_BUNDLE.md)

Use the GitHub issue chooser after that:

- usage questions: open the closest issue template
- bug reports: open a tight reproduction with exact inputs
- feature proposals: describe the operator problem and the expected outcome
- workflow hardening help: start with [docs/WORKFLOW_HARDENING.md](docs/WORKFLOW_HARDENING.md) and then open the [workflow intake request](https://github.com/shleder/toolwall/issues/new?template=guided-setup-request.yml)
- security-sensitive findings: use `SECURITY.md` instead of posting exploit detail in an issue

Useful context for any report or setup request:

- operating system
- Node.js version
- exact command used
- whether you used the stdio runtime, HTTP companion service, or Docker path
- expected behavior
- actual behavior
- sanitized logs, screenshots, or config fragments

Direct request paths:

- issue chooser: [github.com/shleder/toolwall/issues/new/choose](https://github.com/shleder/toolwall/issues/new/choose)
- workflow intake request: [open template](https://github.com/shleder/toolwall/issues/new?template=guided-setup-request.yml)

The fastest path to triage is still a narrow repro with exact inputs and observed output.
