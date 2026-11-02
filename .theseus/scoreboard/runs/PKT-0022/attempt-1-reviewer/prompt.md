You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0022, described in .theseus/queue/ (search for PKT-0022). The changes to review are `git diff bfbc20e73a221999f58dc65de153792942313596..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've recorded the PKT-0021 findings in `baseline.md` and the two perf scripts. Both scripts pass a syntax check (`node --check`), but I did not run either one against the server. The packet has no acceptance commands, so there was nothing else to run, and `theseus validate` reports 0 errors (1 warning). Committed as `838d99f` and `b1a9426`.

**What changed:**
- **`perf/load-coedit.js`:** once all clients of a doc are connected, the first client now sends `unLockDocument`, as the real editor does. Waits for `saveLock` now give up after 10 s and count as `errors.noLockReply`. Before this, any run whose open phase passed 30 s (`expire.lockDoc`) hung.
- **`perf/convert-large.js`:** before timing anything, it repeats a small conversion until one takes under 3 s (at most 15 min). That waits for the converter queue to empty, since it has only one process and also handles saves from load tests. The header comment says to run it on an idle server or before load tests.
- **`baseline.md`:**
  - Added the 200×5 and 200×10 rows, and replaced "200×5 not diagnosed" with the cause: a bug in the test script, not a server limit.
  - Replaced the "124 s outlier" note with the explanation: the conversion was waiting behind saves left over from the load test.
  - The Gaps row now points to PKT-0023 (valid saves under load).

**Decisions:**
- The patched copies of the scripts from PKT-0021 no longer existed, so I rewrote the two fixes from its log. I left out its extra stderr timestamps, which were only for debugging.
- PostgreSQL's 0.25 core goes in the text, because the table has no column for it.

**Surprises:** the packet has no acceptance commands, and its `contract.preserve` still holds the template placeholder.

**Lessons for the Atlas** (also written in the packet):
- Any load script for co-editing must send `unLockDocument` after a second client joins, and must time out every wait for a server reply.
- Conversion timings are only valid once the converter queue is empty.

The Executor log and friction line are filled in. No follow-up packets were needed, and none of my commands were refused.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
