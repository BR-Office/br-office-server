---
id: PKT-0102
title: Diagnose the docservice module again (round 2)
type: investigate
role: diagnostician
priority: high
module: docservice
origin:
  type: plan
  ref: diagnosis:docservice:dcb03039:r2
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
  - 'grep -q "^round: 2" .theseus/diagnosis/DIAG-docservice.md'
  - test -s .theseus/oracle/rounds/docservice-r2.md
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
Round 2 of the `docservice` module. Read `.theseus/diagnosis/DIAG-docservice.md` (round 1) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/docservice-r2.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-docservice.md` with the round 2 diagnosis, `round: 2` in its header, following `.theseus/prompts/diagnostician.md`: the verdict for the goal now, what round 1 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-docservice-b.md` exists from round 1, delete it with `git rm`. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 1 plan of `docservice` has run. Packets of round 2 get keys `plan:docservice:dcb03039:r2:<row>`.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-03. Differential by hand: installed DocService (:80, original code) vs worktree `sources/server.js` on :8099 (NODE_CONFIG port override, same DB/RabbitMQ/x2t), `SYNC=1 e2e-convert.js 5 1`. Sync convert p50 gain 0.44-1.56 s on all 7 pairs, 0 errors. Numbers in `.theseus/oracle/rounds/docservice-r2.md`. Unit oracle 178 passed / 1 skipped.
- Decision: verdict stays **refactor**. Round 1 delivered the convert gain (PKT-0068) and PKT-0070 guards; not delivered: editorStat fallback (PKT-0064 blocked, never merged; DocsCoServer.js:155 unchanged), upstream 81132/81576 ports (assessment only).
- Round 2 plan: P1 editorStat fix, P2 port 81132, P3 test plan for 81576, P4 DB-load of backoff polling. Used `type: investigate` for P4 (no `measure` type in the queue).
- Surprise: there is no DocService differential oracle script (others have `.theseus/oracle/differential/*.sh`); the r2 file documents the manual recipe. Not requested as a packet; P4 reuses the recipe.
- No DIAG-docservice-b.md existed, nothing to `git rm`. Not done: co-edit differential (round 1 changed no hot path).

## Spawned packets

## Review

## Lessons for the Atlas
