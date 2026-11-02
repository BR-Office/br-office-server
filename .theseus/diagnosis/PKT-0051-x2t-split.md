# PKT-0051 — x2t phase split, measured on the installed binary

Measured 2026-11-02 on the factory VM (2 CPUs, 7 GB), **native package** euro-office-documentserver 9.3.7-1,
`/var/www/euro-office/documentserver/server/FileConverter/bin/x2t`, run as root from that directory, warm page
cache, 3 runs per input, **median** shown (raw runs below). Tool: `.theseus/oracle/perf/x2t-split.sh`
(strace `-f -ttt` on execve/openat/exit_group; phase boundaries at file opens, see its header).
strace overhead: empty docx/xlsx/pptx → pdf without strace = 762–908 / 700–707 / 1230–1259 ms.

Inputs: `document-templates/new/en-US/new.{docx,xlsx,pptx}` (the PKT-0016 empty samples),
`make-samples.py` big-300p.docx / big-50k.xlsx / big-80s.pptx, and a save conversion:
`Editor.bin` produced by x2t from new.docx / big-300p.docx + `changes/changes0.json` = `[]`, converted to docx
with `m_bFromChanges=true` (fixed cost of a save; no real change set available).

## Phase split (ms, median of 3)

| Input | total | start | native (OOXML→bin) | V8 init | script load | layout / Execute | write |
|---|---|---|---|---|---|---|---|
| new.docx → pdf | 933 | 76 | 17 | 8 | 372 | 392 | 17 |
| new.xlsx → pdf | 830 | 54 | 11 | 6 | 402 | 317 | 22 |
| new.pptx → pdf | 1554 | 52 | 38 | 6 | 439 | 781 | 27 |
| big-300p.docx → pdf | 16452 | 91 | 573 | 8 | 465 | 8911 | 5517 |
| big-50k.xlsx → pdf | 58004 | 61 | 1320 | 11 | 399 | 51118 | 5465 |
| big-80s.pptx → pdf | 8045 | 68 | 489 | 6 | 360 | 5020 | 1694 |
| save, empty (bin+changes → docx) | 944 | 65 | 1 | 8 | 340 | 495 | 47 |
| save, big-300p (bin+changes → docx) | 4259 | 47 | 3 | 6 | 310 | 2641 | 1209 |

(Medians are per column, so a row does not sum exactly to its total.)

## Which phase dominates

- **Empty documents:** fixed costs. Script load (sdk-all compile/run from the code cache) ≈ 370–440 ms = 40–50 %,
  first Execute (layout of an empty doc, font engine warm-up; pptx themes) 320–780 ms. Process start + V8 init
  ≈ 60–85 ms; PDF write ≈ 20 ms.
- **Large documents:** JS layout/Execute dominates (54 % docx, 88 % xlsx, 62 % pptx), then the writer
  (docx 34 %, xlsx 9 %, pptx 21 %). big-50k.xlsx → pdf ≈ 58 s, 51 s in layout: worst case.
- **Save:** same ≈ 0.3–0.35 s script load; big-300p save ≈ 4.3 s, 62 % Execute, 28 % write.
- Noise is high on this 2-CPU VM (big inputs vary up to ±30 % between runs); the ranking of phases is stable.

## sdk-all.bin / .cache

- `sdkjs/{word,cell,slide,visio,pdf}/sdk-all.cache` ship (V8 code cache, 4–6 MB; mtime = install time, so the
  postinst/first run generated them). **No** `sdk-all.bin` in any editor dir.
- strace of every run: `sdk-all.bin` open → ENOENT (x2t looks for a snapshot first), then `sdk-all-min.js`,
  `sdk-all.js` and `sdk-all.cache` (opened twice) are read. So the code cache loads; a snapshot is supported by
  the lookup but not shipped.
- Agrees with PKT-0041 (same table shape, numbers within run noise): the fixed ≈ 0.35–0.45 s script load and
  ≈ 0.3–0.8 s first-Execute warm-up are what a snapshot / persistent renderer would remove.

## Raw runs (total, ms)

new.docx 933/957/795 · new.xlsx 845/666/830 · new.pptx 1559/1554/1241 · big-300p.docx 16452/12664/19153 ·
big-50k.xlsx 57642/58004/74437 · big-80s.pptx 7000/8045/8491 · save-new 935/944/1034 · save-big-300p 4742/4214/4259
