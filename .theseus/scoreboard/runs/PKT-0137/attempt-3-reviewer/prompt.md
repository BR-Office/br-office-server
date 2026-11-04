You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0137, described in .theseus/queue/ (search for PKT-0137). The changes to review are `git diff e4aaf5ac54f2e25aee15eb81844be4f888867b7f..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
Both acceptance commands now pass, and PKT-0137 still changes no server code. The finding stands: the server already saves an explicitly closed document without the 5 s wait, but a browser tab close never arrives as an explicit close.

**Both rejections fixed:**
- **`.theseus/oracle/unit.sh`:** passes (178 passed, 1 skipped). The earlier failure was in the timing-sensitive timeout tests in `tests/unit/request.tests.js`, which this packet doesn't touch.
- **`bash .theseus/oracle/journeys/save.sh`:** passes. It had failed because `external/sdkjs` was missing from the worktree. I cloned the fork's `theseus` branch from `../.external/https___github_com_BR-Office_br-office-sdkjs.git` into `external/sdkjs`; the Euro-Office mirror only has `main`. Git ignores `external/`, so the clone is not committed. The journey measured 5918 ms p50, of which 5007 ms is the save delay. That is unchanged, as expected with no code change.

**Finding:**
- **Server side:** when the client sends the `{type:"close"}` message, the server already saves immediately (`noDelay = !reason || shutdown`, `DocsCoServer.js` ~2191).
- **Client side:** the web client sends nothing on unload. Its socket.io library just closes the connection, so a tab close, a reload and a dropped connection all reach the server as `transport close`.
- **Decision:** treating `transport close` as a final close would break the contract that a user who reconnects within the delay (a reload, for example) still finds the session open. So I made no server change.
- **Follow-up:** I recorded a request in `.theseus/spawn/` to measure a close driven by the integrator through the API (`asc_coAuthoringDisconnect`). That path should give the expected ~0.85 s save.

The Executor log and the friction line are updated, `theseus validate` reports 0 errors and `theseus scope-check` is ok. The work is committed in two commits on the packet branch.

**Lessons for the Atlas:**
- Every browser tab close or reload reaches the server as `transport close` and waits the full save delay. Only the API close skips it.
- `environment.md` should name the BR-Office mirror that holds the `theseus` branch, or the factory should check out `external/` in every worktree.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>

Environments that are up right now (the factory just ran these checks and they passed; .theseus/adapter/environment.md says how to use them):
- `documentserver`: `curl -sf http://127.0.0.1/healthcheck`
- `browser`: `node -e "require('playwright')"`
Do not report one of these as missing: use it, and if a script points elsewhere (another port, a container), point it here. If you still cannot reach it, say exactly what you ran and what came back.
