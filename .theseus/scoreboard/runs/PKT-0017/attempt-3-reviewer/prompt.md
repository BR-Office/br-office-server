You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0017, described in .theseus/queue/ (search for PKT-0017). The changes to review are `git diff 9dc31321175a4debf4c071a6d67be60ec865bd70..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0017 still can't be finished as written: the goal asks for bug-issue counts per month or release, and only `gh api` can get those. My permissions refuse `gh api` and WebFetch, and as instructed I did not retry them. A human needs to either allow `gh api` for the executor or accept the narrower goal.

The acceptance check (`test -s .theseus/oracle/baseline.md`) passes, but it only checks that the file isn't empty.

**What's delivered, from the earlier attempts:**
- **Data source:** both upstream repositories were cloned with `git clone --bare --filter=blob:none`, which was allowed.
- **Fix-commit and crash-fix rates:** `baseline.md` has them per year, month, module and file.
- **Script:** `.theseus/oracle/perf/defect-history.js` produces those numbers. The rules written in `baseline.md` now match the script's regexes.
- **Follow-up request:** the bug-issue counts are requested in `.theseus/spawn/PKT-0017-bug-issue-counts-…md`, which says it needs `gh api`.

**This attempt:** I added a note to the packet's Executor log about the `gh` blocker and the human decision needed. I also added the packet's friction line to `.theseus/scoreboard/friction.jsonl`, which was missing, and committed both.

**Lessons for the Atlas:**
- Upstream history can be cloned with git even when `gh` is refused.
- Euro-Office's history contains 1,828 duplicate commits. Deduplicate by date and subject before counting, or the counts nearly double.
- `DocsCoServer.js` is the defect hotspot: about 27% of fix commits and 31% of crash fixes.
- ONLYOFFICE has 7 crash fixes from 2026 whose subjects don't appear on Euro-Office's default branch. Whether they are actually missing still needs checking by content; `baseline.md` records this.
- Rejections keep demanding something the executor isn't allowed to run. That mismatch between the goal and the permissions has to be settled before a packet is assigned.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
