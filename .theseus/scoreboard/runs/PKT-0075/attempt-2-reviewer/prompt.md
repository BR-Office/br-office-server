You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0075, described in .theseus/queue/ (search for PKT-0075). The changes to review are `git diff 0b2cd45f1c5394fd7be72c7a7cdd527cb0f6db06..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the one problem from the rejection: the follow-up request for the flaky test no longer has placeholders. Both acceptance commands pass (`.theseus/oracle/unit.sh` and `npm run lint:check`), `theseus validate` reports 0 errors and 1 warning, and the work is committed as `58b5bd6`.

**What I filled in** (`.theseus/spawn/PKT-0075-stabilize-flaky-tests-unit-docscoservercrashpath.md`):
- **Target:** `tests/unit/docsCoServerCrashPaths.tests.js`, the test file that fails intermittently.
- **Contract:** no changes to production code under `DocService/` or `Common/`, and no test removed or weakened. Hiding the flake with Jest config or retry settings is forbidden.
- **Acceptance:** `.theseus/oracle/unit.sh` once, then the same script five times in a row, then `npm run lint:check`.
- **Plan:** reproduce the failure in a loop, then make the timing predictable inside the test file only.

**Unchanged from the earlier attempt:** the main change is still a patch with a decision note under `.theseus/diagnosis/`, because the packet has no target files; the real change belongs in the packaging repo. Not yet tested: installing a rebuilt package for real, and a Docker build. I added the rework to the Executor log and a second friction line for this packet.

**Lesson for the Atlas:** `theseus validate` doesn't catch template placeholders left in spawn requests, so this only came up at review. It's worth checking new requests for leftover `[...]` before delivering.
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
