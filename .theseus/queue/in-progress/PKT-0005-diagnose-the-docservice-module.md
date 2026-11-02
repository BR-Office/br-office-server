---
id: PKT-0005
title: Diagnose the docservice module
type: investigate
role: diagnostician
priority: high
module: docservice
origin:
  type: plan
  ref: diagnosis:docservice
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - docservice
  references:
  - .theseus/spec/diagnosis-verdict.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/diagnosis/DIAG-docservice.md
budget:
  max_files_changed: 2
  max_diff_lines: 600
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Diagnose the module `docservice` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-docservice.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and no diagnosis.

## Suggested plan

## Executor log
- 2026-11-02 claude-opus-5-5: Verdict **refactor** (confidence medium), conditional on characterization P1-P3. Wrote `.theseus/diagnosis/DIAG-docservice.md` with the matrix and a 6-packet yaml plan (wave 0: 3 characterize + 1 investigate; wave 1: 2 refactor).
- Decision: TypeScript migration rejected for now. The core files (DocsCoServer.js 4,736 lines, canvasservice.js 2,106) have no tests, so equivalence cannot be proven. Reassess after the split.
- Surprise: `churn_90d` is unusable because git history restarted from upstream (one commit per file in 90 days). Sizes come from `wc -l`, since the card has no metrics or graph.
- Surprise: confirmed that `DocsCoServer.js:154` uses `new editorDataStorage()` as the EditorStat fallback (P4 investigates).
- Not done: friction line in `.theseus/scoreboard/friction.jsonl` and the SUMMARY.md update, both outside target.create_in. Friction: without graph.json or metrics, scoring relied on raw line counts and reading the code.

## Spawned packets

## Review

## Lessons for the Atlas
