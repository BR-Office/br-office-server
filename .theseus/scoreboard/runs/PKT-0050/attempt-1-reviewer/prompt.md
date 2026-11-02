You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0050, described in .theseus/queue/ (search for PKT-0050). The changes to review are `git diff 7c9f0938a6bb3d24fb46d49f5db4706e21fad8a4..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I finished PKT-0050 and committed it as `3fe2dc7`. The main finding: **Euro-Office has no commit for bug 81132 on `release/v9.4.0` or on `main`.** The fix needs to be ported. The acceptance list is empty, so there were no commands to run; `theseus validate` reports 0 errors and 1 warning.

**What I did**
- The PKT-0029 diagnosis already had most of what the packet asked for: SHAs, files, diff summaries and whether each patch applies. The only thing missing was the Euro-Office commit for 81132.
- Network access worked this time. I cloned ONLYOFFICE/server and Euro-Office/server into the scratchpad and checked the commits:
  - **81132:** `12ba395e`, dated 2026-04-16. It was merged into ONLYOFFICE `release/v9.4.0` by `3cf8b1fd` on 2026-04-17.
  - **81576:** `8585bcf4`, dated 2026-07-13. It is only on ONLYOFFICE `master`.
- **Euro-Office:**
  - 81132 is not in the history of EO `release/v9.4.0` or `main`. The release branch's last commit is from 2026-03-29, before the fix. The upstream commit only appears on EO dependabot and feature branches.
  - 81576 is not on any EO branch.
  - EO `main` has an older client-disconnect fix from 2025-12-07 (`b29a4bae`/`07730e68`). It is a different fix and does not cover the crash that 81132 fixes.
- I added a "Verification by PKT-0050" section to the diagnosis and filled in the Executor log, the Atlas lesson and the friction line.

**Decisions**
- I did not add new patch files, because the PKT-0029 patches use the same SHAs.
- I did not change any code. The port still waits on the human decisions listed in the diagnosis: port 81132 now (low risk), and port 81576 only after a test plan.

**Lesson for the Atlas:** EO `release/v9.4.0` stops at 2026-03-29, so any upstream v9.4.0 fix after that date is not in Euro-Office and has to be ported.

No commands were refused. In the friction line I noted that this packet was queued even though the PKT-0029 diagnosis already said it was no longer needed.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
