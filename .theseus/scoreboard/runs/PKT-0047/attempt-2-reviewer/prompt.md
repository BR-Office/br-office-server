You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0047, described in .theseus/queue/ (search for PKT-0047). The changes to review are `git diff f0094571c1cfc526307ecb47a33545c8b4fc5ff3..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed both problems from the rejection. The packet's diff is now 321 lines, down from 4,875, so it fits the 800-line budget. `theseus validate` reports 0 errors and 1 warning (pilot mode is on). The packet defines no acceptance commands, so there were none to run.

**What changed**
- **`perf/open-window-2026-11-02.json`:** I removed the per-run `raw` and `rawNoProfiler` arrays and kept only the median summary. The kept values are unchanged; I checked this when rewriting the file. It is now written one key per line, which takes it from about 4,600 lines to 13.
- **`perf/open-window.js`:**
  - **Header:** fixed. It now says `bodyKb` is the decoded size and is the figure the table uses. `kb` comes from `encodedDataLength`, which is about 0 on this stack.
  - **Output:** the script writes only medians by default; a new `--raw` flag brings back the per-run arrays. It also writes compact JSON now.
- **`baseline.md`:** the command line now shows `--raw`, and the JSON file is described as a "median summary" rather than raw output.
- **Packet and scoreboard:** I added an "Attempt 2" entry to the Executor log and appended my friction line.

**Decision:** I put the raw arrays behind a flag rather than deleting that code, so anyone can still regenerate the full per-run data when they need it.

**Surprise:** my first friction line didn't match the format the existing records use, and validate failed on it. I corrected it in a second commit.

**Lesson for the Atlas:** commit median summaries under `oracle/perf/`, not per-run dumps. The diff budget counts data files, and raw output should stay out of the repo or behind a flag.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
