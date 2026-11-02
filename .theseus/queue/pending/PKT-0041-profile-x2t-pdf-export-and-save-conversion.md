---
id: PKT-0041
title: Profile x2t PDF export and save conversion
type: investigate
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:P1
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/perf
  - .theseus/diagnosis
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Split the time of raw x2t docx/xlsx/pptx -> pdf (empty templates and the PKT-0016 samples) and of a save conversion (Editor.bin + changes -> docx) into process start, CDocBuilder/V8 initialization, sdkjs script or snapshot load, layout in CDoctrenderer::Execute, and CPdfFile writing; record numbers in baseline.md and say which part dominates.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P1`).
Baseline PKT-0015/PKT-0018 - empty docx->pdf 0.65 s raw vs 70 ms for ODF; large files 1.3-6.5 s. Path is X2tConverter/src/lib/pdf_image.h:339 doct_bin2pdf. Use perf/strace/ltrace or timestamps from the installed binary; x2t lives in /var/www/euro-office/documentserver/server/FileConverter/bin. Check whether the package ships JS snapshots/cache (x2t -create-js-snapshots).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
