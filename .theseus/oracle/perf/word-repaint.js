// Repaint scope per local keystroke and per remote change in the word editor (PKT-0109).
// Usage: node .theseus/oracle/perf/word-repaint.js <file.docx> [sdkjs-checkout|bundle-dir|-] [runs] [base] [--json out.json]
//   bundle: a checkout is built with .theseus/oracle/differential/build.sh (cached by content) and its
//   word/sdk-all{,-min}.js are injected with Playwright context.route (sdk-all.{bin,cache} -> 404), as PKT-0093;
//   a directory containing word/sdk-all.js is used as is; "-" keeps the installed bundle. Default: external/sdkjs.
//   Per run, users A and B open the file in separate contexts. Then
//     local:  A types N single characters at the caret (Ctrl+Home), instrumented on A;
//     remote: A types N markers, instrumented on B (B's view stays at the top, the change is on B's visible page 1).
//   Each event is a window: counters reset -> key -> model has the text -> settle (SETTLE ms, recalc/paint timers).
// Instrumented entry points (wrapped on the live instances, names from the sdkjs sources):
//   CDocument: private_Recalculate (result: 0 NoRecal/1 FastRange/2 FastParagraph... see Document.js),
//     Recalculate_Page, Redraw(start,end) (requested range), private_Redraw (range actually invalidated);
//   DrawingDocument: OnRecalculatePage(index) (pages recalculated), OnRepaintPage(index) (pages invalidated),
//     FirePaint, ClearCachePages (invalidate all), StartRenderingPage(index) (page re-rasterised into its cache image),
//     UpdateTarget; HtmlPage (WordControl): OnPaint (blit of visible pages), OnScroll, OnUpdateOverlay;
//   NOCLEAR=1: ceiling variant, the all-pages ClearCachePages from CWordCollaborativeEditing.Send_Changes is skipped.
//   CanvasRenderingContext2D.prototype.drawImage: count, ms and destination pixels (= rectangles redrawn).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const argv = process.argv.slice(2), ji = argv.indexOf('--json');
const JSONOUT = ji >= 0 ? argv.splice(ji, 2)[1] : null;
const [FILE, BUNDLE_ARG = path.join(__dirname, '../../../external/sdkjs')] = argv;
const RUNS = +(argv[2] || 2), BASE = argv[3] || 'http://localhost/example/';
const NOCLEAR = process.env.NOCLEAR === '1', N = +(process.env.N || 20), SETTLE = +(process.env.SETTLE || 400);
if (!FILE) { console.error('usage: word-repaint.js <file.docx> [sdkjs|bundle-dir|-] [runs] [base]'); process.exit(2); }

function bundleDir() {
  if (BUNDLE_ARG === '-') return null;
  if (fs.existsSync(path.join(BUNDLE_ARG, 'word/sdk-all.js'))) return BUNDLE_ARG;
  const out = execFileSync('bash', [path.join(__dirname, '../differential/build.sh'), BUNDLE_ARG, 'word'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  return out.trim().split('\n').pop();
}
async function upload(file) {
  const fd = new FormData();
  fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
  if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
  return r.filename;
}
async function route(ctx, dir) {
  if (!dir) return;
  await ctx.route(/sdkjs\/word\/sdk-all(-min)?\.js/, (r, req) => {
    const f = /sdk-all-min\.js/.test(req.url()) ? 'sdk-all-min.js' : 'sdk-all.js';
    r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(dir, 'word', f)) });
  });
  await ctx.route(/sdkjs\/word\/sdk-all\.(bin|cache)/, r => r.fulfill({ status: 404, body: '' }));
}
async function editorFrame(page, timeout = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => /documenteditor/.test(f.url()) && /index/.test(f.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) return f;
    await page.waitForTimeout(50);
  }
  throw new Error('editor not ready');
}

