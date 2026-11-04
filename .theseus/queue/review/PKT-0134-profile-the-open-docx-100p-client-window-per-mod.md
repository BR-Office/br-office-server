---
id: PKT-0134
title: Profile the open-docx-100p client window per module (CPU profile of the journey)
type: measure
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0127

depends_on: []

requires: [documentserver, browser]

target:
  files:
    - ".theseus/oracle/journeys/open-docx-100p-run.cjs"
    - ".theseus/journeys/open-docx-100p.md"
  create_in:
    - ".theseus/oracle/journeys"

context:
  cards: [project]
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks"
    - "The total_ms measure of open-docx-100p.sh (profiling runs are separate from the timed runs)"
  forbidden: []

acceptance:
  commands:
    - "grep -q 'self-time' .theseus/journeys/open-docx-100p.md"
    - "bash .theseus/oracle/journeys/open-docx-100p.sh"
    - "theseus validate"

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
Add a CDP CPU profile (Profiler, 100 us) to `open-docx-100p-run.cjs` over Editor.bin→painted and replace the PKT-0043 share estimate in `.theseus/journeys/open-docx-100p.md` (client-open-* and layout-finish-paint stages, 2 379 ms of 4 628) by measured self-time per module. Also split editor-bin-download (646 ms) into network vs main-thread wait. Requires environments documentserver and browser.

## Essential context

## Suggested plan

## Executor log
- claude-opus-5-5-b, 2026-11-04. Added `PROFILE=1` mode to `open-docx-100p-run.cjs`: separate runs (default off, so
  the timed `total_ms` path is unchanged) with CDP Profiler at 100 us + CDP Network of Editor.bin; attribution reuses
  the PKT-0045 anchor mapping of `perf/profile-client.js` (copied, not required: that file runs main() on load).
  5 profiled runs, 86 pages; map 367/393 + 33/42 files located, unmapped ≤ 2 ms.
- Decision: wall→monotonic clock offset taken from Editor.bin `requestWillBeSent` (wallTime vs timestamp) to place
  `complete`/`painted` on the profile clock.
- Surprise: Editor.bin network is ~95 ms (ttfb 35 + body 55); Playwright `requestfinished` lags CDP loadingFinished by
  ~559 ms. The old 646 ms "download" was mostly the open on the main thread. Stage replaced by `editor-bin-network` 95
  and the rest folded into the client-open window, split by measured self-time.
- Surprise: measured sdkjs-word is 965 ms (21 %) vs the 1 723 ms (37 %) estimate; browser (program/GC/native) and idle
  are large. Idle got its own stages (`client-open-idle`, `layout-finish-idle`, module project).
- Decision: stage id `layout-finish-paint` kept for the sdkjs-word part of the layout (DIAG-sdkjs-word covers it;
  renaming failed `theseus validate`). New stages layout-finish-common/webapps/browser/idle added.
- Profiled runs are slower (painted ~6.9 s vs 4.6 s); shares were rescaled onto the PKT-0127 timed p50 windows, total_ms
  4628 kept (acceptance re-run gave 4773 p50, within PKT-0127's spread; not written to the map).

## Spawned packets

## Review

## Lessons for the Atlas
