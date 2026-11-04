'use strict';
// Runner of open-docx-real-internet.sh (PKT-0141, from open-docx-real-run.cjs): same journey, with CDP network
// emulation 50 Mbps down / 10 Mbps up / 30 ms latency on the page (all frames), the upload done by the page's fetch so
// it pays the uplink too, and every response accounted (bytes, duration) by the module whose URL asks for it.
// Original header: One run = what a user does: select the real 11-page docx (samples/aluno-moderno.docx: images, tables, CJK fonts) in the
// example's file picker (POST /example/upload, multipart), the example opens the editor
// (/example/editor?fileName=...), wait until the document is fully rendered: editor.isDocumentLoadComplete,
// all 10 pages counted by the layout, then two animation frames (the last pixel is on screen).
// Each run uses a new browser and context (cold HTTP cache: first open). Marks, ms after the user's action:
//   upload  upload response received          goto     editor page DOMContentLoaded (example page)
//   api     api.js of the Document Server loaded (frame created)
//   sdk     sdk-all-min.js request sent (web-apps shell has booted up to loading the SDK)
//   loadDoc first asc_LoadDocument call          binReq/binEnd  Editor.bin requested / finished
//   complete isDocumentLoadComplete              painted  layout recalculation finished (FullRecalc.Id null,
//            page count stable) + 2 rAF. The "10-page" sample lays out as 9 pages in this build: the runner
//            no longer waits for a fixed count (it hung forever on 10), it records the count in `pages`.
// Prints one JSON line per run on stderr and the summary line on stdout.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const RUNS = +(process.env.RUNS || 5);
const FILE = path.join(__dirname, 'samples', 'aluno-moderno.docx');
const PAGES = 0, T = 240000;

