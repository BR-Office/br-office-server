---
id: PKT-0149
title: Diagnose the sdkjs-word module again (round 3)
type: investigate
role: diagnostician
priority: high
module: sdkjs-word
origin:
  type: plan
  ref: diagnosis:sdkjs-word:dcb03039:r3
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-sdkjs-word.md
  - .theseus/diagnosis/DIAG-sdkjs-word-b.md
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/rounds
context:
  cards:
  - sdkjs-word
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
  - .theseus/journeys
contract:
  preserve:
  - No source code changes
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-sdkjs-word.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-sdkjs-word.md'
  - 'grep -q "^round: 3" .theseus/diagnosis/DIAG-sdkjs-word.md'
  - test -s .theseus/oracle/rounds/sdkjs-word-r3.md
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
Round 3 of the `sdkjs-word` module. Read `.theseus/diagnosis/DIAG-sdkjs-word.md` (round 2) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/sdkjs-word-r3.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-sdkjs-word.md` with the round 3 diagnosis, `round: 3` in its header, following `.theseus/prompts/diagnostician.md`, with the plan under `## Initial packet plan`: the verdict for the goal now, what round 2 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-sdkjs-word-b.md` exists from round 2, delete it with `git rm`. List your model id in `diagnosed_by`. Cover the journeys: every stage of `.theseus/journeys/*.md` (round 3) whose `module` is `sdkjs-word` is listed in your header, in `covers: [<stage id>, ...]` when your plan works on it, or in `not_covered: [{stage: <id>, reason: <why>}]`; nothing is skipped. Order your plan by the time each stage costs the user.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 2 plan of `sdkjs-word` has run. Packets of round 3 get keys `plan:sdkjs-word:dcb03039:r3:<row>`.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
