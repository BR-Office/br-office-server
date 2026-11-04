---
id: PKT-0148
title: Diagnose the x2t module again (round 3)
type: investigate
role: diagnostician
priority: high
module: x2t
origin:
  type: plan
  ref: diagnosis:x2t:dcb03039:r3
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
  - .theseus/journeys
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
  - 'grep -q "^round: 3" .theseus/diagnosis/DIAG-x2t.md'
  - test -s .theseus/oracle/rounds/x2t-r3.md
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Round 3 of the `x2t` module. Read `.theseus/diagnosis/DIAG-x2t.md` (round 2) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/x2t-r3.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-x2t.md` with the round 3 diagnosis, `round: 3` in its header, following `.theseus/prompts/diagnostician.md`, with the plan under `## Initial packet plan`: the verdict for the goal now, what round 2 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-x2t-b.md` exists from round 2, delete it with `git rm`. List your model id in `diagnosed_by`. Cover the journeys: every stage of `.theseus/journeys/*.md` (round 3) whose `module` is `x2t` is listed in your header, in `covers: [<stage id>, ...]` when your plan works on it, or in `not_covered: [{stage: <id>, reason: <why>}]`; nothing is skipped. Order your plan by the time each stage costs the user.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 2 plan of `x2t` has run. Packets of round 3 get keys `plan:x2t:dcb03039:r3:<row>`.

## Suggested plan

## Executor log
- Measured: `bash .theseus/oracle/differential/x2t.sh` PASS (direct + browser, no unstable side); numbers in `.theseus/oracle/rounds/x2t-r3.md`. Journeys not re-run (exclusive); their round 3 maps are cited.
- Surprise: external/core is still identical to core.base (tree 83b890f3): round 2 changed no x2t code, so its user gain is 0 ms. PKT-0147 (round 2 P3) is still pending although its own context says stop (PKT-0108 found < 0.2 s); this diagnosis records it as superseded — the factory should discard it.
- Decision: verdict refactor toward a persistent converter keeping one warmed context; it builds on the already-queued PKT-0143 (sizing) instead of re-planning it. Plan: P1 (wave 0) split the save stage, P2 (wave 1) implement, conditional on PKT-0143 >= 0.3 s.
- Decision: `server-open-x2t` (4 open journeys) is not_covered: no V8 in docx->bin, 3-8 % of journeys, the lever does not reach it.
- No core prototype: nothing new to measure in-process after PKT-0108; the persistent prototype is PKT-0143's job. external/core unchanged.
- DIAG-x2t-b.md did not exist; nothing to git rm.

## Spawned packets

## Review

## Lessons for the Atlas