// Runs in the editor frame.
function instrument(noClear) {
  if (window.__rp) return;
  const wc = editor.WordControl, dd = wc.m_oDrawingDocument, ld = wc.m_oLogicDocument;
  const S = window.__rp = { reset() { this.c = {}; this.ms = {}; this.pages = {}; this.ranges = []; this.recalcResults = []; this.px = 0; this.stacks = {}; } };
  S.reset();
  const now = () => performance.now();
  const STACKS = ['ClearCachePages', 'OnRecalculatePage', 'StartRenderingPage', 'OnRepaintPage', 'private_Recalculate', 'OnPaint'];
  function wrap(obj, name, pageArg, onArgs) {
    const orig = obj[name]; if (typeof orig !== 'function') { S.missing = (S.missing || []).concat(name); return; }
    obj[name] = function (...a) {
      S.c[name] = (S.c[name] || 0) + 1;
      if (pageArg != null && typeof a[pageArg] === 'number') (S.pages[name] = S.pages[name] || new Set()).add(a[pageArg]);
      if (onArgs) onArgs(a);
      if (STACKS.includes(name)) { const st = (new Error().stack || '').split('\n').slice(2, 9).map(l => l.trim().replace(/^at /, '').replace(/ \(.*/, '')).join(' < ');
        (S.stacks[name] = S.stacks[name] || {})[st] = (S.stacks[name][st] || 0) + 1; }
      const t = now(); try { const r = orig.apply(this, a); if (name === 'private_Recalculate') S.recalcResults.push(r); return r; }
      finally { S.ms[name] = (S.ms[name] || 0) + now() - t; }
    };
  }
  wrap(ld, 'private_Recalculate'); wrap(ld, 'Recalculate_Page');
  wrap(ld, 'Redraw', null, a => S.ranges.push(['Redraw', a[0], a[1], !!ld.Action.Start]));
  wrap(ld, 'private_Redraw', null, a => S.ranges.push(['private_Redraw', a[0], a[1]]));
  wrap(ld, 'DrawPage', 0);
  wrap(dd, 'OnRecalculatePage', 0); wrap(dd, 'OnRepaintPage', 0); wrap(dd, 'FirePaint'); wrap(dd, 'ClearCachePages');
  wrap(dd, 'StartRenderingPage', 0); wrap(dd, 'UpdateTarget'); wrap(dd, 'OnEndRecalculate');
  wrap(wc, 'OnPaint'); wrap(wc, 'OnScroll'); wrap(wc, 'OnUpdateOverlay');
  const P = CanvasRenderingContext2D.prototype, di = P.drawImage;
  P.drawImage = function (...a) {
    S.c.drawImage = (S.c.drawImage || 0) + 1;
    const w = a.length >= 9 ? a[7] : a.length >= 5 ? a[3] : (a[0].width || 0), h = a.length >= 9 ? a[8] : a.length >= 5 ? a[4] : (a[0].height || 0);
    S.px += Math.abs(w * h);
    const id = (this.canvas && this.canvas.id) || '(offscreen)'; S.c['drawImage@' + id] = (S.c['drawImage@' + id] || 0) + 1;
    const t = now(); try { return di.apply(this, a); } finally { S.ms.drawImage = (S.ms.drawImage || 0) + now() - t; }
  };
  // Ceiling variant (NOCLEAR=1): ClearCachePages called from Send_Changes (lock redraw) becomes a no-op.
  if (noClear) { const cc = dd.ClearCachePages; dd.ClearCachePages = function () { if (/Send_Changes/.test(new Error().stack || '')) { S.c.skippedClear = (S.c.skippedClear || 0) + 1; return; } return cc.apply(this, arguments); }; }
  S.snap = () => ({ c: S.c, ms: Object.fromEntries(Object.entries(S.ms).map(([k, v]) => [k, +v.toFixed(2)])),
    pages: Object.fromEntries(Object.entries(S.pages).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])),
    ranges: S.ranges, stacks: S.stacks, recalcResults: S.recalcResults, px: S.px,
    visible: [dd.m_lDrawingFirst, dd.m_lDrawingEnd], pagesCount: dd.m_lPagesCount, canvas: [wc.m_oEditor.HtmlElement.width, wc.m_oEditor.HtmlElement.height] });
}

async function measure(page, frame, typeIn, typeFrame, waitFrame, text) {
  await frame.evaluate(() => window.__rp.reset());
  const n0 = await waitFrame.evaluate(t => editor.WordControl.m_oLogicDocument.GetText().split(t).length, text);
  const t0 = Date.now();
  await typeIn.keyboard.type(text);
  await waitFrame.waitForFunction(([t, n]) => editor.WordControl.m_oLogicDocument.GetText().split(t).length > n, [text, n0], { polling: 20, timeout: 30000 });
  const seen = Date.now() - t0;
  await page.waitForTimeout(SETTLE);
  const s = await frame.evaluate(() => window.__rp.snap()); s.seenMs = seen; return s;
}

