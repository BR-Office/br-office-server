---
id: PKT-0042
title: Characterize x2t on a document corpus
type: characterize
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:P2
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/x2t
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 1
---

## Goal
A script that runs the installed x2t over a corpus for the directions the server uses (open -> Editor.bin, save -> docx/xlsx/pptx, -> pdf, -> odf) and records exit code, output size and, for PDF, page count and extracted text, so a later x2t build can be compared to it.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P2`).
Card x2t "Available oracle" - none automated. Invariants - exit code mapping and params.xml schema are the FileConverter contract. Samples - en-US new.* templates and the PKT-0016 generated files.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.16.1 (every privilege for executors)

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: surprise "wrong m_nFormatTo gives exit 88 with no output" is in the log but not kept in a test/baseline; add an unsupported-format case to corpus.py and baseline-9.3.7-1.json (and document that the make-corpus output dir must be named `corpus`)

## Lessons for the Atlas
