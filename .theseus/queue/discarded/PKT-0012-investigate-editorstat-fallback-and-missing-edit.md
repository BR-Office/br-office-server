---
id: PKT-0012
title: Investigate EditorStat fallback and missing editorDataRedis.js
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:P4
depends_on: []
target:
  files: []
  create_in:
  - .theseus/investigations
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
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
Decide whether DocsCoServer.js:154 (new editorDataStorage() used as EditorStat fallback) is a bug or relied upon, and whether the DocService package.json pkg.scripts entry ./sources/editorDataRedis.js is dead; propose follow-up packets.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P4`).
Card pitfalls in .theseus/atlas/docservice.md; check upstream Euro-Office/server and ONLYOFFICE history.

## Suggested plan

## Executor log
- discard: superseded: its plan answered other goals

## Spawned packets

## Review

## Lessons for the Atlas
