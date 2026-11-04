You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0110, described in .theseus/queue/ (search for PKT-0110). The changes to review are `git diff a00a7897576ec24995407c321df0f532f73c25c2..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0110 is done and all four acceptance commands pass. The work is committed on `pkt/PKT-0110`, `theseus scope-check` reports scope ok, and `theseus validate` reports 0 errors (4 warnings, which I didn't open). (The last watcher task ended with exit 1, but the results it was waiting for were already in: all four commands exited 0.)

**What I did**
- The earlier attempt's work was kept, so the new `large.docx` case in `run.cjs` was already written and listed in `sdkjs-word.sh`.
  - **Typing:** A types 6 characters at each of 5 places spread through the document (30 in all), and B waits for each one to appear.
  - **Checks:** model, sent, reopened and converted are compared as for the other cases. Shown is a hash of B's screen on every page that was typed on.
  - **Timing:** latency per character and B's busy time are each the median of 3 runs.
- The only fix needed was document size. 640 paragraphs gave 74 pages in the editor, so the "about 100 pages" guard (at least 90) failed. I raised it to 880 paragraphs in `gen-inputs.py`; the inputs regenerate on their own when the script changes.
- On `large.docx` all six checks come out the same between original and new.

**Timings on this VM** (typing latency is a median of 3 runs, in ms):

| | median latency | max latency | busy time (long tasks) |
|---|---|---|---|
| original | 124 | 693 | 509 |
| new | 126 | 580 | 698 |

The busy time varied from 485 to 698 ms across runs of the same build, so only differences well above about 200 ms mean anything.

**Lessons for the Atlas** (also written in the packet)
- **Busy time:** use the long-task figure (`long`) as B's real receive cost, not the WebSocket handler time (`recv`). `recv` reads only 2–3 ms because sdkjs's message handler just queues the changes; applying and repainting happen later. I left `recv` in the output and explained it in the log.
- **Input size:** with 55-word paragraphs, the editor fits about 8.4 per page. Size test documents by the page count you measure, not by estimate.

The Executor log and my friction line are written; the friction line notes that running all four acceptance commands back to back takes longer than the 10-minute command limit. I made no changes under `external/sdkjs`, created no follow-up packets, and changed no existing assertions.
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0110 of the fork https://github.com/BR-Office/br-office-sdkjs)
