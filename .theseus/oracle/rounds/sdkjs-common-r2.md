# sdkjs-common, round 2 measurements (PKT-0105, 2026-11-03)

Native Euro-Office 9.3.7-1 Document Server on the factory VM (2 CPUs, shared). Original = `external/sdkjs.base` (9cea536),
new = `external/sdkjs` (0f61ccc, round 1 merged: PKT-0078 sha256-free style key, PKT-0084 script-direction fast path,
PKT-0085 recalculateTextStyles cache, PKT-0090 test repairs; plus sdkjs-word changes under word/).

## Unit oracle
`bash .theseus/oracle/sdkjs-common.sh`: **7/7 suites, 10341/10341 assertions, 23 s** (round 1 P2 had 6 suites;
PKT-0084 added libfont/script-direction 14/14).

## Differential oracle (original against new)
`bash .theseus/oracle/differential/sdkjs-common.sh`: **PASS**, 3 cases; model, sentA, sentB, shown, reopened and
converted are the same in every case. Timings (ms, one run each, two invocations):

| case | run | open orig → new | join | edit | reopen |
|---|---|---|---|---|---|
| shapes.pptx | 2 | 7137 → 7295 | 4665 → 5184 | 2749 → 2835 | 5649 → 4801 |
| chart.pptx | 1 | 4529 → 4194 | 5129 → 4767 | 2312 → 2216 | 4376 → 6105 |
| chart.pptx | 2 | 5923 → 5752 | 6148 → 7652 | 3349 → 3426 | 4359 → 4445 |
| text.docx | 1 | 5635 → 5577 | 5075 → 4470 | 5147 → 3271 | 8464 → 5558 |
| text.docx | 2 | 7012 → 5667 | 6828 → 5503 | 4970 → 6321 | 7130 → 7684 |

The same case moves 20–40 % between invocations of the *same* build; original-vs-new differences are inside that
spread and change sign. No open-time gain is visible end to end.

## Round 1 packet measurements (from their logs)
| packet | change | local gain | end-to-end |
|---|---|---|---|
| PKT-0078 | style cache key without sha256 | key path 111 → 23.5 ms (−88 ms) on deck-50 | busy open medians 2063 → 2327 ms (spread 1724–2965): not visible |
| PKT-0084 | hb_get_script_horizontal_direction fast path | fn self ~20–35 → 0–6 ms | busy/open within noise |
| PKT-0085 | recalculateTextStyles cache (placeholders, empty history) | not measured | not measured |
| PKT-0080 | (same candidate as 0084) | — | blocked (acceptance placeholder) |

Common's remaining CPU (PKT-0072/0073): fonts 170–280 ms per open spread thin, glyph cache 98–99 % hits; drawings
282–290 ms on pptx, flat, no function above 31 ms self. The one large candidate left (xlsx remote apply re-shaping,
~200–250 ms per 20 changes, `cell/view/StringRender.js`) belongs to sdkjs-cell.

Not re-profiled with `profile-client.js`: it attributes the *installed* bundles, which do not contain the fork
changes, so it would measure the original only; the differential runs above are the original-vs-new comparison.
