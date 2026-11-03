---
journey: typing
goals_hash: dcb03039
round: 3
total_ms: 51
measured_by: claude-opus-5-5-b
packet: PKT-0128
date: 2026-11-03
---
# Journey typing: key press in an open Word document until the character is drawn on screen

Measure: `bash .theseus/oracle/journeys/typing.sh` → `total_ms=51 min_ms=34 max_ms=83 runs=90`
(3 sessions × 30 keystrokes, 2 warm-up keys per session not counted; load average ~1 during the run).
Build: **integrated** (`serve-integrated.sh up`: sdkjs word bundle from the fork's collecting branch, external/sdkjs 0f61ccce,
over the native package; core and web-apps `theseus` == `main`). Headless Chromium (Playwright), 2-CPU VM.
Document: `open-docx-10p.docx`, cursor in the body of page 1, letters `a..j` pressed 250 ms apart.

Per key, in the editor frame's clock: t0 = `KeyboardEvent.timeStamp` of keydown; end = two rAFs after the first
`WordControl.OnPaint` that follows `CDocument.EnterText` (the frame that shows the character).

## Stages (p50 per key, ms; means in brackets)
| stage | module | ms | share |
|---|---|---|---|
| input: OS/browser event → first JS keydown listener | project (browser) | 0.3 [0.35] | 0.6% |
| handler: keydown dispatch → `CDocument.EnterText` (model change, paragraph fast recalc) | sdkjs-word | 3.4 [3.58] | 6.7% |
| wait-paint: EnterText end → next `PaintMessageLoop` tick (40 ms interval) | sdkjs-common | 12.8 [15.6] | 25.2% |
| paint: `WordControl.OnPaint` (redraw of the changed page area, overlay, cursor) | sdkjs-word | 12.5 [13.73] | 24.7% |
| frame: OnPaint end → frame presented (2 rAF, canvas compositing) | project (browser) | 19.8 [18.36] | 39.1% |
| unattributed (p50s do not add exactly) | | 1.9 | 3.7% |

`CDocument.Recalculate_Page` was **never called** during typing (nrc=0): a typed letter goes through the fast
paragraph recalculation inside `EnterText`, so layout is inside "handler" (2.6 ms model+recalc, 0.7 ms before it).

## Reading
- The keystroke itself is cheap (~3.4 ms in sdkjs). **Three quarters of the latency is scheduling**: waiting for the
  40 ms paint timer (avg ~half the interval, 12.8–15.6 ms) and the browser frame after the canvas paint (~20 ms, which
  includes waiting for the next vsync at 60 Hz and the headless compositor).
- The most actionable lever toward the goal is wait-paint: painting on `requestAnimationFrame` right after an edit
  (instead of the fixed 40 ms `PaintMessageLoop`) would save ~13 ms p50 (25%). Next is OnPaint cost (12.5 ms per key
  for one letter: it redraws more than the changed line).
- 51 ms p50 is under the ~100 ms perceptibility threshold; max 83 ms is a wait-paint near 40 ms plus a slow frame.

## Comparison with earlier rounds
No earlier typing map exists (`.theseus/journeys/` had none; `oracle/rounds/*-r2.md` do not measure typing). This is the
first map; round 4 compares with it.

```yaml
stages:
  - id: input
    module: project
    files: []
    functions: ["browser input dispatch (KeyboardEvent)"]
    ms: 0.3
    share: 0.6
  - id: handler
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js, external/sdkjs/word/Drawing/HtmlPage.js]
    functions: [CDocument.prototype.EnterText, CDocument.prototype.Recalculate (fast paragraph path)]
    ms: 3.4
    share: 6.7
  - id: wait-paint
    module: sdkjs-common
    files: [external/sdkjs/common/Drawings/WorkEvents.js, external/sdkjs/word/Drawing/HtmlPage.js]
    functions: [AscCommon.PaintMessageLoop (40 ms interval), CEditorPage.paintMessageLoop]
    ms: 12.8
    share: 25.2
  - id: paint
    module: sdkjs-word
    files: [external/sdkjs/word/Drawing/HtmlPage.js]
    functions: [CEditorPage.OnPaint]
    ms: 12.5
    share: 24.7
  - id: frame
    module: project
    files: []
    functions: ["browser compositing of the editor canvas (requestAnimationFrame / vsync)"]
    ms: 19.8
    share: 39.1
unattributed_ms: 1.9
```
