You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0024, described in .theseus/queue/ (search for PKT-0024). The changes to review are `git diff 5ad1b11da56cbc879815eb46cc82357aa1e46711..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I diagnosed the `common` module as **keep** (confidence medium), conditional on one measurement packet, and committed it as `0b8423f`. All three acceptance commands pass; `theseus validate` reports 0 errors and 1 warning, which I didn't look into.

**Why keep:** the baseline puts the time users feel outside Common.
- **Where the time is:** opening a document takes about 3.4–4.4 s, mostly the browser loading scripts and rendering. PDF export takes 0.6–6.5 s, almost all in the x2t converter. The whole Node server costs about 4 ms p50 per co-edit message and 55–95 ms of overhead per conversion.
- **Defects:** Common has 259 fix commits out of 904 and 4 crash fixes, fewer than DocService (421 out of 1,115, and 13 crashes). The riskiest code in Common, the SSRF filtering and JWT helpers in `utils.js`, already has unit tests.
- **Other verdicts:** a refactor or a move to Rust, Go or TypeScript would not change any number users see. Common sits under every service, so putting another language there would add a crossing to every call instead of saving time.

**Decisions:**
- **Old diagnosis replaced:** the previous `DIAG-common.md` (verdict refactor) answered the earlier goals. `DIAG-common-b.md` did not exist, so there was nothing to remove.
- **One packet planned (wave 0, P1):** profile DocService under load and during conversions to measure how much of its CPU is spent in Common. The baseline has never isolated this. The verdict switches to refactor if Common takes more than 20 % of DocService CPU or more than 10 ms p50 of a step users wait on.
- **Shutdown sleep:** the only sleep in Common is a 1 s wait at shutdown in `taskqueueRabbitMQ.closeOrWait`, so it doesn't affect users. The +900 ms delay on synchronous conversions is in DocService (`converterservice.js`), not Common.

**Permissions:** two commands were refused, a Python heredoc and an `echo >>` combined with `cd`. I made the same changes with the file edit tool instead. The friction line went into `.theseus/scoreboard/friction.jsonl`, which isn't in `target.files`; I wrote it because the run rules require it. I didn't update `SUMMARY.md`, which is outside the target.

**Lessons for the Atlas:**
- Common is not where users' time goes; only its share of DocService's own server time is still unmeasured.
- Fixes in Common cluster in `utils.js` and `config/default.json` (the second is configuration, not code).
- Untested parts: the storage backends, the task queues, `tenantManager`, and `operationContext`, which has only one test file.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
