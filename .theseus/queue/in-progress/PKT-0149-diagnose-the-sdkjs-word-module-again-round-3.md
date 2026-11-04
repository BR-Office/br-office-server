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
  executor: claude-opus-5-5
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
- 2026-11-04 (claude-opus-5-5): read DIAG round 2, PKT-0109/0110 logs, pending PKT-0133/0144/0145 and the round 3 journeys.
  Ran the four oracles sequentially (all pass: 42/42, 7/7, differential word 3 cases, common 3 cases) and
  `word-repaint.js large-100p.docx external/sdkjs 1`; numbers in `.theseus/oracle/rounds/sdkjs-word-r3.md`.
- Decision: verdict stays **refactor**, refocused on open. The journey maps put 471-1 250 ms per open in this module
  (layout-finish-paint 27 % of open-docx-100p) vs 3-16 ms per key/change; one plan row (P1: split the post-load layout window).
- Decision: typing/co-edit stages (paint, b-paint, b-apply) are `not_covered` because their levers are already pending
  packets (PKT-0144, PKT-0145) from PKT-0109; re-planning them would duplicate. client-open-word is covered but its split
  is left to PKT-0133 (pending); P1 does not duplicate it.
- Surprise: the fork has not moved since round 2 (0f61ccc): round 2 delivered no sdkjs change, so no speed gain.
- Surprise: differential large.docx timing showed new 40 % faster on open/reopen; same code except the font fix, so it is
  run order/cache noise (PKT-0110 measured 485-698 ms spread on one build). Recorded as noise.
- Nothing prototyped in external/sdkjs. DIAG-sdkjs-word-b.md did not exist, nothing to git rm.

## Spawned packets

## Review

## Lessons for the Atlas
