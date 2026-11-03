---
id: PKT-0089
title: Re-measure PKT-0066 A/B after PKT-0087 (CTableId handled)
type: investigate
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0087

depends_on: [PKT-0087]
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
    - "No sdkjs source changes"
  forbidden: []

acceptance:
  commands:
    - "grep -q PKT-0087 .theseus/oracle/baseline.md"

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
Re-measure PKT-0066 A/B after PKT-0087 (CTableId handled).

## Essential context
PKT-0087 (sdkjs pkt/PKT-0087) makes private_CollectFontCheckClasses replace CTableId_Add changes by the registered object, so remote typing should now take the incremental font path. Re-run the A/B recipe in baseline.md section "PKT-0066 A/B (PKT-0071)" (100 p docx, 30 remote changes) and record in baseline.md under a PKT-0087 heading: how many batches take the incremental path (expected 30/30) and the self-time gain (expected ~140 ms / 30 changes).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
