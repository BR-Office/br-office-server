You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0015, described in .theseus/queue/ (search for PKT-0015). The changes to review are `git diff 8f5ba376fe92445eabff9ee5f19e234642910933..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the file-budget problem, but the defect/crash rate part of the Goal is still not done: it can't be finished without GitHub read access. The acceptance command `test -s .theseus/oracle/baseline.md` passes, and the work is committed as `9ad096c`.

**Defect/crash rate (still open):**
- I didn't re-run the refused `gh api` call. I tried WebFetch on the public github.com/Euro-Office/server issues page once, and that was refused too. I stopped there and tried nothing else.
- `baseline.md` now has a "Upstream defect / crash rate: NOT MEASURED" section saying why.
- The spawn request `PKT-0015-defect-and-crash-rate-from-upstream-history` covers it for a run that has GitHub access.

**File budget (fixed: 12 files down to 6):**
- I removed the 4 sample files that were committed. `e2e-convert.js` now reads them from `$SAMPLES` (default `/tmp/eo-samples`). Its header gives the one `docker cp` command that copies them out of the container.
- I removed `perf/x2t-direct.sh`. Its timing loop is now a code block in `baseline.md` that reads the templates directly inside the container.
- I dropped the spawn request for shortening ConvertService's sync polling to stay under the budget. The finding (sync mode answers in whole seconds because of `CONVERT_ASYNC_DELAY = 1000`) is still in `baseline.md` as a candidate improvement, so someone else will need to file it.
- I didn't run the measurements again, so the numbers are the same ones from the first attempt.

All of this is written up in the Executor log of the packet.

**Lessons for the Atlas:**
- Spawn requests and sample files both count toward `max_files_changed`, so count them before committing.
- For benchmarks with the docker image, set `services.CoAuthoring.request-filtering-agent.allowPrivateIPAddress: true`, or every ConvertService call fails with `error: -4`.
- Open the editors through the container's bridge IP on port 80, not `127.0.0.1:8080`, or save fails.
- Packets that need upstream GitHub data need network or GitHub permissions granted to the executor first.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
