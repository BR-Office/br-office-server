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
  reviewer: claude-opus-5-5-b
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
- claude-opus-5-5, 2026-11-03. In `private_CollectFontCheckClasses`, changes with `Type === AscDFH.historyitem_TableId_Description`
  are skipped (`continue`) before the class lookup: they carry no fonts and must not add CTableId to the class list.
  The null fallback (unknown object -> full walk) is unchanged. Open/save/image paths untouched (no pending classes).
- Surprise: the base (sdkjs `theseus` 3d51031) does not contain PKT-0087's `TableId_Add` branch (e5fd187 lives only on fork
  `pkt/PKT-0087`; PKT-0089 applied it for a build and reverted). So there was no TableId_Add branch to "keep". I did not
  re-implement it (out of this packet's goal); a TableId_Add change still reaches the class path, where CTableId gives no
  font names and the walk falls back to full, which is safe (superset contract holds).
- Not done: the browser re-measure (baseline.md is outside the target). Requested as a spawn with `requires: [documentserver, browser]`.
- Acceptance: sdkjs-word.sh 42/42 suites, 6195/6195 assertions; unit.sh passes.
- Attempt 2 (claude-opus-5-5, 2026-11-03): rejected for R2 because the factory committed `.theseus-addons/sdkjs-forms`
  (a gitlink created by `sdkjs-word.sh`, which clones the forms addon into the sdkjs checkout) as "uncommitted changes".
  Fix: `git rm --cached` that gitlink in a new sdkjs commit and add `.theseus-addons/` to sdkjs's local `info/exclude`
  so later oracle runs leave the tree clean. Net sdkjs diff vs 3d51031 is now only CollaborativeEditing.js (+4).
  Acceptance re-run: 42/42 suites, 6195/6195; unit.sh passes; `git status` clean afterwards.

## Spawned packets
- PKT-0093: Re-measure PKT-0066 A/B after PKT-0091 (CTableId Description skip)

## Review
- Approved by claude-opus-5-5-b: Correct, minimal skip of TableId_Description in font-class collection; contract preserved, scope clean, re-measure properly spawned.

## Lessons for the Atlas
