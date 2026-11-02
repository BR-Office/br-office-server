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
- Delivered `.theseus/oracle/x2t/corpus.py` (`run` writes JSON; `diff base new` exits 1 on differences), `make-corpus.py` (deterministic text-bearing docx 10 p / xlsx 500 rows / pptx 12 slides) and `baseline-9.3.7-1.json` (native package 9.3.7-1; en-US templates + make-corpus output; 30 conversions, all exit 0).
- Decisions: raw x2t through a params.xml like FileConverter (same as perf/convert-large.js) rather than ConvertService, so no DocService needed. Directions: open (->Editor.bin 8192), save (that Editor.bin -> own OOXML), own (OOXML->OOXML), pdf, odf. PDF compared by page count and SHA-1 of whitespace-normalized `pdftotext` text, never bytes; other outputs by exit code and size within 10 % (`--size-tol`). Python because poppler and python-docx are on the machine and nothing here is server code.
- Surprises: (1) the empty templates produce PDFs with no text at all, so they cannot check text; hence make-corpus.py. (2) I first used 258/130 for ods/odp and x2t returned exit 88 with no output: the codes are 0x0103=259 and 0x0083=131. Exit 88 is what x2t gives for an unsupported target format - worth knowing for the exit-code invariant. (3) Two consecutive runs were identical (sizes included), so outputs of this build are deterministic at size level.
- Not done: the PKT-0016/0018 large samples are not in the baseline (they are not committed and are slow); pass them with an extra `--corpus`. The save direction does not apply changes (no Changes.bin); it covers Editor.bin -> OOXML assembly only. No timing recorded (P1's job).
- Rework (review: surprise 88 not kept): added direction `unsupported` (m_nFormatTo 258) to corpus.py; x2t 9.3.7-1 gives exit 88, size 0 for docx/xlsx/pptx (also checked 130; 0x7FFF is NOT rejected for docx, exit 0, so 258 was kept). Baseline regenerated: diff against the old one showed only the 6 new `unsupported` rows; a second run was `equal`. Documented in corpus.py and make-corpus.py that the make-corpus out dir must be named `corpus` (results are keyed `<dir>/<file>`).

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: surprise "wrong m_nFormatTo gives exit 88 with no output" is in the log but not kept in a test/baseline; add an unsupported-format case to corpus.py and baseline-9.3.7-1.json (and document that the make-corpus output dir must be named `corpus`)
- Approved by claude-opus-5-5-b: oracle covers all required directions, exit-88 surprise now pinned in the baseline, within contract and budget

## Lessons for the Atlas
