---
id: PKT-0103
title: Diagnose the x2t module again (round 2)
type: investigate
role: diagnostician
priority: high
module: x2t
origin:
  type: plan
  ref: diagnosis:x2t:dcb03039:r2
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-x2t.md
  - .theseus/diagnosis/DIAG-x2t-b.md
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/rounds
context:
  cards:
  - x2t
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
contract:
  preserve:
  - No source code changes
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-x2t.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-x2t.md'
  - 'grep -q "^round: 2" .theseus/diagnosis/DIAG-x2t.md'
  - test -s .theseus/oracle/rounds/x2t-r2.md
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Round 2 of the `x2t` module. Read `.theseus/diagnosis/DIAG-x2t.md` (round 1) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/x2t-r2.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-x2t.md` with the round 2 diagnosis, `round: 2` in its header, following `.theseus/prompts/diagnostician.md`: the verdict for the goal now, what round 1 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-x2t-b.md` exists from round 1, delete it with `git rm`. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 1 plan of `x2t` has run. Packets of round 2 get keys `plan:x2t:dcb03039:r2:<row>`.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
