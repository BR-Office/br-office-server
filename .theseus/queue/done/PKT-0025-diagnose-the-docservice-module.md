---
id: PKT-0025
title: Diagnose the docservice module
type: investigate
role: diagnostician
priority: high
module: docservice
origin:
  type: plan
  ref: diagnosis:docservice:dcb03039
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-docservice.md
  - .theseus/diagnosis/DIAG-docservice-b.md
  create_in:
  - .theseus/diagnosis
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
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-docservice.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-docservice.md'
  - theseus validate
budget:
  max_files_changed: 3
  max_diff_lines: 700
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Diagnose the module `docservice` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-docservice.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- `.theseus/diagnosis/DIAG-docservice.md` exists but answers other goals: replace it. If `.theseus/diagnosis/DIAG-docservice-b.md` exists, delete it with `git rm` (it answers the old goals too).

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: P=$(ls .theseus/queue/in-progress/PKT-0025-*.md)
- Decision: verdict **refactor** (JavaScript, no target language). Baseline shows DocService is a few % of open, 4 ms p50 of a ~100 ms co-edit round trip and ~0.1 s of conversions; no language change gains user-felt speed. The user-felt costs this module owns: the fixed 1 s sync-convert poll (`converterservice.js:49,163`) and crash-prone, untested co-edit code (PKT-0017 fix/crash concentration). Plan: 2 characterize + 2 refactor + 1 investigate (upstream fixes 81132/81576).
- Decision: replaced the old DIAG-docservice.md without reading it (independence); DIAG-docservice-b.md did not exist, so nothing to `git rm`.
- Decision: save's 5 s `savetimeoutdelay` is configuration in Common, noted in the diagnosis but not planned.
- Surprise: `DocsCoServer.js:155` builds `editorStat` with `new editorDataStorage()`; folded into P4.
- Not done: no new measurement (baseline covers the module, except the server share of open, listed as what would change the verdict). A heredoc-based shell edit was refused by permissions; used file edits instead.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: refactor diagnosis is grounded in baseline and code, includes a valid §5 plan, and respects scope and contract

## Lessons for the Atlas
