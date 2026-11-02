You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0072, described in .theseus/queue/ (search for PKT-0072). The changes to review are `git diff 887aa32861642a9f3e9e51a420c38ec28854a61e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0072 is done and committed (`75204fd`). Two functions are worth refactoring; nothing else in libfont costs more than 50 ms. The packet declares no acceptance commands, so there were none to run; `theseus validate` reports 0 errors.

**What the data shows** (native package, PKT-0016 samples, 3 profiled opens each):
- **Font CPU on open is 170–280 ms, spread across many functions.** About 60–75 ms of it is WASM: HarfBuzz text shaping (2–3.5k calls), glyph loading, and one character-map lookup crossing into WASM per character (11–28k per open). The other functions each stay at or under ~25 ms. The largest are font matching in `map.js` (15–40 ms) and drawing glyphs in `file.js` (20–30 ms), which is drawing rather than measuring.
- **The glyph-measure cache is not the problem.** It hits 98–99% at open and 100% during remote apply. Misses equal the `FT_Load_Glyph` calls, which cross-checks the count.
- **Spreadsheet remote apply** costs 291 ms for 20 changes (PKT-0045 measured 336 ms). The spreadsheet view re-shapes about 900 strings per change: 18k shapes and 100k JS→WASM calls in total. All of it comes from `FragmentShaper.shapeFragment` in `cell/view/StringRender.js`, not from libfont. Each call costs the same as at open (about 3 µs per shape); the number of calls is the cost.

**Refactor candidates** (filed as two requests in `.theseus/spawn/` for the factory to approve):
1. **Stop re-shaping unchanged cells on a remote spreadsheet change**, for example by caching shaped text per (text, font). Expected gain is about 200–250 ms per 20 changes.
2. **Replace `hb_get_script_horizontal_direction` with a lookup table.** It is a `switch` over about 40 cases that each read a property, so V8 can't make it a jump table and Latin text runs through every case. It is called for every character. It costs 43 ms on the 100-page docx (408k calls), and about 60 ms with the related per-character lookups. This one is borderline.

**Decisions:**
- Times come only from the CPU profiles. Call counts and glyph-cache hits come from a separate coverage run, because coverage instruments the code.
- A JS→WASM crossing counts only calls to the raw WASM functions. My first count also included wrappers and pure-JS string-buffer calls and was about twice too high.
- The new script `profile-fonts.js` reuses PKT-0045's `profile-client.js` without changing it, because that file is outside the target.

**Surprise:** the coverage run of the spreadsheet co-edit saw only 360 crossings, against 118k in the profiled run. Coverage slows the receiving browser enough that redraws get merged, so co-edit counts come from in-page counters in the profiled run. The `applyCounts` field in the JSON is wrong for the spreadsheet.

**Lessons for the Atlas:**
- Font CPU per open is not one hotspot, and the spreadsheet's apply cost is in the cell view, not in libfont.
- Count calls with in-page hooks rather than coverage when the browser is receiving co-edits.
- In V8 profiles, WASM time sits under `js-to-wasm` frames with no URL; walk past them to find the JS caller.

**Open points:**
- The commit touches 7 files against `max_files_changed: 6`. Four are the target and the new perf files; the rest are the packet file, the friction line and two spawn requests.
- The spreadsheet request uses module `sdkjs-cell`, which has no Atlas card yet.
- Run-to-run spread on this VM is up to about 1.5×.

Results are in `.theseus/oracle/baseline.md` under "libfont + WASM CPU by function"; raw data is in `.theseus/oracle/perf/fonts-profile-2026-11-02.json`.
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
