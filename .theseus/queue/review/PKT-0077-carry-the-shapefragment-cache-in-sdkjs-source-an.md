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

## Spawned packets

## Review

## Lessons for the Atlas
