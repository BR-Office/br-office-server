---
id: PKT-0074
title: Audit the method (scoreboard records 50 to 76)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:76
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
  - test -s .theseus/audits/AUD-3.md
  - grep -qi "not to change" .theseus/audits/AUD-3.md
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
Audit the method over scoreboard records 50 to 76, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-3.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 76 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- Wrote AUD-3 over records 50-76 (27 records, 23 packets) and friction lines 61-79; computed indicators with a one-off script from packets.jsonl.
- Decisions: TEP-0001 recommended `confirmed` (mechanism; -46% vs -50% target); TEP-0002 lacks data; TEP-0003 not supported; TEP-0004 confirmed for done packets with a gap on blocked ones. No verdict on TEP-0005/0006 (still `proposed`).
- Target-too-narrow and placeholder packets affect fewer than 20 packets, so recorded as observations; proposed TEP-0007 and TEP-0008 from them anyway, flagged as observation-based.
- Surprises: permission denials fell from 3.3 to 0 per record with TEP-0005 unapplied; blocked packets carry no friction line; 5 discarded records.
- Not done: no spawn requests (all findings are method-level, for the human to decide); same-family audit (pilot mode).

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: Audit report and two well-formed TEPs meet the goal within contract; outcome counts check out, and the weaknesses are minor (TEP-0007 starting figure, Atlas lessons not copied into the packet)

## Lessons for the Atlas
