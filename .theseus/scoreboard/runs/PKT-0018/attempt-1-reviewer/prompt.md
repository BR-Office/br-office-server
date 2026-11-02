You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0018, described in .theseus/queue/ (search for PKT-0018). The changes to review are `git diff 3b2108629d966f06b72dea33ac672b5a5517459a..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0018 is finished and committed (`8efe30d`). The acceptance command `test -s .theseus/oracle/baseline.md` passes, and `theseus validate` reports 0 errors and 1 warning, which I did not look into. The measurement scripts from the attempt that timed out had already been committed by the factory, so this run executed them and recorded the results. No project source was changed. The server-side timestamps come from DocService's DEBUG logs, which were already switched on in the config.

**Where the co-edit delay comes from:** the server is not the cause; the browsers are short of CPU.

| Segment (ms) | 2 clients p50 / p99 | 4 clients p50 / p99 |
|---|---|---|
| Total round trip | 101 / 294 | 126 / 2 066 |
| Sender: keystroke → message sent | 46 / 120 | 48 / **1 843** |
| Server: message received → sent to others | 4 / 69 | 4 / 57 |
| Receiver: server send → message received | 1 / 198 | 1 / **924** |

The machine's CPU was about 99% busy throughout, Chromium used up to 76% of it and DocService 3–7%. The server's share stays under 70 ms and doesn't grow with more clients.

**Load test** (lightweight Socket.IO clients instead of browsers, 2 changes/s per document, 30 s per setup):
- From 10 documents × 5 clients up to 100 × 10 (about 1,770 messages sent out per second), p99 latency stayed around 7–12 ms. DocService used 0.28 of a core.
- 100 × 10 failed when going through nginx: nginx's default limit of 768 connections tops out at about 700 open connections. I reran it straight against DocService (port 8000).
- 200 × 5 produced no result within 5 minutes. I didn't find out why.
- Every save in the load test failed (callback status 3), because the clients replay one recorded edit that doesn't fit each document. Save times under load don't mean much yet.

**Large files:**
- Converting a file for opening stays at 0.1–0.3 s even for large files, so opening time is spent in the browser.
- Export to PDF is the expensive step: 1.3–6.5 s.
- One of three pptx → pdf conversions took 124 s. I can't explain it yet.

**Decisions:**
- I used browsers plus server log timestamps for the delay breakdown, and lightweight clients for the load test so the load generator wouldn't steal CPU from the server. It used at most 0.14 of a core.
- I recorded a follow-up request in `.theseus/spawn/` for three things: the 200 × 5 failure, saves that actually succeed under load, and the 124 s outlier.

The results are a new section in `baseline.md`, the raw numbers are in `.theseus/oracle/perf/results-2026-11-02.json`, and the gaps table is updated. The executor log, the Atlas lessons and a friction entry are filled in. The friction entry says three things: the packet has no time budget even though the first attempt timed out, the acceptance check passes before any work is done, and reusing PKT-0016's setup helped.

**Lessons for the Atlas:**
- On this 2-CPU machine the co-edit delay comes from the browsers' CPU, not DocsCoServer. Measure the server with lightweight Socket.IO clients, not Chromium.
- nginx's default connection limit runs out (about 700 connections) long before DocService gets busy.
- PDF export is the expensive conversion; the conversion done when opening a file stays cheap.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
