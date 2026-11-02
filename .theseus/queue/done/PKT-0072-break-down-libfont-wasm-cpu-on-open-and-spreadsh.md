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
  reviewer: claude-opus-5-5-b
---

## Goal
With profile-client.js (PKT-0045) on the PKT-0016 samples, attribute the 250-300 ms fonts self time per open and the 336 ms libfont+WASM time of xlsx remote apply (20 changes) to functions in common/libfont (file.js, map.js, textshaper.js, loader) and to WASM calls. Count calls, glyph-measure cache hits/misses and JS<->WASM crossings. Name one or two refactor candidates with an expected gain, or state that none exceeds 50 ms.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `W1a`).
PKT-0045 found fonts are already fetched in parallel (poll tail 6-71 ms), so the font cost left is CPU. Data is in perf/client-profile-2026-11-02.json (commit 2fc5c20).

## Suggested plan

## Executor log
- Tooling: new `.theseus/oracle/perf/profile-fonts.js` loads `profile-client.js` (PKT-0045) without its `main()` via
  `module._compile` and reuses its bundle->source map, upload and ready poll (profile-client.js is outside the target,
  so it was not changed to export them). Raw data: `perf/fonts-profile-2026-11-02.json`; results in baseline.md
  "Client: libfont + WASM CPU by function (PKT-0072)". 3 profiled opens + 1 counted open per sample, plus one profiled
  and one counted co-edit for docx/xlsx. No acceptance commands are declared for this packet.
- Decision: times from CPU profiles only; counts from a separate precise-coverage run (callCount + detailed blocks),
  because coverage instruments the code. Glyph cache = block counts of the miss range (innermost range containing
  `CacheGlyph(`, in the bundle the `&&` right side, not a `{` block) in CFontFile.GetString*/GetChar; cross-checked: misses
  equal `FT_Load_Glyph` calls (240 xlsx, 127-137 docx).
- Decision: JS->WASM crossings = calls to the raw exports engine.js binds (FT_*, HB_ShapeText, HB_FontFree), counted by
  wrapping `AscFonts.*` in the page; JS wrappers and the pure-JS HB_Start/Append/EndString are excluded (the first count
  included them and was ~2x too high).
- Surprise: the counted (coverage) xlsx co-edit saw only 360 crossings vs 118 k in the profiled one; coverage slows the
  receiver so cell redraws coalesce. Apply counts come from hook counters in the profiled run; the counted-run apply
  numbers in the JSON (`applyCounts`) are kept but must not be used for the cell editor.
- Surprise: the WASM-by-caller split first stopped at the `js-to-wasm` trampoline frames (no URL); fixed by walking to the
  first frame with a URL.
- Result: fonts self 170-280 ms per open, spread thin; glyph cache 98-99 % hits. Candidates > 50 ms: (1) xlsx remote apply
  re-shapes ~900 strings per change from `cell/view/StringRender.js FragmentShaper.shapeFragment` (291 ms per 20 changes;
  gain ~200-250 ms); (2) `hb_get_script_horizontal_direction` switch of property-load cases, 43 ms on 100 p docx
  (408 k calls), ~60 ms with the related per-char lookups. Font matching (map.js penalties) 15-40 ms and the SetFont chain
  5-15 ms stay under 50 ms. Both candidates spawned (.theseus/spawn/). The cell one uses module `sdkjs-cell`, which has no
  Atlas card yet (cards set to sdkjs-common).
- Not done: no before/after (investigate packet); variance between runs is up to ~1.5x on this shared 2-CPU VM.

## Spawned packets
- PKT-0080: libfont: table lookup for hb_get_script_horizontal_direction / isRtlScript
- PKT-0081: Spreadsheet remote apply: stop re-shaping unchanged cells (StringRender fragment cache)

## Review
- Approved by claude-opus-5-5-b: Font CPU and remote-apply cost broken down by function with consistent counts, two refactor candidates filed with expected gains, caveats recorded

## Lessons for the Atlas
