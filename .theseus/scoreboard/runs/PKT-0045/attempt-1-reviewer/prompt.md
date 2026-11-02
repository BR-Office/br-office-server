You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0045, described in .theseus/queue/ (search for PKT-0045). The changes to review are `git diff 6263e268a04a70bd2f9d2e3db0104390be8a40f1..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I profiled the open and remote-apply phases on the four PKT-0016 samples. The main finding contradicts the packet and the diagnosis: fonts are not loaded one after another. Every font in the document is requested at once, and the 50 ms poll in `GlobalLoaders.js` only adds a 6–71 ms tail per open. Everything is committed in one commit (`2ad5ddc`, amended), and `theseus validate` reports 0 errors and 1 warning, the pilot-mode notice. The packet has no acceptance commands; the script ran end to end on the four files: 3 cold opens each, plus a two-user edit session on the docx and xlsx files.

**What I added**
- `.theseus/oracle/perf/profile-client.js`: drives Chromium through Playwright and the DevTools protocol. It records a CPU profile and the network events for each open, and profiles the receiving user during remote edits.
- `.theseus/oracle/perf/client-profile-2026-11-02.json`: the raw results.
- A new section in `baseline.md` with the share table and the font waterfall.

**Results** (CPU time spent in the functions themselves, median of 3 runs)
- **Open:** `sdkjs/common` is 22–35 % of open CPU, about 0.5–0.8 s. Most of it is font work, 250–300 ms of glyph measuring and shaping in libfont and its WebAssembly engine. For the pptx, drawings add about 300 ms. Charts and coauth (History, TableId) are negligible because the samples have no charts. The editor's own code is the larger share, 0.7–1.1 s.
- **Remote apply:** common is only 5–6 % in Word, and History/TableId cost 13–22 ms over 24 changes. In the spreadsheet it is 22 %, almost all text measurement while redrawing cells.
- **Fonts:** all 14–25 font files are in flight together and served through the editor's service worker. The wait comes from how long the last font takes to start arriving (0.3–1.4 s), which happens below sdkjs. While fonts download, the editor does nothing, but the main thread is still 35–80 % busy with browser and web-apps work.

**Decisions**
- **No source maps or readable develop build are installed.** The installed bundles keep function names, so I mapped each profile frame back to its source file using function names that appear in only one source file. That covered 85–95 % of the files. `sdk-all-min.js` and `sdk-all.js` hold different file lists and are mapped separately; before I split them, coauth showed as 0.
- **Remote apply counts only the 300 ms after each incoming change.** The first version counted the whole 16–18 s edit session, and half of that was background work. Every change arrived: 24 frames for the docx, 20 for the xlsx.
- **The tables report each file's own CPU time.** Time including called functions is in the JSON, but callbacks inflate it.
- **Remote apply covers docx and xlsx only**, the word and cell editors the diagnosis names.

**Not done, and caveats**
- I could not coordinate with PKT-0043 (sdkjs-word profiling, in progress elsewhere); my script is separate and does not touch the word oracle.
- I could not get server-side font timings because the Document Server's nginx has its access log turned off.
- Runs varied by up to 2×, probably because the VM is shared with other measuring packets.
- The profiler itself slows the open by 10–25 %, so absolute times are higher than in PKT-0016.

**Follow-up:** I recorded a spawn request in `.theseus/spawn/` to revise Wave 1 of `DIAG-sdkjs-common.md`. Its planned "parallel font fetching" refactor has nothing to fix, and removing the poll would save about 50 ms per open at most. The Executor log, the Lessons section and the friction line are written.

**Lessons for the Atlas**
- Font loading requests every document font at once; the 50 ms check is only a completion poll.
- The installed client keeps function names, so it can be profiled without source maps.
- The real costs in common are glyph CPU and drawings at open, not font I/O.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
