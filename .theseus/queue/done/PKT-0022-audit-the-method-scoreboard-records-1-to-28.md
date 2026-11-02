---
id: PKT-0022
title: "Audit the method (scoreboard records 1 to 28)"
type: investigate
role: auditor
priority: high
module: method

origin:
  type: plan
  ref: "audit:28"

depends_on: []

target:
  files: []
  create_in: [.theseus/audits, .theseus/proposals]

context:
  cards: []
  references:
    - .theseus/spec/method-measurement.md
    - .theseus/scoreboard/packets.jsonl
    - .theseus/scoreboard/friction.jsonl
    - .theseus/scoreboard/runs/

contract:
  preserve:
    - "No change outside .theseus/audits and .theseus/proposals, except spawn requests"
  forbidden: []

acceptance:
  commands:
    - "test -s .theseus/audits/AUD-1.md"

budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Audit the method over scoreboard records 1 to 28, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-1.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 28 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: sed -n '/^## 4/,/^## 5/p;/^## 6/,$p' .theseus/spec/method-measurement.md | head -150; cat .theseus/METHOD-CHANGELOG.md |…; Bash: python3 -I - <<'E'; Bash: cd .theseus/proposals && cat > TEP-0001.md <<'E'

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: audit and proposals complete, numbers verified against packets.jsonl, scope and budget respected

## Lessons for the Atlas
