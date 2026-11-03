'use strict';
// Runner of open-docx-10p.sh (PKT-0126). One run = what a user does: select the 10-page docx in the
// example's file picker (POST /example/upload, multipart), the example opens the editor
// (/example/editor?fileName=...), wait until the document is fully rendered: editor.isDocumentLoadComplete,
// all 10 pages counted by the layout, then two animation frames (the last pixel is on screen).
// Each run uses a new browser and context (cold HTTP cache: first open). Marks, ms after the user's action:
//   upload  upload response received          goto     editor page DOMContentLoaded (example page)
//   api     api.js of the Document Server loaded (frame created)
//   sdk     sdk-all-min.js request sent (web-apps shell has booted up to loading the SDK)
//   loadDoc first asc_LoadDocument call          binReq/binEnd  Editor.bin requested / finished
//   complete isDocumentLoadComplete              painted  10 pages laid out + 2 rAF
// Prints one JSON line per run on stderr and the summary line on stdout.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const RUNS = +(process.env.RUNS || 5);
const FILE = path.join(__dirname, 'open-docx-10p.docx');
const PAGES = 10, T = 90000;

async function run(i) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
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
  const m = {}, net = {};
  page.on('request', r => { const u = r.url(); const k = /Editor\.bin/.test(u) ? 'binReq' : /sdk-all-min\.js/.test(u) ? 'sdk' : /api\.js/.test(u) ? 'apiReq' : null; if (k && !net[k]) net[k] = Date.now(); });
  page.on('requestfinished', r => { const u = r.url(); if (/Editor\.bin/.test(u) && !net.binEnd) net.binEnd = Date.now(); if (/api\.js/.test(u) && !net.api) net.api = Date.now(); });
  await page.goto(BASE + '/example/');
  // the user's action: choose the file in the picker
  const t0 = Date.now();
  const buf = fs.readFileSync(FILE);
  const res = await page.request.post(BASE + '/example/upload', { multipart: { uploadedFile: { name: 'open-docx-10p.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: buf } } });
  const name = (await res.json()).filename;
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
    const t = () => { const c = editor.WordControl && editor.WordControl.m_oLogicDocument ? editor.WordControl.m_oLogicDocument.GetPagesCount() : editor.getCountPages();
      if (c >= n) requestAnimationFrame(() => requestAnimationFrame(() => res({ at: performance.timeOrigin + performance.now(), pages: c, loadDoc: window.__m.loadDoc })));
      else setTimeout(t, 5); };
    t();
  }), PAGES);
  m.painted = Math.round(r.at - t0);
  m.loadDoc = r.loadDoc ? Math.round(r.loadDoc - t0) : null;
  for (const k of Object.keys(net)) m[k] = net[k] - t0;
  m.pages = r.pages;
  await browser.close();
  process.stderr.write(JSON.stringify({ run: i, ...m }) + '\n');
  return m;
}

(async () => {
  const all = [];
  if (process.env.WARMUP !== '0') await run('warmup'); // server-side caches (font list, JIT of docservice) as after a day of use; the browser is still cold
  for (let i = 0; i < RUNS; i++) all.push(await run(i));
  const med = k => { const v = all.map(x => x[k]).filter(x => x != null).sort((a, b) => a - b); return v[(v.length - 1) >> 1]; };
  const keys = Object.keys(all[0]).filter(k => k !== 'pages');
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify({ runs: all, p50: Object.fromEntries(keys.map(k => [k, med(k)])) }, null, 1));
  const tot = all.map(x => x.painted).sort((a, b) => a - b);
  console.log(`total_ms=${med('painted')} min_ms=${tot[0]} max_ms=${tot[tot.length - 1]} runs=${all.length}`);
})().catch(e => { console.error('FAIL open-docx-10p', e.message); process.exit(1); });
