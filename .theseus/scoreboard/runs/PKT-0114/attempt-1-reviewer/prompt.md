You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0114, described in .theseus/queue/ (search for PKT-0114). The changes to review are `git diff b236529448a10a5ee6e554e1081b6b2ba9105b03..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've ported upstream fix 81132, and the new test fails on the old code and passes with the fix. Both acceptance commands pass: `.theseus/oracle/unit.sh` (179 passed, 1 skipped) and `npm run lint:check` (0 errors, one warning in AdminPanel that was already there). `theseus scope-check` and `theseus validate` both pass, and the work is committed on `pkt/PKT-0114`.

**What changed:**
- **`DocService/sources/routes/static.js`:** if the client drops the connection (`ERR_STREAM_PREMATURE_CLOSE`, `ECONNRESET`, `ECONNABORTED`), that is now logged at debug level instead of as an error. The 400 response is only sent if headers haven't gone out yet. This applies both when streaming from local disk and from S3/Azure storage.
- **`DocService/sources/ai/aiProxyHandler.js`:** the same check before sending the error response, with the response itself wrapped in a try/catch.
- **`tests/unit/staticAbort.tests.js`:** a new test. It runs the real static router on a local test server, with storage replaced by a stream that never finishes. The client aborts after the first chunk. The test checks that no status is sent afterwards and that the source stream is closed.

**Decisions:**
- I applied the upstream patch with `git apply`, but left out its first hunk in `aiProxyHandler.js`. It only rewords a comment, and it no longer matched the code here.
- There is no unit test for the AI proxy path. The packet asked for one stream-abort test, and the static path covers that.
- No existing test assertions changed.

**Surprises:**
- The cache middleware in `static.js` isn't exported, so the test has to go through the router. It mocks storage, and swaps the storage backend to S3 by spying on `Context.prototype.getCfg`.
- `unit.sh <pattern>` doesn't run a single suite. The extra pattern is added alongside the script's own `unit` pattern, so everything still runs. I recorded this in my friction line.

**Lesson for the Atlas** (also written in the packet): to test the cache middleware in `routes/static.js`, mock storage-base `needServeStatic` before requiring the router, and spy on `Context.prototype.getCfg` to pick the storage backend.

The Executor log and friction line are filled in. No follow-up packets were needed, and no commands were refused.
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
