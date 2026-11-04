---
id: PKT-0109
title: Measure repaint scope per keystroke and per remote change in sdkjs word
type: investigate
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:r2:P1
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
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
estimated:
  files: 3
  diff_lines: 400
  source: planner
acceptance:
  commands:
  - node --check .theseus/oracle/perf/word-repaint.js
  - grep -q "word-repaint" .theseus/oracle/baseline.md
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
resume: false
---

## Goal
Write .theseus/oracle/perf/word-repaint.js. With the fork build injected by Playwright routing (as PKT-0093, bundles from .theseus/oracle/differential/build.sh) on large-100p.docx, count per local keystroke and per remote change how many pages and rectangles are invalidated and redrawn (wrap the word DrawingDocument / CDocument redraw and OnRecalculatePage / UpdateTarget entry points), the canvas drawImage calls and the ms each takes, and the recalculation range (pages recalculated). Record the table in baseline.md and name the call sites that decide the redraw range, with the expected ceiling of limiting redraw to the changed page or lines.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P1`).
PKT-0043 found typing and remote apply repaint-dominated (drawImage 17-27 % self, Draw frames 33-57 % on stack). PKT-0093 shows the font fix took ≈ 7 % and repaint/recalc remain. Round 1 lesson - trace what actually runs before planning a fix (PKT-0087).

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.23.3, work kept
- attempt 1: acceptance failed: `bash .theseus/oracle/differential/sdkjs-word.sh`
- 2026-11-04 (claude-opus-5-5): wrote `.theseus/oracle/perf/word-repaint.js`. It builds the fork with
  `differential/build.sh` (cached, key 02ce87d…; fork `theseus` 0f61ccc, no local change), routes the word bundles as
  PKT-0093, opens large-100p.docx as A and B, wraps on the live instances CDocument `private_Recalculate`,
  `Recalculate_Page`, `Redraw`, `private_Redraw`, `DrawPage`; DrawingDocument `OnRecalculatePage`, `OnRepaintPage`,
  `FirePaint`, `ClearCachePages`, `StartRenderingPage`, `UpdateTarget`; CEditorPage `OnPaint`, `OnScroll`,
  `OnUpdateOverlay`; and `CanvasRenderingContext2D.prototype.drawImage` (count, ms, px, target canvas), with call-site
  stacks. Results and call sites in baseline.md "repaint scope per keystroke … (PKT-0109)". 2 runs × 20 events per side.
- Decision: "rectangles" = page rectangles. sdkjs word has no sub-page invalidation: the unit is the page cache image;
  `drawImage` counts are split into offscreen (glyphs into the page cache, ~2 000 per page) and on-screen blits.
- Surprise 1: `CDocument.Redraw/private_Redraw/OnRepaintPage` are never used by typing; `OnRecalculatePage` itself marks
  the page dirty (`SetRepaint`), so the fast paths already invalidate only the changed page.
- Surprise 2: `CWordCollaborativeEditing.Send_Changes` clears ALL page caches + FirePaint on every send while co-editing
  (`m_nUseType !== 1`), "to redraw locks": a second whole-page re-raster per keystroke. Ceiling measured with an in-page
  no-op of that call (env `NOCLEAR=1`, not a fix): local re-raster 1.8 → 1 page, OnPaint 30 → 18 ms per keystroke.
  Remote: no gain (B re-rasters twice from its own recalc passes). Refactor requested (spawn: skip the lock redraw).
- Surprise 3: 4–5 of 40 remote events leave the fast path and recalc pages 0–85 in the timer loop (260–420 ms each).
  Not traced; investigation requested (spawn: trace the full-document fallback).
- Gap: the remote fast path (`RecalculateByChanges → private_RecalculateFastParagraph`) is not timed (not wrapped), so
  remote recalc ms p50 0 means "not measured", said in baseline.md. Line-level redraw ceiling is an estimate, not prototyped.
- Nothing prototyped in external/sdkjs (the ceiling used a runtime wrapper); per-event JSON not committed (budget), the
  script's `--json` reproduces it.
- 2026-11-04 retry (claude-opus-5-5): rejected on `differential/sdkjs-word.sh` (1 unintended difference). The fork
  has no change (still `theseus` 0f61ccc, same build key 02ce87d… as base comparisons), so the packet cannot cause a
  difference. Re-ran it twice: PASS (2 cases, all checks `same`) both times; all six acceptance commands pass. Likely
  a flaky co-editing check (timing-sensitive sentA/sentB/shown) or load from a concurrent run; the failing output was
  not kept by the factory, so the check that differed is unknown. No code change made for the retry.

## Spawned packets
- PKT-0144: Skip the all-pages lock redraw in Send_Changes when no lock changed (sdkjs word)
- PKT-0145: Trace why some remote typing changes fall back to a full-document recalc in sdkjs word

## Review
- Approved by claude-opus-5-5-b: measurements, call sites and ceilings recorded as asked; gaps (remote fast-path recalc not timed, line-level ceiling estimated) are stated and follow-ups requested

## Lessons for the Atlas
