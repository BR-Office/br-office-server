---
id: PKT-0036
title: Diagnose the x2t module
type: investigate
role: diagnostician
priority: high
module: x2t
origin:
  type: plan
  ref: diagnosis:x2t:dcb03039
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - x2t
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-x2t.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-x2t.md'
  - theseus validate
budget:
  max_files_changed: 3
  max_diff_lines: 700
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Diagnose the module `x2t` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-x2t.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.

## Suggested plan

## Executor log
- 2026-11-02, claude-opus-5-5: wrote `.theseus/diagnosis/DIAG-x2t.md`, verdict **refactor (C++), conditional** on P1 (profile of PDF export) and P2 (corpus oracle).
- Decisions: no target language. The measured cost (PDF export 0.65 s on empty files, up to 6.5 s on large ones) runs in x2t's callees (`doct_bin2pdf` → `CDoctrenderer` V8/sdkjs layout → `CPdfFile`, `lib/pdf_image.h:339`), not the dispatcher, so a language change of this module gains nothing measurable; oracle `none` also blocks migrate/rewrite (D1). Open is not an x2t problem (0.1–0.3 s).
- Surprises: `external/core` is a read-only checkout (no fork yet), so wave 1 refactors cannot land in this repository; P3 says to deliver a patch + note if the fork still does not exist. The fixed ~0.6 s of PDF export may be sdkjs JS run inside x2t, which would move the work to the sdkjs modules (stated in "What would change").
- Not done: no measurement of my own (diagnosis only); the split of PDF time is unknown and is P1. Did not read other diagnoses of x2t (none existed). No spawn filed: the follow-ups are the plan's packets.

## Spawned packets

## Review

## Lessons for the Atlas
