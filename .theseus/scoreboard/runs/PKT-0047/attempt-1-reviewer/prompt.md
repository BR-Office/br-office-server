You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0047, described in .theseus/queue/ (search for PKT-0047). The changes to review are `git diff f0094571c1cfc526307ecb47a33545c8b4fc5ff3..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've measured the document editor's open on the native package and added the split to `baseline.md`. In short: the ~1.4 s before the document is requested goes almost entirely to building the web-apps interface; sdkjs barely appears in it. The packet has no acceptance commands, so there was nothing to run. `theseus validate` reports 0 errors and 1 warning, which I didn't look into.

**What I measured.** Both PKT-0016 docx samples (10 and 100 pages), 5 opens each in a fresh browser, with a timing marker on `asc_LoadDocument`. Each profiled open is paired with an unprofiled one, so the timings aren't skewed by the profiler. The new script is `.theseus/oracle/perf/open-window.js` and the raw data is in `perf/open-window-2026-11-02.json`.

**Findings:**
- **Timeline (median):** `asc_LoadDocument` is called at about 1.42 s, Editor.bin is requested 65–100 ms later, and the document is fully loaded at 3.8–4.4 s.
- **CPU before `asc_LoadDocument`:** about 1.1 s of the 1.4 s is busy.
  - About 0.95 s is web-apps: the documenteditor app code (~0.18 s), apps/common (~0.13–0.17 s), jQuery called by the UI build (~0.4 s) and script/style parsing (~0.2 s).
  - sdkjs costs only ~80 ms here (`sdk-all-min.js`).
- **The word engine is off this path.** `sdk-all.js` (18 MB uncompressed) downloads in parallel and finishes after Editor.bin is requested, so it costs nothing in this window.
- **Controllers:** their `onLaunch` hooks are cheap. The real cost is the UI build that runs after the permissions message (`Main.onEditorPermissions → Toolbar.onAppShowed`).
  - Toolbar ≈ 250 ms of its own CPU, ≈ 0.5 s including the code it calls.
  - Comments ≈ 100 ms, Main ≈ 80–100 ms, Viewport ≈ 70 ms; the other controllers are small.
- **Locale and CSS** don't show up as separate scripts: their cost is part of the browser's own parsing time.
- **Sizes:** I could only get uncompressed sizes; the browser doesn't report compressed transfer sizes on this setup. So the "~500 KB of scripts" figure from PKT-0016 is an undercount: the scripts are about 23 MB uncompressed.
- **Is a refactor worth it?** Lazy-loading the ~30 controllers as code would save under 0.1 s. Deferring hidden toolbar tabs and the Comments launch might save 0.3–0.4 s. That figure is my estimate, not measured. The 2.3–2.9 s after Editor.bin arrives is the bigger target either way.

**Decisions:**
- I sampled the CPU every 1 ms rather than every 0.1 ms, because the finer rate roughly doubled the open time in a trial run.
- The documenteditor app and apps/common ship as one bundle (`app.js`), so I split it module by module (`DE.*`, `Common.*`, everything else counted as vendor).
- I report controller cost two ways: inside `onLaunch` only, and all work under each controller.

**Not done:** only docx was in scope, and compressed sizes weren't measured. The samples came from another worktree's scratch folder because they aren't committed anywhere; I noted that in the friction line and didn't request a packet for it.

**Lessons for the Atlas** (also in the packet):
- Before Editor.bin, the documenteditor's open time is the web-apps UI build, not sdkjs.
- `app.js` contains apps/common, so split it per module, not per URL.
- The browser reports no usable compressed sizes on this stack.

Everything is committed as `fcb7ded` on the packet branch, including the Executor log and friction line.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
