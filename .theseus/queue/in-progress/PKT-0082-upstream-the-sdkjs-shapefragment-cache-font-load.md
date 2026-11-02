---
id: PKT-0082
title: Upstream the sdkjs shapeFragment cache (font-load invalidation + PR)
type: port-upstream
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0077

depends_on: [PKT-0077]
requires: [documentserver]

target:
  files:
    - ".theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch"
  create_in:
    - .theseus/diagnosis

context:
  cards: [x2t]
  references: []

contract:
  preserve:
    - "PDF output of the xlsx samples stays visually identical (pdftoppm page comparison)"
    - "Installed documentserver files are not modified in place"
  forbidden: []

acceptance:
  commands:
    - "test -f .theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch"
    - "curl -sf http://127.0.0.1/healthcheck"

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
Make the PKT-0077 sdkjs shapeFragment cache safe for the interactive editor and prepare it as an upstream PR
to Euro-Office/sdkjs: invalidate the cache when fonts finish loading (or enable it only in the native/x2t
path), keep the x2t saving (re-measure with x2t-cpu-ab.py) and the pixel-identical output, and write the PR
text. Opening the PR itself is for humans.

## Essential context
Patch: .theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch (cell/view/StringRender.js, sdkjs 9cea536).
Results and method: .theseus/diagnosis/PKT-0077-shape-cache-source.md; mirror + snapshot:
.theseus/oracle/perf/sdkjs-mirror.sh; build with NODE_OPTIONS=--max-old-space-size=2500 (OOM otherwise).
Risk: the cache key does not capture whether the font file is loaded; in the browser a fallback shaping
could be replayed after the real font arrives.

## Suggested plan

## Executor log
- Decision: gate the cache on `window["NATIVE_EDITOR_ENJINE"] === true` (browser path unchanged) AND add
  `AscCommonExcel.clearShapeCache()` called from `asyncFontsDocumentEndLoaded`/`asyncFontEndLoaded` in cell/api.js,
  so a later PR can enable it in the browser. Patch updated in place (2 files, +47/−1).
- Surprise: sdkjs `9cea536` is gone from the shallow mirror; patch rebased on `d9e810c`, applies cleanly.
  `external/` was not checked out in this worktree; cloned `.external/sdkjs.git` into the scratchpad.
- Surprise: webpack cell build OOM-killed (137) twice at 2500 MB heap with other agents running; 3000 MB worked.
- Re-measure (x2t-cpu-ab.py, 2 runs): savings 13 % / 16 % / 23 % (25k / numbers / 50k); 2605/2605 pages
  pixel-identical; installed sdk-all.js mtime unchanged. Details and PR text: PKT-0082-sdkjs-shape-cache-pr.md.
- Not done: opening the PR (human); sdkjs QUnit not run; browser behaviour not exercised (unchanged by gate).

## Spawned packets

## Review

## Lessons for the Atlas
- x2t runs sdkjs with `NATIVE_EDITOR_ENJINE === true`; it is the right switch for native-only optimizations.
- sdkjs cell webpack build needs ~3000 MB heap when the VM is shared.
