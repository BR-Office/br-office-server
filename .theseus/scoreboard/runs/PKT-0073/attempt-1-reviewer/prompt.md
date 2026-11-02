You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0073, described in .theseus/queue/ (search for PKT-0073). The changes to review are `git diff 5eb9805c90425062773bde386cb20efc3c8f22ba..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I broke down the ~300 ms "drawings" time on pptx open by function. No single `Drawings/Format` function takes more than 50 ms of its own CPU time (self time), but one group of related calls does exceed 50 ms in total, so I requested a refactor packet for it. The work is committed as `404fbfc`; the packet lists no acceptance commands, so none were run, and `theseus validate` shows 0 errors and 1 warning.

**How I measured:** I wrote a new script, `.theseus/oracle/perf/drawings-functions.js`, which reuses the helpers in `profile-client.js` (I couldn't edit that file because it isn't in the target). I ran 3 cold opens each of the PKT-0045 samples (pptx 50, docx 10 p and 100 p, xlsx 10 k) on the native Document Server. Raw data is in `drawings-functions-2026-11-02.json`, and the results are a new section in `.theseus/oracle/baseline.md`.

**Findings:**
- **pptx 50:** drawings self time is 282–290 ms, which matches PKT-0045. For comparison it is 51–96 ms on docx and 31–51 ms on xlsx.
- **No hotspot:** the largest single function takes about 31 ms. The top 40 functions add up to 152 ms, and the remaining ~130 ms is spread over many functions under 2 ms each.
- **The one candidate:** building text styles for each shape (`CShape.recalculateTextStyles` / `Get_Styles`) costs 143 ms including the functions it calls. 91 ms of that is `CMemory.sha256` hashing, called from `word/Editor/Styles/style-cache.js`. Caching these styles per master/layout/placeholder should save about 50–100 ms per open.
- **Font loading counted as drawings:** about 30 ms of the "drawings" time is font loading in `common/Drawings/Externals.js` (`xhr.onload`, `LoadFontArrayBuffer`). On docx and xlsx it is most of what gets counted as drawings. PKT-0045's grouping should move that file to fonts.
- **Text layout inside shapes** (`recalculateDocContent`, about 500 ms including callees) is the word engine working for the slide editor, so it belongs to the sdkjs-slide/sdkjs-word diagnoses, not common. Coordination with sdkjs-slide amounts to naming the slide-side callers in the baseline and the spawn request: `SlideLayout.recalculate`, `Slide.recalculateSpTree` and `MasterSlide.recalculate`.

**Decisions:**
- I added a new script rather than editing `profile-client.js`.
- The breakdown is by function name, not file. The script assigns file names by nearest anchor and is sometimes wrong (`getIsSingleBody` shows up under `CnxShape.js`), while function names are exact. I found what the unnamed closures were by reading the bundle at their positions.
- The refactor request is in `.theseus/spawn/` with `requires: [documentserver, browser]`. Its targets are under `external/sdkjs`, which is a read-only clone, so it can't be done until the sdkjs fork exists.

**Not done:** the summary lists only the top 40 functions per measure, so the long tail is not itemised.

The packet's log and Atlas lessons are filled in, and the friction line is appended.

**Lessons for the Atlas:**
- On pptx open, drawings CPU is flat. The only lever over 50 ms is building text styles for each shape plus the sha256 style-cache keys.
- `common/Drawings/Externals.js` is the font loader, despite the folder it sits in.
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
