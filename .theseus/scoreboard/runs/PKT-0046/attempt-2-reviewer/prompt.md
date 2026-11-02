You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0046, described in .theseus/queue/ (search for PKT-0046). The changes to review are `git diff 30b0aa9d5025cf4949f1caefcec3335136a6d2c5..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've fixed the three problems from the rejection, and the sdkjs-common oracle now passes with 6 of 6 suites (10066/10323 assertions, about 130 s). Both acceptance commands pass: `unit.sh` gives 178 passed and 1 skipped, and `lint:check` has 0 errors and 1 warning that was already there. The work is committed as `211e06a`.

**What changed:**
- **color-mods runs by default.** It passes only if the count is exactly 9766/10023 and the failing tests are exactly the 11 known names. Any other result fails the oracle, whether the suite gets fixed or gets worse, and the runner prints what it expected. The 11 names are listed in a `known` table in `.theseus/oracle/sdkjs-common-run.cjs`. The local skips and the `ORACLE_ALL=1` switch are gone.
- **chartEx-serialize runs by default too.** It passes only if it still times out at 120 s, which I confirmed on this run.
- **The runner fails when no suite runs.** It prints `FAIL no suite matched` and exits 1; I checked this with a filter that matches nothing.
- **The `sdkjs-common.sh` header now describes the real suite list,** including the two known-broken suites.
- **The card, the packet's Executor log and the friction line are updated.**

**Decisions:**
- **I kept the full 120 s timeout for chartEx-serialize.** A shorter timeout would prove less, and since the suite runs alongside the others, the whole oracle still takes about 130 s.
- **A timeout check has a limit:** it can't tell a hang from a very slow run. This is written on the card.

**Lessons for the Atlas:**
- When a suite is known to be broken, pin its exact failure in a test instead of skipping it. That way the oracle notices both a fix and a regression.
- A suite pinned on a timeout adds about 2 minutes to every oracle run.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
