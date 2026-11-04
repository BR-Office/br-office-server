You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0131, described in .theseus/queue/ (search for PKT-0131). The changes to review are `git diff 6b16b930e8514de63a17818f858f7ccab6c22215..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0131 is done and committed (`b6513c2`). Converting the 10-page Word document to PDF takes **1200 ms** at p50 (min 1083, max 1251, over 9 runs), and **98% of that is x2t**. All four acceptance commands pass, and `theseus scope-check` reports no changes outside the target.

**What I built**
- `.theseus/oracle/journeys/convert-docx-pdf.sh` and `convert-docx-pdf-run.cjs` play the integrator calling the API:
  1. POST a signed request to `/ConvertService.ashx` (`async:true`, docx → pdf), pointing at `open-docx-10p.docx`, served from a local URL.
  2. Re-post every 20 ms until the server says the conversion is finished.
  3. Download the PDF to the last byte.
  - Stage times come from the server's own debug logs, matched by the request key.
- The existing `serve-integrated.sh` (from PKT-0126) is reused unchanged.
- The map is `.theseus/journeys/convert-docx-pdf.md`. The stages add up to 1209 ms against the 1200 ms total (0.75% apart), with 0 ms unattributed.

**Where the time goes**
- **Server plumbing** (HTTP, token check, queue, fetching the source, storage, response) is about 15 ms in total.
- **Polling** adds about 19 ms, which is the 20 ms poll interval I chose.
- **x2t** is 1174 ms. Running x2t on its own on the same file splits it into:
  - about 75 ms to start the process and read the docx;
  - about 390 ms of fixed start-up (the JavaScript engine plus the bundled editor code), paid even for an empty document;
  - about 585 ms to lay out the 10 pages and draw the PDF.

**Decisions**
- No browser: the user of this journey is an integrator calling the API.
- Async mode with 20 ms polling. The server's sync mode only re-checks about once a second, so it would add up to ~1 s; the map notes this.
- I used the same 10-page sample as the open journeys so the numbers can be compared.
- There was no earlier map of this journey, so the comparison is with `baseline.md`: 767 ms there for a small template, where x2t was 70–90% of the time.

**Problem found: x2t does not run the integrated code**
- x2t loads a precompiled snapshot, `sdkjs/word/sdk-all.bin`. `serve-integrated.sh` replaces the JavaScript files but leaves this snapshot from the original package.
- So every x2t run uses the packaged editor code, not the forks' branch. This also affects the save journey (PKT-0130).
- I tested moving the snapshot aside: x2t rebuilt it on the next run and then took about the same time. I put the original back, byte-identical.
- I couldn't fix the script here because it is outside this packet's target. I recorded a follow-up request at `.theseus/spawn/PKT-0131-serve-integrated-make-x2t-run-the-integrated-sdk.md`, priority high, which needs the `documentserver` environment.

The Executor log and the friction line are written. No command was refused.

**Lessons for the Atlas**
- The fastest gain for conversion is a renderer that stays running, which would save roughly 0.45 s on every conversion. The rest is sdkjs word's layout and PDF drawing, which is shared with opening a document.
- The next x2t diagnosis needs to cover all three x2t sub-steps. x2t has no internal timing log, so the split had to be inferred from standalone runs and strace.
- Any overlay of the sdkjs code must also handle `sdk-all.bin`, or x2t keeps running the old code.
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
