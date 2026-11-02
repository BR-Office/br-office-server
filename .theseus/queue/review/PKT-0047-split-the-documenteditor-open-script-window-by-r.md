---
id: PKT-0047
title: Split the documenteditor open script window by resource and evaluation
type: investigate
priority: medium
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - web-apps-documenteditor
  references:
  - .theseus/diagnosis/DIAG-web-apps-documenteditor.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 1
---

## Goal
On the native package with the PKT-0016 docx samples, record per-resource timings and a CDP CPU profile from goto to asc_LoadDocument and to Editor.bin request. Attribute time to sdk-all (sdkjs), the documenteditor app bundle, apps/common, locale, CSS and fonts, and to controller launch (Main/Toolbar/Viewport onLaunch). Add the table to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P1`).
baseline.md PKT-0016 shows ~1.5 s and ~500 KB of scripts before the document loads, not split. main/app.js loads ~30 controllers eagerly. This decides whether any refactor here is worth doing.

## Suggested plan

## Executor log
- 2026-11-02, claude-opus-5-5. New script `perf/open-window.js` (CDP Network + CPU profile, 1 warm-up + 5 runs per file,
  each profiled open paired with an unprofiled one for the marks); raw data `perf/open-window-2026-11-02.json`; table and
  reading in baseline.md, section "Document editor open window split by resource and CPU (PKT-0047)".
- Decisions: LoadDoc mark by wrapping `Asc.asc_docs_api.prototype.asc_LoadDocument` from an init script (sdk-all-min.js
  is mangled, so no reliable profile frame); app.js is one webpack bundle, so "apps/common" vs "documenteditor" is split
  per webpack module by what it defines (`Common.*` / `DE.*` / neither = vendor); "controller launch" is reported two
  ways: inclusive `onLaunch` (small) and busy time attributed to the nearest controller module on the stack (≈ 665 ms,
  Toolbar ≈ 250). Sampling at 1 ms instead of 100 µs: at 100 µs the profiler doubled the marks in a trial run.
- Surprises: (1) sdk-all.js (word engine, 18 MB decoded) finishes downloading *after* asc_LoadDocument and after
  Editor.bin is requested, so sdkjs costs only ≈ 80 ms (sdk-all-min.js) before the document; the window is the web-apps
  UI. (2) The UI build happens in `Main.onEditorPermissions → Toolbar.onAppShowed` after the license message, not in
  `onLaunch`. (3) CDP gives no wire sizes here (`encodedDataLength` −1/0); I report decoded sizes, and PKT-0016's
  "~500 KB of scripts" is a transferSize undercount (app.js 2.4 MB + sdk-all-min 2.4 MB + sdk-all 18 MB decoded).
- Not done: no `acceptance` commands are defined (none to run); existing tests untouched (only baseline.md and new
  files under perf/). The "worth refactoring" estimate (≈ 0.3–0.4 s from deferring hidden toolbar tabs and Comments) is
  an estimate, not measured. Only docx; xlsx/pptx not in scope. Wire/compressed sizes not measured.
- Attempt 2 (after review): diff was 4,875 lines vs 800 budget. Dropped the per-run `raw`/`rawNoProfiler` arrays
  from the JSON (medians kept, values unchanged) and wrote it one key per line; the script now writes medians only
  unless `--raw`. Fixed the header: `bodyKb` = decoded size (the figure used), `kb` = encodedDataLength (≈0 here).
  Lesson: commit summaries, not per-run dumps, under perf/; keep raw output out of the repo or behind a flag.

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: diff is 4,875 lines vs the 800-line budget. Remove the per-run raw/rawNoProfiler arrays from open-window-2026-11-02.json (keep the median summary) and fix the open-window.js header, which wrongly says sizes are encodedDataLength.

## Lessons for the Atlas
