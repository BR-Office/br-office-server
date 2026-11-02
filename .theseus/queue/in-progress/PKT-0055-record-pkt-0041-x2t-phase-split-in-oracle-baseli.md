---
id: PKT-0055
title: Record PKT-0041 x2t phase split in oracle baseline.md
type: characterize
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0041

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in: []

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-0041-x2t-pdf-split.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands:
    - "[ORACLE COMMAND]"

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
Add a section "x2t phase split (PKT-0041)" to `.theseus/oracle/baseline.md` with the table and the "which part dominates" conclusion from `.theseus/diagnosis/PKT-0041-x2t-pdf-split.md`, and update the Gaps row about x2t. PKT-0041 could not do it: baseline.md was outside its target (target.files empty, create_in only perf/ and diagnosis/).

## Essential context

## Suggested plan

## Executor log
- attempt 1: acceptance failed: `[ORACLE COMMAND]`
- attempt 2: acceptance failed: `[ORACLE COMMAND]`
- attempt 3: acceptance failed: `[ORACLE COMMAND]`
- Added "x2t phase split (PKT-0041, ...)" to baseline.md, inside "End-to-end server", after the PKT-0018 large-files block (where the other raw x2t numbers live). Table copied verbatim from the diagnosis; conclusion condensed to 4 bullets.
- Gaps row "x2t conversion time per format" updated: phase split now done; remaining gap is applying a real change set on save (diagnosis notes `doc_changes` was empty).
- Surprise: the acceptance command is the literal placeholder `[ORACLE COMMAND]`, not runnable. Nothing was run as acceptance; checked by `git diff` that only baseline.md changed (plus this log and friction). Reviewer should treat acceptance as unverified.
- Attempt 2 (after rejection for `sh: 1: [ORACLE: not found`): the failure is in the packet, not the work. Re-ran it: exit 127. An executor cannot fix it (acceptance is not in target.files and must not be edited). Requested a follow-up in .theseus/spawn/ to replace it with a runnable check (`grep -q 'x2t phase split (PKT-0041' .theseus/oracle/baseline.md`, which passes). baseline.md content unchanged in this attempt.
- Attempt 3: same rejection, same cause (placeholder acceptance, exit 127). No content change; existing spawn request stands. Factory must fix the packet's acceptance (or stop retrying) — re-executing cannot make it pass.

## Spawned packets
- PKT-0062: Give PKT-0055 a runnable acceptance instead of [ORACLE COMMAND]

## Review

## Lessons for the Atlas
