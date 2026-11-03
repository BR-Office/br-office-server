You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0089, described in .theseus/queue/ (search for PKT-0089). The changes to review are `git diff cb714ed72a154a3185b3faf222848bfa011c212c..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I re-ran the A/B, and PKT-0087 gives no gain: 0 of 131 remote typing batches took the incremental path (30/30 was expected), so the self-time gain is about 0 instead of the expected ~140 ms. The acceptance check (`grep -q PKT-0087 .theseus/oracle/baseline.md`) passes and `theseus validate` reports 0 errors and 2 warnings. Everything is committed on this branch, and the sdkjs tree is clean.

**What I did**
- I reused the A/B harness from PKT-0071, which was still in that packet's scratchpad, and its *before* build. I added a log, per incoming batch, of which changed objects are collected and whether the incremental path is taken.
- I built three versions of the word bundle the same way: before (main, no incremental code), PKT-0066 (sdkjs at 3d51031), and PKT-0087 (3d51031 plus its fix, e5fd187).
- Each was run 3 times on the 100-page docx with 30 remote changes, typed text only.
- Results are in `.theseus/oracle/baseline.md` under "PKT-0066 A/B re-measured after PKT-0087 (PKT-0089)".

**Why there's no gain:** PKT-0071 named the wrong change. In every batch, the extra change that forces the full document walk is a description record attached to each batch of changes (`CChangesTableIdDescription`, type 131071). It is not the "new object added" change (`TableId_Add`, type 65537) that PKT-0087 handles. Typing into an existing run creates no new object, so PKT-0087's code is never reached.

**Decisions**
- PKT-0087's fix isn't in this sdkjs branch, so I applied its commit only for the build and reverted it straight after. No sdkjs source changes remain.
- I measured only the typed-text case; PKT-0087 doesn't affect the style case, so I didn't re-run it.
- The machine was busier than during PKT-0071, so absolute times are higher. The differences between the three versions are noise.

**Follow-up:** I recorded a request in `.theseus/spawn/` to skip these description records when collecting changed objects, using the existing sdkjs-word and unit oracles as acceptance. It also asks for this A/B to be run again afterwards, in a separate packet that needs the documentserver and browser environments.

**Surprise:** webpack's build cache (`build/.webpack-cache`) made the second build an exact copy of the first. I cleared it and rebuilt.

**Lessons for the Atlas**
- Every incoming co-editing batch carries a `CChangesTableIdDescription` record, so any filter over the changed objects must skip it.
- Clear the webpack cache between A/B builds and check that the bundles differ.
- Check the change type, not just the class name, before spawning a fix.

I also logged in the friction file that this packet's acceptance check can't catch a missing result, and that the A/B harness exists only in a scratchpad and should be committed under `.theseus/oracle/perf`.
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0089 of the fork https://github.com/BR-Office/br-office-sdkjs)
