You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0087, described in .theseus/queue/ (search for PKT-0087). The changes to review are `git diff 73477557083b35ec1c40494dfa2c99737b6efaf6..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the scope violation. The `external/sdkjs` branch now changes only `word/Editor/CollaborativeEditing.js`, and both acceptance commands pass.

**What went wrong:** after the last attempt, the factory's "commit what you leave" step made commit e456c77 in `external/sdkjs`. That commit re-added `.theseus-addons/sdkjs-forms`, a folder sitting untracked in the checkout. That was the file outside the target.

**What I did:**
- **Removed it:** I reset the sdkjs branch back to my code commit e5fd187 and unstaged the addon folder. Compared with base 3d51031, the branch now holds one commit touching only `CollaborativeEditing.js`, and the sdkjs working tree is clean.
- **Kept it out:** I added `/.theseus-addons/` to the sdkjs local exclude file (`info/exclude`), so the factory's auto-commit shouldn't pick it up again.
- **Code change (same as attempt 4):** in `private_CollectFontCheckClasses`, a "new object registered" (`CTableId`) change is now replaced by the object it registers. If that object can't be found, the code falls back to the full walk, so the font set is still never smaller than before. `Document.js` needed no change, because `Paragraph` is already accepted.
- **Checks:** sdkjs-word passed 42/42 suites (6195/6195 assertions) and the unit tests exited with code 0. `theseus validate` reports 15 ok, 2 warnings and 0 errors.
- **Recorded:** I wrote the executor log and the friction line and committed them as ce1676d.

**Not done:** the timing re-measurement in the browser (the before/after recipe in `baseline.md`). It is already requested as PKT-0089.

**Lessons for the Atlas:**
- Every incoming batch of remote typing contains a `CTableId` change next to the run change. Any logic that works change by change has to swap `CTableId` changes for the object they register.
- The factory should exclude `.theseus-addons/` from the sdkjs checkout itself. My local exclude is a workaround: the one I added in an earlier attempt was lost when the checkout was recreated, and this could happen again.
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0087 of the fork https://github.com/BR-Office/br-office-sdkjs)
