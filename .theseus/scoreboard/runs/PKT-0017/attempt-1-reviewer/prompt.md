You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0017, described in .theseus/queue/ (search for PKT-0017). The changes to review are `git diff 9dc31321175a4debf4c071a6d67be60ec865bd70..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I added the upstream defect and crash rate to `.theseus/oracle/baseline.md`. It is only part of what the packet asked for: the numbers count fix commits, not bug issues, because both ways into the issue tracker (`gh api` and WebFetch) were refused by permissions. The acceptance check passes and the work is committed as `bd670a8`.

**What I did**
- `gh` was refused, but a network clone of both upstreams (`git clone --bare --filter=blob:none`) was allowed, so the history comes from Euro-Office/server and ONLYOFFICE/server.
- New script `.theseus/oracle/perf/defect-history.js` (Node, no dependencies) sorts commits into fix and crash-related by their message. It reports counts per year, per month, per module and per file, and lists the crash-related commits.

**Results**
- **Rate:** since 2022 there are about 6–12 fix commits and about 0.5 crash-related fixes per month upstream. Euro-Office has had little activity of its own since about 2025-11.
- **Where fixes land:** `DocsCoServer.js` takes about 27% of all fix commits and 31% of crash fixes. Next are `canvasservice.js`, `converter.js`, `utils.js` and `wopiClient.js`.
- **Crash themes:** unhandled socket errors when a client disconnects, null dereferences, forcesave after the editor closes, converter exit codes and timeouts, and hangs at shutdown.
- **Upstream fixes Euro-Office doesn't have:** ONLYOFFICE has 7 crash-related fixes in 2026 whose commit messages don't appear on Euro-Office's default branch. They include a process crash when a client disconnects during file streaming (bug 81132) and a shutdown hang (bug 81576). I compared by message only; a search by bug number was refused, so the baseline says to check by content before porting anything.

**Decisions**
- Euro-Office's history has 1,828 duplicate commits (same date and message, new hashes). I counted each once; without this the counts were almost doubled.
- The baseline says these numbers show where fixes land, not an absolute defect rate. The share of fix commits jumps after 2018 mostly because ONLYOFFICE started tagging commits `[bug]`. "timeout" also matches a few commits that aren't crashes.
- I did not create a new packet; whether to port the missing upstream fixes is for you to decide.

**Not done**
- Bug-issue counts and production crash data. The Gaps table now says this needs `gh api` allowed for the executor.
- The friction entry in `.theseus/scoreboard/friction.jsonl`: that file is outside `target.files`, and the factory writes those entries.

**Lessons for the Atlas** (also written in the packet)
- Upstream history can be cloned even when `gh` is refused.
- Remove duplicate commits from Euro-Office's history before counting anything.
- `DocsCoServer.js` is where most defects land, matching the size hotspot already in the baseline.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
