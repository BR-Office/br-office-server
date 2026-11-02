---
id: DIAG-sdkjs-common
module: sdkjs-common
verdict: refactor
target_language: null
confidence: medium
conditional_on: "Each Wave 1 refactor shows a before/after CPU gain with the PKT-0045 harness (profile-client.js) and passes the P2 oracle; P1 (PKT-0045) showed common is 22-35 % of open CPU but not of font I/O"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 2ea2df5
wave: 0
---

## Summary
**Refactor (performance), revised after P1 (PKT-0045).** sdkjs-common runs in the browser, where most of the user wait is: 1.5–2.4 s after Editor.bin on every open and the co-edit apply tail. P1 measured its share: **22–35 % of open CPU (0.5–0.8 s)**, 5–6 % of Word remote apply and 22 % of spreadsheet remote apply. The premise of the first Wave 1 candidate was wrong: fonts are **not** loaded one at a time. `CheckFontsNeedLoadingLoad` requests every document font at once (served by the service worker) and the 50 ms `check_loaded_list` poll adds only 6–71 ms per open; the font wait is the TTFB of the last font (0.3–1.4 s), below sdkjs. So Wave 1 no longer touches font fetching. It targets the measured CPU instead, in this order: font CPU (libfont glyph measuring/shaping + WASM, 250–300 ms per open), drawings on pptx open (~300 ms), and text measurement during spreadsheet remote apply (336 ms per 20 changes). Each is first characterized, then refactored in JavaScript. Nothing yet justifies a language change.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, open | Open is 3.4–4.4 s; the part after Editor.bin is 1.5–2.4 s. **Measured (P1):** common self time is 720 / 586 / 503 / 794 ms (23 / 22 / 22 / 35 % of busy CPU) on docx 10 p / docx 100 p / xlsx 10 k / pptx 50. Fonts CPU (libfont `file.js`/`map.js`/`textshaper.js` + WASM) is 250–300 ms on every file; drawings (`Drawings/Format/*`) are 296 ms on pptx and 55–88 ms elsewhere; serialize 44–110 ms; charts and coauth are negligible (the samples have no charts). The editor code itself is larger (0.7–1.1 s). **Font I/O:** all 14–25 fonts are requested at once (max in flight = all), the 50 ms poll adds 6–71 ms after the last font, and the font wait is the last font's TTFB (0.3–1.4 s) in the service worker / network / shared CPU, not in sdkjs. During that wait the main thread is 35–80 % busy (browser, web-apps init), so faster fonts alone would not shorten open much. The earlier reading of `_LoadFonts` as serial was wrong. | PKT-0045 baseline section and `perf/client-profile-2026-11-02.json` (commit 2fc5c20); `external/sdkjs/common/GlobalLoaders.js:184-263` |
| Goal: speed, co-edit | Remote apply is 47–73 ms p50 and 105–143 ms p90; the server is 4 ms. **Measured (P1):** in Word, common is 5–6 % of apply CPU (History/TableId/CoApi 13–22 ms for 24 changes); the cost is the word editor's recalculation and the browser, which belongs to DIAG-sdkjs-word. In the spreadsheet, common is 22 % (442 ms for 20 changes), almost all text measurement (libfont + WASM 336 ms) during re-render from `WorksheetView.js`/`StringRender.js`. | baseline.md PKT-0016, PKT-0018; PKT-0045 apply rows (commit 2fc5c20) |
| Goal: speed, other editors | The xlsx open spends 2.3 s loading scripts, against 1.5 s for docx. A large part of every bundle is common (≈395k lines by `wc`), so its size and parse cost are paid by every editor. | baseline.md PKT-0016; atlas card |
| Quality and security risk | Very large files: `ChartsDrawer.js` 21k lines, `Format.js` 21k, `ChartFormat.js` 20k, `editorscommon.js` 16k, `SerializeChart.js` 15k, `wordcopypaste.js` 15k. Changes here affect all five editors, so the risk of regressions is wide. There is no client-side defect history yet (PKT-0017 measured the server only). | atlas card Hotspots; baseline.md PKT-0017 |
| Oracle (D1) | The card says `none`. `external/sdkjs/tests/common/` holds api, charts and color-mods suites, run by `tests/runAll.js` (node-qunit-puppeteer). They haven't been run here, so treat the oracle as `none` until P2 runs them. Font measurement and drawings refactors need their own render/pagination check on the samples (QUnit does not cover them). | `external/sdkjs/tests/common/`; `external/sdkjs/AGENTS.md` Tests |
| Coupling and interop | Every editor depends on common through `window` globals (`AscCommon`, `AscFormat`, `AscFonts`, `AscDFH`). Change objects reference objects by `TableId` id, and the change format is shared with x2t for save assembly. Any boundary (WASM, a worker) would cut through the most-used API in the code. | `external/sdkjs/AGENTS.md` Architecture |
| Target language | None for now. The font engine already uses native/WASM code from `core` (`libfont/engine`). Moving the JS orchestration to Rust/WASM does not address an I/O wait. TypeScript adds safety, not speed. P1 found the compute is spread (fonts 250–300 ms, already partly WASM; drawings ~300 ms on pptx); no single kernel is above 30 % of open, so the migration trigger is not met. | goals.preferred_languages |

