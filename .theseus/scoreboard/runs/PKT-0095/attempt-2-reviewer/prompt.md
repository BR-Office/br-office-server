You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0095, described in .theseus/queue/ (search for PKT-0095). The changes to review are `git diff b40bb6a175bddad0886c41611cc2e56c41453657..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the scope violation from the last rejection, and all four acceptance commands pass.

**What went wrong:** the base oracle (`.theseus/oracle/sdkjs-word.sh`) clones sdkjs-forms into `external/sdkjs/.theseus-addons/`. That clone is a git repository inside the checkout. When the factory committed the leftover files, it recorded the clone as a submodule pointer (`b094a63`), which put a change outside the target.

**What I did:**
- **Reverted the commit:** I undid `b094a63` with a new commit in `external/sdkjs` (`2262b2e`) rather than rewriting the branch history. The branch's combined change to sdkjs for this packet is now empty, so the contract's "no change to the code of sdkjs" holds.
- **Kept it from coming back:**
  - I added `/.theseus-addons/` to the checkout's local exclude list (`info/exclude`), which is not a tracked file.
  - `.theseus/oracle/differential/build.sh` now adds that line itself on every run.
- **Recorded it:** I wrote attempt 3 and an Atlas lesson in the Executor log, and appended the friction line. `theseus validate` reports 0 errors.

**Acceptance results:**
- `differential/sdkjs-word.sh`: PASS, 2 cases
- `differential/sdkjs-common.sh`: PASS, 3 cases
- `sdkjs-word.sh`: 42/42 suites passed
- `sdkjs-common.sh`: 6/6 suites passed

Both working trees are clean after the runs. Commits: `1bde949` and a friction-format fix in this repo, `2262b2e` in `external/sdkjs`.

**Lesson for the Atlas:** an oracle that clones a repository inside a fork checkout must exclude it locally, or the factory's commit of leftovers records it as a submodule outside the target.
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0095 of the fork https://github.com/BR-Office/br-office-sdkjs)
