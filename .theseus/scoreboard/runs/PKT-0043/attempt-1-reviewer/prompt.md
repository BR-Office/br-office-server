You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0043, described in .theseus/queue/ (search for PKT-0043). The changes to review are `git diff 027bc2eb6f5f024a2f050932328be5078d5a195d..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I profiled PKT-0043 and committed it as `aba34ff`. The profiles show that the time in the word editor goes to text layout, font work and repainting; parsing Editor.bin and the code that applies co-editing changes cost little. No single JavaScript function takes more than 4% of the time, so nothing is a migration candidate. The packet has no acceptance commands, and `theseus validate` reports 0 errors. Its one warning is the pilot-mode notice that reviewer and executor may come from the same model family.

**What I ran:** CPU profiles of the editor in headless Chromium, using the native stack and the two PKT-0016 samples (10 and 100 pages), 3 runs each, covering three phases:
- **Open:** from Editor.bin arriving to load complete.
- **Typing:** one user typing 40 characters.
- **Remote apply:** a second user receiving 30 changes.

The full table is a new section in `baseline.md`, and the aggregated data is in `perf/word-profile-2026-11-02.json`.

**Results:**
- **Open:** it is mostly layout. Paragraph/run and document recalculation are about 40–50% of the stack, fonts about 20%, and the web-apps interface start-up about 12–14%. Reading Editor.bin (Serialize2) is 13–23%, and grows with document size.
- **Typing and remote apply:** most of the time is repainting. Drawing functions are on the stack in 33–57% of samples, and the canvas `drawImage` call alone takes 17–27%. The co-editing code that applies a change is under 1%.
- **Largest single functions:** each takes 2–4%: `Draw_HighLights`, `BidiFlow.add`, and `Document_Get_AllFontNames`. On the 100-page file, `Document_Get_AllFontNames` is about 9% of remote apply because it walks the whole document on every change.

Two limits on the numbers:
- **Profiling slows the open:** the open window grew to 2.5–6.9 s, against 1.9–2.4 s without the profiler in PKT-0016. Runs also vary a lot on 2 CPUs. Read the table as shares of time, not as absolute milliseconds.
- **`drawImage` is probably over-weighted:** headless Chromium draws the canvas in software, so it likely costs more here than on a desktop with a GPU.

**Decisions:**
- **No develop build or source maps needed.** The shipped `sdkjs/word/sdk-all.js` keeps its function names. The script maps each frame to a source file using the file list in `configs/word.json` and the sources in `external/sdkjs`.
- **`sdk-all-min.js` stays one bucket.** It is name-mangled and holds the base code, including the co-editing base and the connection to the server, so its internals are not split out.
- **Open window timing:** it is taken from the browser's network event for Editor.bin, which uses the same clock as the profile.
- **Harness polling excluded:** the test harness's own polling of the document text was showing up as paragraph/run time (up to 690 ms per run). Those samples are now counted separately.

**Follow-up:** I recorded one request in `.theseus/spawn/`: make `Document_Get_AllFontNames` incremental on remote changes. It declares `requires: [documentserver, browser]`.

**Not covered:** rendering with a GPU, documents heavy in images or drawings, and the inside of the mangled base bundle.

**Lessons for the Atlas** (also written in the packet):
- The sdkjs-word card should say that the shipped `sdk-all.js` keeps function names, so it can be profiled as-is, and that `sdk-all-min.js` is the mangled base.
- Open cost is layout plus fonts; typing and remote-apply cost is repainting, not applying the change.
- The whole-document font-name walk on every remote change is a refactor candidate for wave 1.

The executor log and the friction line are filled in. I did not move the packet.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
