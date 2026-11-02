# PKT-0082 — sdkjs shapeFragment cache: made safe for the editor, re-measured, PR text

Patch: `PKT-0077-sdkjs-shape-cache.patch` (updated in place by this packet), `git apply` on Euro-Office/sdkjs
`d9e810c` (main, 2026-11-02; the PKT-0077 base `9cea536` is no longer in the shallow mirror, the patch applies cleanly).
Files: `cell/view/StringRender.js` (+45/−1), `cell/api.js` (+2).

## What changed vs PKT-0077

1. **Gate**: the cache is used only when `window["NATIVE_EDITOR_ENJINE"] === true` (x2t, mobile native).
   There every font file is local and `_loadFonts` returns synchronously, so a fallback shaping cannot be
   cached before the real font. In the browser `shapeFragment` runs the original code path unchanged.
2. **Invalidation**: `AscCommonExcel.clearShapeCache()` is exported and called from
   `spreadsheet_api.asyncFontsDocumentEndLoaded` and `asyncFontEndLoaded`. With the gate it is a no-op
   in the browser today, but it is the hook that lets a later PR enable the cache there.

## Re-measure (native package 9.3.7-1, same checkout built twice, own V8 snapshot per side)

CPU s (user+sys), 2 interleaved runs per side, median (`x2t-cpu-ab.py`):

| Sample | base | patched | saving |
|---|---|---|---|
| v-1sheet-25k | 16.8 | 14.6 | 13 % |
| v-numbers (50k) | 35.6 | 29.8 | 16 % |
| v-1sheet-50k | 33.7 | 25.9 | 23 % |

Same range as PKT-0077 (14–24 %), so the gate is active in x2t. Output: **2 605 / 2 605 pages pixel-identical**
(`pdftoppm -r 50 -png`, byte compare), PDF sizes identical. Installed `sdk-all.js` mtime unchanged.
Build note: `webpack.cell.mjs` was OOM-killed (137) twice at `--max-old-space-size=2500` while other agents ran;
3000 worked.

## PR text (for a human to open on Euro-Office/sdkjs)

**Title:** perf(cell): memoize FragmentShaper.shapeFragment in the native engine (~15–25 % faster xlsx→pdf)

**Body:**

Converting large spreadsheets to PDF with x2t spends a large share of its time in HarfBuzz shaping of cell
text, although most cells repeat the same short strings (labels, codes, small numbers). This PR memoizes
`FragmentShaper.shapeFragment`: results are keyed by (font name, size, bold/italic, PPI Y, code points) and
replayed into the string renderer on a hit (offset, grapheme, width, char). The original body is unchanged
and renamed `private_shapeFragment`; `private_HandleItem` records what it writes. The map is capped at
200 000 entries.

- Enabled only when `NATIVE_EDITOR_ENJINE` is set (x2t / native), where fonts are local and loaded
  synchronously. The browser editor keeps the current behaviour: there fonts load lazily and a fallback
  shaping could otherwise be replayed after the real font arrives.
- `AscCommonExcel.clearShapeCache()` is called when document fonts or a single font finish loading, so the
  cache can later be enabled in the browser safely.

Measured on a 2-CPU VM, xlsx → pdf, one sheet of 25k/50k rows: 13–23 % less CPU; 2 605 rendered pages
byte-identical to the unpatched build (pdftoppm). Memory: at most ~60 MB extra on the largest sample.

Not run: the sdkjs QUnit suites (browser-driven); the browser path is unchanged by construction.
