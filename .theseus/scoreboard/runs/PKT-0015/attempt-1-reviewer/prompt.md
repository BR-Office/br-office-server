You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0015, described in .theseus/queue/ (search for PKT-0015). The changes to review are `git diff 8f5ba376fe92445eabff9ee5f19e234642910933..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I measured the full stack (the Docker image with PostgreSQL, Redis, RabbitMQ and x2t) and added the numbers to `.theseus/oracle/baseline.md`. The defect and crash rate from upstream history is **not** done: `gh api` on github.com/Euro-Office/server was refused by my permissions, and I did not work around it. The acceptance command passes, `theseus validate` reports 0 errors and 1 warning that I did not look into, and the work is committed as `4c2bc23`. The container is stopped.

All samples are the image's own near-empty templates, on a 2-CPU VM, so these are fixed per-request costs. Results:

| Operation | p50 | p99 | Notes |
|---|---|---|---|
| Convert any format → PDF | 0.76–1.17 s | up to 1.35 s | x2t alone takes 0.65–1.0 s; about 1.3 conversions/s |
| Convert to ODF, or PDF → docx | about 140 ms | up to 210 ms | x2t alone takes about 70 ms; about 7 conversions/s |
| Open a document (first user) | 2.8 s | 3.0 s | mostly the browser client |
| Co-edit round trip, 2 clients | 99 ms | 1.1 s | change from user A visible to user B |
| Co-edit round trip, 4 clients | 105 ms | 2.4 s | the slow tail is not explained yet |
| Save after the last user leaves | about 6 s | 6.4 s | 5 s of this is the configured `savetimeoutdelay` |

- **Four conversions in parallel** give only 1.4× to 2× the throughput, because x2t saturates the 2 CPUs.
- **Synchronous ConvertService** answers only in whole seconds. It checks the conversion status once a second (`CONVERT_ASYNC_DELAY = 1000` in `DocService/sources/converterservice.js:49`), so a 140 ms conversion comes back after at least 1 s.

**Decisions:**
- The scripts are in `.theseus/oracle/perf/`: `e2e-convert.js`, `e2e-coedit.js` (headless Chromium through the example page) and `x2t-direct.sh`. The sample files are in `perf/samples/`.
- I timed conversions in async mode, checking every 50 ms. `SYNC=1` runs the server's own sync mode instead.

**Surprises:**
- **Conversions failed with `error: -4`.** The server refuses downloads from private IPs. I allowed them under `services.CoAuthoring` in the container's `local.json`; no source code changed.
- **Saving failed when the editors were opened through `127.0.0.1:8080`.** Inside the container that address does not exist, so the save callback failed. Opening the editors through the container's own IP on port 80 fixes it.

**Also not done:**
- Running `x2t-direct.sh` was refused by permissions. I ran the same loop through `docker exec`, which gave the x2t numbers in the table.
- I did not write the line in `.theseus/scoreboard/friction.jsonl`: that file is outside the target, and this run's rules forbid changing it. Its content is in the Executor log for the factory to add.

**Follow-up requests in `.theseus/spawn/`, committed with the work:**
- Explain the co-edit tail and load-test the server with large documents.
- Measure the defect rate from upstream history, which needs `gh` allowed.
- Shorten the 1 s wait in synchronous ConvertService.

**Lessons for the Atlas:**
- **Bench setup:** future benches on the Docker image need the private-IP setting and should open editors through the container's IP. `adapter/environment.md` should say so.
- **Where the time goes:** almost all server time is x2t (0.6–1 s for any PDF output) and configured delays (5 s before saving, 1 s polling in sync convert). The co-editing server code (DocsCoServer) is not a measurable share of any end-to-end latency here.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
