// Client open / co-edit latency breakdown (PKT-0016).
// Usage: node .theseus/oracle/perf/client-breakdown.js <dir-with-samples> [runs] [base]
//   Uploads every .docx/.xlsx/.pptx in <dir> to the example and, per file, opens it RUNS times and splits
//   open time with the Performance API (resource timings of the editor frame). For .docx it also runs
//   a two-user co-edit and splits each remote apply with timestamps of the Socket.IO frames
//   (WebSocket send on A / message on B, wrapped in the page; same host clock as Node's Date.now()).
// Needs the Document Server with the example and allowPrivateIPAddress (see .theseus/adapter/environment.md).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = process.argv[2];
const RUNS = +(process.argv[3] || 3);
const BASE = process.argv[4] || 'http://localhost/example/';
const EDITS = 30;

const pct = (a, q) => { const s = a.filter(x => !isNaN(x)).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const st = a => ({ n: a.length, p50: pct(a, .5), p90: pct(a, .9), max: pct(a, 1) });

// Wrap WebSocket in every frame: log wall-clock time of change frames sent / received.
const WS_HOOK = () => {
  const W = window.WebSocket; if (!W || W.__hooked) return;
  window.__ws = [];
  const send = W.prototype.send;
  W.prototype.send = function (d) {
    if (typeof d === 'string' && d.indexOf('saveChanges') >= 0) window.__ws.push({ dir: 'out', t: Date.now(), len: d.length });
    if (!this.__h) { this.__h = 1; this.addEventListener('message', e => {
      if (typeof e.data === 'string' && e.data.indexOf('saveChanges') >= 0) window.__ws.push({ dir: 'in', t: Date.now(), len: e.data.length }); }); }
    return send.call(this, d);
  };
  W.__hooked = 1;
};

const EDITOR_RE = /(document|spreadsheet|presentation)editor/;
async function editorFrame(page, timeout = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => EDITOR_RE.test(f.url()) && /index/.test(f.url()));
    if (f) {
      const ok = await f.evaluate(() => { const a = window.editor || (window.Asc && Asc.editor); return !!(a && a.isDocumentLoadComplete); }).catch(() => false);
      if (ok) return f;
    }
    await page.waitForTimeout(20);
  }
  throw new Error('editor not ready');
}

