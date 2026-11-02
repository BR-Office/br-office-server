You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0079, described in .theseus/queue/ (search for PKT-0079). The changes to review are `git diff e8e940de4a086b5be49c0b2ad9fce15068771254..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the flaky test. The unit-test oracle now passes every time I ran it, and all three acceptance commands pass.

**Cause:** One test failed in 6 isolated runs, always the same one: `io.use handshake auth › no token … next() without error`. The handshake handler in `DocsCoServer` calls `next()` only after some async work finishes (`initTenantCache()`, plus `checkJwt` when a token is sent). The test waited a fixed 5 or 10 event-loop ticks before checking. On a cold first call that work can take longer, so `next` sometimes hadn't been called yet when the test checked it.

**Fix:** I changed only `tests/unit/docsCoServerCrashPaths.tests.js`. A new helper, `runUseHandler`, returns a promise that resolves when `next` is actually called. Both handshake tests now wait on it.
- No assertion was removed or loosened.
- No jest config or retry settings were changed.
- No production code was touched.

**Checks:**
- **Suite alone:** 15 of 15 runs passed.
- **`.theseus/oracle/unit.sh`:** 178 passed, 1 skipped.
- **The 5× loop:** passed.
- **`npm run lint:check`:** 0 errors. Its one warning is in `AdminPanel`, outside the target, and was already there.
- **`theseus validate`:** 0 errors and 1 warning, which I didn't look into.

**Not done:** I didn't look into Jest's open-handle warning separately, because it wasn't what made the test fail. No follow-up packets were requested and no commands were refused.

I filled in the packet's Executor log and Lessons sections, appended the friction line, and committed everything as `fc44530`.

**Lesson for the Atlas:** in DocsCoServer tests, don't wait a fixed number of ticks for code that runs after `initTenantCache` or `checkJwt`. Wait for the callback or promise that signals it has finished.
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
