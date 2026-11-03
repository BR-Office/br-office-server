---
id: PKT-0112
title: Defer the Comments build until after document load
type: refactor
priority: medium
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:r2:P2
depends_on:
- PKT-0047
target:
  files:
  - external/web-apps/apps/common/main/lib/controller/Comments.js
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
  - tests/unit
context:
  cards:
  - web-apps-documenteditor
  references:
  - .theseus/diagnosis/DIAG-web-apps-documenteditor.md
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
  files: 2
  diff_lines: 200
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/documenteditor-open.sh
  - bash .theseus/oracle/differential/web-apps-documenteditor.sh
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
Move the ≈ 0.1 s of Comments onLaunch work (view/panel build) to after document load or first use, keeping comment callbacks from the sdk queued and applied. Before/after with perf/open-window.js into baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P2`).
PKT-0047 Comments 116/96 ms, ≈ 90-100 ms inside onLaunch. Comments.js is in apps/common, shared with other editors; the differential checks only documenteditor, so do not change behaviour for the others.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