async function main() {
  const dir = bundleDir();
  console.error('bundle:', dir || 'installed', NOCLEAR ? '(NOCLEAR ceiling variant)' : '');
  const browser = await chromium.launch();
  const url = BASE + 'editor?fileName=' + encodeURIComponent(await upload(FILE));
  const events = { local: [], remote: [] };
  for (let r = 0; r < RUNS; r++) {
    const ca = await browser.newContext({ viewport: { width: 1280, height: 900 } }), cb = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await route(ca, dir); await route(cb, dir);
    const a = await ca.newPage(), b = await cb.newPage();
    await a.goto(url); const fa = await editorFrame(a);
    await b.goto(url); const fb = await editorFrame(b);
    await fa.evaluate(instrument, NOCLEAR); await fb.evaluate(instrument, NOCLEAR);
    await a.waitForTimeout(3000);
    await fa.click('#id_main_view', { position: { x: 300, y: 200 } }).catch(() => {});
    await a.keyboard.press('Control+Home'); await a.waitForTimeout(500);
    for (let i = 0; i < N; i++) events.local.push(await measure(a, fa, a, fa, fa, 'x'));
    await a.waitForTimeout(1500);
    for (let i = 0; i < N; i++) events.remote.push(await measure(b, fb, a, fa, fb, 'zq' + r + '_' + i + 'k'));
    const missing = await fa.evaluate(() => window.__rp.missing || []);
    if (missing.length) console.error('not wrapped (missing):', missing);
    await ca.close(); await cb.close();
    console.error('run', r, 'done');
  }
  await browser.close();
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify({ bundle: dir, N, SETTLE, events }, null, 1));
  report(events);
}

function report(events) {
  const med = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const rows = [
    ['private_Recalculate calls', e => e.c.private_Recalculate || 0],
    ['pages recalculated (OnRecalculatePage, distinct)', e => (e.pages.OnRecalculatePage || []).length],
    ['Recalculate_Page calls', e => e.c.Recalculate_Page || 0],
    ['recalc ms (private_Recalculate + Recalculate_Page)', e => (e.ms.private_Recalculate || 0) + (e.ms.Recalculate_Page || 0)],
    ['pages invalidated (OnRepaintPage, distinct)', e => (e.pages.OnRepaintPage || []).length],
    ['ClearCachePages (all pages invalidated)', e => e.c.ClearCachePages || 0],
    ['pages re-rasterised (StartRenderingPage)', e => e.c.StartRenderingPage || 0],
    ['re-raster ms (StartRenderingPage)', e => e.ms.StartRenderingPage || 0],
    ['OnPaint calls (blit visible pages)', e => e.c.OnPaint || 0],
    ['OnPaint ms (incl. re-raster)', e => e.ms.OnPaint || 0],
    ['OnScroll calls', e => e.c.OnScroll || 0],
    ['OnUpdateOverlay calls', e => e.c.OnUpdateOverlay || 0],
    ['UpdateTarget calls', e => e.c.UpdateTarget || 0],
    ['UpdateTarget ms', e => e.ms.UpdateTarget || 0],
    ['drawImage calls', e => e.c.drawImage || 0],
    ['drawImage ms', e => e.ms.drawImage || 0],
    ['drawImage Mpx drawn', e => e.px / 1e6],
    ['visible pages', e => e.visible[1] - e.visible[0] + 1],
    ['key -> text in model ms', e => e.seenMs],
  ];
  console.log('| Metric (per event) | local p50 | local mean | remote p50 | remote mean |\n|---|---|---|---|---|');
  const f = v => (Math.round(v * 10) / 10).toString();
  for (const [n, g] of rows) console.log(`| ${n} | ${f(med(events.local.map(g)))} | ${f(mean(events.local.map(g)))} | ${f(med(events.remote.map(g)))} | ${f(mean(events.remote.map(g)))} |`);
  for (const k of ['local', 'remote']) {
    const rr = {}, rg = {}, pg = {};
    for (const e of events[k]) { for (const x of e.recalcResults) rr[x] = (rr[x] || 0) + 1; for (const x of e.ranges) rg[x.join(',')] = (rg[x.join(',')] || 0) + 1; for (const p of e.pages.StartRenderingPage || []) pg[p] = (pg[p] || 0) + 1; }
    const e0 = events[k][0] || {};
    console.log(`\n${k}: ${events[k].length} events; pages ${e0.pagesCount}, visible ${JSON.stringify(e0.visible)}, canvas ${JSON.stringify(e0.canvas)}`);
    console.log('  private_Recalculate results:', JSON.stringify(rr));
    console.log('  redraw ranges [fn,start,end,inAction]:', JSON.stringify(rg));
    console.log('  re-rasterised pages (count):', JSON.stringify(pg));
    const cv = {}; for (const e of events[k]) for (const [c, v] of Object.entries(e.c)) if (c.startsWith('drawImage@')) cv[c] = (cv[c] || 0) + v;
    console.log('  drawImage by target canvas:', JSON.stringify(cv));
    const st = {}; for (const e of events[k]) for (const [fn, m] of Object.entries(e.stacks || {})) for (const [s2, v] of Object.entries(m)) { st[fn] = st[fn] || {}; st[fn][s2] = (st[fn][s2] || 0) + v; }
    for (const [fn, m] of Object.entries(st)) { console.log('  call sites of ' + fn + ':'); for (const [s2, v] of Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 4)) console.log('    ' + v + 'x ' + s2); }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
