You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0085, described in .theseus/queue/ (search for PKT-0085). The changes to review are `git diff 118a4d47814e45c035d8c273c372bd6b360c6398..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've re-implemented the text-style cache in `external/sdkjs/common/Drawings/Format/Shape.js`, and the acceptance oracle passes (6/6 suites, 10066/10323 assertions). The change is committed on `pkt/PKT-0085`. I haven't measured the speed-up on deck-50.pptx, so how often the cache hits and how many ms it saves is still unknown.

**Surprise:** the earlier attempts' Shape.js change was gone. After the 0.20.0 fix the branch was back at base `3d51031`, even though the Executor log said the change existed. I rebuilt it from the design in that log. `git diff theseus HEAD` now shows only Shape.js (+80 lines), so it stays inside the target.

**How it works:**
- `recalculateTextStyles` first looks the shape up in the cache. On a miss it runs `computeTextStyles`, which is the original code unchanged.
- The cache key is built from:
  - the level;
  - the presentation, master, theme and layout Ids;
  - the placeholder type and index;
  - the Ids of the shapes in the placeholder chain;
  - the autofit values (from bodyPr, or the temporary values while `bCheckAutoFitFlag` is set).
- On a hit the shape gets a new wrapper object that shares the cached styles. The earlier attempts checked that code reading these styles only gets copies, so sharing them is safe.

**Decisions (safety over hit rate):**
- The cache only covers placeholders in the presentation editor. It skips PDF, table frames, SmartArt, shapes with a fontRef and shapes with their own lstStyle for that level.
- It only works while the undo history is empty, that is, right after open. The first history point clears it and turns it off.
- It holds at most 5000 entries.

**Risk:** changes from co-editors that arrive without a local history point are not detected, so a shape could keep stale styles. Catching them would need a version counter; I did not open a follow-up packet for it.

I wrote the Executor log, added a lesson for the Atlas, and appended the friction line. My first friction line used the wrong format; I fixed it and `theseus validate` now reports 0 errors.

**Lesson for the Atlas:** code that reads these styles only gets copies, so one compiled style set can be shared between shapes. Checking that the history is empty (`History.Index === -1`) is a cheap way to tell that the file was just opened.
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

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0085 of the fork https://github.com/BR-Office/br-office-sdkjs)
