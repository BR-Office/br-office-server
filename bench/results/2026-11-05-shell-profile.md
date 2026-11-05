# 2026-11-05 · the shell's share of the main thread during the open

CPU profile of the editor frame on aluno-moderno.docx, localhost, no network emulation (`../shell-profile.cjs`,
`../shell-profile-incl.cjs`). The main thread is one: whatever the shell (web-apps) does while the editor (sdkjs)
parses and lays out the document delays the first paint by the same amount.

| window | wall | busy | sdkjs | shell (app.js + jquery + code.js + requirejs) | browser (program, forced layout) |
|---|---|---|---|---|---|
| page start → shell hands the document over (DocInfo) | 0.85 s | 0.56 s | 0.05 | 0.17 | 0.30 |
| DocInfo → content ready | 1.83 s | 1.77 s | 0.97 | 0.41 | 0.25 |
| content ready → painted | 0.50 s | 0.49 s | 0.15 | 0.19 | 0.13 |

Inclusive time of the shell's functions in the DocInfo → content ready window (a sample counts once per function
on its stack): the event fan-out `Zn` 401 ms; `onEditorPermissions` 238 of which `applyModeEditorElements` 209
(the edit-mode UI, toolbar included); `onAppShowed` 161; `start`/`launchControllers` 115; `Button.render` 119
(each caption measured in the DOM, `getWidthOfCaption`, which forces a style recalculation: `getPropertyValue`
41 ms self, `getClientRects` 14); `injectComponent` 61; `perfectScrollbar` 54. After content ready:
`createDelayedElements` 39 + 35, `setMenu` 30, the `code.js` module init 29, theme colour updates about 50.

## Reading

- The shell owns about 0.6 s of main-thread time between DocInfo and the first paint, interleaved with the
  editor's 1.1 s of parse and layout. That is the last client-side item of the open worth more than the noise
  floor: if the secondary toolbar tabs and the colour/theme work moved after the first paint, the document could
  show up to about 0.4 s earlier. It is a staged-initialisation refactor of a large Backbone application
  (Main.applyModeEditorElements, Toolbar.onAppShowed, the controllers' onLaunch), two to three days with the risk
  of UI init order, and it should be measured with the bench before merging like everything else.
- A small, safe cut inside it: `Button.getWidthOfCaption` measures captions by inserting text in the DOM and
  reading its width, once per toolbar button; a canvas `measureText` with the same font would avoid the forced
  reflows (tens of ms).

Not started: recorded here for the decision on the next investment.
