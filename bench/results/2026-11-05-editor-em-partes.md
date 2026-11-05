# 2026-11-05 · "Editor em partes": the ceiling of a smaller sdk-all.js, measured before building it

Lever chosen after the fonts work: split `sdkjs/word/sdk-all.js` (2.42 MB brotli) so the open downloads only what
it uses. Before building the loader, the ceiling of the gain was measured: a bundle built without the files a
.docx never calls (the PDF editor, the document builder API, compare/merge, the SmartArt layout engine) against
the full bundle from the same tree. The trimmed bundle is what the base part of a split would be, so its open is
the best a split can do for `painted`; the deferred parts would download after it.

What the open executes, which files could move and why only these: `../analysis/README.md`.

Sides: A = main at 4e3fd9e, production build (sdk-all.js 2 423 253 B brotli q11); B = same tree without
`pdf/src/*`, `pdf/apiBuilder.js`, `word/apiBuilder.js`, `word/Editor/Comparison.js`, `word/Editor/Merge.js`,
`common/SmartArts/SmartArtTree.js`, `common/SmartArts/DefaultStructures.js` (2 139 964 B, −11.7 %). B opens and
edits the document without errors (`../check-open.cjs`). Cache on, certificate trusted by public key, Thue-Morse order.

## Home profile (50/10 Mbps, 30 ms), 8 pairs

| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 2833 | 2826 | -9 | -78 … 81 | 6/8 |
| goto | 2968 | 2943 | -34 | -65 … 111 | 5/8 |
| loadDoc | 3735 | 3720 | -33 | -129 … 69 | 5/8 |
| binEnd | 4276 | 4278 | -21 | -168 … 68 | 6/8 |
| complete | 5128 | 5117 | +1 | -123 … 65 | 4/8 |
| painted | 5448 | 5467 | -1 | -148 … 156 | 5/8 |

sdk bytes per open: 3.71 MB (A) vs 3.44 MB (B). The sdk-all.js download itself took 704 ms (A) and 665 ms (B) in
the sampled runs: the 283 KB saved are worth about 40 ms on this link, and that is what `loadDoc` shows. Nothing of
it reaches `complete` or `painted`: after `loadDoc` the critical path is the server conversion, the fonts and the
client's parse and layout, which do not depend on the bundle.

## Slow profile (10/2 Mbps, 60 ms), 6 pairs

| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |
|---|---|---|---|---|---|
| upload | 11977 | 11991 | +22 | -40 … 44 | 2/6 |
| goto | 12161 | 12181 | +44 | -42 … 64 | 2/6 |
| loadDoc | 13169 | 13165 | +39 | -191 … 70 | 2/6 |
| binEnd | 13536 | 13556 | +14 | -235 … 110 | 3/6 |
| complete | 16379 | 16420 | +71 | -198 … 125 | 1/6 |
| painted | 16634 | 16648 | +77 | -217 … 198 | 1/6 |

No gain either, and the marks say why: `goto → loadDoc` is 1.0 s on both sides although 3.7 MB of sdk scripts
would take 3 s at 10 Mbps. The example page warms the cache (`DocsAPI.DocEditor.warmUp`, the editor-only
preloader merged on 2026-11-04) while the 12 s upload runs, so the editor finds sdk-all.js in the browser cache
and its size never reaches the critical path. On this link the open after the upload is 4.7 s, of which
`binEnd → complete` is 2.8 s: the fonts (1.94 MB, about 1.6 s of transfer) and the first layout. The images are
not even requested before the paint (media 0 requests), they come later.

## Slow profile without any warm-up (preloader blocked on both sides, cache off), 6 pairs

(run in progress at the time of this commit; the next commit fills it in)

## Reading

- At the home profile the whole lever is below the noise floor (±0.3 s), even at its ceiling. The bundle's
  download runs in parallel with the shell's boot (app.js, UI, DocInfo) and both finish around the same time;
  cutting one alone does not move `loadDoc` much, and the later marks are bound by other work.
- Wherever the integrator warms the cache (`DocsAPI.DocEditor.warmUp`, as the example does), the bundle's size
  is hidden behind whatever the user does before the editor opens, on any link. Without warm-up the saving is
  the bytes over the link: (measured in the run above)
- The returning user has sdk-all.js in the browser cache for a year (`max-age=31536000, immutable`), so the split
  only ever helps the first open on a device.
- The CPU side is small: evaluating sdk-all.js costs about 70 ms on the main thread; its compile (about 400 ms)
  happens on a background thread while it downloads (`../analysis/trace-eval.cjs`).
- What a real split would need, for the record: the parts emitted without the sdk-all IIFE wrapper (about 50 bare
  variables are shared through it), `sdk-all.js` kept whole for core's doctrenderer and the desktop app, a loader
  in `AscCommon.loadSdk` that fetches the pdf part only for the PDF editor and a deferred part after the document
  is shown, with gates on plugins' `callCommand`, macros and compare/merge until it arrives. Two load-time guards
  in word code (`wordcopypaste.js` `instanceof AscPDF.PDFSelectedContent`, `ChartFormat.js` `instanceof
  AscPDF.CPDFDoc`). Zero load-time dependencies otherwise (`../analysis/deps-check.cjs`).

Verdict by the bench's rule (a gain must beat the noise of identical code): not implementable as a latency lever
for the home profile. Not implementable at the slow profile either, as long as the integrator warms the cache.
