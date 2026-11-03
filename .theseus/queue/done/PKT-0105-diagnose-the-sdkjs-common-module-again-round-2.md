---
id: PKT-0105
title: Diagnose the sdkjs-common module again (round 2)
type: investigate
role: diagnostician
priority: high
module: sdkjs-common
origin:
  type: plan
  ref: diagnosis:sdkjs-common:dcb03039:r2
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-sdkjs-common.md
  - .theseus/diagnosis/DIAG-sdkjs-common-b.md
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/rounds
context:
  cards:
  - sdkjs-common
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
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-sdkjs-common.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-sdkjs-common.md'
  - 'grep -q "^round: 2" .theseus/diagnosis/DIAG-sdkjs-common.md'
  - test -s .theseus/oracle/rounds/sdkjs-common-r2.md
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Round 2 of the `sdkjs-common` module. Read `.theseus/diagnosis/DIAG-sdkjs-common.md` (round 1) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/sdkjs-common-r2.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-sdkjs-common.md` with the round 2 diagnosis, `round: 2` in its header, following `.theseus/prompts/diagnostician.md`: the verdict for the goal now, what round 1 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-sdkjs-common-b.md` exists from round 1, delete it with `git rm`. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 1 plan of `sdkjs-common` has run. Packets of round 2 get keys `plan:sdkjs-common:dcb03039:r2:<row>`.

## Suggested plan

## Executor log
- Measured: unit oracle 7/7, 10341/10341; differential sdkjs-common PASS (3 cases), run twice; timings in .theseus/oracle/rounds/sdkjs-common-r2.md.
- Decision: verdict **keep** (was refactor). Round 1 refactors (PKT-0078, 0084, 0085) are correct but no end-to-end gain is visible: differential timings swing 20-40 % between runs of the same build and change sign; round 1's own downgrade condition (no group > 50 ms) is met.
- Decision: did not re-run profile-client.js: it attributes the installed bundles, which lack the fork changes, so it cannot compare original vs new.
- Surprise: PKT-0085's gain was never measured; PKT-0080 is still blocked (its candidate landed via PKT-0084).
- No DIAG-sdkjs-common-b.md existed, nothing to git rm. No follow-ups spawned (keep = no packets); the remaining xlsx shaping cost belongs to sdkjs-cell.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: keep verdict backed by evidence; no source changes, all required diagnosis fields present

## Lessons for the Atlas
