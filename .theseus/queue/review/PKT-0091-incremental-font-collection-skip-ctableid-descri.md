---
id: PKT-0091
title: "Incremental font collection: skip CTableId Description changes so remote typing takes the incremental path"
type: refactor
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0089

depends_on: [PKT-0087]

target:
  files:
    - external/sdkjs/word/Editor/CollaborativeEditing.js
  create_in: []

context:
  cards: [sdkjs-word]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - "Font set after a remote change is a superset of what the full walk collects"
    - "Open, save and image paths keep the full walk"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-word.sh"
    - "bash .theseus/oracle/unit.sh"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Incremental font collection: skip CTableId Description changes so remote typing takes the incremental path.

## Essential context
PKT-0089 measured PKT-0087 in the browser: 0 of 131 remote typing batches take the incremental path. Every batch is
`[CTableId, ParaRun]`, and the CTableId change is `CChangesTableIdDescription` (Type `historyitem_TableId_Description`,
131071: the per-point description record), not `historyitem_TableId_Add` (65537) that PKT-0087 handles. In
`private_CollectFontCheckClasses`, skip `historyitem_TableId_Description` changes (`continue`, they carry no fonts),
keep the TableId_Add branch and the null fallback. Then re-measure with baseline.md "PKT-0066 A/B re-measured after
PKT-0087 (PKT-0089)" (expected 30/30 batches incremental, ~140 ms gain per 30 changes on 100 p) — likely a separate
measure packet with `requires: [documentserver, browser]`, since baseline.md is outside this target.

## Suggested plan

## Executor log
- attempt 1: changed external/sdkjs/.theseus-addons/sdkjs-forms, outside the target (rule R2)
- fork: pkt/PKT-0091 merged into theseus of https://github.com/BR-Office/br-office-sdkjs (88df302)

## Spawned packets

## Review

## Lessons for the Atlas
