---
id: PKT-0020
title: Audit the method (scoreboard records 1 to 22)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:22
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
  - test -s .theseus/audits/AUD-1.md
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
Audit the method over scoreboard records 1 to 22, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-1.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 22 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cd .theseus; sed -n '/## 4/,/## 7/p' spec/method-measurement.md; cat METHOD-CHANGELOG.md | head -40; ls proposals; cat s…; Bash: sed -n '/^## 4/,/^## 7/p' .theseus/spec/method-measurement.md; Bash: f=.theseus/audits/AUD-1.md

## Spawned packets

## Review

## Lessons for the Atlas
