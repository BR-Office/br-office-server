---
id: PKT-0147
title: Cut the first-Execute warm-up of x2t PDF export in doctrenderer
type: refactor
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:r2:P3
depends_on:
- PKT-0041
- PKT-0042
target:
  files:
  - external/core/DesktopEditor/doctrenderer/doctrenderer.cpp
  create_in:
  - external/core/DesktopEditor/doctrenderer
  - .theseus/diagnosis
  - tests/unit
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
- browser
estimated:
  files: 3
  diff_lines: 250
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/differential/x2t.sh
  - theseus validate
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
Implement in the core fork the option P2 chose, so that empty-template -> pdf drops by at least 0.3 s (direct timing of x2t.sh, new vs original) with every other check of the differential oracle equal; record numbers in .theseus/diagnosis.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P3`).
If P2 finds no in-process option worth >= 0.2 s, stop and record that a persistent converter (FileConverter contract change) is the remaining lever, for a new diagnosis.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
