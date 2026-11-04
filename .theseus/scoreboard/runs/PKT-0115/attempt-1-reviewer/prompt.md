You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0115, described in .theseus/queue/ (search for PKT-0115). The changes to review are `git diff 4434daad95a0c877a0216044abe4281916c8d132..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the test plan for porting upstream fix 81576 (`.theseus/diagnosis/PKT-81576-test-plan.md`) and committed it as `9a0fc4b`. The plan comes from reading the upstream patch and EO's current code. I didn't run any code or tests, and I left the full end-to-end check for the port itself. The acceptance command passes, `theseus scope-check` is clean, and `theseus validate` reports 0 errors and 4 warnings.

**How the bug works today:** when the final save of a document fails, the code puts its database entry back into the "saving" state (`SaveVersion`) and nothing ever moves it out again. Shutdown waits until no document is in that state, so it runs until its timeout and reports failure. Retries are turned off during shutdown, so a failed save while shutting down always leaves a stuck entry.

**What the fix changes:**
- **Stuck state:** a failed save with no retry left now marks the document as openable, with a "file not assembled" flag, instead of leaving it in `SaveVersion`. Shutdown can then finish.
- **Unsaved edits:** these are kept, and the editor shows a "File not assembled" warning on every open until a later save clears the flag.
- **What counts as success:** an acknowledgement from the integrator only counts as a successful save if the save worked, or if the error was the "corrupted file" one.

**Something PKT-0029 missed:** on EO main today, if the save fails for a reason other than a corrupted file (for example a converter crash) and the integrator still acknowledges the "Corrupted" callback, EO treats it as a success and deletes the unsaved edits. So the fix also closes a data-loss path, not only the shutdown hang.

**Test plan:** the tests are meant to be written first against EO main, so they record how it behaves today. They cover the save callback (T1–T9), the editor warning on open (E1–E5), the shutdown wait (S1–S2) and the new helper file. After the port, only four of them should change result (T3, T4, T6, E2). The plan also covers the end-to-end check using the running document server and browser, and the one conflict to fix by hand when applying the patch.

**Recommendation for the human decision:** port it, with the characterization tests written first in a separate packet. The reason to wait instead is that the fix exists only on upstream `master` (no release branch) and adds a new database state integrators may notice. One gap remains either way: a corrupted-file error with no acknowledgement and no retry still leaves the stuck state (T9).

**Follow-up:** I recorded a request for the characterization-tests packet in `.theseus/spawn/`. It only creates files under `tests/unit` and changes no source code.

**Lesson for the Atlas:** in docservice, the save callback treats any acknowledgement as success, even when the save failed for a reason other than a corrupted file. Shutdown counts documents still in `SaveVersion`, so any path that restores that state without a retry can hang shutdown.

The Executor log, Lessons section and friction line are filled in. The friction line notes that `theseus packet new` refused `--type test`; the executor prompt doesn't list the valid types.
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
