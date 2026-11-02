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

## Spawned packets

## Review

## Lessons for the Atlas
