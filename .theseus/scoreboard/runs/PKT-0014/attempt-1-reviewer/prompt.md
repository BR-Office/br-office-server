You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0014, described in .theseus/queue/ (search for PKT-0014). The changes to review are `git diff 38c23cd9c0d125a07f7d8b89f8b465405c721679..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I measured the browser editors and recorded the numbers in `.theseus/oracle/baseline.md`, in a new "Client (browser editors)" section. The acceptance command passes and the work is committed (`910fd13`).

**Results** (Word document editor, new empty .docx, headless Chromium, 2-CPU machine):

| Scenario | p50 | p90 |
|---|---|---|
| Open and render the document | 3.15 s | 3.84 s |
| Second user joins the same document | 3.51 s | 3.69 s |
| Typing (key press until the character is drawn) | 31 ms | 68 ms |
| A remote user's change appears | 101 ms | 361 ms |
| Memory used by the editor | about 73–78 MB | |

A second run gave similar figures (remote change p50 90 ms, p90 233 ms; same memory).

What this means: opening takes about 3 s, almost all of it in the browser. The server's own work per co-edit message (about 60 µs, measured earlier) is under 0.1% of the 0.1 s a remote change takes. Typing is already below the point where people notice delay.

**Decisions**
- I didn't fetch the client repositories. The Docker image already ships the compiled client (version 9.3.7), so the factory doesn't need to add those repositories to the pilot for these measurements.
- The script is `.theseus/oracle/perf/client-perf.js`. It opens the document through the server's example page with two separate browser users and reads the editor's internal state for each measurement.

**Surprise:** with the `docker run` command in `environment.md`, documents never load and the client shows no error. The server's protection against requests to private addresses blocks it from fetching the file from the example page on localhost. Adding `-e EXAMPLE_ENABLED=true -e ALLOW_PRIVATE_IP_ADDRESS=true` fixes it. `environment.md` should say so, but it is outside my target, so I didn't edit it.

**Not done**
- Only an empty .docx was measured. These numbers don't cover large documents, spreadsheets, presentations or a real network. I also didn't split the 3 s open into its parts or explain the slow tail of remote changes. I requested a follow-up packet for this ("Break down client open and co-edit latency on realistic documents", in `.theseus/spawn/`).
- I didn't append the friction line, because `.theseus/scoreboard/friction.jsonl` is outside my target. Its content is in the Executor log instead.
- The packet file itself is also outside `target.files`; I edited only its log, spawn and lessons sections, as this run allows.
- No commands were refused by permissions.

**Lessons for the Atlas** (also written in the packet)
- The compiled client in the server image is enough to measure the browser editors; no client source checkout is needed.
- The example page needs `ALLOW_PRIVATE_IP_ADDRESS=true` on localhost, otherwise documents silently never load.
- Baseline on an empty .docx: open about 3 s, remote change about 0.1 s, typing about 30 ms, memory about 75 MB.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
