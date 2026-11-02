You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0040, described in .theseus/queue/ (search for PKT-0040). The changes to review are `git diff bc6db68dfaaf23a2231dcf166b85e11573b3ee04..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0040 needed no code change: PKT-0049 had already fixed it. Commit `f500ee1` added `.theseus/**` (and `external/**`) to the `ignores` in `eslint.config.js`. So PKT-0040 duplicates PKT-0049 and can be closed as already done.

- **Acceptance:** both commands pass. `npm run lint:check` shows 0 errors and 1 warning that was already there (a React hook dependency warning in AdminPanel). `.theseus/oracle/unit.sh` shows 178 tests passed and 1 skipped.
- **Decision:** I left `eslint.config.js` as it is, so the lint rules for product code are unchanged, as the contract requires.
- **Recorded:** I filled in the Executor log and the Lessons for the Atlas in the packet, and added the friction line to `.theseus/scoreboard/friction.jsonl`. It suggests checking new packets against finished ones when they are queued, so duplicates like this don't get run. Everything is in commit `d57c571`. `theseus validate` reports 0 errors and 1 warning, which I didn't look into.
- **Lesson for the Atlas:** ESLint ignores `.theseus/**`, so the method's own scripts are outside the product lint scope.

No commands were refused.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
