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
- claude-opus-5-5, 2026-11-03. Reused PKT-0071's scratch harness (ab.js/an.js, still in its scratchpad) and its *before* build;
  added a per-batch log of `TakeFontCheckClasses` and of `GetFontNamesFromClasses(...) !== null`.
- Decision: PKT-0087 is not in this sdkjs branch (3d51031); its commit e5fd187 (fork pkt/PKT-0087) was applied to the tree only for
  `npm run build:word` and reverted right after (`git status` clean) — contract "No sdkjs source changes" kept.
- Surprise: webpack's persistent cache (`build/.webpack-cache`) made the second build byte-identical to the first in 1.6 s; cleared it
  and rebuilt. Recorded in baseline.md.
- Result: 0/131 batches incremental (expected 30/30), gain ≈ 0 (expected ≈ 140 ms). Recorded under the PKT-0089 heading (mentions PKT-0087).
- Surprise (cause): the CTableId change in each batch is `CChangesTableIdDescription` (Type 131071), not `TableId_Add` (65537):
  PKT-0071's diagnosis named the wrong change type, so PKT-0087 fixed a path remote typing never uses.
- Spawned a follow-up to skip TableId_Description changes (.theseus/spawn/).
- Text case only; style case not re-run (PKT-0087 does not touch it). Absolute numbers higher than PKT-0071's (busier VM).

## Spawned packets
- PKT-0091: Incremental font collection: skip CTableId Description changes so remote typing takes the incremental path

## Review

## Lessons for the Atlas
