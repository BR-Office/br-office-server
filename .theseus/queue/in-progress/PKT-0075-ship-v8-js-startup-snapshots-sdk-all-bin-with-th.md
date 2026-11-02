---
id: PKT-0075
title: Ship V8 JS startup snapshots (sdk-all.bin) with the Document Server install
type: refactor
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0065

depends_on: [PKT-0065]
requires: [documentserver]

target:
  files: []
  create_in:
    - .theseus/diagnosis

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-0065-x2t-js-snapshots.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/unit.sh
    - npm run lint:check

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
Make every install (deb postinst, Docker image) generate the V8 startup snapshots `sdkjs/<editor>/sdk-all.bin`
with `x2t -create-js-snapshots` as user `ds`, and regenerate them on upgrade. PKT-0065 measured −90…110 ms per
PDF export through ConvertService (≈12–14 %) with corpus-oracle equal output. Deliver the packaging change as a
patch + decision note under .theseus/diagnosis until a writable fork of Euro-Office/DocumentServer exists.

## Essential context
- The 9.3.7-1 package does not ship sdk-all.bin; it was created by hand on the factory VM (see PKT-0065 note).
- Snapshots are tied to the exact x2t/V8 build and sdk-all.js: a stale .bin after an upgrade must be removed or rebuilt.
- Files must be owned by `ds` (PKT-0041 saw x2t silently regenerate the code cache as root).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
