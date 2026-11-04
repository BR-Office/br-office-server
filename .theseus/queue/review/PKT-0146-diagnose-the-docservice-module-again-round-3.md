---
id: PKT-0146
title: Diagnose the docservice module again (round 3)
type: investigate
role: diagnostician
priority: high
module: docservice
origin:
  type: plan
  ref: diagnosis:docservice:dcb03039:r3
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-docservice.md
  - .theseus/diagnosis/DIAG-docservice-b.md
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/rounds
context:
  cards:
  - docservice
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
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-docservice.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-docservice.md'
  - 'grep -q "^round: 3" .theseus/diagnosis/DIAG-docservice.md'
  - test -s .theseus/oracle/rounds/docservice-r3.md
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
Round 3 of the `docservice` module. Read `.theseus/diagnosis/DIAG-docservice.md` (round 2) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/docservice-r3.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-docservice.md` with the round 3 diagnosis, `round: 3` in its header, following `.theseus/prompts/diagnostician.md`, with the plan under `## Initial packet plan`: the verdict for the goal now, what round 2 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-docservice-b.md` exists from round 2, delete it with `git rm`. List your model id in `diagnosed_by`. Cover the journeys: every stage of `.theseus/journeys/*.md` (round 3) whose `module` is `docservice` is listed in your header, in `covers: [<stage id>, ...]` when your plan works on it, or in `not_covered: [{stage: <id>, reason: <why>}]`; nothing is skipped. Order your plan by the time each stage costs the user.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 2 plan of `docservice` has run. Packets of round 3 get keys `plan:docservice:dcb03039:r3:<row>`.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-04. Ran the r2 differential again (installed DocService :80 vs worktree source on :8099, `SYNC=1 e2e-convert.js 5 1`, order new/original/new). Numbers in `.theseus/oracle/rounds/docservice-r3.md`.
- **Surprise:** the round-1 backoff (50 ms doubling to 1000 ms) is a regression for conversions ending at 0.75-1.0 s: pptx->pdf 1006 ms original vs 1572/1610 ms new; xlsx->pdf flips between 775 and 1565. Round 2 read its 1569 ms pptx->pdf as a gain only because the original's runs were cold. Plan row P2 caps the delay at 200 ms.
- Decision: verdict stays refactor (JS). save-delay (5 s, 85 % of save) left to pending PKT-0140, not duplicated; PKT-0115/0116 (round 2 rows) are still pending and are not re-planned.
- Decision: covers lists only server-open-docservice (P1 splits the 538 ms of open-docx-10p); the other docservice stages are in not_covered with reasons. Stage ids repeat across journeys (queue, result); validate accepted plain ids.
- DIAG-docservice-b.md did not exist: nothing to git rm.
- unit.sh: 186 passed / 1 skipped twice, one run with 1 flaky failure (not reproduced).
- Acceptance: all five commands pass.

## Spawned packets

## Review

## Lessons for the Atlas
