---
id: PKT-0060
title: Generate atlas/graph.json via adapter graph/metrics scripts and fill card tool fields
type: investigate
priority: medium
module: atlas

origin:
  type: packet
  ref: PKT-0053

depends_on: []

target:
  files:
    - ".theseus/adapter/adapter.yaml"
    - ".theseus/atlas/*.md"
  create_in:
    - ".theseus/adapter/scripts/"
    - ".theseus/atlas/graph.json"

context:
  cards: [atlas]
  references: []

contract:
  preserve:
    - "hand-written sections of the module cards (everything except tool fields)"
  forbidden: []

acceptance:
  commands: []

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
Add `tools.graph` / `tools.metrics` scripts to the adapter (spec adapter.md §scripts, step 3 of setup), run them to produce `.theseus/atlas/graph.json` (module dependencies, languages, size), and fill the tool fields (`languages`, `size`, `dependencies`, `metrics`) of every module card, which are null today.

## Essential context
- Replaces PKT-0053, whose target was the unfilled template placeholder `[FILE]` so nothing could be changed.
- Origin: audit AUD-2 (O4); friction of PKT-0030..0033, diagnosticians PKT-0036..0039 need size/graph metrics.
- `.theseus/adapter/scripts/` is empty today and adapter.yaml `tools` has only `hotspot`.
- Acceptance suggestion: `theseus validate` and `test -s .theseus/atlas/graph.json`.
Generate atlas/graph.json via adapter graph/metrics scripts and fill card tool fields.

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
