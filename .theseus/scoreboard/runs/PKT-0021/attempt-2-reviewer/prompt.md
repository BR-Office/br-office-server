You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0021, described in .theseus/queue/ (search for PKT-0021). The changes to review are `git diff 17f4bf325d926dfe7195e18bbc4fe0179e78cbba..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I took the reviewer's second option. PKT-0021 now covers only items (1) and (3), and item (2), valid saves under load, moves to its own packet. Both acceptance commands pass, and the work is committed on the branch (a5f6579, 3af1d11).

**What changed in the packet:**
- **Goal and title:** item (2) is removed, with a note pointing to the spawn request that already describes it (`PKT-0021-valid-saves-under-load-…`).
- **Target:** filled in. It lists this packet file and `.theseus/scoreboard/friction.jsonl`; new files go only in `.theseus/spawn/`.
- **Contract:** this is a measurement-only packet. No source, configuration or perf script changes, and the server source is forbidden.
- **Acceptance:** `theseus validate` (0 errors), plus a check that the branch's diff since the claim touches only `.theseus` queue, spawn and friction files.
- **Executor log:** the attempt-2 decision is recorded. The item (2) findings stay there as context for the new packet.
- **Friction:** one new line for this attempt.

**Findings already in the packet log (unchanged):**
- **(1) 200 docs × 5 clients hang:** the cause is a bug in the test script, not a server limit. The script never sends `unLockDocument`, so docs left idle for more than 30 s lost their lock holder, and the script then waited for a save lock with no timeout. With that fixed, one DocService handled 2,000 sockets at about 3,500 broadcasts/s with ack p99 of 28 ms. No ceiling was reached.
- **(3) The 124 s pptx → pdf conversion:** it was waiting in the converter queue. Only one conversion runs at a time, and it shares the queue with the save assemblies left over from the load test.

**Lessons for the Atlas:**
- Synthetic co-edit clients must send `unLockDocument` within 30 s once a second editor joins, or the server drops them.
- Drain the converter queue before timing conversions after a load test.
- A goal that bundles an item needing new tooling (here, capturing changes in a browser) should be split up front.

Nothing was refused by permissions.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
