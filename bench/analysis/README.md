# Analysis tools: what the open actually executes, and what a bundle split could save

These scripts answer, with measurements, the question behind the "editor in parts" lever: which parts of
`sdkjs/word/sdk-all.js` does opening a document use, which files could be loaded later or never, and would a
smaller bundle make the open faster. They complement `../open-journey-ab.cjs`, which is the proof step.

All of them run against the Document Server on this machine (HTTPS with the bench certificate, see `BENCH_CERT`)
and the sdkjs checkout next to this repo (`SDKJS_DIR`, default `../sdkjs` or `../br-office-sdkjs`).

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH="$(npm root -g)"

# 1. V8 precise coverage of the open (and a little typing), every range with its count
node coverage-open.cjs https://localhost ../samples/aluno-moderno.docx coverage.json

# 2. Bytes executed per source file, through the bundle's source map (build with SDK_SOURCE_MAPS=1)
node --max-old-space-size=6000 coverage-map.cjs sdk-all.js sdk-all.js.map coverage.json open

# 3. Functions called per source file: a file whose only called function is its wrapper is unused at open
node --max-old-space-size=6000 coverage-functions.cjs sdk-all.js sdk-all.js.map coverage.json ../sdkjs/configs/word.json

# 4. Can a set of files move to a later chunk? Load-time references from the files that stay, bare variables
#    shared through the sdk-all wrapper, symbols both sides assign, and the runtime entry points to gate
node deps-check.cjs ../sdkjs '^(pdf/(src/|apiBuilder)|word/apiBuilder|word/Editor/(Comparison|Merge)\.js)'

# 5. Main-thread cost of each script during the open (EvaluateScript / compile, from a Chrome trace)
node trace-eval.cjs https://localhost ../samples/aluno-moderno.docx trace.json
```

## What they found on 2026-11-05 (aluno-moderno.docx, bundle of main at 4e3fd9e)

- The open executes 24 % of the bundle's bytes (4.3 of 17.6 MB mapped). Only 1 file in 391 executes nothing,
  because every file is an IIFE that registers its classes when the script loads. Counting functions instead:
  195 files (5.3 MB raw, 30 %) have only their wrapper called during the open, 192 after typing too.
  Per-file table: `2026-11-05-coverage-functions-aluno-moderno.txt`.
- The whole PDF editor (52 `pdf/src` files + `pdf/apiBuilder.js`, 1.4 MB raw, about 190 KB brotli) sits inside
  the word bundle because the pdfeditor app loads `sdkjs/word/sdk-all.js`; a .docx never calls it. The document
  builder API, compare and merge (0.7 MB raw) are only entered through plugins, macros and the compare dialog.
  Charts, SmartArt, Math, chart data (cell model), copy/paste and the JSON writers are not called at this open
  either, but the open does call into them (color managers, numbering `ToJson`, paste options, XML parser), so
  they cannot move without refactoring their callers.
- Zero load-time dependencies from the files that would stay to the files that would move, for both
  candidate partitions. But the files that would move read about 50 bare variables (`para_Text`, `g_dKoef_pt_to_mm`,
  `CDocument`, `reviewtype_Add`, ...) that are locals of the `(function(window, undefined){...})(window)` wrapper
  around sdk-all.js. Separate parts would have to be emitted without that wrapper, as `sdk-all-min.js` and the
  develop manifest already are; `sdk-all.js` itself must stay whole because core's doctrenderer (x2t, document
  builder) loads it by name (`DesktopEditor/doctrenderer/editors.cpp`).
- CPU: evaluating sdk-all.js costs about 70 ms on the main thread; its compile (about 400 ms) runs on a background
  thread during the download. The lever is bytes, not CPU.
- Ceiling measured with `../open-journey-ab.cjs`: a bundle without the PDF editor, builder, compare and SmartArt
  layout (2.14 instead of 2.42 MB brotli, −11.7 %) against the full one, 8 pairs, home profile, cache on:
  `loadDoc` −33 ms, `complete` +1 ms, `painted` −1 ms (range −148 … +156, 5/8 pairs). Below the noise floor.
  See `../results/2026-11-05-editor-em-partes.md` for the slow-link run.
