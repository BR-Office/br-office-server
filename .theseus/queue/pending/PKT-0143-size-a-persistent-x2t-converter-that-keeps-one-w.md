---
id: PKT-0143
title: Size a persistent x2t converter that keeps one warmed JS context per editor
type: investigate
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0108

depends_on: []

target:
  files: []
  create_in:
    - .theseus/diagnosis
    - .theseus/oracle/perf

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-x2t-r2-warmup.md
    - .theseus/diagnosis/DIAG-x2t.md

contract:
  preserve:
    - "Existing tests keep passing; the installed Document Server is restored after any experiment"
  forbidden: []

requires: [documentserver]

acceptance:
  commands:
    - test -s .theseus/diagnosis/PKT-x2t-persistent-converter.md
    - theseus validate

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
Measure, on the core fork (external/core, prototype only), the per-document cost of converting docx/xlsx/pptx -> pdf in a process that keeps one warmed CDoctrenderer JS context per editor and resets the document inside it (versus a fresh x2t per file), and the memory per warmed context; record numbers (median of 5, wall and CPU), output equality and the FileConverter contract changes it would need in .theseus/diagnosis/PKT-x2t-persistent-converter.md.

## Essential context
PKT-0108 found no in-process cut >= 0.2 s (V8 flags, warmed snapshot); the document-independent init is ~0.13-0.17 s; docbuilder (new context per document in one process) gains nothing, so only a kept context can remove the ~0.5 s CPU warm-up. A core-fork edit costs a ~50-60 min full rebuild with x2t-build.sh: plan one build.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
