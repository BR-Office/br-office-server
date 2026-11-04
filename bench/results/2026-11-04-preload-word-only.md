# 2026-11-04 · preloader of the editor about to open (web-apps change) · home profile

Same bench and machine as 2026-11-04-preload.md. A = installed preload.html (all four editors, seven font families). B = the new preload.html served in place of it.

## B = static word-only variant, 7 pairs

| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 5252 | 3303 | -1966 | -2740 … 292 | 6/7 |
| goto | 5435 | 3422 | -2018 | -2764 … 459 | 6/7 |
| loadDoc | 7040 | 4947 | -2059 | -2977 … 4401 | 6/7 |
| binEnd | 7693 | 5436 | -2025 | -2983 … 6303 | 6/7 |
| complete | 11200 | 9022 | -2148 | -3143 … 6049 | 6/7 |
| painted | 12047 | 9787 | -2197 | -3247 … 6260 | 6/7 |

| category | A requests / MB (median) | B requests / MB (median) |
|---|---|---|
| fonts | 47 / 13.02 | 30 / 9.52 |
| sdk | 20 / 19.58 | 8 / 5.17 |
| app | 30 / 2.83 | 22 / 1.09 |
| bin | 1 / 0.02 | 1 / 0.02 |
| media | 7 / 1.02 | 7 / 1.02 |
| other | 70 / 0.21 | 52 / 0.20 |


## B = the exact new source (links injected by script), 4 pairs

| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 4921 | 3292 | -1223 | -2299 … -1164 | 4/4 |
| goto | 5025 | 3422 | -1212 | -2354 … -1211 | 4/4 |
| loadDoc | 6553 | 5146 | -1071 | -2421 … -1050 | 4/4 |
| binEnd | 7035 | 5667 | -1257 | -2583 … -289 | 4/4 |
| complete | 10624 | 9201 | -1287 | -2301 … -1272 | 4/4 |
| painted | 11519 | 10019 | -1368 | -2265 … -1184 | 4/4 |

| category | A requests / MB (median) | B requests / MB (median) |
|---|---|---|
| fonts | 47 / 13.02 | 30 / 9.52 |
| sdk | 21 / 20.92 | 8 / 5.17 |
| app | 30 / 2.83 | 22 / 1.09 |
| bin | 1 / 0.02 | 1 / 0.02 |
| media | 7 / 1.02 | 7 / 1.02 |
| other | 70 / 0.22 | 52 / 0.21 |


One pair of the first run had B slower by 6 s (a server hiccup during that run, load 4.5); the medians and the other 10 pairs agree: about -1.4 to -2.2 s on painted, outside the ±0.9 s floor.
