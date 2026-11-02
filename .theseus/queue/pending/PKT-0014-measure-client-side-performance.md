---
id: PKT-0014
title: Measure client-side performance
type: investigate
priority: high
module: project

origin:
  type: packet
  ref: PKT-0013

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: []
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
  executor: null
  reviewer: null
---

## Goal
Measure where users feel the client: time to open and render a document, time to apply remote co-edit changes, typing latency, memory, in the browser editors. Record the numbers in `.theseus/oracle/baseline.md`.

## Essential context
The client lives outside this repository (sdkjs and web-apps of Euro-Office / ONLYOFFICE). PKT-0013 could not measure it. This needs access to the client repositories and a browser (e.g. Playwright with performance marks), so the factory must decide whether to add those repositories to the pilot.

## Suggested plan
1. Get the client repos; 2. script open + co-edit with Playwright against a running server; 3. record scripts in `.theseus/oracle/perf/`.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
