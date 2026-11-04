# 2026-11-04 · what is left in the open window after the layout fix

Real 11-page document, merged bundle (sdkjs main b002c50), brotli on, localhost. Scripts: `bench/profile-open.cjs`,
`bench/layout-slices.cjs`, `bench/layout-restarts.cjs`.

## Background layout (ContinueRecalculationLoop)

| | before the fix | after |
|---|---|---|
| layout passes started during the open | 5 (1 real, 4 by late font styles) | 2 (1 real, 1 by a bold the document does use) |
| slices | 11 | 6 |
| compute inside the slices | 380–700 ms | 247 ms |
| span from first slice to last | 1.7–2.5 s | 1.0 s |

The loop itself is cheap and already sliced (10 ms timer). The span is filled by other main-thread work.

## Main-thread work from Editor.bin to the last paint, 1.56 s busy (median of 3), by owner

| ms | what |
|---|---|
| 640 | document layout: tables 306 (grid min/max content 150, which shapes every run once more), paragraphs 182 |
| 350 | web-apps on `onDocumentContentReady`: `app:ready` fan-out to every controller, zoom, settings; jquery 161 self, app.js 149 self |
| 210 | paint of the visible pages (PaintMessageLoop, OnPaint, DrawPage) |
| 232 | browser (program): DOM layout and paint, GC 47 |
| 160 | InitControl: rulers, input context, first scroll |
| 72 | fonts.wasm (text measuring) |

## Reading

Each remaining item is at most 0.3 s of an 8 s open, and the two largest (the UI fan-out and the table grid) carry
risk: the first changes when the toolbar becomes usable, the second touches the table layout engine. The open journey
on this emulated link is near the floor of what the client can give without product decisions.
