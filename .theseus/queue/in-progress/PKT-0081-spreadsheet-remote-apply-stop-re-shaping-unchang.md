---
id: PKT-0081
title: "Spreadsheet remote apply: stop re-shaping unchanged cells (StringRender fragment cache)"
type: refactor
priority: medium
module: sdkjs-cell

origin:
  type: packet
  ref: PKT-0072

depends_on: [PKT-0072]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/cell/view/StringRender.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/fonts-profile-2026-11-02.json

contract:
  preserve:
    - Rendered cell text (widths, wrapping, bidi) is identical before and after; existing tests keep passing
  forbidden: []

acceptance:
  commands:
    - node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3  # xlsx apply fonts self and HB_ShapeText crossings drop

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
On a spreadsheet remote change, do not re-shape the text of cells that did not change: cache shaped fragments per
(text, font) in `StringRender`/`FragmentShaper`, or keep text metrics of untouched cells. Target: xlsx remote apply
(20 changes, large-10k.xlsx) fonts self from ~290 ms to < 100 ms; `HB_ShapeText` from ~18 k to a few hundred.

## Essential context
- PKT-0072 (baseline.md, "libfont + WASM CPU by function"): 20 one-cell edits cause 18 318 shapes and ~100 k
  `FT_SetCMapForCharCode` crossings (~900 shapes per change), 257 ms under `FragmentShaper.shapeFragment` via
  `StringRender._measureChars`. Per-call cost is normal (~3 µs/shape); the count is the cost.
- Code is in sdkjs `cell/view` (no Atlas card for sdkjs-cell yet). `external/` is read-only: the change needs the sdkjs fork.
- Counts must come from the profiled run (hook counters), not from a coverage run (coverage coalesces cell redraws).

## Suggested plan

## Executor log
- attempt 1: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`
- attempt 2: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`
- attempt 3: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`
- Decision: applied the existing source patch `.theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch` to `external/sdkjs/cell/view/StringRender.js` (the only target file): a bounded (200k entries) module-level Map memoizes `FragmentShaper.shapeFragment` by (font name, size, bold/italic, PPI, code points) and replays grapheme/width/char per index on a hit. Output is the same data `private_HandleItem` writes, so widths/wrapping/bidi are unchanged by construction. Unchanged cells (same text+font) no longer reach HarfBuzz on remote apply.
- Committed in the sdkjs clone on branch `pkt/PKT-0081` (f11c1d1); `external/` is not tracked by this repo, so the change lives only in that clone (the fork push is for the factory).
- Syntax checked with `new Function(...)`. Not done: webpack build + profile run.
- Surprise / blocker: the acceptance `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3` cannot run: `<samples-dir>` is parsed by the shell as a redirection (`samples-dir: No such file or directory`, exit 1) and `profile-fonts.js` is not on this base branch (only on pkt/PKT-0072). Identical to PKT-0080's blocker; PKT-0083 (pending) already fixes it, so no new spawn. This packet should depend on PKT-0083 and be re-run after it.
- Attempt 2 (2026-11-02): re-ran the acceptance exactly as written; it still fails before node starts (`bash: samples-dir: No such file or directory`, exit 1) and `.theseus/oracle/perf/profile-fonts.js` is still absent. No code change can fix this inside `target.files`: the packet's acceptance line must be fixed by the factory (PKT-0083, pending) and the packet re-queued with `depends_on: [PKT-0083]`. Code change unchanged (sdkjs f11c1d1). Not re-attempting a third time with the same unrunnable command is recommended.
- Attempt 3 (2026-11-02): acceptance re-run exactly as written; same failure before node starts (`/bin/bash: line 1: samples-dir: No such file or directory`, exit 1). `.theseus/oracle/perf/profile-fonts.js` still absent from this branch; PKT-0083 still in `pending`. Code change unchanged (sdkjs f11c1d1). This is the last allowed attempt (max_attempts: 3): the packet cannot pass until the factory replaces `<samples-dir>` with a real path and brings `profile-fonts.js` onto the base (PKT-0083), then re-queues it.

## Spawned packets

## Review

## Lessons for the Atlas
