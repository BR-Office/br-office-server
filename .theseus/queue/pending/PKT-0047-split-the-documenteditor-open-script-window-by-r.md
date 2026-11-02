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
  executor: null
  reviewer: null
---

## Goal
On the native package with the PKT-0016 docx samples, record per-resource timings and a CDP CPU profile from goto to asc_LoadDocument and to Editor.bin request. Attribute time to sdk-all (sdkjs), the documenteditor app bundle, apps/common, locale, CSS and fonts, and to controller launch (Main/Toolbar/Viewport onLaunch). Add the table to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P1`).
baseline.md PKT-0016 shows ~1.5 s and ~500 KB of scripts before the document loads, not split. main/app.js loads ~30 controllers eagerly. This decides whether any refactor here is worth doing.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
