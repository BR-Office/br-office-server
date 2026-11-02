---
id: PKT-0054
title: Investigate xlsx to pdf layout cost in x2t (50k rows 44 s)
type: investigate
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0041

depends_on: []
requires: [documentserver]

target:
  files: []
  create_in:
    - .theseus/diagnosis
    - .theseus/oracle/perf

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-0041-x2t-pdf-split.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands: []

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5-b
  reviewer: claude-opus-5-5
---

## Goal
PKT-0041 measured big-50k.xlsx -> pdf at ~50 s, 44 s of it in the JS layout/Execute phase of doctrenderer (xlsx -> xlsx was 6.5 s in PKT-0018). Profile where the cell layout/drawing time goes (V8 --prof or perf with perf-map, or sdkjs cell print path) and say whether it is page setup (e.g. no print area / fit-to-page), font measurement, or drawing-command volume.

## Essential context
Run with `.theseus/oracle/perf/x2t-split.sh`; samples from `make-samples.py`.

## Essential context

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.16.2
- Result in `.theseus/diagnosis/PKT-0054-xlsx-pdf-layout.md`: the cost is per-cell text measurement (HarfBuzz
  shaping + number formatting, 79 % of asc_nativeGetPDF) then drawing (~33 %); page setup ~3 %, fit-to-page no effect.
- Decision: compared CPU time, not wall: the VM is shared and wall time swung 50 -> 85 s for the same file.
- Decision: profiled through doctrenderer's own V8 inspector (V8_USE_INSPECTOR=1) instead of perf (not installed)
  or --prof (no flag hook in doctrenderer). New tool x2t-cpuprofile.js; trick: inspector only handles messages
  while paused, so pause before each script and wrap asc_nativeGetPDF with `debugger`.
- Surprise: `js_speed=1` env makes doctrenderer print per-call laps (NativeOpenFileData/Calculate/PagesCount/GetPDF).
- Surprise: only the active sheet is printed; big-50k has 3 sheets but 1 042 pages.
- Surprise: ~13-15 s of big-50k's time is formula recalculation because openpyxl writes no cached values (sample artifact).
- Cost is linear (~0.7 ms CPU/row); no quadratic per-page work.
- Not done: no change to sdkjs (read-only); measurements are single runs (CPU time stable to ~5 %);
  formula recalc cost was not profiled separately. Follow-up requested in .theseus/spawn/.

## Spawned packets
- PKT-0069: Prototype a text-shaping cache in the sdkjs xlsx print path

## Review
- Approved by claude-opus-5-5: Goal answered with profile evidence (text shaping and formatting ~79%, drawing ~33%, page setup ~3%); log, spawned follow-up and friction present; minor gaps in reproducibility and the fit test

## Lessons for the Atlas
