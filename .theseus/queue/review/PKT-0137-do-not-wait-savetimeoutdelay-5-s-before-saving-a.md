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
- attempt 1: acceptance failed: `.theseus/oracle/unit.sh`
- attempt 2: acceptance failed: `bash .theseus/oracle/journeys/save.sh`
claude-opus-5-5, 2026-11-04.
**Result: no change to DocsCoServer.js. The server already does what the Goal asks; the client never sends an explicit close on tab close.**
Findings:
- Server: `closeDocument(ctx, conn, reason)` is called with no `reason` for the socket message `{type:"close"}` (DocsCoServer.js ~1958)
  and with the socket.io reason for `disconnect` (~2028). It already computes `noDelay = !reason || getIsShutdown()` (~2191) and
  passes it to `createSaveTimer`. So an explicit close already saves without the 5 s sleep.
- Client (installed compiled build, /var/www/euro-office/documentserver): `{type:"close"}` is sent only by
  `DocsCoApi.disconnect()` without a code (`asc_coAuthoringDisconnect`). web-apps `onBeforeUnload` only saves localStorage
  (and holds saving off for 500 ms if the document is modified); `onUnload` only clears a timer. Nothing is sent to the server.
- The bundled socket.io client has `closeOnBeforeunload:!0`: on beforeunload it closes the transport, and the server logs
  `transport close`, the same reason it logs for a page reload (and for a killed tab or a TCP reset).
  So a real browser close and a Playwright `page.close()` look the same, as PKT-0130 saw.
- A reload is exactly the case the delay protects (contract preserve #1), and neither the browser nor the server can tell it
  apart from a final close. Saving immediately on `transport close` would break that contract. Only the integrator knows a close is final.
Decisions:
- No server change (a heuristic on `transport close` breaks the preserve clause). Requested a follow-up
  (.theseus/spawn/PKT-0137-save-immediately-when-the-integrator-closes-the.md) to measure an integrator-driven close
  that reaches `asc_coAuthoringDisconnect`, which should give the ~0.85 s save.
Surprises / not done:
- `external/` (sdkjs, web-apps, core) is not checked out in this worktree, so I read the minified installed client instead.
- Acceptance: `.theseus/oracle/unit.sh` passes (178 passed, 1 skipped). `bash .theseus/oracle/journeys/save.sh` FAILS before
  measuring: serve-integrated.sh line 29 `cd .../external/sdkjs/build: No such file or directory` (missing external/ checkout:
  a factory problem, recorded in friction). The packet changes no code, so the journey number cannot move anyway.
Attempt 2 (after rejection on unit.sh):
- The rejected run failed in `tests/unit/request.tests.js` timeout tests (`timeout of 300ms exceeded`, `aborted`): timing-sensitive
  tests against a local server, not code this packet touches (the packet changes no source file). Rerun: 178 passed, 1 skipped.
- `save.sh` still fails at serve-integrated.sh:29 because `external/` (sdkjs fork checkout) is absent in this worktree and in the
  main checkout; not fixable within target. Needs the factory to provide `external/sdkjs`.
Attempt 3:
- Created `external/sdkjs` myself: `git clone --depth 1 -b theseus file://<repo>/../.external/https___github_com_BR-Office_br-office-sdkjs.git external/sdkjs`
  (the fork with branch `theseus`; the Euro-Office mirror has only `main`). Git-excluded, not committed.
- Both acceptance commands pass: unit.sh 178 passed, 1 skipped; save.sh total_ms=5918 p50 (save_delay 5007), unchanged as expected
  since tab close is `transport close` and no server code changed.

## Spawned packets

## Review

## Lessons for the Atlas
