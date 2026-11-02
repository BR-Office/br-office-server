---
id: PKT-0011
title: Characterize formatchecker and documentFormats
type: characterize
priority: high
module: common

origin:
  type: diagnosis
  ref: DIAG-common

depends_on: []

target:
  files:
    - "tests/unit/formatchecker.tests.js"
  create_in: [tests/unit]

context:
  cards: [common]
  references: []

contract:
  preserve:
    - "Production code is not changed: only tests are added"
    - "Existing tests keep passing unchanged"
    - "Tests assert what the code does today; surprising behavior is recorded in the packet, not fixed"
  forbidden: []

acceptance:
  commands:
    - ".theseus/oracle/unit.sh"
    - "npx eslint tests/unit/formatchecker.tests.js"

budget:
  max_files_changed: 2
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-sonnet-5-5
  reviewer: claude-opus-5-5
rejected_reviews: 1
---

## Goal
Pin the behavior of `Common/sources/formatchecker.js` and `Common/sources/documentFormats.js` before they are migrated (wave 1).

## Essential context
- Wave 0 of DIAG-common (plan #2) and DIAG-common-b.
- `getFormatFromString` and `getStringFromFormat`: round trip over every known extension, plus unknown, empty and upper-case input.
- `isDocumentFormat`, `isSpreadsheetFormat`, `isPresentationFormat`, `isOOXFormat`, `isBrowserEditorFormat`: a table over representative format ids.
- `documentFormats.getAllFormats()`: shape and a few stable entries (do not snapshot the whole list).
- Signature detection (`getDocumentFormatBySignature`, `getOfficeZipFormatBySignature`, `getImageFormat`): use small in-memory buffers built in the test (magic bytes for PDF, ZIP/OOXML, PNG, JPEG...), plus empty and truncated buffers. Do not add binary fixture files. `getImageFormat(ctx, buffer)` takes an operation context; use `operationContext.global` or a minimal fake.
- Tests use `@jest/globals` imports, the AGPL header and the layout of `tests/unit/utils.tests.js`.

## Suggested plan
1. List the exports and the format id constants they use.
2. Write table-driven tests, run the oracle, adjust tests (never the code).
3. Record surprising results in the executor log.

## Executor log
- attempt 2: changed .theseus/queue/in-progress/PKT-0011-characterize-formatchecker-and-documentformats.md, outside the target (rule R2)
- attempt 3: changed .theseus/queue/in-progress/PKT-0011-characterize-formatchecker-and-documentformats.md, outside the target (rule R2)

## Spawned packets

## Review
- Rejected by claude-opus-5-5: Fill the empty Executor log with the surprising behaviors these tests pin (xlsx-only zip detection with its 8KB window, the null TypeError, no %PDF detection, pdfa→pdf, the getAllFormats no-context throw, the stray "word" key); the test file itself is acceptable as is.

## Lessons for the Atlas
