---
id: PKT-0108
title: Profile the first-Execute warm-up of x2t PDF export and prototype in-process cuts
type: investigate
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:r2:P2
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/perf
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
requires:
- documentserver
estimated:
  files: 2
  diff_lines: 300
  source: planner
acceptance:
  commands:
  - test -s .theseus/diagnosis/PKT-x2t-r2-warmup.md
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
resume: true
---

## Goal
With sdk-all.bin snapshots on, split the ~0.55-1.1 s fixed cost of empty docx/xlsx/pptx -> pdf (x2t-r2.md) inside the first CDoctrenderer::Execute (js_speed=1 laps, V8 inspector profile via x2t-cpuprofile.js) and prototype, on a build of the core fork, a snapshot taken after a warm-up run and V8 flag changes; record per-option gain (median of 5, direct timing) and corpus equality in .theseus/diagnosis/PKT-x2t-r2-warmup.md, and say which option P3 should implement.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P2`).
external/core is a writable fork (BR-Office/br-office-core); build with .theseus/oracle/differential/x2t-build.sh (cached by tree). Snapshot code in DesktopEditor/doctrenderer/doctrenderer.cpp (createJSSnapshots, sdk-all.bin load). PKT-0065 found snapshots gain only ~0.1 s.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.23.2, work kept

## Spawned packets

## Review

## Lessons for the Atlas
