You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0002, described in .theseus/queue/ (search for PKT-0002). The changes to review are `git diff 289f71c2a9ce285b98779b6d65e6572240b5db93..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I still couldn't add the docservice row to `.theseus/atlas/INDEX.md`, which was the reason for the rejection. So this attempt does not fix it; it only hands the problem to the factory. The acceptance check `test -s .theseus/atlas/docservice.md` passes, and the work is committed as `6973e1e`.

**Why I couldn't add the row:**
- `INDEX.md` is not in `target.files` (the list is empty), and the file already exists, so the folder I'm allowed to create files in doesn't cover it.
- The reviewer's two fixes were to add `INDEX.md` to `target.files` or to drop the requirement from the goal. Both mean editing parts of the packet other than the Executor log, which this run doesn't let me touch.
- `INDEX.md` also says "Do not edit by hand"; the spec says it is generated from the cards.

**What I did:**
- **Follow-up request:** I recorded a request in `.theseus/spawn/PKT-0002-regenerate-atlas-index-md-rows-from-module-cards.md`. It targets `INDEX.md`, and its acceptance command is `grep -q '| docservice' .theseus/atlas/INDEX.md`.
- **Executor log:** I logged this attempt in the packet, including the two commands that were refused (below).
- **Module card:** I left `docservice.md` unchanged, since the reviewer found it correct.

**Still needed from the factory:** either approve that request, or add `INDEX.md` to this packet's `target.files` and run it again.

**Commands refused this time:** `theseus --help`, and a Python one-off to fill in the request, so I used the Edit tool for that. I didn't try any other way around the refusals.

**Lesson for the Atlas and the packet template:** cartographer packets should either list `INDEX.md` in `target.files` or not ask for the index row in the goal. Otherwise every mapping packet will be blocked the same way.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
