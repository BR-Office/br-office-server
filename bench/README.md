# Bench: the "open a document" journey, paired A/B

Measures what a user waits for when opening a document in the browser, against a running
Document Server, and compares two variants of the system side by side. It is the proof step of
the method: a change is only "implementable" when B beats A by more than the noise of identical code.

## Rules of the bench

1. **Quiet machine.** Nothing else runs while it measures: no agents, no builds, no other bench.
   The script records the load average of every run; discard a run above 1.5 and say so.
2. **Paired and interleaved.** Each pair runs A then B, the next pair B then A. Drift, caches and
   background noise hit both sides alike. The result is the median of the per-pair differences.
3. **Noise floor first.** Run once with A and B identical (no knobs). The per-pair range of
   `painted` is the floor. A gain smaller than that floor is not a gain.
4. **Cold browser per run.** New browser, no HTTP cache, service worker bypassed: this is the first
   open of a new user, the case Rafael measured at 20 s.
5. **The user's document.** `samples/aluno-moderno.docx` (11 pages, images, tables, CJK fonts) is the
   reference. Synthetic documents are allowed only next to it, never instead of it.

## Running

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers   # or wherever Playwright's Chromium lives
export NODE_PATH="$(npm root -g)"                  # playwright installed globally

# noise floor (A == B), home internet profile
node bench/open-journey-ab.cjs --file samples/aluno-moderno.docx --pairs 7 --net home --out floor.json

# lever 1a: is the example's preloader (all editors' bundles + 7 font families) stealing the link?
node bench/open-journey-ab.cjs --file samples/aluno-moderno.docx --pairs 7 --net home \
  --b-block 'api/documents/preload\.html' --out preload.json

# lever 1b: a rebuilt sdkjs word bundle, installed on the server for side B only (nginx compresses it as in
# production; --serve would hand the browser the raw 18 MB file). Back the installed files up first.
D=/var/www/euro-office/documentserver/sdkjs/word
node bench/open-journey-ab.cjs --file samples/aluno-moderno.docx --pairs 7 --net home \
  --a-cmd "cp -p /backup/sdk-all.js /backup/sdk-all-min.js $D/" \
  --b-cmd "cp /path/to/deploy/sdkjs/word/sdk-all.js /path/to/deploy/sdkjs/word/sdk-all-min.js $D/" --out bundle.json

# a server-side change (nginx cache headers, compression): swap config before each side
node bench/open-journey-ab.cjs --file samples/aluno-moderno.docx --pairs 7 --net home \
  --a-cmd 'sudo cp nginx.base.conf /etc/nginx/includes/ds-common.conf && sudo nginx -s reload' \
  --b-cmd 'sudo cp nginx.new.conf  /etc/nginx/includes/ds-common.conf && sudo nginx -s reload'
```

Network profiles: `home` (50/10 Mbps, 30 ms), `fast` (200/50 Mbps, 10 ms), `none` (localhost).

**The browser cache.** A warm-up page helps a later page only through the browser cache, and two things switch
that cache off: request interception (`--block` and `--serve` install it, for that side only) and an ignored
certificate error. Over HTTPS with a self-signed certificate pass `--cert /etc/nginx/bench-ssl/cert.pem`, which
makes Chromium trust the certificate by its public key instead of ignoring the error. Every run of 2026-11-04 up
to the fonts work ran with the cache off on both sides: the paired differences hold, but the preloader's benefit
was never measured before the run recorded in `results/2026-11-04-cache-on.md`.
Rafael's 20 s was over a real home link with the server elsewhere; `home` is the closest we can
emulate on one machine. Always report which profile a number comes from.

## What a run records

- Marks in ms after the user's action: `upload`, `goto` (editor page), `loadDoc` (asc_LoadDocument
  issued), `binEnd` (Editor.bin received), `complete` (isDocumentLoadComplete), `painted` (layout
  finished and two frames drawn). `painted` is the user's number.
- Downloads by category: fonts, sdk scripts, app scripts, Editor.bin, media, other. Requests and bytes.
- The `Cache-Control` and `Content-Encoding` headers seen on fonts and scripts. If fonts come back
  without a long `max-age` or scripts without compression, that is a lever on its own, visible here
  without touching nginx.
- The eight biggest downloads of the run.

## Reading the result

The summary prints, per mark, the medians of A and B, the median of the per-pair difference, its
range and how many pairs favoured B. Claim a gain only when the median difference is outside the
noise floor's range and most pairs agree.

## Where the levers are (from the pilot's map, 2026-11-04, 8.3 s over the home profile)

| Stage | ms | Owner |
|---|---|---|
| upload of the 2.8 MB file over the 10 Mbps uplink | 2 819 | integrator / example (not the editor) |
| editor shell boot: app.js, sdk bundles and fonts over the link | 1 696 | web-apps + sdkjs + nginx |
| client open in sdkjs word (parse, first layout) | 839 | sdkjs-word |
| layout of the remaining pages and paint | 490 | sdkjs-word |
| fonts: 58 requests, 12.9 MB per cold open | inside the stages above | sdkjs libfont + the example's preloader + nginx |
| x2t conversion | 267 | core |
| DocService | 81 | server |

The first lever to measure is the font traffic. Three facts from the sdkjs source (GlobalLoaders.js,
Drawings/Externals.js, apiBase.js) say where it comes from:

1. `LoadDocumentFonts2` asks every font family the document names with `NeedStyles = 0x0F`: the
   regular, italic, bold and bold-italic files are all downloaded, used or not. The five default
   families (Arial, Symbol, Wingdings, Courier New, Times New Roman) are added to every document.
   `Document_Get_AllFontNames` keeps only names; the style information that would let the loader
   fetch one file instead of four is dropped (the commented `Document_CreateFontMap` block in
   `CheckFontNeeds` is the trace of an earlier attempt).
2. Font files are fetched whole, as TrueType over XHR (`CFontFileLoader.LoadFontArrayBuffer`): no
   subsetting, no WOFF2, no streaming. A CJK family is tens of MB for four files.
3. The example's `preload.html` warms up every editor's bundles and `asc_loadFontsFromServer()`
   (seven families, all styles) in a hidden iframe while the document opens, on the same link.
   Whether a real integrator page does the same (`DocsAPI.DocEditor.warmUp`) decides whether this
   part is the product's problem or the example's.

Order of experiments: (1) noise floor; (2) preloader blocked, to size fact 3; (3) the headers the bench
prints, to size compression and caching without touching nginx; (4) a sdkjs build that loads only the
styles the document uses (fact 1), served with `--b-serve`, which is the first product change worth a packet.
