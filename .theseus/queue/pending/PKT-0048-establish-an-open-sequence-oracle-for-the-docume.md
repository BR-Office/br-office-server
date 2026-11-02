---
id: PKT-0048
title: Establish an open-sequence oracle for the documenteditor shell
type: characterize
priority: medium
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:P2
depends_on: []
target:
  files:
  - .theseus/atlas/web-apps-documenteditor.md
  create_in:
  - .theseus/oracle
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
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
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
Run external/web-apps/test/documenteditor/main headless if possible and add a Playwright check (open docx, toolbar present, type, save callback status 2). Write a wrapper under .theseus/oracle, record pass/fail and duration, and set the card's oracle level and sources.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P2`).
The card's oracle is none; lazy-loading refactors touch the open-order invariants (sdk first, asc_LoadDocument after onEditorPermissions).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
