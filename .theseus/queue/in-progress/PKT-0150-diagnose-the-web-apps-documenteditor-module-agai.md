---
id: PKT-0150
title: Diagnose the web-apps-documenteditor module again (round 3)
type: investigate
role: diagnostician
priority: high
module: web-apps-documenteditor
origin:
  type: plan
  ref: diagnosis:web-apps-documenteditor:dcb03039:r3
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-web-apps-documenteditor.md
  - .theseus/diagnosis/DIAG-web-apps-documenteditor-b.md
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/rounds
context:
  cards:
  - web-apps-documenteditor
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
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-web-apps-documenteditor.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-web-apps-documenteditor.md'
  - 'grep -q "^round: 3" .theseus/diagnosis/DIAG-web-apps-documenteditor.md'
  - test -s .theseus/oracle/rounds/web-apps-documenteditor-r3.md
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
Round 3 of the `web-apps-documenteditor` module. Read `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (round 2) and what its packets delivered (the done and blocked packets of this module in `.theseus/queue/`, their logs and measurements). Measure the module now where users feel it, with its differential oracle (original against new) and the perf scripts, and record the numbers in `.theseus/oracle/rounds/web-apps-documenteditor-r3.md` (a file of its own: every module's round runs in parallel, and one shared file would conflict at every merge). Then replace `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` with the round 3 diagnosis, `round: 3` in its header, following `.theseus/prompts/diagnostician.md`, with the plan under `## Initial packet plan`: the verdict for the goal now, what round 2 proved and what it did not (changes that were correct but gained nothing count as not delivered), and the machine-readable plan of the next round. If `.theseus/diagnosis/DIAG-web-apps-documenteditor-b.md` exists from round 2, delete it with `git rm`. List your model id in `diagnosed_by`. Cover the journeys: every stage of `.theseus/journeys/*.md` (round 3) whose `module` is `web-apps-documenteditor` is listed in your header, in `covers: [<stage id>, ...]` when your plan works on it, or in `not_covered: [{stage: <id>, reason: <why>}]`; nothing is skipped. Order your plan by the time each stage costs the user.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- Planned by `theseus plan` because every packet of the round 2 plan of `web-apps-documenteditor` has run. Packets of round 3 get keys `plan:web-apps-documenteditor:dcb03039:r3:<row>`.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-04. The fork is at upstream `d238e526`; no round 2 code landed (PKT-0111/0112 blocked, PKT-0132 discarded and reverted, PKT-0125 pending).
- Measured: documenteditor-open PASS, differential PASS (4 cases), open-window.js 7 runs × 2 files. **The VM was loaded the whole time (load 9.9–13.8)**, so the absolute numbers are 1.5–2× round 2 on identical code.
- Surprise: in the network trace LoadDoc coincides with the end of the sdk-all.js download (2 707 vs 2 710 ms; 2 181 vs 1 993 ms). Following that, I ran a critical-path test of my own: a session script that delays asc_LoadDocument by 500 ms, 7 alternating pairs per file. Ready did not follow the delay (+147 / −729 ms, spread ±1.2 s). The script is copied into the round file so that P1 can commit it; `.theseus/oracle/perf` is outside this packet's create_in.
- Decision: verdict **keep**, following round 2's pre-registered rule (P1+P2 < 150 ms) and the critical-path reading. The plan has one investigate row that confirms the finding on a quiet VM. I recommend closing PKT-0111/0112 and discarding PKT-0125 without merging.
- `DIAG-web-apps-documenteditor-b.md` does not exist, so there was nothing to `git rm`.
- Not done: the critical-path test on an idle VM (no idle slot in this run). No prototype in external/web-apps.

## Spawned packets

## Review

## Lessons for the Atlas
- In the document editor, asc_LoadDocument waits for the sdk-all.js download, not for the UI build. The web-apps work before LoadDoc overlaps that wait, so deferring UI pieces does not shorten the open. Check the critical path, by delaying the mark, before planning cuts.
