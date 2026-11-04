---
id: PKT-0145
title: Trace why some remote typing changes fall back to a full-document recalc in sdkjs word
type: investigate
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0109

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [sdkjs-word]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - "No change to sdkjs behaviour (investigation; prototypes only in the fork branch)"
  forbidden: []

acceptance:
  commands:
    - "node --check .theseus/oracle/perf/word-repaint.js"
    - "grep -q \"full-document recalc\" .theseus/oracle/baseline.md"

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
Trace why some remote typing changes fall back to a full-document recalc in sdkjs word.

## Essential context
PKT-0109 measured that 4-5 of 40 remote typing events on B (large-100p.docx, A types markers at the document start) leave
the fast path (`RecalculateByChanges → private_RecalculateFastParagraph`) and go `RecalculateWithParams` → timer loop
`ContinueRecalculationLoop → Recalculate_Page` from page 0 to 85, 260-420 ms each: the whole remote recalc mean.
Find which changes in those batches make the fast path refuse (wrap `private_RecalculateFastParagraph`/`FastRunRange`
in `.theseus/oracle/perf/word-repaint.js`, dump the batch classes), and the expected gain of keeping them on the fast path.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
