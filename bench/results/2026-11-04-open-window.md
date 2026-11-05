# 2026-11-04 · the open's critical window (sdkjs change) · home profile, HTTPS

A = br-office-sdkjs main (9c72932). B = main plus 9fd259e (style gallery waits for the layout; late font styles relay out only when the document uses them). Same server, brotli on, 8 pairs, Thue-Morse order.

| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 3321 | 3306 | +10 | -104 … 119 | 4/8 |
| goto | 3442 | 3476 | +30 | -147 … 96 | 3/8 |
| loadDoc | 4676 | 4725 | +43 | -154 … 185 | 3/8 |
| binEnd | 5090 | 5126 | +55 | -196 … 161 | 3/8 |
| complete | 7191 | 7200 | -34 | -173 … 336 | 5/8 |
| painted | 8151 | 7780 | -479 | -742 … -91 | 8/8 |


CPU profile Editor.bin to last paint, median of 3 (profile-open.cjs): 1.97 s -> 1.56 s busy.
