# 2026-11-05 · building the interface after the first paint: measured, no gain, reverted

The shell profile (`2026-11-05-shell-profile.md`) showed web-apps taking the main thread after "content ready":
delayed toolbar and menu elements, right panel, theme colours, document:ready, about 0.35 s on the bench CPU and
2 s with the CPU slowed four times (`../shell-timeline.cjs`, 100 ms buckets by owner). The hypothesis: that work
holds the first paint of the page back. The change: sdkjs raises `asc_onFirstPaint` when the pages first reach the
canvas; the document editor's Main controller runs that block on the event (or after 1.5 s), and removes the loading
skeleton at content ready.

## Result (A = main, B = the change; home profile, cache on; bench with `--cpu`)

| CPU | pairs | complete B−A | painted B−A | pairs B<A on painted |
|---|---|---|---|---|
| ×1 | 8 | +61 ms (range −173 … 505) | −101 ms (−309 … 579) | 5/8 |
| ×4 | 6 | +506 ms (−1132 … 1230) | −518 ms (−2196 … 1303) | 4/6 |

Both inside the noise. The upload, which no editor code touches, moved by +156 and +104 ms between the sides, which
sets the scale of the drift in these runs.

## Why the hypothesis was wrong

A temporary "visible" mark (page 1 drawn on the canvas, drawing unfrozen, skeleton gone) landed within 7 ms of
`complete` on both sides. In the original code the heavy block already ran asynchronously, 50 ms after content
ready, so the browser had painted page 1 before it started. Moving it to "after the first paint" moved nothing the
user sees; the remaining pages still share the main thread with it either way, and `painted` (end of the whole
layout) does not change. The two seconds of shell work on a slow CPU are real, but they come after the first page
is on screen, while the user already reads it.

What is left in the shell on the first page's path: the toolbar render at `app:face` (about 0.4 s of shell on
the bench CPU), free when it overlaps the server's conversion (CPU ×1) and colliding with the parse when the CPU is
slow (CPU ×4, about 0.7 s of the 14 s open). Moving the toolbar itself after the document would be a visible
change in how the editor appears, for a gain only on slow machines; not done.

Code reverted on the sdkjs and web-apps branches (the first version also deferred `app:ready` and broke the
header/footer tab's focus handler, which read arrays its `onAppReady` had not created: a second reason to keep the
fan-out synchronous). Kept: `--cpu` in the bench and `shell-timeline.cjs`.
