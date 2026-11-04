---
id: PKT-0137
title: Do not wait savetimeoutdelay (5 s) before saving an explicitly closed document
type: investigate
priority: high
module: docservice

origin:
  type: packet
  ref: PKT-0130

depends_on: []

target:
  files:
    - DocService/sources/DocsCoServer.js
  create_in: []

context:
  cards: [docservice]
  references:
    - .theseus/journeys/save.md

contract:
  preserve:
    - "A user who reconnects within savetimeoutdelay after a dropped connection (no explicit close) still finds the session open"
    - "Saved file content and the status 2 callback contract"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/unit.sh
    - bash .theseus/oracle/journeys/save.sh

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
Do not wait savetimeoutdelay (5 s) before saving an explicitly closed document.
The save journey (journeys/save.md, PKT-0130) is 5853 ms p50, of which 5006 ms (85.5%) is `utils.sleep(savetimeoutdelay)` in
`createSaveTimer` (DocsCoServer.js:1556) after the last user leaves. Find out whether the client sends an explicit close
(beforeunload / closeDocument message) distinguishable from a dropped socket, and if so save with `opt_noDelay` for an
explicit close while keeping the delay for drops. Expected: save journey ~0.85 s.

## Essential context
- Measured on the integrated build; tab close produced `Connection closed or timed out: reason = transport close` only:
  check whether a real browser close (not Playwright page.close) sends anything before the socket drops.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
