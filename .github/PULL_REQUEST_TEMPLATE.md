## Summary

- describe the user-visible or reviewer-visible change
- list the main files or subsystems touched

## Why

- explain the problem being solved
- explain how the change stays aligned with the fail-closed stdio-first product shape

## Verification

- [ ] `npm run verify:all`
- [ ] `npm run demo:stdio` if runtime or trust-gate behavior changed
- [ ] docs updated if claims, demos, release notes, or repo metadata changed

## Reviewer Notes

- note any residual risks, unsupported claims, or follow-up work
