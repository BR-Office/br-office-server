# 2026-11-05 · perceived latency while editing (typing, formatting, scrolling), real document

After the open journey, the editing journey: what the user waits for after a keystroke, a Ctrl+A, a bold, an
undo, a page down and a wheel scroll, on aluno-moderno.docx (11 pages), main at 4e3fd9e, headless Chromium on the
bench machine, no network emulation (these are CPU paths). Scripts: `../type-latency.cjs` (real key events, paint
detection by wrapping the editor page's OnPaint, long-task observer), `../trace-selectall.cjs` (Chrome trace of
the main thread around a select-all), `../selectall-profile.cjs`.

| action | key → paint | notes |
|---|---|---|
| typing a 68-character sentence, 80 ms between keys | median 35 ms, p90 55 ms, max 61 ms | no task over 50 ms; the paint itself 7 ms |
| select all (Ctrl+A) | 160 ms to the first paint | one keydown task of 145 ms in sdkjs (selection over 11 pages, calculated text and paragraph properties for the toolbar); forced layouts from jQuery `:visible` 9 ms in total |
| bold on the whole document | 106 ms synchronous, 126 ms to paint | |
| undo of that bold | 117 ms synchronous, 145 ms to paint | |
| undo of the typing | 7 ms synchronous, 41 ms to paint | |
| page down | median 77 ms, max 108 ms | |
| wheel scroll, 20 steps of 300 px in 1 s | 20 paints of 0.7 ms (max 1 ms) | pages are cached bitmaps |

## Reading

Editing is responsive on this document: every common action paints within 160 ms and typing sits at the editor's
own paint timer. There is no latency lever here comparable to the open; the one task above 100 ms is the whole-
document selection, acceptable for an 11-page selection. The first measurement of select-all (561 ms to paint in
`type-latency.cjs`) was an artefact of the shell's `app:ready` work still running; the trace shows 160 ms.
