## Demo Run Transcript

Scenario:

- protected local filesystem/search-style workflow
- one allow request
- one cache hit
- one blocked exfiltration-shaped request
- one blocked missing-auth request

Proof path:

```powershell
npm install
npm run build
npm run demo:stdio
```

Observed output from the latest local run:

```text
stdio demo passed
allow: tool=search_files callCount=1
cache: second response matched first response for tool=search_files
block: ShadowLeak request denied with code=SHADOWLEAK_DETECTED
block: missing auth denied with code=AUTH_FAILURE
```

What each line proves:

- the first allow request reached the protected downstream target
- the second identical allow request was served from cache
- the exfiltration-shaped sample was denied before downstream execution
- the missing-auth sample was denied at the transport boundary

This is the transcript referenced by the README and quickstart proof path.

What this scenario is good for:

- a five-minute local proof that the main boundary still works
- confirming that read/search traffic remains usable
- confirming that the repo still demonstrates one concrete blocked path

What this scenario is not:

- a full benchmark replacement
- a full filesystem MCP server demo
- proof that every high-trust path is covered identically
