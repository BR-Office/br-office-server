---
id: SPAWN
title: "Incremental font collection: treat CTableId (new object) changes so remote typing takes the incremental path"
type: refactor
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0071

depends_on: [PKT-0066]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/word/Editor/CollaborativeEditing.js
    - external/sdkjs/word/Editor/Document.js
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
  executor: null
  reviewer: null
---

## Goal
Incremental font collection: treat CTableId (new object) changes so remote typing takes the incremental path.

## Essential context
PKT-0071 measured PKT-0066 (fork branch pkt/PKT-0066, b152f87) and found it never takes the incremental path for remote typing:
every incoming batch on B holds a `CTableId` change (registration of the new ParaRun) next to the `ParaRun` change, so
`CDocument.GetFontNamesFromClasses` returns null and `pre_Save` falls back to `CheckFontNeeds` (full walk), 30/30 batches.
Fix: in `private_CollectFontCheckClasses` (or `GetFontNamesFromClasses`) skip `CTableId` classes, or replace them by the
object they register (change.Class is g_oTableId; the added object is in the change data), keeping `null` → full walk
for anything else unknown. Also check that `Paragraph` is accepted (instanceof CDocumentContentElementBase).
Then re-measure with the A/B recipe in baseline.md section "PKT-0066 A/B (PKT-0071)": expected gain ≈ 140 ms self per 30
remote changes on the 100 p docx (≈ 4.7 ms per change, ≈ 6 % of B's busy time).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