// Split of one open, all in ms relative to page.goto start (wall clock).
async function openSplit(f, tGoto, tReady) {
  const r = await f.evaluate(() => {
    const o = performance.timeOrigin, cat = { js: [0, 0, 0], css: [0, 0, 0], fonts: [0, 0, 0], bin: [0, 0, 0], other: [0, 0, 0] };
    let bin = null, lastJs = 0;
    for (const e of performance.getEntriesByType('resource')) {
      const u = e.name; let c = 'other';
      if (/Editor\.bin|\/cache\/files\//.test(u)) { c = 'bin'; bin = { start: o + e.startTime, end: o + e.responseEnd, kb: e.transferSize / 1024 }; }
      else if (/fonts\//.test(u) || /\.(ttf|otf|woff2?)(\?|$)/.test(u)) c = 'fonts';
      else if (/\.js(\?|$)/.test(u)) { c = 'js'; lastJs = Math.max(lastJs, o + e.responseEnd); }
      else if (/\.css(\?|$)/.test(u)) c = 'css';
      cat[c][0]++; cat[c][1] += e.duration; cat[c][2] += e.transferSize / 1024;
    }
    return { origin: o, cat, bin, lastJs };
  });
  const rel = t => t == null ? null : Math.round(t - tGoto);
  return {
    total: tReady - tGoto,
    frameStart: rel(r.origin),                 // host page + api.js until editor iframe navigation starts
    scriptsDone: rel(r.lastJs),                // last sdkjs/web-apps script received
    binStart: r.bin && rel(r.bin.start),       // client asked for Editor.bin (server opened + x2t converted before)
    binEnd: r.bin && rel(r.bin.end),
    binKB: r.bin && Math.round(r.bin.kb),
    render: r.bin ? Math.round(tReady - r.bin.end) : null, // parse Editor.bin + layout + first paint until load complete
    resources: Object.fromEntries(Object.entries(r.cat).map(([k, v]) => [k, { n: v[0], sumMs: Math.round(v[1]), kb: Math.round(v[2]) }])),
  };
}

async function upload(file) {
  const fd = new FormData();
  fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
  if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
  return r.filename;
}

async function coedit(browser, url) {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  for (const c of [ctxA, ctxB]) await c.addInitScript(WS_HOOK);
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  await a.goto(url); const fa = await editorFrame(a);
  await b.goto(url); const fb = await editorFrame(b);
  await a.waitForTimeout(2000);
  await fa.click('#id_main_view', { position: { x: 300, y: 200 } }).catch(() => {});
  await a.keyboard.press('Control+Home');
  const text = f => f.evaluate(() => editor.WordControl.m_oLogicDocument.GetText());
  const typing = [], rows = [];
  for (let i = 0; i < 20; i++) {
    const n = (await text(fa)).length, t = Date.now();
    await a.keyboard.type('x');
    await fa.waitForFunction(n => editor.WordControl.m_oLogicDocument.GetText().length > n, n, { polling: 'raf', timeout: 5000 });
    await fa.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    typing.push(Date.now() - t);
  }
  await a.waitForTimeout(1500);
  for (let i = 0; i < EDITS; i++) {
    const mark = 'zq' + i + 'k';
    await fa.evaluate(() => { window.__ws.length = 0; }); await fb.evaluate(() => { window.__ws.length = 0; });
    const t0 = Date.now();
    await a.keyboard.type(mark);
    const tType = Date.now();
    let tSeen = NaN;
    await fb.waitForFunction(m => editor.WordControl.m_oLogicDocument.GetText().indexOf(m) >= 0, mark, { polling: 5, timeout: 30000 })
      .then(() => { tSeen = Date.now(); }, () => {});
    await a.waitForTimeout(100);
    const out = (await fa.evaluate(() => window.__ws)).filter(x => x.dir === 'out');
    const inn = (await fb.evaluate(() => window.__ws)).filter(x => x.dir === 'in');
    const sent = out.length ? out[0].t : NaN, recv = inn.length ? inn[0].t : NaN;
    rows.push({ total: tSeen - t0, typeMs: tType - t0, batchA: sent - tType, wire: recv - sent, applyB: tSeen - recv, framesOut: out.length });
    await a.waitForTimeout(300);
  }
  await ctxA.close(); await ctxB.close();
  return { typing, rows };
}

async function main() {
  const browser = await chromium.launch();
  const files = fs.readdirSync(DIR).filter(f => /\.(docx|xlsx|pptx)$/.test(f)).sort();
  const result = {};
  for (const f of files) {
    const name = await upload(path.join(DIR, f));
    const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
    const opens = [];
    for (let r = 0; r < RUNS; r++) {
      const ctx = await browser.newContext(), p = await ctx.newPage();
      const t = Date.now(); await p.goto(url); const fr = await editorFrame(p);
      opens.push(await openSplit(fr, t, Date.now()));
      await ctx.close();
    }
    const k = key => st(opens.map(o => o[key]));
    result[f] = { bytes: fs.statSync(path.join(DIR, f)).size, open: { total: k('total'), frameStart: k('frameStart'), scriptsDone: k('scriptsDone'),
      binStart: k('binStart'), binEnd: k('binEnd'), binKB: opens[0].binKB, render: k('render'), resourcesFirstRun: opens[0].resources, resourcesLastRun: opens[RUNS - 1].resources } };
    if (/\.docx$/.test(f)) {
      const c = await coedit(browser, url);
      const col = key => st(c.rows.map(r => r[key]));
      result[f].typing = st(c.typing);
      result[f].remote = { total: col('total'), batchA: col('batchA'), wire: col('wire'), applyB: col('applyB'), raw: c.rows };
    }
    console.error('done', f);
  }
  await browser.close();
  console.log(JSON.stringify(result, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
