---
id: PKT-0104
title: Diagnose the sdkjs-word module again (round 2)
type: investigate
role: diagnostician
priority: high
module: sdkjs-word
origin:
  type: plan
  ref: diagnosis:sdkjs-word:dcb03039:r2
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
  - 'grep -q "^round: 2" .theseus/diagnosis/DIAG-sdkjs-word.md'
  - test -s .theseus/oracle/rounds/sdkjs-word-r2.md
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
Round 2 of the `sdkjs-word` module. Read `.theseus/diagnosis/DIAG-sdkjs-word.md` (round 1) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/sdkjs-word-r2.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-sdkjs-word.md` with the round 2 diagnosis, `round: 2` in its header, following `.theseus/prompts/diagnostician.md`: the verdict for the goal now, what round 1 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-sdkjs-word-b.md` exists from round 1, delete it with `git rm`. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 1 plan of `sdkjs-word` has run. Packets of round 2 get keys `plan:sdkjs-word:dcb03039:r2:<row>`.

## Suggested plan

## Executor log
- 2026-11-03 claude-opus-5-5. Ran all four oracles on the fork build (0f61ccc): QUnit word 42/42, common 7/7, differential word PASS (2 cases), common PASS (3); ran `perf/client-perf.js 3 http://127.0.0.1/example/` on the installed bundle. Numbers in `.theseus/oracle/rounds/sdkjs-word-r2.md`.
- Decision: verdict stays refactor, confidence low → medium (hotspot now located). Only PKT-0091 delivered (≈ −7 % B busy, PKT-0093); PKT-0066 and PKT-0087 were correct but gained 0 and are counted as not delivered.
- Decision: round 2 wave 0 = measure repaint scope (P1) + a large-doc remote typing case in the differential oracle (P2); wave 1 refactors not guessed before P1.
- Surprise: the differential timing lines are noise (±2–3 s) and its small inputs never exercise remote apply, so the oracle cannot show round 1's gain; `client-perf.js` measures the installed (original) bundle only.
- Surprise: `/usr/bin/time` is not installed on the VM (first oracle loop produced nothing).
- DIAG-sdkjs-word-b.md did not exist; nothing to `git rm`.

## Spawned packets

## Review

## Lessons for the Atlas
