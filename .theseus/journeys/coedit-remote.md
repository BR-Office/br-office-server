---
journey: coedit-remote
goals_hash: dcb03039
round: 3
total_ms: 107
measured_by: claude-opus-5-5
packet: PKT-0129
date: 2026-11-04
---
# Journey coedit-remote: A presses a key in a shared Word document until the character is drawn on B's screen

Measure: `bash .theseus/oracle/journeys/coedit-remote.sh` → `total_ms=107 min_ms=72 max_ms=363 runs=60`
(3 sessions × 20 keystrokes 700 ms apart, 2 warm-up keys per session not counted; load average ~1.1 during the run).
Build: **integrated** (`serve-integrated.sh up`: sdkjs word bundle from the fork's collecting branch, external/sdkjs 0f61ccce,
over the native package; core and web-apps `theseus` == `main`; DocService is the packaged binary, see serve-integrated.sh).
Headless Chromium (Playwright), A and B are two browser contexts of one Chromium, 2-CPU VM, fast co-editing mode (default).
Document: a fresh upload of `open-docx-10p.docx` per session, A's cursor in the body of page 1.

Clock: absolute host time (`performance.timeOrigin + performance.now()`) in both editor frames, and the DocService DEBUG
log (`/var/log/euro-office/documentserver/docservice/out.log`, ms resolution) for the server split.
t0 = A's `KeyboardEvent.timeStamp`; end = two rAFs after B's first `WordControl.OnPaint` after `Apply_Changes`.

