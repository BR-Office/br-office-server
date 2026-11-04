# 2026-11-04 · brotli as packaged (BR-Office/br-office-document-server-package) · home profile, HTTPS

The package's own setup, installed on the bench server: web files precompressed at quality 11 (build), fonts and install-time files at quality 5 by documentserver-static-brotli.sh, /etc/nginx/includes/ds-brotli.conf enabled. A = that include removed (gzip, as before). B = include present. Baseline on both sides: editor-only preloader and font styles on demand. Thue-Morse order, 8 pairs.


file aluno-moderno.docx  net home  pairs 8
| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 3546 | 3330 | -184 | -333 … 81 | 7/8 |
| goto | 3714 | 3487 | -167 | -339 … 103 | 7/8 |
| loadDoc | 5091 | 4716 | -283 | -400 … 24 | 7/8 |
| binEnd | 5621 | 5168 | -217 | -524 … 434 | 7/8 |
| complete | 7872 | 7393 | -577 | -682 … -161 | 8/8 |
| painted | 8931 | 8512 | -513 | -765 … -105 | 8/8 |

| category | A requests / MB (median) | B requests / MB (median) |
|---|---|---|
| fonts | 18 / 6.96 | 18 / 6.09 |
| sdk | 11 / 8.84 | 11 / 6.48 |
| app | 28 / 1.73 | 28 / 1.26 |
| bin | 1 / 0.02 | 1 / 0.02 |
| media | 7 / 1.02 | 7 / 1.02 |
| other | 53 / 0.22 | 53 / 0.17 |


Document loaded −0.58 s and last paint −0.51 s, 8/8 pairs each, both ranges outside the noise floor of 2026-11-04-brotli.md.
