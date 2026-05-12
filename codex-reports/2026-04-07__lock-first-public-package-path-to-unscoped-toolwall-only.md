# lock first public package path to unscoped toolwall only

## STATE

- Repo root: `C:\Users\777\OneDrive\Desktop\Calculator\GITMCP\toolwall`
- Branch: `project/tests-first-quality`
- HEAD: `2ed9ec5 docs(pr): Sync review boundary truth`
- Local release-candidate baseline remains `toolwall@2.2.6`
- The explicit first release-candidate boundary already exists
- The whole mixed tree remains forbidden as a publish source
- The old public/current npm line remains `mcp-transport-firewall@2.2.5`
- Intended first public package path is now treated as unscoped `toolwall` only

## ACTIVE FALLBACK REFERENCES

- `chatgpt-upload-pack/01_PROMPT_FOR_CHATGPT.md`
  - role before rewrite: active release contingency
- `chatgpt-upload-pack/02_CURRENT_STATE.md`
  - role before rewrite: active operator choice plus fallback release contingency
- `chatgpt-upload-pack/06_REPO_TRUTH_AND_LIMITS.md`
  - role before rewrite: active truth-layer package-path choice
- `chatgpt-upload-pack/07_NEXT_BATCH.md`
  - role before rewrite: active operator choice / next-batch guidance
- `CHANGELOG.md`
  - role before rewrite: active release-prep summary that still preserved the fallback as part of the current `2.2.6` story
- `docs/DISTRIBUTION_NOTES.md`
  - role before rewrite: active release contingency
- `docs/SHIP_CHECKLIST.md`
  - role before rewrite: active operator choice / release checklist

## FILES TO UPDATE NOW

- `chatgpt-upload-pack/01_PROMPT_FOR_CHATGPT.md`
- `chatgpt-upload-pack/02_CURRENT_STATE.md`
- `chatgpt-upload-pack/06_REPO_TRUTH_AND_LIMITS.md`
- `chatgpt-upload-pack/07_NEXT_BATCH.md`
- `CHANGELOG.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/SHIP_CHECKLIST.md`
- `codex-reports/INDEX.md`
- `codex-reports/latest.md`

## FILES TO LEAVE ALONE

- `codex-reports/2026-04-07__verify-npm-reality-and-prepare-toolwall-publish-boundary.md`
- `codex-reports/2026-04-07__cut-clean-toolwall-publish-candidate-boundary.md`
- `codex-reports/2026-04-07__finalize-first-toolwall-release-candidate-boundary.md`
- `README.md`
- `docs/QUICKSTART.md`
- `docs/PROXY_SETUP.md`
- `docs/VERIFICATION_GUIDE.md`
- `docs/CLIENT_CONFIG_EXAMPLES.md`
- `docs/RUNTIME_CONTRACT.md`

## CHANGED FILES

- `chatgpt-upload-pack/01_PROMPT_FOR_CHATGPT.md`
- `chatgpt-upload-pack/02_CURRENT_STATE.md`
- `chatgpt-upload-pack/06_REPO_TRUTH_AND_LIMITS.md`
- `chatgpt-upload-pack/07_NEXT_BATCH.md`
- `CHANGELOG.md`
- `docs/DISTRIBUTION_NOTES.md`
- `docs/SHIP_CHECKLIST.md`
- `codex-reports/2026-04-07__lock-first-public-package-path-to-unscoped-toolwall-only.md`
- `codex-reports/INDEX.md`
- `codex-reports/latest.md`

## VERIFICATION

- `git diff --check` passed without whitespace errors; the nested repo emitted only CRLF conversion warnings
- final inspection of all changed active truth and release-guidance files confirmed the live current surfaces no longer present `@maksiph14/toolwall` as an active package-path choice
- final inspection of `codex-reports/latest.md` confirmed the pointer moved to this report
- no runtime or package implementation files were changed in this batch, so no full runtime rerun belongs here

## RISKS / OPEN QUESTIONS

- Unscoped publishability for `toolwall` is still not proven from the current evidence.
- Historical same-day reports still mention `@maksiph14/toolwall`; they remain valid history and were intentionally not rewritten.
- If unscoped `toolwall` cannot be published later, that still requires a new explicit operator decision batch.

## REPORT FILES

- `codex-reports/2026-04-07__lock-first-public-package-path-to-unscoped-toolwall-only.md`
- `codex-reports/INDEX.md`
- `codex-reports/latest.md`
