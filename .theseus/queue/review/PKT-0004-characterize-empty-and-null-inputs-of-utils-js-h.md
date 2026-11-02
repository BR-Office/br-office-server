---
id: PKT-0004
title: Characterize empty and null inputs of utils.js helpers
type: characterize
priority: medium
module: common

origin:
  type: human
  ref: null

depends_on: []

target:
  files:
    - tests/unit/utils.tests.js
  create_in: []

context:
  cards: [common]
  references: []

contract:
  preserve:
    - "Production code is not changed: only tests are added"
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands:
    - ".theseus/oracle/unit.sh"
    - "npx eslint tests/unit/utils.tests.js"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-sonnet-5-5
  reviewer: null
---

## Goal
Characterize empty and null inputs of utils.js helpers.

## Essential context
PKT-0002 covered 18 pure helpers but left out empty-string and null inputs. One of them is surprising and must be recorded, not fixed: `compareStringByLength('', 'a')` returns 1 (the empty string is treated like a missing value and sorts after). Cover empty strings, `null` and `undefined` for the helpers PKT-0002 tested, asserting what they do today.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
