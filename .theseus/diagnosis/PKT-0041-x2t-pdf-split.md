# PKT-0041 — x2t PDF export and save conversion: where the time goes

Measured 2026-11-02 on the factory VM (2 CPUs, 7 GB), **native package** euro-office-documentserver 9.3.7-1,
`/var/www/euro-office/documentserver/server/FileConverter/bin/x2t`, warm page cache, 3 runs each (median shown).
Script: `.theseus/oracle/perf/x2t-split.sh <workdir> <inputs...>` (strace `-f -ttt` on execve/openat/exit_group;
phases are cut at file opens, see the script header). strace adds ≈ 10–20 %: empty docx→pdf is 620–720 ms
without it, 715–940 ms with it; big-300p.docx 9.6 s without, 11.2–12.8 s with.

Samples: `/tmp/eo-samples/new.{docx,xlsx,pptx}` (empty templates, PKT-0016) and
`make-samples.py` outputs big-300p.docx / big-50k.xlsx / big-80s.pptx (PKT-0018). Save = `Editor.bin` (made by
x2t from the docx) + `changes/changes0.json` containing `[]`, converted to docx with `m_bFromChanges=true`:
it takes the full doctrenderer path (open, apply 0 changes, save) but no real change set was available
(the `doc_changes` table is empty), so it is the fixed cost of a save, not the cost of applying edits.

## Phase split (ms, median of 3)

| Input | total | start | native (OOXML→bin) | V8 init | script load | layout / Execute | write |
|---|---|---|---|---|---|---|---|
| new.docx → pdf | 841 | 48 | 13 | 7 | 333 | 413 | 22 |
| new.xlsx → pdf | 682 | 50 | 10 | 6 | 330 | 267 | 17 |
| new.pptx → pdf | 1213 | 59 | 56 | 8 | 330 | 682 | 27 |
| big-300p.docx → pdf | 11897 | 58 | 560 | 6 | 330 | 7526 | 2856 |
| big-50k.xlsx → pdf | 50205 | 71 | 1406 | 13 | 349 | 44274 | 4342 |
| big-80s.pptx → pdf | 5874 | 59 | 466 | 8 | 370 | 3369 | 1257 |
| save, empty (bin+changes → docx) | 933 | 62 | 1 | 10 | 331 | 495 | 60 |
| save, big-300p (bin+changes → docx) | 4044 | 48 | 3 | 7 | 369 | 2310 | 1099 |

Phase definitions: *start* execve → input open (dynamic loading of ~40 .so incl. ICU/V8); *native* → open of
DoctRenderer.config; *V8 init* → open of `sdkjs/<editor>/sdk-all-min.js`; *script load* → open of AllFonts.js
(compile + run of sdk-all-min.js, fonts_native.js, sdk-all.js with `sdk-all.cache`); *layout* → last
`font_selection.bin` open before the output (opening Editor.bin in JS, font engine, layout/recalc, drawing
commands; for save: open + apply changes + serialize); *write* → exit (CPdfFile or OOXML writing, cleanup).

## Which part dominates

- **Small/empty documents (the 0.65 s of PKT-0015):** fixed costs dominate. Script load is a constant
  ≈ 330 ms (≈ 40–50 % of the run) and the first-Execute layout on an empty document is another 270–680 ms,
  most of it JS warm-up (font engine init, first layout of an empty doc; pptx also loads themes).
  Process start + V8 init together are only ≈ 55–65 ms. PDF writing is ≈ 20 ms.
- **Large documents:** layout/Execute dominates (63–88 %), then the writer (13–24 % for docx/pptx,
  9 % xlsx), then the native OOXML read (3–5 %). The 330 ms script load becomes noise.
  big-50k.xlsx → pdf takes ≈ 50 s, 44 s of it in JS layout: by far the worst case (PKT-0018 saw 6.5 s for
  xlsx→xlsx; PDF rendering of 50 k rows is a different, much slower path).
- **Save conversion** has the same fixed ≈ 0.4 s (script load) + JS open/serialize; a big docx save is ≈ 4 s,
  57 % in Execute.

## JS snapshot / code cache

- The package ships `sdk-all.cache` (V8 code cache, 5.3 MB for word) per editor; **no** `sdk-all.bin`
  snapshot. strace shows the cache is opened and read on every run.
- Experiment: renaming `sdkjs/word/sdk-all.cache` made the next run 1087 ms (vs 620–720) and x2t
  **re-created** the cache (as root, not `ds`, mode 644); the following run was back to 772 ms. Original file
  restored afterwards. So the code cache already saves ≈ 400 ms; what remains (≈ 330 ms) is cache
  deserialization + top-level execution of sdk-all.js, which a startup snapshot (`x2t -create-js-snapshots`,
  needs a build with `V8_SUPPORT_SNAPSHOTS`) or a long-lived renderer process would remove.
- Risk seen: a missing/unwritable cache is regenerated silently by whichever user runs x2t.

## Consequence for the plan (DIAG-x2t P3)

The fixed part P3 can cut is ≈ 0.33 s script load + ≈ 0.3–0.5 s first-Execute warm-up per conversion
(process start + V8 init is only ≈ 60 ms). Snapshots address the first; only a persistent/pooled doctrenderer
addresses both. For large files the target is JS layout itself (xlsx→pdf especially), not x2t's C++ side.
