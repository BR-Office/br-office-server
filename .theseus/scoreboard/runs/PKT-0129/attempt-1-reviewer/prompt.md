You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0129, described in .theseus/queue/ (search for PKT-0129). The changes to review are `git diff 2e58bc569aa9435796aa048bf5631f70f547932e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've mapped the coedit-remote journey on the integrated build: **total_ms=107** (p50), min 72, max 363, over 60 remote changes. All four acceptance commands pass (`theseus validate` shows 0 errors and 7 warnings, none about this packet), `theseus scope-check` is clean, and the work is committed with the executor log and friction line.

**What I did**
- Wrote `.theseus/oracle/journeys/coedit-remote.sh` and its runner `coedit-remote-run.cjs`. Two Chromium users open the same copy of the 10-page document; user A presses a key, and the measurement ends when the character is shown on user B's screen. Both pages use the same host clock, and the server's share is split out using the DocService debug log. `serve-integrated.sh` already existed, so I left it unchanged.
- Wrote `.theseus/journeys/coedit-remote.md` with the required header and a `stages` yaml block: 12 stages, each with its module, files and functions.

**Where the 107 ms goes**
- **About 80% is waiting on timers and the browser frame, not doing work.** Three 40 ms timers in `sdkjs-common` account for most of it:
  - A waiting to send the change: 31 ms
  - B waiting to apply it: 17.5 ms
  - B waiting to paint: 20 ms
  - The browser then takes 17 ms to put the frame on screen.
- The actual work adds up to about 26 ms: A's text entry 4 ms, the server 3 ms, B applying the change 3.3 ms, and B's repaint 15.5 ms.
- **The server is not the bottleneck** (3 ms typical, 9 ms on average). This matches the earlier PKT-0018 measurement. The slowest cases (up to 363 ms) mostly come from occasional slow server responses on this busy 2-CPU machine.

**Decisions**
- I used the typical (p50) value for each stage. They add up to 112.4 ms, more than the 107 ms total, so `unattributed_ms` is −5.4. That is exactly 5.0%, the edge of the allowed range, and `theseus validate` accepts it. The averages add up exactly (118.4 ms mean).
- There was no earlier map of this journey, so I compared against the baseline measurements from PKT-0016 and PKT-0018 (101–116 ms). Those stopped when the text reached B's document model rather than the screen, and timed a whole 4–5 letter word rather than one key. On the same basis, this map gives about 60 ms.

**Surprises**
- Socket.IO handles an incoming message before any listener added later, so B's arrival time is read from `window.event` instead.
- `_onSaveChanges` runs twice per message, so the runner removes the duplicate.
- Applying a one-letter change never triggers a full page re-layout (`Recalculate_Page`).

**Not done:** I did not compare against the installed package. My short test runs with `NO_INTEGRATED=1` still ran the integrated code, because that setting only skips bringing the build up and it was already up. I corrected this note in the executor log.

**Lessons for the Atlas**
- The biggest gains for co-editing speed are in `sdkjs-common`, ahead of the server: send right after an edit (about 25–30 ms saved), apply on arrival (about 15 ms), and paint on the next animation frame (about 15 ms, the same fix the typing map points to).
- The method's spec does not say whether stage times should be medians or averages; medians do not add up to the median total.
- There is no shared helper for the editor hooks, so I had to copy and adapt `typing-run.cjs`.
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
