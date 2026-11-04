---
id: PKT-0144
title: Skip the all-pages lock redraw in Send_Changes when no lock changed (sdkjs word)
type: refactor
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0109

depends_on: []

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
    - "Other users' locks are still drawn and cleared when a lock is added or released"
    - "Existing sdkjs word and common oracles keep passing"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-word.sh"
    - "bash .theseus/oracle/differential/sdkjs-word.sh"
    - "node .theseus/oracle/perf/word-repaint.js /var/lib/euro-office/documentserver-example/files/127.0.0.1/large-100p.docx external/sdkjs 1"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
requires: [documentserver, browser]
---

## Goal
Skip the all-pages lock redraw in Send_Changes when no lock changed (sdkjs word).

## Essential context
PKT-0109 (baseline.md, "repaint scope per keystroke") found that `CWordCollaborativeEditing.Send_Changes` calls
`DrawingDocument.ClearCachePages(); FirePaint()` whenever `m_nUseType !== 1` (always while co-editing), even when no lock
was added or released. Every local keystroke thus re-rasterises the visible page twice. Skipping that clear (harness
`NOCLEAR=1`, an upper bound) took local re-raster 1.8 → 1 page and OnPaint 30 → 18 ms per keystroke on large-100p.docx.
Goal: invalidate only when the lock set actually changed (or only the pages holding changed locks); re-measure with
`.theseus/oracle/perf/word-repaint.js` (expect `ClearCachePages` 0 per keystroke, re-raster ≈ 1).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
