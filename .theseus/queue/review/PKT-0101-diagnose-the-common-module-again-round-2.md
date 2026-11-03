---
id: PKT-0101
title: Diagnose the common module again (round 2)
type: investigate
role: diagnostician
priority: high
module: common
origin:
  type: plan
  ref: diagnosis:common:dcb03039:r2
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-common.md
  - .theseus/diagnosis/DIAG-common-b.md
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/rounds
context:
  cards:
  - common
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
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-common.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-common.md'
  - 'grep -q "^round: 2" .theseus/diagnosis/DIAG-common.md'
  - test -s .theseus/oracle/rounds/common-r2.md
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
Round 2 of the `common` module. Read `.theseus/diagnosis/DIAG-common.md` (round 1) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/common-r2.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-common.md` with the round 2 diagnosis, `round: 2` in its header, following `.theseus/prompts/diagnostician.md`: the verdict for the goal now, what round 1 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-common-b.md` exists from round 1, delete it with `git rm`. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 1 plan of `common` has run. Packets of round 2 get keys `plan:common:dcb03039:r2:<row>`.

## Suggested plan

## Executor log
- Decision: verdict stays **keep**, now unconditional (`conditional_on: null`, confidence high). PKT-0026 met the round 1 condition (Common 3–4 % self, 15–25 % inclusive of DocService CPU, ≈ 1 % of wall).
- Decision: differential oracle is trivially equal: `git log 5ad1b11..HEAD -- Common/` is empty. Ran the unit oracle, `bench-hotpaths.js` and `load-coedit.js 50 5 60 2` instead; did not re-profile Common's share (no code changed). Numbers in `.theseus/oracle/rounds/common-r2.md`.
- Decision: round 2 plan is empty (`packets: []`).
- Surprise: `mailService.tests.js` fails with `ENOTFOUND api.nodemailer.com` (needs internet DNS); environmental. log4js still at DEBUG on the VM (docservice 0.19 core under load); left as is.
- `DIAG-common-b.md` did not exist, nothing to `git rm`. No follow-up spawned.

## Spawned packets

## Review

## Lessons for the Atlas
