---
id: PKT-0052
title: Audit the method (scoreboard records 23 to 49)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:49
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
  - test -s .theseus/audits/AUD-2.md
  - grep -qi "not to change" .theseus/audits/AUD-2.md
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Audit the method over scoreboard records 23 to 49, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-2.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 49 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
