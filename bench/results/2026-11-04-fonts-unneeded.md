# 2026-11-04 · fonts the document does not need (sdkjs change) · home profile, HTTPS

A = br-office-sdkjs main (b002c50). B = main plus 62323b2 and 50b7074: East Asian and complex script fonts only where the document has such characters; no fallback font for private use codes; the East Asian width probe asks the font itself first. Same server, brotli on, 8 pairs, Thue-Morse order.

| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 3078 | 3047 | -14 | -314 … 78 | 5/8 |
| goto | 3173 | 3193 | -12 | -298 … 83 | 5/8 |
| loadDoc | 4222 | 4232 | +3 | -340 … 66 | 4/8 |
| binEnd | 4546 | 4578 | +20 | -359 … 89 | 3/8 |
| complete | 6662 | 6198 | -395 | -759 … -216 | 8/8 |
| painted | 7099 | 6612 | -425 | -798 … -114 | 8/8 |

| category | A requests / MB (median) | B requests / MB (median) |
|---|---|---|
| fonts | 14 / 3.69 | 13 / 1.94 |
| sdk | 11 / 6.48 | 11 / 6.49 |
| app | 28 / 1.26 | 28 / 1.26 |
| bin | 1 / 0.02 | 1 / 0.02 |
| media | 7 / 1.02 | 7 / 1.02 |
| other | 53 / 0.17 | 53 / 0.17 |

response headers seen (cache-control | content-encoding → count), side A, first run:

## How the Korean fonts got in

The document has 53 distinct characters, none Korean. Two things fetched Korean fonts anyway (bench/picker-log.cjs):

1. The bullet of its Symbol/Wingdings lists is U+F0B7, a private use code. The character picker, asked to cover it, chose NanumBarunGothic: 4.2 MB raw for one glyph that the list's own font draws.
2. The text shaper's East Asian en width probe measures U+AC00 in every font; Latin fonts have no such glyph, the measurer fell back to NanumGothic and fetched it, then the probe discarded the result.

## Functional check (bench/eafont-check.cjs)

Font files at open 19 → 15, no Korean font. Typing 한글 fetched NanumGothic in 94 ms, layout stayed at 11 pages, no page error.

## Result

Fonts per cold open 3.69 → 1.94 MB (−47 %). Document loaded −0.40 s, last paint −0.43 s, 8/8 pairs each, ranges outside the ±0.6 s floor on the median.
