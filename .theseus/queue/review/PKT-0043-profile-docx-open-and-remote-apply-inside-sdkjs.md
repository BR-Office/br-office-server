---
id: PKT-0043
title: Profile docx open and remote apply inside sdkjs word
type: investigate
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - sdkjs-word
  references:
  - .theseus/diagnosis/DIAG-sdkjs-word.md
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
  reviewer: null
---

## Goal
With the native stack and the PKT-0016 samples (docx 10 p and 100 p), record Chrome CPU profiles (Playwright + CDP Profiler) of open (Editor.bin received → load complete), typing, and receiver apply of remote changes. Attribute self and inclusive time to word submodules (Serialize2 reader, CDocument.Recalculate/paragraph/table layout, styles, collab apply, Drawing render) versus sdkjs/common, fonts and browser. Use the unminified develop bundle or source maps so frames are named. Add the table to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P1`).
baseline.md PKT-0016 shows 1.9–2.4 s after Editor.bin and apply p90 105–143 ms, not split. The atlas card sdkjs-word lists the call path. This decides which refactors to plan and whether any kernel is a migration candidate.

## Suggested plan

## Executor log
- Recorded with CDP Profiler (100 µs) in headless Chromium via Playwright (`/opt/node-tools/node_modules`, browsers in `/opt/pw-browsers`); 3 runs × {open, type, apply} × {10 p, 100 p}. Scripts `perf/profile-word.js` (record) and `perf/attribute-word.js` (attribute); aggregated JSON `perf/word-profile-2026-11-02.json`; table in baseline.md.
- Decision: no source maps / develop bundle needed. Surprise: the package's `sdkjs/word/sdk-all.js` is whitespace-minified and keeps function names; only `sdk-all-min.js` (the "min" list of configs/word.json: docscoapi, CollaborativeEditingBase, SerializeCommonWordExcel, libfont loader) is mangled. Frames are mapped to source files via definition anchors in the bundle (names from the files word.json bundles, looked up in external/sdkjs; 154 ambiguous names skipped; ≤ 1 % of samples unmapped).
- Decision: open window = CDP Network.loadingFinished of Editor.bin → isDocumentLoadComplete, same monotonic clock as the profile.
- Surprise: the harness's own `GetText` polling showed up as Paragraph/Run time (up to 690 ms/run); samples under Playwright `evaluate`/`predicate` frames are now excluded and reported apart.
- Surprise: profiling inflates the open window (2.5–6.9 s vs 1.9–2.4 s in PKT-0016) and run-to-run spread is large on 2 CPUs (10 p apply busy 5.4 s vs 100 p 2.9 s): shares are the result, not ms.
- Finding: open is word layout + fonts (Serialize2 only 13–23 % inclusive); typing/apply are repaint-dominated (canvas drawImage 17–27 % self, *Draw* on stack 33–57 %); collab apply code itself < 1 %. No single JS kernel > 4 % → no migration candidate; refactor candidates listed in baseline.md.
- Spawned one follow-up (font-name walk per remote change). Not done: GPU rendering, image-heavy docs, internals of the mangled base bundle. Acceptance list is empty; `theseus validate` run.

## Spawned packets
- PKT-0057: Avoid whole-document font-name walk on every remote change in sdkjs word

## Review

## Lessons for the Atlas
