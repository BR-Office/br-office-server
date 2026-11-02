---
id: PKT-0072
title: Break down libfont + WASM CPU on open and spreadsheet remote apply
type: investigate
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:W1a
depends_on:
- PKT-0045
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - sdkjs-common
  references:
  - .theseus/diagnosis/DIAG-sdkjs-common.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
With profile-client.js (PKT-0045) on the PKT-0016 samples, attribute the 250-300 ms fonts self time per open and the 336 ms libfont+WASM time of xlsx remote apply (20 changes) to functions in common/libfont (file.js, map.js, textshaper.js, loader) and to WASM calls. Count calls, glyph-measure cache hits/misses and JS<->WASM crossings. Name one or two refactor candidates with an expected gain, or state that none exceeds 50 ms.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `W1a`).
PKT-0045 found fonts are already fetched in parallel (poll tail 6-71 ms), so the font cost left is CPU. Data is in perf/client-profile-2026-11-02.json (commit 2fc5c20).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
