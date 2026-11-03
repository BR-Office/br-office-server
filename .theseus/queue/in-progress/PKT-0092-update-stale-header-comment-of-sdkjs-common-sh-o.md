---
id: PKT-0092
title: Update stale header comment of sdkjs-common.sh oracle (color-mods/chartEx no longer known broken)
type: refactor
priority: low
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0090

depends_on: []
requires: [browser]

target:
  files:
    - .theseus/oracle/sdkjs-common.sh
  create_in: []

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - "Script behaviour (only the header comment changes)"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/sdkjs-common.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Lines 4-5 of `.theseus/oracle/sdkjs-common.sh` say color-mods and chartEx-serialize "are known broken and pass only if they still fail exactly as recorded". Since PKT-0090 both pass and `known` in `sdkjs-common-run.cjs` is empty. Rewrite the comment: all suites must pass; `known` stays as a mechanism for future recorded failures.

## Essential context
PKT-0090 could not fix it: the file was outside its target.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
