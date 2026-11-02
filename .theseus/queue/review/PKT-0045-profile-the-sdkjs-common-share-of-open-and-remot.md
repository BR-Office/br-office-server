---
id: PKT-0045
title: Profile the sdkjs common share of open and remote apply, with font waterfall
type: investigate
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:P1
depends_on: []
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
  - Existing tests keep passing unchanged
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
With the native stack and the PKT-0016 samples (docx 10p/100p, xlsx 10k, pptx 50), record Chrome CPU profiles (Playwright + CDP) of open (Editor.bin received → load complete) and receiver apply. Attribute self/inclusive time to sdkjs/common submodules (fonts/GlobalLoaders+libfont, drawings, charts, serialize, coauth/History/TableId) vs editor-specific code vs browser. Record the font waterfall (request/response times per font file and idle gaps from the 50 ms check_loaded_list poll) and the onLoadFonts client log. Use unminified develop sources or source maps. Add the table to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `P1`).
baseline.md PKT-0016 shows 1.5–2.4 s after Editor.bin and 14–25 font files per open, not split. GlobalLoaders.js:184-263 loads fonts serially with a 50 ms polling timer. Coordinate with sdkjs-word P1 (same harness) to avoid duplicate work.

## Suggested plan

## Executor log
claude-opus-5-5, 2026-11-02. Deliverables: `.theseus/oracle/perf/profile-client.js` (harness), raw
`.theseus/oracle/perf/client-profile-2026-11-02.json`, section "Client: sdkjs/common share of open and remote apply, font
waterfall (PKT-0045)" in `.theseus/oracle/baseline.md`. Acceptance has no commands; the harness ran end to end
(4 files x 3 cold opens + 2 co-edits, ~4 min).
Decisions:
- Sources: no unminified develop build or source map is installed (`sdkjs/develop/` holds only stubs). The installed
  `sdk-all.js` / `sdk-all-min.js` keep function names, so frames are mapped back to source files with anchors: names
  declared `function Name(` in exactly one file of `configs/<editor>.json` and present once in the bundle (85-95 % of
  files anchored). `sdk-all-min.js` holds the `sdk.min` list (apiBase, docscoapi, HistoryCommon, TableId, libfont loader),
  mapped separately; a first version that ignored this put coauth at 0.
- Self time is the headline; inclusive is in the JSON but inflated by callbacks (font loader end callback runs the open).
- Remote apply = B's samples in 300 ms after each incoming `saveChanges` WebSocket frame (CDP timestamps); a first version
  counting the whole 16 s loop was half background work (advisor review). Every change arrived (24 frames docx, 20 xlsx).
- Remote apply for docx and xlsx only (pptx co-edit not driven), as DIAG P1 names word and cell.
- Coordination with sdkjs-word P1 (PKT-0043, in progress elsewhere): not possible from this worktree; this harness is
  separate from `client-breakdown.js` and does not touch the word oracle.
Surprises:
- Fonts are NOT loaded serially: all document fonts are requested at once and served via the editor service worker;
  the 50 ms poll only adds a 6-71 ms tail. The DIAG Wave 1 "parallel font fetching" has no target -> spawn request.
- Fonts cost CPU (libfont + WASM 250-300 ms per open), more than their poll.
- Run-to-run spread up to 2x (docx 10 p window 2.8-5.5 s): the VM is shared with other packets' measurements.
Not done: nginx-side font timing (DS nginx has `access_log off`); documents with images/charts (samples have none).

## Spawned packets
- PKT-0059: Revise DIAG-sdkjs-common Wave 1 with the PKT-0045 profile (fonts already parallel)

## Review

## Lessons for the Atlas
