You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0128, described in .theseus/queue/ (search for PKT-0128). The changes to review are `git diff f9bf2daed3a088ee837483c439a74a0f2521bd69..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
The typing journey map is written and committed. A key press takes **51 ms at the median** to show up on screen (fastest 34 ms, slowest 83 ms, over 90 measured keystrokes). All four acceptance commands pass, `theseus validate` has 0 errors and `theseus scope-check` reports nothing outside the target.

**What I did**
- The earlier interrupted attempt had already written `.theseus/oracle/serve-integrated.sh`, `typing.sh` and `typing-run.cjs` (commit a84c496). They ran unchanged against the integrated build (sdkjs fork at 0f61ccce over the native package): 3 sessions of 30 key presses each, on a quiet machine (load about 1).
- I wrote `.theseus/journeys/typing.md`. Its header has `round: 3`, `goals_hash: dcb03039` and `total_ms: 51`, followed by the stage table and the yaml block. The stages plus `unattributed_ms` (1.9 ms) add up to the total, inside the 5% tolerance.
- No earlier typing map existed, so there was nothing to compare with. Round 4 will compare against this one.

| stage | module | ms | share |
|---|---|---|---|
| browser delivers the key event | project | 0.3 | 0.6% |
| `CDocument.EnterText`: model change and paragraph re-layout | sdkjs-word | 3.4 | 6.7% |
| waiting for the 40 ms `PaintMessageLoop` paint timer | sdkjs-common | 12.8 | 25.2% |
| `WordControl.OnPaint` | sdkjs-word | 12.5 | 24.7% |
| browser presents the frame | project | 19.8 | 39.1% |

**Decisions**
- Layout is counted inside the `EnterText` stage. `Recalculate_Page` was never called while typing; a typed letter is laid out by a faster paragraph recalculation inside `EnterText`.
- The two browser stages are assigned to the `project` module. The paint-timer wait is assigned to `sdkjs-common`.
- The executor log in the packet and the friction line are filled in. My first friction line had the wrong shape and failed `theseus validate`; the corrected line is in a second commit.

**Lessons for the Atlas**
- About three quarters of typing latency is scheduling, not editing work: the actual edit costs about 3.4 ms.
- The biggest lever is the paint timer: painting on the next animation frame right after an edit, instead of waiting for the fixed 40 ms tick, should save about 13 ms (25%).
- The next lever is `OnPaint` itself, at 12.5 ms for one letter, which suggests it redraws more than the changed line. I didn't profile inside it; the next sdkjs-word diagnosis should.
- Even the slowest key (83 ms) is under the roughly 100 ms point where users start to notice a delay.

I didn't create any follow-up packets.
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
