---
id: DIAG-sdkjs-common
module: sdkjs-common
verdict: refactor
target_language: null
confidence: low
conditional_on: "P1 (profile the sdkjs/common share of open and remote apply) shows measurable user-visible time inside external/sdkjs/common"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 2ea2df5
wave: 0
---

## Summary
**Refactor (performance), conditional on profiling.** sdkjs-common runs in the browser, where the baseline puts most of the time users wait: 1.5–2.4 s after Editor.bin on every open (parse, **font loading**, layout, first render) and the co-edit apply tail. This module owns font loading, the shared DrawingML/chart model and serializer, and the co-edit client and history, so part of that time is probably here. The code also shows a concrete candidate: fonts load **one at a time**, polled with a 50 ms timer. But the share of time in this module is not measured, and the oracle is `none`. So the first packets profile and characterize, and targeted JavaScript refactors follow. Nothing yet justifies a language change.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, open | Open is 3.4–4.4 s; the part after Editor.bin is 1.5–2.4 s and grows with document size. Each open fetches 14–25 font files. Font loading in `CGlobalFontLoader._LoadFonts` is serial: it takes `fonts_loading[0]`, and if the font isn't ready it re-checks with `setTimeout(…, 50)` before moving to the next (`check_loaded_list`). Worst case, that adds up to 50 ms of idle wait per font that isn't loaded yet, which could reach about 1 s on 20 fonts. The real wait is unmeasured, but the loader itself logs `onLoadFonts` duration (`sendClientLog`). | baseline.md PKT-0016 open table; `external/sdkjs/common/GlobalLoaders.js:184-263` |
| Goal: speed, co-edit | Remote apply (receiver event → marker in model) is 47–73 ms p50 and 105–143 ms p90; the server is 4 ms. Apply goes through `CollaborativeEditingBase`, `TableId` and `HistoryCommon` (common), plus editor-specific recalculation. The split between common and editor code is unknown. | baseline.md PKT-0016, PKT-0018 coedit-split; atlas card "How they relate" |
| Goal: speed, other editors | The xlsx open spends 2.3 s loading scripts, against 1.5 s for docx. A large part of every bundle is common (≈395k lines by `wc`), so its size and parse cost are paid by every editor. | baseline.md PKT-0016; atlas card |
| Quality and security risk | Very large files: `ChartsDrawer.js` 21k lines, `Format.js` 21k, `ChartFormat.js` 20k, `editorscommon.js` 16k, `SerializeChart.js` 15k, `wordcopypaste.js` 15k. Changes here affect all five editors, so the risk of regressions is wide. There is no client-side defect history yet (PKT-0017 measured the server only). | atlas card Hotspots; baseline.md PKT-0017 |
| Oracle (D1) | The card says `none`. `external/sdkjs/tests/common/` holds api, charts and color-mods suites, run by `tests/runAll.js` (node-qunit-puppeteer). They haven't been run here, so treat the oracle as `none` until P2 runs them. The font loader in particular has no test, so a change to it needs an open-time render check on the samples. | `external/sdkjs/tests/common/`; `external/sdkjs/AGENTS.md` Tests |
| Coupling and interop | Every editor depends on common through `window` globals (`AscCommon`, `AscFormat`, `AscFonts`, `AscDFH`). Change objects reference objects by `TableId` id, and the change format is shared with x2t for save assembly. Any boundary (WASM, a worker) would cut through the most-used API in the code. | `external/sdkjs/AGENTS.md` Architecture |
| Target language | None for now. The font engine already uses native/WASM code from `core` (`libfont/engine`). Moving the JS orchestration to Rust/WASM does not address an I/O wait. TypeScript adds safety, not speed. Reassess if P1 finds a compute-bound kernel (shaping, chart layout). | goals.preferred_languages |

