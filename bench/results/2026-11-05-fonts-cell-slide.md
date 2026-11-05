# 2026-11-05 · fonts the spreadsheet and the presentation do not need (−6.2 MB and −1.0 MB per open)

The text editor's two font levers of 2026-11-04 (style files on demand; theme East Asian and complex script fonts
only where used) were measured on the other two editors with real documents from the web (`../samples/web-sources.md`)
and then ported. Bench: `../open-journey-ab.cjs` now opens .xlsx and .pptx (`complete` from `Asc.editor`, `painted`
two frames after complete for those editors).

## Where the open stood (home profile, cache on, 3 pairs A = B)

| document | upload | loadDoc | binEnd | complete | painted | fonts | sdk |
|---|---|---|---|---|---|---|---|
| unirio-rocinha.pptx (2.4 MB, 10 slides) | 2.4 s | 3.7 | 4.0 | 7.8 | 8.3 | 33 files, 8.56 MB | 11 / 6.37 MB |
| sp-qdd-2025.xlsx (3.0 MB, Prefeitura de São Paulo) | 3.0 s | – | 5.6 | 6.7 | 7.2 | 15 files, 2.04 MB | 10 / 6.69 MB |

Two things stood out. The deck downloaded a 3.7 MB Japanese font (IPAPGothic, the theme's East Asian font,
used by no run) and four files of every family; 3.7 s of the open sat between `binEnd` and `complete`, which
is the fonts. And both opens downloaded the text editor's bundles too (2.3 MB sdk-all.js + app.js): the example's
file list page warms the cache with `warmUp` without a type, which assumes the document editor. That is the
example's call; api.js now drops a warm-up started on the same page for another editor, but the list page is
another page, so for spreadsheets and presentations the example wastes those 3 MB on the link during the upload.

## The change (sdkjs, all three editors)

- Presentation: `CheckFontNeeds` collects names with `g_fontNamesForLoad` set (the theme's East Asian and complex
  script fonts only through runs with such characters) and a style mask per family from the slides' font map;
  picker fonts get the regular file; `GetDefaultFontsStyles` loads the regular file of the default fonts.
- Spreadsheet: the workbook's font map carries an exact style mask per family from the cell styles, shared strings
  and named styles (theme and drawing fonts keep every style); `generateFontMap2` loads only those files.
- A style that arrives late lays the deck out again (every slide) or lays the sheet view out again.

## A/B, home profile, cache on, A = main, B = the change

| document | pairs | fonts A → B | complete B−A | painted B−A | pairs B<A |
|---|---|---|---|---|---|
| unirio-rocinha.pptx | 6 | 33 / 8.56 MB → 15 / 2.39 MB | −933 ms (−1083 … −831) | −621 ms (−736 … −482) | 6/6 |
| sp-qdd-2025.xlsx | 6 | 15 / 2.04 MB → 8 / 1.08 MB | −212 ms (−439 … 292) | −129 ms (−432 … 815) | 5/6 |

The deck opens 0.6–0.9 s sooner, every pair outside the noise. The spreadsheet halves its font bytes; on this link
that is near the floor, as the text editor's font levers were, and it will show on slower links in proportion.

## Checks

- Sweep (`../sweep.cjs`) over four real decks, four real workbooks and the reference .docx with the change: no modal,
  no console error, no failed request.
- Late styles (`../late-style.cjs`): bold and italic applied by keyboard after the open fetch the missing file on
  demand (the workbook fetched one file, the deck none: its runs already used those styles), no error, text intact.
- sdkjs QUnit suites: see the PR.
