You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0054, described in .theseus/queue/ (search for PKT-0054). The changes to review are `git diff 0fb78ceee1d97b7901b7e213e9f2b2cc7caab80e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've finished PKT-0054. The time goes to measuring each cell's text, then to drawing. It is not page setup. Committed as `afa4d6a`.

**Findings** (in `.theseus/diagnosis/PKT-0054-xlsx-pdf-layout.md`):
- **Where it goes:** almost all of the layout phase is one call, `asc_nativeGetPDF`. In a CPU profile of a 25k-row sheet:
  - 79% is building the text-metrics cache before drawing. Most of that is font shaping, done fresh for every cell with nothing reused. Number formatting (`Cell._getValue2`) is about 40% and overlaps with the shaping.
  - Drawing (row backgrounds and cell text) is about 33%. These shares overlap, so they don't add to 100%.
  - Page setup (`calcPagesPrint`) is about 3%, and turning on fit-to-width changed nothing (38.1 s vs 37.9 s).
- **It scales linearly:** about 0.7 ms of CPU per row, or about 35 ms per printed page. Nothing grows faster per page. Text versus numbers makes no difference.
- **Part of the 44 s is the sample file:** big-50k's formulas have no saved results, so x2t recalculates them all, which adds about 13–15 s. Real Excel files normally store those results.
- **Only the active sheet is printed:** the file has 3 sheets but the PDF has 1,042 pages, all from sheet 1.

**Decisions:**
- I compared CPU time, not wall time. The VM is shared with other agents and the same file took anywhere from 50 to 85 s.
- `perf` isn't installed, so I profiled through doctrenderer's built-in V8 inspector, turned on with `V8_USE_INSPECTOR=1`. The new tool is `x2t-cpuprofile.js`. The inspector only handles messages while V8 is paused, so the tool pauses before each script and makes `asc_nativeGetPDF` pause once it returns. Profiling slows runs by about 1.6×, so only the proportions count.
- I also added `x2t-cpu.sh` (CPU, wall time and memory per conversion) and `xlsx-variants.py` (the test files above).

**Not done:**
- I changed nothing in sdkjs, because it is read-only under `external/`.
- Each variant was run once.
- I didn't profile the formula recalculation on its own.
- The packet has no acceptance commands to run. `theseus validate` passed with 1 warning and 0 errors; I didn't check what the warning was.

**Follow-up requested** in `.theseus/spawn/` (requires `documentserver`): prototype a text-shaping cache keyed by font, size and text in the xlsx print path, or skip measuring numbers that already fit. Then measure whether the saving is worth forking sdkjs.

**Lessons for the Atlas:**
- The xlsx → pdf cost is in `drawForPrint` → `_prepareCellTextMetricsCache` and grows linearly with rows.
- doctrenderer has two debug switches: `V8_USE_INSPECTOR=1` opens a DevTools connection on port 8080 and waits for a client, and `js_speed=1` prints the time of each JS call.
- On the shared factory VM, compare CPU time rather than wall time.

The executor log and the friction line are filled in.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
