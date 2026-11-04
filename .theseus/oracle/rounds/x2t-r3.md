# x2t, round 3 measurements (PKT-0148, 2026-11-04)

Native Euro-Office 9.3.7-1 stack on the factory VM (2 CPUs, shared; load avg ≈ 2.9 at start). `sdk-all.bin` snapshots present.

## What changed in x2t code since round 2
Nothing. `external/core` (pkt/PKT-0148) and `external/core.base` are both `59458e06`, tree `83b890f3`: one build
serves both sides. Round 2 delivered an oracle fix (PKT-0107), a measurement (PKT-0108: no in-process cut ≥ 0.2 s)
and a serve-integrated correctness fix (PKT-0138). P3 (PKT-0147) has not run and, by its own stop rule, should not.

## Differential oracle `bash .theseus/oracle/differential/x2t.sh` (one run): PASS
- Build cache hit (mirror 83b890f3…-da39a3ee5e6b), 54 libraries replaced, Editor.bin 190 656 bytes.
- Direct: PASS (6 inputs × open/save/own/pdf/odf). Browser: PASS (3 cases, 2 repeats per side), no
  "original side itself unstable" line — PKT-0107's fix held on this run (round 2: 1 of 2 runs failed).

### Direct timing (median of 3, ms, original | new; same binary, spread = VM noise)
| Input | open | save | own | pdf | odf |
|---|---|---|---|---|---|
| new.docx | 65 / 65 | 65 / 65 | 65 / 65 | 469 / 518 | 64 / 65 |
| new.xlsx | 65 / 65 | 65 / 64 | 65 / 65 | 523 / 517 | 115 / 115 |
| new.pptx | 115 / 115 | 115 / 68 | 65 / 68 | 873 / 928 | 115 / 117 |
| text-10p.docx | 115 / 122 | 118 / 116 | 117 / 115 | 1338 / 1406 | 115 / 119 |
| rows-500.xlsx | 117 / 115 | 69 / 65 | 65 / 67 | 1331 / 1329 | 215 / 222 |
| slides-12.pptx | 115 / 115 | 115 / 115 | 115 / 115 | 1272 / 1331 | 117 / 115 |

(The 65/115 ms values are the harness's 50 ms poll quantum; non-PDF directions are ≤ 0.12 s.)

### Browser timing (median of 2, ms, original | new)
| Case | open | join | edit | save | →pdf | →odf | reopen |
|---|---|---|---|---|---|---|---|
| text-10p.docx | 3305 / 3148 | 3134 / 3496 | 10373 / 10340 | 329 / 196 | 226 / 198 | 287 / 207 | 2910 / 2666 |
| rows-500.xlsx | 2744 / 2751 | 2681 / 2724 | 7360 / 7330 | 153 / 128 | 316 / 328 | 180 / 186 | 2409 / 3274 |
| slides-12.pptx | 2994 / 3008 | 3008 / 3110 | 8229 / 8107 | 161 / 151 | 166 / 152 | 189 / 174 | 2794 / 2924 |

## Journeys (round 3 maps, integrated build; not re-run here, they are exclusive)
| Journey | x2t stage | ms p50 | share |
|---|---|---|---|
| convert-docx-pdf | x2t | 1174 | 97.8 % |
| save | x2t | 774 | 13.2 % |
| open-docx-real / 10p / real-internet / 100p | server-open-x2t | 394 / 299 / 267 / 243 | 7.9 / 3.6 / 3.2 / 5.3 % |

## Reading
- Empty template → PDF 0.47–0.93 s vs ≤ 0.12 s for every other direction: the fixed per-process JS warm-up
  is still the x2t cost users feel (lower than round 2's 0.68–1.25 s only because the VM was quieter).
- Round 2 gained users 0 ms in x2t: the binary is unchanged. It did make the oracle usable for a core change.