## Discarded alternatives
- **keep**: the module sits on the client path that holds most of what users wait for, and font loading shows a likely, cheap gain. Doing nothing leaves it untouched.
- **migrate**: the oracle is `none` (D1), no hotspot has been located, and the module has the widest global coupling in the client. Migration could come back for one isolated kernel.
- **rewrite**: there is no evidence the design is the problem. The contracts (`baseEditorsApi`, the change format, Editor.bin drawings) are shared with every editor, x2t and the server.
- **retire**: this is live code used by every editor.

## Path of change
The language stays the same.
1. P1 profiles open and remote apply in the word and cell editors on the PKT-0016 samples. It attributes time to the common submodules and records the font waterfall: when each font is requested and received, and the idle time between fonts.
2. P2 makes the common QUnit suites run here and turns them into the oracle.
3. Wave 1 adds one refactor per hotspot P1 finds. The likely first one is parallel font fetching, or fetching without the 50 ms poll in `GlobalLoaders.js`. Each refactor is gated by P2 plus a before/after with P1's script.

The sdkjs code lives in the separate `external/sdkjs` checkout.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Profile the sdkjs common share of open and remote apply, with font waterfall |
| P2 | 0 | characterize | Run the sdkjs common QUnit suites as the module oracle |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Profile the sdkjs common share of open and remote apply, with font waterfall
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    goal: With the native stack and the PKT-0016 samples (docx 10p/100p, xlsx 10k, pptx 50), record Chrome CPU profiles (Playwright + CDP) of open (Editor.bin received → load complete) and receiver apply. Attribute self/inclusive time to sdkjs/common submodules (fonts/GlobalLoaders+libfont, drawings, charts, serialize, coauth/History/TableId) vs editor-specific code vs browser. Record the font waterfall (request/response times per font file and idle gaps from the 50 ms check_loaded_list poll) and the onLoadFonts client log. Use unminified develop sources or source maps. Add the table to baseline.md.
    context: baseline.md PKT-0016 shows 1.5–2.4 s after Editor.bin and 14–25 font files per open, not split. GlobalLoaders.js:184-263 loads fonts serially with a 50 ms polling timer. Coordinate with sdkjs-word P1 (same harness) to avoid duplicate work.
  - key: P2
    wave: 0
    type: characterize
    title: Run the sdkjs common QUnit suites as the module oracle
    files: [.theseus/atlas/sdkjs-common.md]
    create_in: [.theseus/oracle]
    depends_on: []
    allowed_commands: ["*"]
    goal: Run external/sdkjs/tests/common suites headless (npm ci in build, npm run develop, node-qunit-puppeteer as in external/sdkjs/AGENTS.md), record pass/fail, duration and skipped suites, write a wrapper script under .theseus/oracle, and set the card's oracle level and sources. Note what is not covered (font loading, co-edit apply) so refactors there add their own checks.
    context: The card says oracle none; tests/common has api, charts and color-mods suites run by tests/runAll.js upstream. Wave-1 refactors are gated on this.
```

## Risks
- On a 2-CPU VM with headless Chromium and server on localhost, font fetch latency is close to zero. The 50 ms poll then dominates the font wait in a way that may differ from a real network. Measure both: with and without network throttling.
- Parallel font loading changes the order of events before the first render. Text measured with a fallback font could cause layout to re-run, so the refactor needs a render/pagination comparison on the samples.
- sdkjs still syncs from upstream ONLYOFFICE, so local refactors of common files raise merge cost. Keep the changes small and local.

## What would change this verdict
- If P1 shows that common (fonts included) accounts for less than 15 % of post-Editor.bin open time and of remote apply, downgrade to **keep** and send the effort to the editor modules.
- If the font waterfall shows fonts arriving in parallel already, with idle polling under 100 ms per open, drop the font refactor.
- If P1 finds a self-contained compute kernel above 30 % of open (e.g. text shaping or chart layout) with a narrow data interface, consider **migrating** that kernel to Rust/WASM. That needs D3 double diagnosis and P2's oracle.
