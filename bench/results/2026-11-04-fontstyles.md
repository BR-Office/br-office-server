# 2026-11-04 · font styles on demand (sdkjs change) · home profile

Same bench and machine. Both sides use the new editor-only preloader. A = installed sdkjs word bundle 9.3.7. B = word bundle built from br-office-sdkjs claude/charming-davinci-g4dbxi (commit 7913a40), installed on the server for its side so nginx compresses it. 7 pairs.

| binEnd | 5786 | 5936 | +116 | -1151 … 1152 | 3/7 |
| complete | 9329 | 8400 | -930 | -1212 … -686 | 7/7 |
| painted | 10132 | 9888 | -259 | -589 … 13 | 6/7 |

| category | A requests / MB (median) | B requests / MB (median) |
|---|---|---|
| fonts | 30 / 9.52 | 18 / 6.96 |
| sdk | 11 / 8.88 | 11 / 8.83 |
| app | 27 / 1.66 | 27 / 1.66 |
| bin | 1 / 0.02 | 1 / 0.02 |
| media | 7 / 1.02 | 7 / 1.02 |
| other | 53 / 0.21 | 53 / 0.21 |

response headers seen (cache-control | content-encoding → count), side A, first run:
  fonts: {"public, max-age=31536000 | identity":1,"public, max-age=31536000, immutable | gzip":29}
  sdk: {"public, max-age=31536000, immutable | gzip":11}
  app: {"public, max-age=0 | gzip":8,"- | identity":1,"public, max-age=31536000, immutable | gzip":14,"public, max-age=31536000, immutable | identity":4,"no-store, no-cache, must-revalidate | gzip":2}

biggest downloads, side A, first run:
  3.22 MB  /sdkjs/word/sdk-all.js
  3.22 MB  /9.3.7-4828136cf8426105c71be8aec88a8141/sdkjs/word/sdk-all.js
  2.13 MB  /9.3.7-4828136cf8426105c71be8aec88a8141/fonts/140
  2.01 MB  /9.3.7-4828136cf8426105c71be8aec88a8141/fonts/139

## Reading

- Font files per cold open: 30 → 18, 9.5 MB → 7.0 MB (−2.6 MB, −27 %). NanumBarunGothic bold (2.1 MB), DejaVu Sans bold/italic/bold-italic, Liberation Sans/Serif/Mono bold/italic/bold-italic and Carlito bold-italic are no longer downloaded at open.
- `complete` (isDocumentLoadComplete) −930 ms median, 7/7 pairs, range −1.2 … −0.7 s. The noise floor on `complete` had a −0.4 s bias toward B with identical code, so the honest estimate is −0.5 … −0.9 s.
- `painted` −259 ms median, 6/7 pairs, range −0.6 … +0.01 s: inside the ±0.9 s floor. After load-complete the remaining layout and paint is CPU, not bytes, so the saved download shows up at `complete` and not at the last paint on this link; on a slower link the 2.6 MB weigh more.
- Functional check (fallback-check.cjs): with the new bundle 17 font files load at open (27 before); selecting all and switching bold on fetched the two missing bold-italic files within 0.35 s, layout stayed at 11 pages, no page error.
