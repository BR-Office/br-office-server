# PKT-0069 — text-shaping cache in the sdkjs xlsx print path (prototype)

Measured 2026-11-02 on the factory VM (2 CPUs, shared), **native package** euro-office-documentserver 9.3.7-1,
x2t xlsx → pdf, CPU time (user+sys) with `.theseus/oracle/perf/x2t-cpu.sh`. Samples from `xlsx-variants.py`.

## Setup (local copy, installed files untouched)

- Mirror tree in the scratchpad: `server/FileConverter/bin` copied (so `DoctRenderer.config`'s `../../../sdkjs`
  resolves to the mirror), everything else symlinked to `/var/www/euro-office/documentserver`, `sdkjs/cell`
  a real directory with a writable copy of `sdk-all.js`.
- **The code x2t runs is `sdkjs/cell/sdk-all.js`**, not `sdk-all-min.js` (2 MB, holds no `StringRender`).
  `sdk-all.bin`/`sdk-all.cache` (V8 snapshot/code cache) were moved out of the mirror so the edited JS is
  compiled; the unpatched mirror gives the same CPU as the installed x2t (19.8–20.5 s vs 19.8 s in PKT-0054),
  so the cache files are not a speed factor here.
- Patch: `.theseus/oracle/perf/sdkjs-shape-cache.py <copy of sdk-all.js>` wraps
  `FragmentShaper.prototype.shapeFragment` with a `Map` keyed by (font name, size, bold|italic, PPI,
  code points). A miss shapes as before and records what `private_HandleItem` wrote (offset, grapheme,
  width); a hit replays it into `charProps/charWidths/chars`. Cap 200 000 entries. ≈ 15 lines.

## Results (CPU s, one run each unless noted)

| Sample | original | with cache | saving |
|---|---|---|---|
| 1 sheet, 25k rows (2 runs) | 19.8 / 18.7 | 16.5 / 15.6 | ≈ 17 % |
| 1 sheet, 50k rows | 36.8 | 30.9 | 16 % |
| 1 sheet, 50k rows, numbers only | 42.3 | 31.3 | 26 % |

Max RSS +50 to +90 MB (cache entries). **Output: 521/521 pages of the 25k PDF render pixel-identical**
(`pdftoppm -r 50`, byte compare of PNGs); the PDF bytes differ only in metadata (byte 4680, line 29).

## Reading

- The cache removes ≈ 1/4–1/3 of the shaping cost (58 % of `asc_nativeGetPDF` in PKT-0054), not all of it:
  in these samples half the columns (id, price, totals) are near-unique values, so they always miss.
  Hit rate was not instrumented (x2t gives no console channel from the patch); estimated from the data shape.
- Real sheets with repeated labels, codes, dates and small integers will hit more; sheets of unique
  decimals hit less. The numbers-only sample gained more (26 %), from a single run on a loaded VM;
  part of that is likely noise. Treat 16–26 % as the range.
- Not prototyped: "skip measurement for numbers that fit". It would hit the unique-number columns the cache
  misses, but changes layout logic (`_prepareCellTextMetricsCache` uses widths for overflow/`###`), so it needs
  visual regression tests before any trust; the cache is behaviour-preserving by construction.

## Verdict

**Worth it, but as a small carried patch / upstream PR, not a broad fork.** ≈ 16–26 % less x2t CPU on large
xlsx → pdf, identical output, ≈ 15 lines in one function, bounded memory. The risk is maintenance of a patch
on minified build output; it should be applied in the sdkjs *source* (`cell/view/StringRender.js`) and
built, then measured again with the snapshot (`sdk-all.bin`) regenerated. Follow-up requested in `.theseus/spawn/`.
