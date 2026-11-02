You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0029, described in .theseus/queue/ (search for PKT-0029). The changes to review are `git diff 3cb4df7e8d8b56ae0be287161409196f328ad274..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0029 is only partly done: I could not find the upstream ONLYOFFICE commits for bugs 81132 and 81576. My permissions refused `git clone`, `gh api` and fetching github.com. The worktree has a single commit with no history and no upstream remote, so searching the git log finds nothing. I did not work around this, so the commit SHAs and diffs the goal asks for are still missing.

**What I delivered instead:** an assessment based only on Euro-Office `main`, in `.theseus/diagnosis/PKT-0029-upstream-fixes-81132-81576.md`. It is marked as not checked against the upstream diffs.

- **81132 (process crashes when a client disconnects mid-download):** `main` already has a helper that ignores client-abort errors (`utils.pipeHttpStreams`, `Common/sources/utils.js:982`), but only two places use it. The most likely crash point is `DocService/sources/routes/static.js:135`. If a client disconnects mid-download, its error handler tries to send a 400 after the response headers have already gone out. That throws, and nothing catches it. I recommend porting the fix, probably by cherry-picking it from the Euro-Office `release/v9.4.0` branch. The risk is low.
- **81576 (shutdown hangs):** `DocService/sources/shutdown.js:73` waits until no document is left in the "saving" (SaveVersion) state, up to a timeout. If the final save fails and that state is never cleared, shutdown waits for the full timeout, which matches the bug. I did not find the code that should clear it. Recommendation: get the upstream diff before deciding. The risk is medium, because the change would touch save-status code that PKT-0028 found crash-prone.

**Also done:**
- Wrote a follow-up request in `.theseus/spawn/`: fetch both upstream diffs in a run that is allowed to clone from or query GitHub (`git clone` / `gh api` to github.com).
- Filled in the Executor log and Lessons for the Atlas, and appended my friction line.
- The packet declares no acceptance commands, so there was nothing to run. `theseus validate` reports 0 errors and 1 warning.
- Committed as `ab3f8f4`.

**Lessons for the Atlas:**
- A packet that investigates upstream history needs network access or a local copy with full history, because packet worktrees have neither.
- `utils.pipeHttpStreams` is the safe way to stream a file to an HTTP response.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