## Discarded alternatives
- **keep**: the module sits on the client path that holds most of what users wait for, and font loading shows a likely, cheap gain. Doing nothing leaves it untouched.
- **migrate**: the oracle is `none` (D1), no hotspot has been located, and the module has the widest global coupling in the client. Migration could come back for one isolated kernel.
- **rewrite**: there is no evidence the design is the problem. The contracts (`baseEditorsApi`, the change format, Editor.bin drawings) are shared with every editor, x2t and the server.
- **retire**: this is live code used by every editor.

## Path of change
The language stays the same.
1. P1 (done, PKT-0045) profiled open and remote apply and recorded the font waterfall. Result above.
2. P2 makes the common QUnit suites run here and turns them into the oracle.
3. Wave 1, reshaped by P1. **Dropped:** parallel font fetching (fonts are already fetched in parallel). **Not planned:** replacing the 50 ms poll with an event; it saves ≤ 50 ms per open and touches the loader order before the first render. It can come back as a small follow-up if the other work runs out. The Wave 1 hotspots, ranked by measured CPU and reach:
   1. **Font CPU** (all editors, every open, and 336 ms of spreadsheet remote apply): characterize which libfont calls dominate (glyph measure cache misses, shaping, WASM boundary crossings) — W1a — then a JS refactor (caching or batching measurement) gated by P2 + a before/after with `profile-client.js`.
   2. **Drawings on pptx open** (~300 ms, 35 % of pptx common): characterize `Drawings/Format/*` hot functions — W1b — before any refactor. Coordinate with the slide module.
   3. **Spreadsheet remote apply text measurement**: covered by W1a's refactor; W1a must measure the cell apply rows too.
   Word remote apply is out of common's scope (5–6 %); its time goes to DIAG-sdkjs-word.

The sdkjs code lives in the separate `external/sdkjs` checkout.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Profile the sdkjs common share of open and remote apply, with font waterfall (done: PKT-0045) |
| P2 | 0 | characterize | Run the sdkjs common QUnit suites as the module oracle |
| W1a | 1 | investigate | Break down libfont + WASM CPU on open and spreadsheet remote apply |
| W1b | 1 | investigate | Break down DrawingML (Drawings/Format) CPU on pptx open |

Refactor packets follow W1a/W1b, one per located function group, once P2 is the oracle.

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
  - key: W1a
    wave: 1
    type: investigate
    title: Break down libfont + WASM CPU on open and spreadsheet remote apply
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: [P1]
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    goal: With profile-client.js (PKT-0045) on the PKT-0016 samples, attribute the 250-300 ms fonts self time per open and the 336 ms libfont+WASM time of xlsx remote apply (20 changes) to functions in common/libfont (file.js, map.js, textshaper.js, loader) and to WASM calls. Count calls, glyph-measure cache hits/misses and JS<->WASM crossings. Name one or two refactor candidates with an expected gain, or state that none exceeds 50 ms.
    context: PKT-0045 found fonts are already fetched in parallel (poll tail 6-71 ms), so the font cost left is CPU. Data is in perf/client-profile-2026-11-02.json (commit 2fc5c20).
  - key: W1b
    wave: 1
    type: investigate
    title: Break down DrawingML (Drawings/Format) CPU on pptx open
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: [P1]
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    goal: With profile-client.js on pptx 50 (and docx/xlsx for comparison), attribute the ~300 ms drawings self time of pptx open to functions in common/Drawings/Format and name refactor candidates with an expected gain, or state that none exceeds 50 ms. Coordinate with the sdkjs-slide diagnosis.
    context: PKT-0045 put drawings at 296 ms (35 % of common) on pptx open and 55-88 ms on docx/xlsx.
```

## Risks
- The VM is shared with other packets' measurements: P1 saw run-to-run spread up to 2×. Before/after comparisons need several runs and medians, ideally on a quiet VM.
- The samples have no images or charts, so drawings and charts cost may be underestimated for real documents.
- A font measurement cache change could alter text metrics and so layout; it needs a render/pagination comparison on the samples.
- sdkjs still syncs from upstream ONLYOFFICE, so local refactors of common files raise merge cost. Keep the changes small and local.

## What would change this verdict
- P1 outcome: common is 22–35 % of open CPU, above the 15 % threshold, so **refactor** stands. Fonts arrive in parallel with a 6–71 ms poll tail, so the font *fetching* refactor is dropped (that condition was met).
- If W1a and W1b find no function group worth more than 50 ms per open or per 20 changes, downgrade to **keep** and send the effort to the editor modules.
- If a later profile finds a self-contained compute kernel above 30 % of open (e.g. text shaping or chart layout) with a narrow data interface, consider **migrating** that kernel to Rust/WASM. That needs D3 double diagnosis and P2's oracle.
