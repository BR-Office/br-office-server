# web-apps-documenteditor, round 3 measurements (PKT-0150, 2026-11-04)

Native Euro-Office 9.3.7-1 stack on the factory VM (2 CPUs). Chromium comes from Playwright. **The VM was heavily loaded** (load average 9.9 at the start, 13.8 at the peak, 9.8 at the end): other factory agents were running. Read the proportions, not the absolute numbers.

## What changed since round 2
Nothing landed. `external/web-apps` is at upstream `d238e526`, the same commit as `external/web-apps.base`. In round 2, PKT-0111 (toolbar tabs, blocked) and PKT-0112 (Comments, blocked) were not merged. PKT-0132 was discarded and reverted. PKT-0125 is still pending.

## Open-sequence oracle (`bash .theseus/oracle/documenteditor-open.sh`)
PASS: toolbar 971 ms, loaded 976 ms, typed 4 966 ms, saved 10 991 ms.

## Differential oracle (`bash .theseus/oracle/differential/web-apps-documenteditor.sh`)
**PASS (4 cases)**: every check is `same`. Original and new are the same code, so the open times measure noise only:

| Case | open orig \| new (ms) |
|---|---|
| text.docx | 3679 \| 3111 |
| styles.docx | 3149 \| 2953 |
| plain.txt | 2910 \| 3123 |
| simple.rtf | 2749 \| 3237 (new reopen 6589: load spike) |

## Open window (`node .theseus/oracle/perf/open-window.js out.json medium-10p.docx large-100p.docx --runs 7`)
p50, ms after goto (unprofiled / profiled):

| File | LoadDoc | Bin | Ready | r2 LoadDoc / Ready (unprofiled) |
|---|---|---|---|---|
| medium-10p | 2 707 / 2 052 | 2 916 / 2 169 | 7 421 / 7 190 | 1 252 / 3 323 |
| large-100p | 2 181 / 1 730 | 2 235 / 1 999 | 5 668 / 5 534 | 1 204 / 3 911 |

The marks are 1.5–2× round 2 on identical code, which matches the load. CPU from goto to LoadDoc (profiled p50, 10 p / 100 p):

| Item | 10 p (ms) | 100 p (ms) |
|---|---|---|
| idle | 959 | 502 |
| vendor (jQuery etc.) | 390 | 403 |
| apps/common in app.js | 151 | 155 |
| DE.* | 146 | 143 |
| parse/compile | 196 | 159 |
| sdk-all-min.js | 71 | 67 |

The busy web-apps CPU is ≈ 0.7 s, the same as round 2. Controller launch: Comments 48 / 82 ms, Viewport 20 / 23 ms, Toolbar ≈ 1 ms.

**LoadDoc coincides with the end of the `sdk-all.js` download (18 MB).** For medium-10p the download ends at 2 710 ms and LoadDoc is at 2 707 ms. For large-100p it ends at 1 993 ms and LoadDoc is at 2 181 ms. The editor waits for the sdkjs word engine before it calls `asc_LoadDocument`. The web-apps UI build runs in the idle time of that wait.

## Critical-path test: delay `asc_LoadDocument` by 500 ms
The script (`delay-loaddoc.js`, session scratchpad; the recipe is below) wraps `asc_LoadDocument` and calls the original after `setTimeout(500)`. The call order is unchanged. Each pair runs control A and delayed B in alternating order, each in a new cold context, 7 pairs per file. The question: does Ready move when LoadDoc moves?

| File | B−A start of LoadDoc, p50 (ms) | B−A Ready, p50 (ms) | B−A Ready, all pairs (ms) |
|---|---|---|---|
| medium-10p | +526 | +147 | −473 … +1124 |
| large-100p | +207 * | −729 | −1284 … +621 |

\* The large-file control's LoadDoc start slipped under load, so the paired difference is lower than 500 ms.

**Reading.** A LoadDoc that is 0.2–0.5 s later does not show up in Ready above noise. Under this load the noise is ±1 s. Together with the coincidence of LoadDoc and the sdk-all.js download end, this says the pre-LoadDoc web-apps UI work is mostly off the critical path. Cutting it, which PKT-0111, PKT-0112 and PKT-0132 tried, cannot be felt. The test was run on a loaded VM, so it is suggestive, not conclusive. Repeating it on a quiet VM is plan row P1.

Recipe: an init script on the editor frame replaces `Asc.asc_docs_api.prototype.asc_LoadDocument` with a wrapper that records `performance.now()` and calls the original after `setTimeout(d)`. Ready is `editor.isDocumentLoadComplete`, as in open-window.js.

### Script used (for P1 to commit as `.theseus/oracle/perf/loaddoc-delay.js`)
```js
// Critical-path test: delay asc_LoadDocument by DELAY ms (call order kept), alternating control/delayed, cold context.
// Usage: node delay-loaddoc.js <out.json> <file.docx> [pairs] [delayMs]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [OUT, FILE, PAIRS = 7, DELAY = 500] = process.argv.slice(2); const BASE = 'http://localhost/example/';
const hook = (d) => { window.__m = {}; const t = setInterval(() => { const p = window.Asc && Asc.asc_docs_api && Asc.asc_docs_api.prototype;
  if (!p || !p.asc_LoadDocument || p.__w) return; const f = p.asc_LoadDocument; p.__w = 1;
  p.asc_LoadDocument = function () { const a = arguments, s = this; window.__m.call = performance.timeOrigin + performance.now();
    if (!d) { window.__m.run = window.__m.call; return f.apply(s, a); }
    setTimeout(() => { window.__m.run = performance.timeOrigin + performance.now(); f.apply(s, a); }, d); };
  clearInterval(t); }, 1); setTimeout(() => clearInterval(t), 60000); };
async function once(b, url, d) { const ctx = await b.newContext(); await ctx.addInitScript(hook, d); const p = await ctx.newPage();
  const t0 = Date.now(); await p.goto(url); let f;
  for (const s = Date.now(); Date.now() - s < 180000; await p.waitForTimeout(10)) { f = p.frames().find(f => /documenteditor/.test(f.url()) && /index/.test(f.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; else f = null; }
  const tR = Date.now(); const m = await f.evaluate(() => window.__m); await ctx.close();
  return { delay: d, call: m.call - t0, run: m.run - t0, ready: tR - t0 }; }
(async () => { const fd = new FormData(); fd.append('uploadedFile', new Blob([fs.readFileSync(FILE)]), path.basename(FILE));
  const name = (await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json()).filename;
  const url = BASE + 'editor?fileName=' + encodeURIComponent(name); const b = await chromium.launch(); const rows = [];
  await once(b, url, 0); // warm server side
  for (let i = 0; i < PAIRS; i++) { const order = i % 2 ? [+DELAY, 0] : [0, +DELAY]; const pair = {};
    for (const d of order) pair[d ? 'B' : 'A'] = await once(b, url, d); rows.push(pair); console.log(JSON.stringify(pair)); }
  await b.close(); const med = a => { a = [...a].sort((x, y) => x - y); return a[a.length >> 1]; };
  const s = { file: path.basename(FILE), delay: +DELAY, pairs: rows.length,
    dRun_p50: med(rows.map(r => r.B.run - r.A.run)), dReady_p50: med(rows.map(r => r.B.ready - r.A.ready)),
    dReady_all: rows.map(r => r.B.ready - r.A.ready), A_ready_p50: med(rows.map(r => r.A.ready)), A_call_p50: med(rows.map(r => r.A.call)) };
  console.log(JSON.stringify(s)); fs.writeFileSync(OUT, JSON.stringify({ summary: s, rows }, null, 1)); })();
```
