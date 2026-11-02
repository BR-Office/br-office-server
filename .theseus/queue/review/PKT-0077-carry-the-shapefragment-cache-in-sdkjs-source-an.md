---
id: PKT-0077
title: Carry the shapeFragment cache in sdkjs source and re-measure with the V8 snapshot
type: port-upstream
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0069

depends_on: []
requires: [documentserver]

target:
  files:
    - ".theseus/oracle/perf/sdkjs-shape-cache.py"
  create_in:
    - .theseus/diagnosis
    - .theseus/oracle/perf

context:
  cards: [x2t]
  references: []

contract:
  preserve:
    - "Existing tests keep passing unchanged"
    - "PDF output of the xlsx samples stays visually identical (pdftoppm page comparison)"
    - "Installed documentserver files are not modified in place"
  forbidden: []

acceptance:
  commands:
    - "python3 -I -c \"import ast;ast.parse(open('.theseus/oracle/perf/sdkjs-shape-cache.py').read())\""
    - "test -f .theseus/diagnosis/PKT-0069-shape-cache.md"
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
PKT-0069 prototyped a memo cache on FragmentShaper.shapeFragment (key: font name, size, bold|italic, PPI,
code points; replay grapheme/width per char) in a copy of the built sdkjs/cell/sdk-all.js: 16-26 % less x2t CPU
on large xlsx -> pdf, 521/521 pages pixel-identical. Port it to the sdkjs source (cell/view/StringRender.js),
build, regenerate sdk-all.bin/cache, re-measure with x2t-cpu.sh and pdftoppm page comparison, and prepare
it as an upstream PR or a carried patch. Reference: .theseus/diagnosis/PKT-0069-shape-cache.md,
.theseus/oracle/perf/sdkjs-shape-cache.py.

## Essential context
x2t loads sdkjs/cell/sdk-all.js (not sdk-all-min.js). Mirror the install (FileConverter/bin copied) to run a patched sdkjs; see PKT-0069 log.

## Suggested plan

## Executor log
- return: container restarted; factory restarted on Theseus 0.17.0
- return: disk filled up; factory restarted on Theseus 0.17.1
- Ported the cache to sdkjs source (`cell/view/StringRender.js`, sdkjs 9cea536, +34/-1): original body renamed
  `private_shapeFragment`, recording done inside `private_HandleItem` (no per-call monkey-patching). Patch kept as
  `.theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch` (sdkjs checkout lives outside the repo, in the scratchpad).
- Decision: build baseline AND patched from the same checkout with webpack (cell config) instead of comparing to
  the installed 9.3.7 sdk-all.js, so only the patch differs. Each side runs in its own mirror install
  (`sdkjs-mirror.sh`, new) with its own `x2t -create-js-snapshots` sdk-all.bin; installed files untouched.
- Surprise: the earlier attempt's webpack build was OOM-killed ("Killed") with other agents on the VM;
  `NODE_OPTIONS=--max-old-space-size=2500` builds in ~60 s.
- Results (median of 2 interleaved runs, `x2t-cpu-ab.py`, new): 25k 17.8 -> 14.9 s (16 %), numbers 50k
  36.6 -> 31.5 s (14 %), 50k 35.5 -> 26.8 s (24 %); 2605/2605 pages pixel-identical. Details in
  `.theseus/diagnosis/PKT-0077-shape-cache-source.md` (new; PKT-0069-shape-cache.md left untouched, not in target).
- Found risk: the cache key ignores whether the font is loaded; harmless in x2t, but in the browser editor a
  fallback shaping could be replayed after the real font loads. Spawned a follow-up to fix that and prepare the PR.
- Not done: sdkjs QUnit tests not run against the build; PR not opened (outward action, left to the follow-up/humans).

## Spawned packets
- PKT-0082: Upstream the sdkjs shapeFragment cache (font-load invalidation + PR)

## Review

## Lessons for the Atlas
