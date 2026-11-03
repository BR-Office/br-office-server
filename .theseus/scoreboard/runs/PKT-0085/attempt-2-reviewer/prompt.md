You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0085, described in .theseus/queue/ (search for PKT-0085). The changes to review are `git diff 118a4d47814e45c035d8c273c372bd6b360c6398..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the problem from the rejection: the text-styles cache now turns itself off for good as soon as co-editing is active or a change from another user arrives. The acceptance oracle passes: 6/6 suites, 10066/10323 assertions. As before, `chartEx-serialize` timed out and counts as a pass only because it is recorded as known-broken.

**What changed (`external/sdkjs/common/Drawings/Format/Shape.js`, the only file touched):**
- The check that runs before the cache is used now also empties and disables it when any of these is true:
  - `AscCommon.CollaborativeEditing` is missing.
  - `Is_SingleUser()` is false.
  - `m_aChanges` holds changes from another user.
  - Co-authoring is online and the session is not marked single-user.
- Changes from other users don't add local history points. That is why the old check, which only looked for an empty History, missed them.
- The rest of the earlier design is unchanged: the cache is used only for placeholders in the presentation editor, only right after opening, and holds at most 5000 entries.

**Decisions:**
- I chose to switch the cache off rather than add a version counter. It is smaller, stays inside `Shape.js`, and keeps the styles identical as `contract.preserve` requires.
- The cost: co-edited sessions get no cache hits. So I did not file the version-counter follow-up in `.theseus/spawn/`.

**Not done:** there is still no benchmark on `deck-50.pptx`, so the hit rate and the time saved are unmeasured.

The Executor log and my friction line are written, and `theseus validate` reports 0 errors and 2 warnings. Both commits are made: one in `external/sdkjs` on `pkt/PKT-0085`, and one for the `.theseus` files in this worktree.

**Lessons for the Atlas:**
- In co-editing, changes from other users don't create History points. A cache that relies on "History is empty" must also check `CollaborativeEditing.Is_SingleUser()` and `m_aChanges`.
- Styles consumers read through `Get_Pr` copies, so one compiled CStyles object can safely be shared between shapes.
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