## Stages (p50 per change, ms; means in brackets)
| stage | module | ms | share |
|---|---|---|---|
| a-input: A keydown → `CDocument.EnterText` end (model + fast paragraph recalc) | sdkjs-word | 4.0 [4.4] | 3.7% |
| a-wait-send: EnterText end → `Send_Changes` (A's 40 ms `_autoSave` tick) | sdkjs-common | 30.9 [29.5] | 28.8% |
| a-send: `Send_Changes` → `WebSocket.send` (serialize changes) | sdkjs-common | 0.1 [0.17] | 0.1% |
| up: A send → DocService `data.type = saveChanges` (nginx, Socket.IO) | docservice | 0.1 [0.46] | 0.1% |
| server: receive → `sendData: type = saveChanges` to B (locks, DB insert, pub/sub, emit) | docservice | 3.0 [9.17] | 2.8% |
| down: emit → B's WebSocket message | docservice | 0.8 [0.86] | 0.7% |
| b-receive: message → `DocsCoApi._onSaveChanges` end (parse, queue) | sdkjs-common | 0.2 [0.24] | 0.2% |
| b-wait-apply: queued → `Apply_Changes` (B's 40 ms `_autoSave` tick) | sdkjs-common | 17.5 [16.35] | 16.3% |
| b-apply: `Apply_Changes` (deserialize, apply, fast recalc; `Recalculate_Page` never called) | sdkjs-word | 3.3 [3.55] | 3.1% |
| b-wait-paint: Apply end → next `PaintMessageLoop` tick → `OnPaint` | sdkjs-common | 19.9 [20.21] | 18.6% |
| b-paint: `WordControl.OnPaint` on B | sdkjs-word | 15.5 [16.7] | 14.5% |
| b-frame: OnPaint end → frame presented (2 rAF) | project | 17.1 [16.95] | 16.0% |
| unattributed (p50s do not add; sum of p50s is 112.4) | | -5.4 | -5.0% |

The stage means add up exactly to the mean total (118.4 ms). The wire (A send → B message) is 4.1 p50 / 10.4 mean;
its tail (max 363 total) is in `server` (mean 9.2, a few changes at 50–250 ms: PostgreSQL insert / event loop on the busy VM).

## Reading
- **Four fifths of the latency is waiting on timers and frames, not work.** Real work (a-input, a-send, server, b-apply,
  b-paint) is ~26 ms; the rest is A's 40 ms send tick (31), B's 40 ms apply tick (17.5), B's 40 ms paint tick (20) and the
  browser frame (17). All three ticks are in sdkjs-common (`apiBase._autoSave` setInterval 40 and `PaintMessageLoop`).
- Levers toward the goal, in order: send right after an edit instead of on the next `_autoSave` tick (~25–30 ms);
  apply on message arrival instead of the next tick (~15 ms); paint on `requestAnimationFrame` after apply (~15 ms, the same
  lever as in the typing map); cheaper `OnPaint` (15.5 ms for one letter).
- **The server is not the problem** (3 ms p50), as in PKT-0018; only its tail (mean 9 ms) deserves a look in docservice.

## Comparison with earlier measurements (no earlier map of this journey)
| source | build | total p50 | split |
|---|---|---|---|
| baseline PKT-0016 (e2e, 10 p docx, A types a 4–5 char marker, end = marker in B's **model**) | native 9.3.7 | 116 | A 6, wire 6, B 42 |
| baseline PKT-0018 `coedit-split.js` (new docx, end = model) | native 9.3.7 | 101 | type 46, up 1, server 4, down 1, apply 47 |
| this map (one key, end = **pixel** on B) | integrated 0f61ccce | 107 | A 35, wire 4, B-to-model 21, B paint+frame 52 |

The earlier numbers stop at B's model (polled every 20 ms) and include typing a whole marker; this map stops at the pixel
and is per key. Up to B's model this map gives 4.0+30.9+0.1+4.1+0.2+17.5+3.3 ≈ 60 ms: lower than 101–116, mainly because
one key replaces a 4–5 key marker and there is no 20 ms polling. Server and wire are unchanged (~4 ms).

```yaml
stages:
  - id: a-input
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js]
    functions: [CDocument.prototype.EnterText]
    ms: 4.0
    share: 3.7
  - id: a-wait-send
    module: sdkjs-common
    files: [external/sdkjs/common/apiBase.js, external/sdkjs/word/api.js, external/sdkjs/word/Editor/Document.js]
    functions: [baseEditorsApi.prototype._autoSave (setInterval 40), asc_docs_api.prototype._autoSaveInner, CDocument.prototype.Continue_FastCollaborativeEditing, asc_docs_api.prototype.asc_Save]
    ms: 30.9
    share: 28.8
  - id: a-send
    module: sdkjs-common
    files: [external/sdkjs/word/Editor/CollaborativeEditing.js, external/sdkjs/common/docscoapi.js]
    functions: [CWordCollaborativeEditing.prototype.Send_Changes, DocsCoApi.prototype.saveChanges]
    ms: 0.1
    share: 0.1
  - id: up
    module: docservice
    files: [DocService/sources/DocsCoServer.js]
    functions: ["Socket.IO message dispatch (nginx proxy)"]
    ms: 0.1
    share: 0.1
  - id: server
    module: docservice
    files: [DocService/sources/DocsCoServer.js]
    functions: [saveChanges, sendData]
    ms: 3.0
    share: 2.8
  - id: down
    module: docservice
    files: [DocService/sources/DocsCoServer.js]
    functions: ["Socket.IO emit to the other connection"]
    ms: 0.8
    share: 0.7
  - id: b-receive
    module: sdkjs-common
    files: [external/sdkjs/common/docscoapi.js]
    functions: [DocsCoApi.prototype._onSaveChanges]
    ms: 0.2
    share: 0.2
  - id: b-wait-apply
    module: sdkjs-common
    files: [external/sdkjs/common/apiBase.js, external/sdkjs/word/api.js, external/sdkjs/word/Editor/Document.js]
    functions: [baseEditorsApi.prototype._autoSave (setInterval 40), asc_docs_api.prototype._autoSaveInner, CDocument.prototype.Continue_FastCollaborativeEditing]
    ms: 17.5
    share: 16.3
  - id: b-apply
    module: sdkjs-word
    files: [external/sdkjs/common/CollaborativeEditingBase.js, external/sdkjs/word/Editor/CollaborativeEditing.js]
    functions: [CCollaborativeEditingBase.prototype.Apply_Changes, CWordCollaborativeEditing.prototype.Apply_OtherChanges]
    ms: 3.3
    share: 3.1
  - id: b-wait-paint
    module: sdkjs-common
    files: [external/sdkjs/common/Drawings/WorkEvents.js, external/sdkjs/word/Drawing/HtmlPage.js]
    functions: [AscCommon.PaintMessageLoop (40 ms interval), CEditorPage.paintMessageLoop]
    ms: 19.9
    share: 18.6
  - id: b-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Drawing/HtmlPage.js]
    functions: [CEditorPage.OnPaint]
    ms: 15.5
    share: 14.5
  - id: b-frame
    module: project
    files: []
    functions: ["browser compositing of the editor canvas (requestAnimationFrame / vsync)"]
    ms: 17.1
    share: 16.0
unattributed_ms: -5.4
```
