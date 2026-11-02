You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0021, described in .theseus/queue/ (search for PKT-0021). The changes to review are `git diff 17f4bf325d926dfe7195e18bbc4fe0179e78cbba..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I found the causes of two of the three problems, but saves under load still fail. Everything is committed (`4497525`).

The packet itself was incomplete: its target file list, contract and acceptance commands were still template placeholders. So the only files I changed are the packet's Executor log, `friction.jsonl` and two spawn requests. There were no acceptance commands to run; `theseus validate` gives 0 errors and one warning about pilot mode. PKT-0018's scripts aren't on this branch yet, so I patched copies in my scratchpad folder.

**1. Why 200 docs × 5 clients gave no result.** This was a bug in the test script, not a server limit.
- When a second editor joins a document, DocService locks it and expects the first editor to send `unLockDocument` within 30 s (the `expire.lockDoc` setting). If it doesn't, the server drops that editor.
- The test script never sends `unLockDocument`, and it opens documents one after another. With 200 documents, opening takes 38–110 s, so the first documents wait more than 30 s for their first change and get dropped.
- The script then waits for a `saveLock` reply that never comes, and that wait has no timeout, so it hangs. In one run 71 documents were dropped.
- 100 × 10 opened in under 30 s, which is why PKT-0018 didn't hit it.

After sending `unLockDocument` and adding a timeout, there was no ceiling up to 2,000 sockets, with no errors:

| Docs × clients | Sockets | Broadcasts/s | Ack p99 | DocService CPU |
|---|---|---|---|---|
| 200 × 5 | 1,000 | 1,574 | 28 ms | 0.40 core |
| 200 × 10 | 2,000 | 3,541 | 28 ms | 0.54 core |

I didn't go higher because the load generator shares the VM's 2 CPUs with the server.

**2. Valid saves under load: not done.** Every save still returns status 3, even for one document with one change on a blank docx. x2t fails to apply the replayed change because it points to objects created in the browser session it was captured from. Fixing it means capturing a full typing sequence in a browser and replaying it in order, so I requested a follow-up packet. The save timings (138–143 s for 200 docs) only show how long the failing saves take.

**3. The 124 s pptx → pdf conversion is explained.** The converter runs one job at a time (`maxprocesscount` 1), and save assembly goes through the same queue.
- On an idle server, 10 conversions of deck-50.pptx took 2.0–2.8 s.
- Started right after a load test closed its sockets, the third conversion took 68.7 s, waiting behind 100 queued saves.
- In PKT-0018 the conversion test ran right after its load test, and deck-50 was the first file converted. I couldn't check PKT-0018's own logs because they no longer exist.

**Follow-up packets requested** (in `.theseus/spawn/`):
- Record these findings in `baseline.md` and the perf scripts once PKT-0018 is merged.
- Make saves under load valid using a browser-captured change sequence.

**Lessons for the Atlas** (also written into the packet):
- Synthetic co-edit clients must send `unLockDocument` after opening, or the server drops them after 30 s.
- One DocService process handles 2,000 sockets and 3,500 broadcasts/s on about half a CPU core.
- Conversions wait behind queued saves, so let the converter queue drain between a load test and conversion timing.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
