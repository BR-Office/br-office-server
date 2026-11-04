---
id: PKT-0151
title: Characterization tests for commandSfcCallback, endAuth warning and shutdown wait (81576 prep)
type: characterize
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0115

depends_on: []

target:
  files: []
  create_in:
    - tests/unit

context:
  cards: [docservice]
  references:
    - .theseus/diagnosis/PKT-81576-test-plan.md

contract:
  preserve:
    - "No source file under DocService/ or Common/ changes; tests pin current EO main behaviour"
  forbidden: []

acceptance:
  commands:
    - "npx jest --config tests/jest.config.js tests/unit/commandSfcCallback81576.tests.js tests/unit/shutdownWait.tests.js"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Create tests/unit/commandSfcCallback81576.tests.js (cases T1-T9 and E1-E5) and tests/unit/shutdownWait.tests.js (S1-S2) as specified in section 4 of .theseus/diagnosis/PKT-81576-test-plan.md, pinning CURRENT EO main behaviour so a later port of upstream 8585bcf4 shows exactly which expectations flip (T3, T4, T6, E2).

## Essential context
- Pattern: tests/unit/docsCoServerCrashPaths.tests.js (PKT-0028): jest, mocked taskresult/baseConnector/storage, real editorDataMemory.
- Only worth running if the human decides to port 81576 or to keep it under watch (see section 7 of the plan).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
