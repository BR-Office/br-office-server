---
id: PKT-0030
title: Map the x2t module (Atlas card)
type: investigate
role: cartographer
priority: high
module: x2t
origin:
  type: plan
  ref: atlas:x2t
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/core/X2tConverter
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/x2t.md
budget:
  max_files_changed: 3
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Map the module `x2t` (`external/core/X2tConverter`) into the Atlas card `.theseus/atlas/x2t.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The C++ document converter (x2t). 70-90% of every PDF conversion and the document conversion inside open; PDF export goes through PdfFile, DocxRenderer and DesktopEditor graphics in the same repository.

## Suggested plan

## Executor log
- claude-opus-5-5 (cartographer), base e32956dd. Wrote `.theseus/atlas/x2t.md` and added its row to INDEX.md.
- Decisions: `graph.json` does not exist, so `languages`, `size`, `dependencies`, `metrics` are null (rule A1); the `wc -l` count (~10.8k lines in `src/`) is mentioned only in Open questions, not in the header. Oracle level `none`: the `test/` folders are manual harnesses, not wired into CI. The 70-90% hotspot figure comes from the packet context, tagged `[human]`.
- Surprises: x2t is a thin dispatcher (`fromInputParams` with a ~100-case switch). The real cost lives in sibling `external/core` libraries (PdfFile, DocxRenderer, graphics, V8 DocBuilder), which this card does not cover. `checkInputLimits` dereferences pointers without null checks. Temp path is process-global.
- Not done: no tool metrics, no run of the binary, sibling libraries not mapped (they deserve their own cards before any x2t performance work). Word count: `wc -w` on the whole file (header included) gives 708, so the body is under the 800-word limit.

## Spawned packets

## Review

## Lessons for the Atlas
