---
id: PKT-0136
title: Audit the method (scoreboard records 119 to 139)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:139
depends_on: []
target:
  files: []
  create_in:
  - .theseus/audits
  - .theseus/proposals
context:
  cards: []
  references:
  - .theseus/spec/method-measurement.md
  - .theseus/scoreboard/packets.jsonl
  - .theseus/scoreboard/friction.jsonl
  - .theseus/scoreboard/runs/
contract:
  preserve:
  - No change outside .theseus/audits and .theseus/proposals, except spawn requests
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/audits/AUD-6.md
  - grep -qi "not to change" .theseus/audits/AUD-6.md
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Audit the method over scoreboard records 119 to 139, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-6.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 139 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-04. Report in `.theseus/audits/AUD-6.md`; proposals TEP-0014 (numeric bars need protocol + reachable target) and TEP-0015 (pre-claim discards excluded from audit count).
- Decision: records 119–139 = PKT-0100…0127; 8 of 21 are human discards never run, so the analysis uses 13 run records and keeps most items as observations (<20 rule).
- Decision: counted PKT-0127 as not approved first time despite `approved_first_review: true` (R6 rejection present).
- Surprise: blocked PKT-0108/0111/0112 have no friction lines; `.theseus/scoreboard/journeys.jsonl` named by TEP-0013 does not exist.
- Not done: no spawn requests; project gaps (O4) are already in friction lines planners read.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: The audit is complete and backed by evidence, its proposals are well-formed, and it stays within scope.

## Lessons for the Atlas
