You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 266959c939a1cc8cfdcc1ba47863a386d62c9acf..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I measured PKT-0016 and recorded the results in `baseline.md`. The acceptance command `test -s .theseus/oracle/baseline.md` passes, `theseus validate` reports 0 errors and 1 warning, and the work is committed.

**Getting the server running.** The Document Server package is now running natively and `/healthcheck` returns true. Three things were needed:
- **Database:** `debconf-show` gave the database user and name (both `ds`) but hid the password, so I set `ds/db-pwd` myself and created a matching role and database.
- **Services:** the package's install script still exits with an error at the end because it calls `systemctl` and this VM has no systemd. The database and config steps finish before that, so I started the three server processes by hand as user `ds`, with the settings from their systemd unit files.
- **Example documents:** I turned on `allowPrivateIPAddress` in `local.json` so they load.

These are changes to the machine, not the repository. The install recipe isn't in `environment.md` yet because that file is outside my target; I filed it as a spawn request (below).

**How I measured.** I added `.theseus/oracle/perf/client-breakdown.js` and left `client-perf.js` unchanged. The new script uploads each sample document and opens it 3 times. It splits open time using the browser's resource timings. For Word documents it also runs a two-user co-edit and timestamps the change messages in both pages. I generated four text-only samples: Word documents of 10 and 100 pages, a 10,000-row spreadsheet and a 50-slide presentation. Raw results are in `perf/client-breakdown-2026-11-02.json`, one line per file to stay under the 800-line diff budget.

**Findings:**
- **Opening takes 3.4–4.4 s, and nearly all of it is the browser.**
  - Loading the editor scripts takes about 1.5 s, or 2.3 s for the spreadsheet editor.
  - The document's data file (`Editor.bin`) arrives in 0.05–0.5 s.
  - The largest part comes after that file arrives: 1.5–2.4 s for parsing, fonts and first render. It grows with document size: going from 10 to 100 pages adds 0.5 s.
- **Co-edit delay is in the receiving browser, not the server.**
  - Server plus network: 6–8 ms typical, at most 20 ms.
  - Sender batching its changes: at most 50 ms.
  - Receiver applying the change: 105–143 ms at the 90th percentile.

  So the 1–2.4 s worst cases PKT-0015 saw with 4 clients are most likely the browsers competing for the VM's 2 CPUs.

**Decisions:**
- I wrote a new script rather than extending the old one.
- The sample documents stay in the scratchpad: they are easy to regenerate and contain no images.
- In the Gaps table I replaced the old client-latency row with what is still missing: the conversion time inside an open, measured separately; documents with images; a real network.

**Surprises:**
- The browser sometimes requests `Editor.bin` before the last script has arrived.
- Fonts and `Editor.bin` report a transfer size of 0, so for them I only have counts and durations.

**Not done:** the conversion step (x2t) overlaps with script loading in the browser, so I couldn't measure it separately; that needs server-side timestamps. There are no image-heavy documents and no real-network runs.

**Spawned:** one request to put the working install recipe into `environment.md`. It includes an acceptance command and is committed under `.theseus/spawn/`.

**Lessons for the Atlas:**
- The native package installs on a VM without systemd if you set the database password in advance, create the `ds` role and database, and start the services by hand from the unit files.
- Both open time and co-edit latency are limited by the browser. The server and network part of a co-edit is under 20 ms.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