async function run(i) {
  const browser = await chromium.launch();
  try { return await run1(i, browser); } finally { await browser.close().catch(() => {}); }
}
async function run1(i, browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    window.__m = {};
    const iv = setInterval(() => {
      const p = window.asc_docs_api && window.asc_docs_api.prototype;
      if (!p || !p.asc_LoadDocument || p.__w) return;
      const f = p.asc_LoadDocument; p.__w = 1; clearInterval(iv);
      p.asc_LoadDocument = function () { window.__m.loadDoc = performance.timeOrigin + performance.now(); return f.apply(this, arguments); };
    }, 2);
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  // web-apps registers docserviceworker.js, which fetches Editor.bin and /cache/files media itself: those requests
  // left the page's emulated link (0 bytes, 15 ms in PKT-0141 attempt 1). The worker is blocked (first open: it is
  // empty anyway; the HTTP cache stays on, the context is new) so every byte goes through the throttled page network and is counted.
  await cdp.send('Network.setBypassServiceWorker', { bypass: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 30, downloadThroughput: 50e6 / 8, uploadThroughput: 10e6 / 8 });
  const reqs = {};
  cdp.on('Network.requestWillBeSent', e => { reqs[e.requestId] = { url: e.request.url, t: e.timestamp }; });
  cdp.on('Network.loadingFinished', e => { const q = reqs[e.requestId]; if (q) { q.bytes = e.encodedDataLength; q.end = e.timestamp; } });
  let wallT0 = null, monoT0 = null;
  cdp.on('Network.requestWillBeSent', e => { if (monoT0 == null && /\/example\/upload/.test(e.request.url)) { monoT0 = e.timestamp; } });
  const m = {}, net = {};
  page.on('request', r => { const u = r.url(); const k = /Editor\.bin/.test(u) ? 'binReq' : /sdk-all-min\.js/.test(u) ? 'sdk' : /api\.js/.test(u) ? 'apiReq' : null; if (k && !net[k]) net[k] = Date.now(); });
  page.on('requestfinished', r => { const u = r.url(); if (/Editor\.bin/.test(u) && !net.binEnd) net.binEnd = Date.now(); if (/api\.js/.test(u) && !net.api) net.api = Date.now(); });
  await page.goto(BASE + '/example/');
  // the user's action: choose the file in the picker
  const t0 = Date.now();
  const buf = fs.readFileSync(FILE);
  const name = await page.evaluate(async b64 => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData(); fd.append('uploadedFile', new File([bin], 'aluno-moderno.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename;
  }, buf.toString('base64'));
  m.upload = Date.now() - t0;
  await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  m.goto = Date.now() - t0;
  let f = null;
  const dl = Date.now() + T;
  for (;;) {
    if (Date.now() > dl) throw new Error('editor did not complete');
    f = page.frames().find(x => x.name() === 'frameEditor');
    const ok = f && await f.evaluate(n => !!(window.editor && editor.isDocumentLoadComplete), PAGES).catch(() => false);
    if (ok) break;
    await new Promise(r => setTimeout(r, 5));
  }
  m.complete = Date.now() - t0;
  const r = await f.evaluate(n => new Promise(res => {
    const t = () => { const d = editor.WordControl && editor.WordControl.m_oLogicDocument;
      const c = d ? d.GetPagesCount() : editor.getCountPages();
      const busy = d && d.FullRecalc && d.FullRecalc.Id != null;
      if (!busy && c >= n && c > 0) requestAnimationFrame(() => requestAnimationFrame(() => res({ at: performance.timeOrigin + performance.now(), pages: c, loadDoc: window.__m.loadDoc })));
      else setTimeout(t, 5); };
    t();
  }), PAGES);
  m.painted = Math.round(r.at - t0);
  m.loadDoc = r.loadDoc ? Math.round(r.loadDoc - t0) : null;
  for (const k of Object.keys(net)) m[k] = net[k] - t0;
  m.pages = r.pages;
  // downloads by requesting module (only requests sent after the user's action)
  const mod = u => /\/example\//.test(u) ? 'project(example)' : /\/web-apps\/apps\/api\//.test(u) ? 'web-apps-documenteditor(api.js)'
    : /\/web-apps\//.test(u) ? 'web-apps-documenteditor' : /\/sdkjs\/word\//.test(u) ? 'sdkjs-word' : /\/sdkjs\/common\/|\/fonts\//.test(u) ? 'sdkjs-common'
    : /Editor\.bin/.test(u) ? 'sdkjs-common(Editor.bin)' : /\/sdkjs\//.test(u) ? 'sdkjs-common' : /\/cache\/files\//.test(u) ? 'docservice(media)'
    : /\/doc\/|\/coauthoring|socket/.test(u) ? 'docservice' : /^data:|^blob:/.test(u) ? null : 'other';
  const dls = {};
  for (const q of Object.values(reqs)) { if (q.bytes == null || monoT0 == null || q.t < monoT0) continue; const k = mod(q.url); if (!k) continue;
    const d = dls[k] || (dls[k] = { n: 0, bytes: 0, ms: 0, first: 1e12, last: 0 }); d.n++; d.bytes += q.bytes; d.ms += Math.round((q.end - q.t) * 1000);
    d.first = Math.min(d.first, Math.round((q.t - monoT0) * 1000)); d.last = Math.max(d.last, Math.round((q.end - monoT0) * 1000)); }
  m.dl = dls;
  process.stderr.write(JSON.stringify({ run: i, ...m }) + '\n');
  return m;
}

(async () => {
  const all = [];
  if (process.env.WARMUP !== '0') await run('warmup'); // server-side caches (font list, JIT of docservice) as after a day of use; the browser is still cold
  for (let i = 0; i < RUNS; i++) all.push(await run(i));
  const med = k => { const v = all.map(x => x[k]).filter(x => x != null).sort((a, b) => a - b); return v[(v.length - 1) >> 1]; };
  const keys = Object.keys(all[0]).filter(k => k !== 'dl');
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify({ runs: all, p50: Object.fromEntries(keys.map(k => [k, med(k)])) }, null, 1));
  const tot = all.map(x => x.painted).sort((a, b) => a - b);
  console.log(`total_ms=${med('painted')} min_ms=${tot[0]} max_ms=${tot[tot.length - 1]} runs=${all.length}`);
})().catch(e => { console.error('FAIL open-docx-real-internet', e.message); process.exit(1); });
