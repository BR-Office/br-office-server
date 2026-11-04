---
id: PKT-0158
title: Audit the method (scoreboard records 140 to 164)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:164
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
  - test -s .theseus/audits/AUD-7.md
  - grep -qi "not to change" .theseus/audits/AUD-7.md
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
Audit the method over scoreboard records 140 to 164, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-7.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 164 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- Sample = scoreboard lines 140–164 (25 records, 23 packets, all method 0.6.0). Computed indicators with a script over packets.jsonl; friction matched by packet id.
- Decision: counted first-review approval two ways (recorded 81%, true 67%) because 0109/0137/0149 carry gate rejections with `approved_first_review: true`.
- Decision: blocked cost reported as an upper bound (≤ $5.43): PKT-0132 block-record costs look cumulative.
- Surprise: `theseus packet new --help` lists only 7 types (no chore/measure) though `--type chore` works — same as PKT-0115 friction.
- Surprise: PKT-0133 record says attempts 1 while block text says 3 attempts.
- Proposals TEP-0016 (truthful scoreboard fields), TEP-0017 (differential names checks and reruns). Two spawn requests (shared journey runner; external/ mirrors in environment.md).
- Same-family audit (claude-opus-5-5) — could not satisfy "different family" preference.

## Spawned packets
- spawn: Shared journey runner helper
- spawn: Document the external/ mirrors in environment.md

## Review

## Lessons for the Atlas
