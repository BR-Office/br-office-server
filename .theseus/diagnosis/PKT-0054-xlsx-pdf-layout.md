# PKT-0054 — xlsx → pdf in x2t: where the 44 s of "layout" go

Measured 2026-11-02 on the factory VM (2 CPUs, shared with other agents), **native package**
euro-office-documentserver 9.3.7-1. Wall time swung 2× with load (big-50k: 50–85 s), so the comparisons
below use **CPU time** (user+sys of x2t, `.theseus/oracle/perf/x2t-cpu.sh`), one run each.

## Answer

The cost is **per-cell text measurement (font shaping) during print drawing**, then drawing-command volume.
It is **not page setup**.

| Share of `asc_nativeGetPDF` (V8 CPU profile, 25k rows, inclusive) | ms | % |
|---|---|---|
| `WorksheetView._prepareCellTextMetricsCache` (measure every cell's text) | 10 563 | 79 |
| — of which `StringRender.measureString` → `FragmentShaper.shapeFragment` (HarfBuzz shaping via `AscFonts.HB_ShapeText`/`HB_ShapeString`, cmap lookups `FT_SetCMapForCharCode`/`GetGIDByUnicode`) | 7 841 / 6 256 | 58 / 47 |
| — of which `Cell._getValue2` (value → formatted text: `format`, `DecodeGeneralFormat`, `_parseNumber`; overlaps with measuring) | 5 398 | 40 |
| `WorksheetView._drawRowBG` (backgrounds/grid per row) | 2 343 | 17 |
| `WorksheetView._drawCellText` (re-renders shaped text into the metafile) | 2 135 | 16 |
| `WorkbookView.calcPagesPrint` (page setup / page breaks; 487 ms of 5 066 at 6k rows) | 427 | 3 |
| total `asc_nativeGetPDF` (profiled, inflated by the 0.5 ms sampler) | 13 453 | 100 |

(Inclusive times overlap, so rows do not add up; call path: `asc_nativePrint → printSheets → drawForPrint →
doDraw → _drawCellsAndBorders`, once per page.) `js_speed=1` (doctrenderer's built-in lap logger) on 12.5k
rows: `NativeOpenFileData` 318 ms, `asc_nativeCalculateFile` 0, `asc_nativePrintPagesCount` 0,
**`asc_nativeGetPDF` 8 260 ms** — everything is in the render call. After it, the native PDF writer adds ≈ 4 s
(PKT-0041 "write").

## Experiments (x2t xlsx → pdf, CPU s)

| Variant (`xlsx-variants.py`) | CPU | max RSS | pages |
|---|---|---|---|
| 1 sheet, values, 6 250 rows | 7.0 | 290 MB | — |
| 1 sheet, values, 12 500 rows | 11.4 | 399 MB | — |
| 1 sheet, values, 25 000 rows | 19.8 | 617 MB | 521 |
| 1 sheet, values, 50 000 rows | 37.9 | 982 MB | 1 042 |
| same + fitToWidth=1, fitToHeight=0 | 38.1 | 986 MB | 1 042 |
| same, numbers only (no text column) | 39.8 | 997 MB | 1 042 |
| 3 sheets (50k+10k+10k), values | 40.3 | 985 MB | 1 042 |
| 3 sheets, formulas (no cached values) | 53.1 | 1 083 MB | 1 042 |
| big-50k.xlsx (PKT-0018 sample) | 55.1 | 1 088 MB | 1 042 |

- **Linear** in rows: ≈ 0.7 ms CPU per row ≈ 35 ms per printed page (8 columns, ~48 rows/page).
  No quadratic term, so no repeated whole-sheet work per page.
- **Page setup does not matter**: fit-to-width gives the same time (8 columns already fit one page wide).
- **Text vs numbers does not matter**: numbers are formatted then shaped like text; same cost.
- **Only the active sheet is printed** (1 042 pages for 3 sheets = sheet 1 only); the other 20k rows cost
  only their load (+2 s).
- **Formulas without cached values add ≈ 13–15 s** (53 vs 40 s): openpyxl writes no cached values, so x2t
  recalculates on open (incl. `SUM(G$2:Gi)` for i < 2000, ≈ 2 M references). Real Excel files carry cached
  values; this part of the 44 s is a sample artifact, not a print cost.

## Where to act (not done here: sdkjs is read-only in `external/`)

1. **Cache shaping results by (font, size, text)** in the print path. Every cell is measured with a fresh
   HarfBuzz shaping pass; columns of repeated words/number shapes would hit a cache. Expected: most of the
   58 % in `measureString`.
2. **Skip measurement for cells that need no width** (right-aligned numbers that fit, no wrap/shrink): the
   print path builds the full text-metrics cache only to place text.
3. **Formatted-value cache** (`Cell._getValue2` 40 %) is per cell; a per-(number format, value) cache would
   help only for repeated values.
4. Drawing (`_drawRowBG` + `_drawCellText`, ≈ 33 %) is command volume; reducing it needs bigger changes
   (batched row backgrounds, glyph runs).

## Tools added

- `.theseus/oracle/perf/x2t-cpu.sh` — CPU/wall/RSS of x2t → pdf (stable on a shared VM).
- `.theseus/oracle/perf/xlsx-variants.py` — the variants above.
- `.theseus/oracle/perf/x2t-cpuprofile.js` — **V8 CPU profile of x2t** through doctrenderer's built-in
  inspector (`V8_USE_INSPECTOR=1`, websocket on port 8080). The inspector reads messages only while V8 is
  paused, so the client pauses before each script (`setInstrumentationBreakpoint beforeScriptExecution`),
  wraps `asc_nativeGetPDF` to hit `debugger` when it returns, and stops the profiler there. Saves a
  `.cpuprofile` (open in Chrome DevTools) and prints top self-time with a source snippet (names survive in
  `sdk-all-min.js` for prototype methods). Profiling inflates time ≈ 1.6×; proportions are what matter.
