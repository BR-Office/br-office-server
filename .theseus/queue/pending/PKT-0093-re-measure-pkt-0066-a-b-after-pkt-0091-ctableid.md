---
id: PKT-0093
title: Re-measure PKT-0066 A/B after PKT-0091 (CTableId Description skip)
type: characterize
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0091

depends_on: [PKT-0091]
requires: [documentserver, browser]

target:
  files:
    - .theseus/oracle/baseline.md
  create_in: []

context:
  cards: [sdkjs-word]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - "Existing baseline.md sections are not rewritten; new numbers go in a new section"
  forbidden: []

acceptance:
  commands:
    - "grep -q \"after PKT-0091\" .theseus/oracle/baseline.md"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
resume: true
---

## Goal
Re-measure PKT-0066 A/B after PKT-0091 (CTableId Description skip) and record it in baseline.md as a new section
"Client: PKT-0066 A/B re-measured after PKT-0091".

## Essential context
Recipe: baseline.md "Client: PKT-0066 A/B re-measured after PKT-0087 (PKT-0089)" (native 9.3.7-1 server, self-built word
bundles via Playwright routing, large-100p.docx, A types 30 markers, CDP profiler on B, 3 runs per variant). Add a variant
built from sdkjs fork branch pkt/PKT-0091. Expected: 30/30 batches on the incremental path, ~140 ms self-time gain per 30
changes on 100 p. If batches still fall back, dump the class/Type of each change returned by TakeFontCheckClasses.
Note: PKT-0087's TableId_Add branch (e5fd187) was not in PKT-0091's base (sdkjs theseus 3d51031); say which builds include it.

## Suggested plan

## Executor log
- return: factory process stopped by the session's 2-hour limit; restarted on Theseus 0.21.3, work kept (TEP-0010)

## Spawned packets

## Review

## Lessons for the Atlas
