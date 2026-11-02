You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0053, described in .theseus/queue/ (search for PKT-0053). The changes to review are `git diff 1b950b0585bc5ba462c5a7bddff29d92b992b80f..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I didn't generate graph.json or fill in any card fields: PKT-0053 doesn't allow it. Its `target.files` is still the template placeholder `"[FILE]"`, `create_in` is empty, and `contract.preserve` is also a placeholder. That leaves no atlas or adapter file I'm allowed to change.

**What I did:**
- **Executor log:** recorded the placeholder target, what I found, my decision, and what was left undone.
- **Follow-up request:** filed in `.theseus/spawn/` with a real target. It covers `adapter.yaml`, the atlas cards, a new `.theseus/adapter/scripts/` folder and `graph.json`. It also has a proper contract (keep the hand-written parts of the cards unchanged) and a suggested acceptance check (`theseus validate` plus `test -s .theseus/atlas/graph.json`).
- **Friction line:** added to `.theseus/scoreboard/friction.jsonl`.
- **Checks:** the packet has no acceptance commands, so I only ran `theseus validate`: 0 errors, 1 warning.
- **Commit:** everything is committed as `c3e2c33`.

**Something else you'll need:** generating graph.json needs adapter work first. `.theseus/adapter/scripts/` is empty, and the `tools` section of `adapter.yaml` only declares `hotspot`, with no graph or metrics script. The replacement packet covers this.

**Lessons for the Atlas:**
- The empty tool fields in the cards come from the missing adapter scripts, not just the missing graph.json.
- Packets should be checked for leftover template placeholders before they are queued.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
