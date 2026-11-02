# PKT-0077 — shapeFragment cache ported to sdkjs source, built, re-measured with the V8 snapshot

Follow-up of PKT-0069 (`PKT-0069-shape-cache.md`). Measured 2026-11-02 on the factory VM (2 CPUs, 7 GB, shared
with other agents), **native package** euro-office-documentserver 9.3.7-1, x2t xlsx → pdf.

## What was done

- **Source patch**: `PKT-0077-sdkjs-shape-cache.patch` against Euro-Office/sdkjs `9cea536` (main, 2026-11-02),
  one file, `cell/view/StringRender.js`, +34/−1. `FragmentShaper.prototype.shapeFragment` looks up a module-level
  `Map` keyed by (font name, size, bold|italic, PPI Y, code points); a hit replays (offset, grapheme, width, char)
  into the string renderer; a miss runs the original body (renamed `private_shapeFragment`) while
  `private_HandleItem` records what it writes. Cap 200 000 entries. Same logic as the PKT-0069 prototype, but
  written in the source instead of a wrapper on build output (no prototype monkey-patching per call).
- **Build**: `cd build && NODE_OPTIONS=--max-old-space-size=2500 npx webpack --config webpack.cell.mjs`
  (production, terser). Built **twice from the same checkout**: once clean (baseline), once patched, so both
  sides use the same sdkjs revision and toolchain (the installed 9.3.7 sdk-all.js is a different build).
  The first attempt of this packet was OOM-killed without the heap cap while other agents were running.
- **Snapshot**: `.theseus/oracle/perf/sdkjs-mirror.sh <dir> <sdk-all.js>` builds a mirror install (bin copied,
  rest symlinked, editor dirs real with symlinked files, no `.bin/.cache` carried over) and runs
  `x2t -create-js-snapshots` there, so each side runs with its own freshly generated `sdk-all.bin`.
  Installed files untouched (mtimes checked before/after).
- **Measure**: `.theseus/oracle/perf/x2t-cpu-ab.py` — CPU (user+sys) of each x2t run, base/patched interleaved.

## Results (CPU s, 2 interleaved runs per side, median)

| Sample (`xlsx-variants.py`) | base | patched | saving |
|---|---|---|---|
| 1 sheet, 25k rows (16.7 / 18.9 vs 15.4 / 14.4) | 17.8 | 14.9 | 16 % |
| 1 sheet, 50k rows, numbers only (34.7 / 38.5 vs 31.5 / 31.6) | 36.6 | 31.5 | 14 % |
| 1 sheet, 50k rows (36.9 / 34.1 vs 27.1 / 26.5) | 35.5 | 26.8 | 24 % |

Max RSS: reported via RUSAGE_CHILDREN (max over all runs so far), so only an upper bound: ≤ +60 MB seen.
**Output: 2 605 / 2 605 pages pixel-identical** (`pdftoppm -r 50 -png`, byte compare of each page PNG:
25k 521/521, numbers 1042/1042, 50k 1042/1042); PDF sizes identical.

## Reading

- The PKT-0069 range holds with the snapshot and a real build: **14–24 %** less CPU on large xlsx → pdf.
  The PKT-0069 numbers-only 26 % did not reproduce (14 % here); the base side swings ±2 s between runs on this
  VM, so take ≈ 15–25 % as the expected range.
- The snapshot does not change the picture: it removes fixed start-up cost, while the saving here is per-cell
  shaping work inside `asc_nativeGetPDF`.
- Not done: sdkjs unit tests (QUnit, browser-driven) were not run against the patched build; hit rate is still
  not instrumented. The patch is behaviour-preserving by construction (same inputs → recorded outputs) and the
  page comparison is the regression oracle used.

## Verdict

Ready as a **carried patch** (`PKT-0077-sdkjs-shape-cache.patch`, `git apply` on sdkjs) and as the body of an
upstream PR to Euro-Office/sdkjs. Opening the PR is an outward action left to humans / a follow-up packet.
**Risk to settle before upstreaming (interactive editor):** the key does not capture whether the font file
is loaded yet. In the browser, fonts load lazily; a text shaped with a fallback before the real font arrives
would be replayed with fallback glyphs/widths afterwards. The PR should clear the cache when fonts finish
loading (or enable it only in the native/x2t path). In x2t all fonts are local and the process is short-lived,
so the measured case is not affected.
