You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0116, described in .theseus/queue/ (search for PKT-0116). The changes to review are `git diff 2546a240c40df8b980e755a0daf3a52633561ef7..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0116 is done and committed (f8f0292). The new DocService about doubles the `taskResult` selects per sync-convert request, from 2.1 to 4.0. That's within what PKT-0068 expected, and each request now gets its answer 0.65–2.5 s sooner at the median. The acceptance check, `theseus scope-check` and `theseus validate` all pass; validate showed 0 errors and 4 warnings, which I didn't open.

**What I ran:** `SYNC=1 e2e-convert.js 10 4` against the installed server on :80 (original) and the worktree DocService on :8099 (new). Each server did 77 conversions: 10 runs of each of the 7 file-type pairs, plus one uncounted warm-up per pair. Neither had errors. The report is in `.theseus/oracle/rounds/docservice-r2-dbload.md`.

**Results:**
- **Selects:** 160 on the original against 306 on the new server. The biggest jump is docx→pdf, from a maximum of 4 to 9 per request (+5).
- **Writes:** one UPDATE and one INSERT on `task_result` per request on both servers, so no change there.
- **Speed:** the ODF pairs got about 3.4× faster, roughly 3.1 to 10.9 requests per second.
- **Load:** each select is a lookup by primary key, and a conversion itself takes 0.16–2.6 s of CPU, so the extra selects are not a bottleneck at 4 parallel requests.

**Decisions:**
- I counted queries by turning on PostgreSQL statement logging (`log_statement='all'`, reloaded without a restart, reset afterwards). The other option, `pg_stat_statements`, is installed but would have needed a PostgreSQL restart under the running stack.
- I matched each logged query to its request using the request's key (`conv_k…`) in the query parameters. That leaves out background queries from the other server, since both share the database.
- I stopped the :8099 server afterwards.

**Surprise:** the database driver uses prepared statements, so the queries are logged as `execute <unnamed>:`, not `statement:`. My first count gave 0 because of this.

**Not measured:** how long each query takes, and more than 4 requests in parallel.

**Lesson for the Atlas (recorded in the packet):** to count DocService queries, grep the PostgreSQL log for `execute <unnamed>:` and use the key in the `DETAIL: parameters` line to tie each query to its request. The Executor log and the friction line are also filled in.
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
