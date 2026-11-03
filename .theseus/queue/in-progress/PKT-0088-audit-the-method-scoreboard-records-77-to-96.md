---
id: PKT-0088
title: Audit the method (scoreboard records 77 to 96)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:96
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
  - test -s .theseus/audits/AUD-4.md
  - grep -qi "not to change" .theseus/audits/AUD-4.md
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Audit the method over scoreboard records 77 to 96, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-4.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 96 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- Computed indicators over records 77-96 (20 records, 18 packets) with one script; wrote AUD-4, TEP-0009, TEP-0010.
- Decision: no verdict on TEP-0006/0007/0008: all 20 records are tool <=0.18.0 and method_version 0.1.0; 0.3.0 ships with tool 0.19. TEP-0001..0004 judged on this period since the tool carried them from 0.16.
- Surprise: one `<samples-dir>` placeholder (PKT-0080) cascaded into 4 blocked records ($4.36); TEP-0007's lint only matches `[UPPERCASE]`.
- Surprise: approved_first_review is true on records with factory R6/R2 rejections (PKT-0068, 0069, 0075, 0066).
- Not done: out_of_context_reads and acceptance run time are not recorded, so those indicators stay empty. No spawn requests needed.

## Spawned packets

## Review

## Lessons for the Atlas
