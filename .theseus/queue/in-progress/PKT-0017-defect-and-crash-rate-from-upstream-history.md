---
id: PKT-0017
title: Defect and crash rate from upstream history
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0015

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [docservice]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - No change to the project's source code
  forbidden: []

acceptance:
  commands:
    - test -s .theseus/oracle/baseline.md

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
Add the server's defect and crash rate from upstream history to `baseline.md`. Sources are github.com/Euro-Office/server and ONLYOFFICE/server before it. Report bug issues and fix commits per month or release, the crash-related ones, and the files or modules where they concentrate.

## Essential context
The local git history starts on 2026-10-28, so it cannot be used for this. In PKT-0015 the executor's permissions refused `gh api repos/Euro-Office/server`. This packet needs `gh`, or a network `git clone` of upstream, to be allowed for the executor.

## Suggested plan
1. Clone upstream or query the GitHub API. 2. Classify fix commits and bug issues. 3. Compute the rate per period and per file. 4. Record the script in `.theseus/oracle/perf/`.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
