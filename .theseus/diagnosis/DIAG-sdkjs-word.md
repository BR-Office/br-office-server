---
id: DIAG-sdkjs-word
module: sdkjs-word
verdict: refactor
target_language: null
confidence: low
conditional_on: "P1 (profile open and remote apply in the word editor) shows the time inside external/sdkjs/word, not in sdkjs/common, fonts or the browser"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 70173b0
wave: 0
---

## Summary
**Refactor (performance), conditional on profiling.** Unlike the server modules, this module is where users wait: after Editor.bin arrives the docx editor spends 1.9–2.4 s parsing, laying out and rendering, growing with document size, and the remote co-edit tail is the receiving client applying and recalculating. But nothing yet says which part of the ~428k lines owns that time, and the oracle is not established. The first packets profile the two paths and turn the existing QUnit suites into a runnable oracle; targeted refactors in JavaScript follow. A language change is not justified by the evidence.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, open | Open docx 3.4 s (10 p) → 4.2 s (100 p). After Editor.bin → load complete is the biggest part: 1 860 ms (10 p), 2 394 ms (100 p), +0.5 s with size. The x2t open conversion is only ≈ 0.1 s, script load ≈ 1.5 s. Parse (`Serialize2.js` `BinaryFileReader`), `CDocument.Recalculate` and first render are all in this module, but fonts and common drawing are not, and the split is unmeasured. | baseline.md PKT-0016 open table; PKT-0018 large files; card "How they relate" |
| Goal: speed, co-edit | Remote apply (receiver event → marker in model) 47–73 ms p50, p90 105–143 ms, max 187 ms, larger on the 100-page doc; server segment 4 ms p50. Apply is `CWordCollaborativeEditing` + `*Changes` + recalculation (`Continue_FastCollaborativeEditing`). | baseline.md PKT-0016 co-edit split, PKT-0018 coedit-split |
| Goal: speed, typing | Typing key → char in model → frame p50 75–80 ms, p90 119–156 ms on 10/100-page docs (31 ms on empty doc): above the ~50 ms threshold and growing with size, so local recalculation cost matters. | baseline.md PKT-0014, PKT-0016 |
| Quality and security risk | Very large files: `Document.js` 29k lines, `Paragraph.js` 21k, `Table.js` 20k, `Styles.js` 18k, `Serialize2.js` 18k, `Run.js` 13k. Size concentrates defect risk; no word-specific defect history measured (PKT-0017 covered the server only; ONLYOFFICE/DocumentServer issues cover the whole product). | atlas card Hotspots; baseline.md PKT-0017 |
| Oracle (D1) | Card says `none`, but `external/sdkjs/tests/word/` holds 21 QUnit suites (api, document-calculation, revisions, numbering, styles, merge-documents, js-api…) run headless by `tests/runAll.js` with `node-qunit-puppeteer`. Not yet run here, so treat as `none` until P2 establishes it; enough for refactor once green. | `external/sdkjs/tests/word/`, `tests/runAll.js`, `external/sdkjs/AGENTS.md` Tests |
| Coupling and interop | Plain scripts concatenated by `configs/word.json`, globals on `window` (`AscWord`, `AscCommon`), deep dependency on `sdkjs/common` (History, TableId, collab) and shared drawing. Changes are referenced by object id in TableId; the change binary format is shared with x2t (save assembly). No module boundary to put WASM behind without a large interop surface. | `external/sdkjs/AGENTS.md` Architecture |
| Target language | None now. Rust→WASM for layout would need the model on both sides of the boundary (copying or a shared heap) on every keystroke and remote change; TypeScript is a type-safety option, not a speed one. Reassess after P1 if one compute-bound kernel (e.g. text shaping, line breaking) dominates. | goals.preferred_languages; coupling row |

## Discarded alternatives
- **keep**: the module holds measured user-visible time (≈ 2 s of every open, the co-edit apply tail, typing p90 > 100 ms on medium docs). Doing nothing leaves the largest client cost untouched.
- **migrate (Rust/WASM, TypeScript)**: oracle not established (D1), hotspot not located, and the model is coupled to sdkjs/common globals; a WASM boundary through the document model would add copies per edit. Could come back for an isolated kernel.
- **rewrite**: no evidence the design itself is the problem; the contract (Editor.bin, change format, `asc_docs_api`) is shared with x2t, web-apps and the server.
- **retire**: live editor.

## Path of change
Same language. P1 profiles open and remote apply with Chrome DevTools CPU profiles on the PKT-0016 samples and attributes self/inclusive time to word submodules (serialize, layout/paragraph, table, styles, collab, drawing) vs common/fonts. P2 makes the word QUnit suites run here and records pass/fail as the oracle. Then one refactor packet per hotspot P1 finds (planned in wave 1 after P1, not guessed now), each gated by P2 and a before/after on P1's script. Note: sdkjs is a separate repository (`external/sdkjs`), so its packets touch that checkout.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Profile docx open and remote apply inside sdkjs word |
| P2 | 0 | characterize | Run the sdkjs word QUnit suites as the module oracle |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Profile docx open and remote apply inside sdkjs word
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    goal: With the native stack and the PKT-0016 samples (docx 10 p and 100 p), record Chrome CPU profiles (Playwright + CDP Profiler) of open (Editor.bin received → load complete), typing, and receiver apply of remote changes. Attribute self and inclusive time to word submodules (Serialize2 reader, CDocument.Recalculate/paragraph/table layout, styles, collab apply, Drawing render) versus sdkjs/common, fonts and browser. Use the unminified develop bundle or source maps so frames are named. Add the table to baseline.md.
    context: baseline.md PKT-0016 shows 1.9–2.4 s after Editor.bin and apply p90 105–143 ms, not split. The atlas card sdkjs-word lists the call path. This decides which refactors to plan and whether any kernel is a migration candidate.
  - key: P2
    wave: 0
    type: characterize
    title: Run the sdkjs word QUnit suites as the module oracle
    files: [.theseus/atlas/sdkjs-word.md]
    create_in: [.theseus/oracle]
    depends_on: []
    allowed_commands: ["*"]
    goal: Run the external/sdkjs/tests/word suites headless (npm ci in build, npm run develop, node-qunit-puppeteer as in external/sdkjs/AGENTS.md), record pass/fail, duration and skipped suites, write a wrapper script under .theseus/oracle, and set the card's oracle level and sources.
    context: The card says oracle none, but 21 word suites exist and tests/runAll.js runs them in upstream CI. Refactors in wave 1 are gated on this.
```

## Risks
- Profiling on a 2-CPU VM with headless Chromium may distort the split (font loading, GC); compare proportions, not absolutes.
- Layout refactors can change pagination silently; QUnit coverage of rendering is thin, so P2 may need to be complemented by a pagination/render snapshot on the samples.
- Upstream sync: sdkjs still pulls from ONLYOFFICE; large refactors of `Document.js`/`Paragraph.js` raise merge cost. Keep refactors local to the hotspot.

## What would change this verdict
- If P1 shows < 25 % of the post-Editor.bin open time and of remote apply inside `word/` (time in sdkjs/common, fonts or the browser), move to **keep** and redirect to sdkjs-common / fonts.
- If P1 shows one self-contained compute kernel (e.g. text shaping or line breaking) above 40 % of open with a narrow data interface, consider **migrate** of that kernel to Rust/WASM (needs D3 double diagnosis and P2's oracle).
- If P2 finds the suites cannot run or cover little of layout, the first refactor packet becomes a characterize packet for layout output.
