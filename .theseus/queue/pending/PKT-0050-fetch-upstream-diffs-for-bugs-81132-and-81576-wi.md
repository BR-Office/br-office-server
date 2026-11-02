---
id: PKT-0050
title: Fetch upstream diffs for bugs 81132 and 81576 with network access
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0029

depends_on: []

target:
  files: []
  create_in:
    - .theseus/diagnosis

context:
  cards: [docservice]
  references:
    - .theseus/diagnosis/PKT-0029-upstream-fixes-81132-81576.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands: []

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
Find the ONLYOFFICE/server commits for bugs 81132 and 81576 (SHA, date, files, diff summary) and the Euro-Office `release/v9.4.0` commit for 81132, and complete the assessment in `.theseus/diagnosis/PKT-0029-upstream-fixes-81132-81576.md`.

## Essential context
PKT-0029 could not fetch: `git clone`, `gh api` and WebFetch to github.com were refused, and the local clone has no history. This run needs permission for `git clone` / `gh api` to github.com (ONLYOFFICE/server, Euro-Office/server).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
