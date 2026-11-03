---
id: PKT-0100
title: Audit the method (scoreboard records 97 to 118)
type: investigate
role: auditor
priority: high
module: method
origin:
  type: plan
  ref: audit:118
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
  - test -s .theseus/audits/AUD-5.md
  - grep -qi "not to change" .theseus/audits/AUD-5.md
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
Audit the method over scoreboard records 97 to 118, following `.theseus/prompts/auditor.md`. Write the report to `.theseus/audits/AUD-5.md` and any proposals to `.theseus/proposals/TEP-<n>.md`.

## Essential context
- Planned by `theseus plan`: `audit.every_n_packets` is 20 and the scoreboard has 118 records.
- Packets: `.theseus/scoreboard/packets.jsonl`. Friction: `.theseus/scoreboard/friction.jsonl`. Queue and packet logs: `.theseus/queue/`.
- The agents' run folders (prompt, final report, acceptance log of every attempt) are in `.theseus/scoreboard/runs/`.
- Work the audit finds missing in the project (not in the method) is requested with `theseus packet new`, as any out-of-scope work.

## Suggested plan

## Executor log
- Decisions: sample = packets.jsonl lines 97-118 (22 records). Counted the factory R2 rejections apart from reviewer verdicts, since `approved_first_review` ignores them. Marked TEP-0002 for refutation for non-use (third audit at 0 records), as AUD-4 asked. Split TEP-0006, 0009, 0010 verdicts into halves because the halves came out differently. Treated the R2/fork-clone problem as an observation (7 records, under 20) and turned it into TEP-0011; TEP-0012 for missing packet types.
- Surprises: TEP-0010's preservation auto-commit itself produced most of the new R2 rejections (.theseus-addons gitlink). The "stop on repeated failure" rule from TEP-0009 does not cover gate rejections: 4 packets still burned 3 identical attempts.
- Could not do: no computation of out_of_context_reads or estimate deviation (fields null/budget). Auditor is same family as executors (no other family available). No spawn request filed: O4 (harness in create_in) is planner guidance, O2 was already filed as PKT-0099 and discarded as factory work, now covered by TEP-0011.

## Spawned packets

## Review

## Lessons for the Atlas
- Nested clones (external/sdkjs) need their own scope base and ignore list; most blocked cost of this period came from that, not from the code.
