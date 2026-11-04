You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0130, described in .theseus/queue/ (search for PKT-0130). The changes to review are `git diff 7f0d720ca48061dbf00d18f42e9cac4f84c94d92..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I mapped the save journey against the integrated build and committed the work. All acceptance commands pass, `theseus validate` reports 0 errors (6 warnings, which I didn't look into) and `theseus scope-check` is clean.

**Result:** `bash .theseus/oracle/journeys/save.sh` prints `total_ms=5853 min_ms=5771 max_ms=5978 runs=7` (I ran it with `RUNS=7`; the default is 5).

| stage | module | p50 ms | share |
|---|---|---|---|
| save-delay: the server waits 5 s (`savetimeoutdelay`) after the last user leaves, in `createSaveTimer` (`DocService/sources/DocsCoServer.js:1556`) | docservice | 5006 | 85.5% |
| x2t: applies the changes and writes output.docx | x2t | 774 | 13.2% |
| disconnect, queue, prepare, upload, callback, the example storing the file | project / docservice / common | ~60 together | ~1% |
| unattributed | | 17 | 0.3% |

**How I measured:**
- `serve-integrated.sh` already existed from PKT-0126, so I reused it. I added `save.sh` and `save-run.cjs`, copied from the typing journey's runner.
- Each run opens a 10-page document, types 5 letters, waits until the server has the changes, then closes the only editor tab. That close is the start.
- The end is when the example's stored copy of the file is replaced by the saved version.
- Stage times come from timestamps in the DocService and converter DEBUG logs, read one after the other, so the stages and `unattributed_ms` add up to the total.

**Follow-up:** I recorded a spawn request under `.theseus/spawn/` for docservice: skip the 5 s wait when a user closes the document on purpose, and keep it for dropped connections so a reconnecting user still finds the session open. That would bring a save to about 0.85 s. Note that the measured close only logged `transport close`. Whether a real browser sends an explicit close first is still open, and the request asks for that to be checked. I filed it as type `investigate` because there is no type for a performance change.

**Not done:** I couldn't split x2t's 774 ms into parts, because the converter deletes its temp folder and x2t logs no timings of its own. The x2t module's next diagnosis must break it down.

**Comparison with earlier rounds:** there was no earlier save map. Round 2 (`rounds/x2t-r2.md`) put x2t's part of a save at 0.2–0.65 s on smaller documents, which is consistent.

**Lessons for the Atlas:**
- The save is slow because of a configured wait, not because of computation.
- The server's DEBUG logs are enough to attribute every stage on the server side.
- The journey runners need a shared helper to upload, open and wait for the document. This is the third copy of that code.
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
