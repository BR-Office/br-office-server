'use strict';
// Runner of typing.sh (PKT-0128). Opens open-docx-10p.docx in the example editor (not measured), clicks into
// the body text, then presses KEYS letters one at a time (page.keyboard.press, 250 ms apart, so each key is
// drawn before the next). Per key, in the editor frame's clock (performance.now):
//   ev        KeyboardEvent.timeStamp of keydown (the OS/browser input time: t0)
//   kd        first JS keydown listener (capture, on window)        -> stage input (browser)
//   et0/et1   CDocument.EnterText start/end (model + sync recalc)   -> stage handler (keyboard/text input, sdkjs-common)
//   rc        ms inside CDocument.Recalculate_Page during EnterText  -> stage layout (sdkjs-word)
//   p0/p1     first WordControl.OnPaint after et1 start/end          -> stage wait-paint (PaintMessageLoop 40 ms), paint
//   f         rAF after p1 + one more rAF (frame presented)          -> stage frame (browser compositing)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const SESSIONS = +(process.env.SESSIONS || 3), KEYS = +(process.env.KEYS || 30);
const FILE = path.join(__dirname, 'open-docx-10p.docx');

const INIT = () => {
  const K = window.__k = [];
  let cur = null;
  window.addEventListener('keydown', e => { if (e.key.length === 1) { cur = { ev: e.timeStamp, kd: performance.now(), rc: 0, nrc: 0 }; K.push(cur); } }, true);
  const iv = setInterval(() => {
    const D = window.AscWord && AscWord.CDocument || window.CDocument;
    const ed = window.editor;
    if (!D || !D.prototype.EnterText || !ed || !ed.WordControl || D.prototype.__w) return;
    clearInterval(iv); D.prototype.__w = 1;
    const P = D.prototype, et = P.EnterText, rp = P.Recalculate_Page;
    P.EnterText = function () { const c = cur; if (c && c.et0 == null) c.et0 = performance.now(); try { return et.apply(this, arguments); } finally { if (c && c.et1 == null) c.et1 = performance.now(); } };
    P.Recalculate_Page = function () { const a = performance.now(); try { return rp.apply(this, arguments); } finally { const c = cur; if (c) { const d = performance.now() - a; if (c.et1 == null) c.rc += d; else c.rcLate = (c.rcLate || 0) + d; c.nrc++; } } };
    const wc = ed.WordControl, op = wc.OnPaint;
    wc.OnPaint = function () { const c = cur, a = performance.now(); try { return op.apply(this, arguments); } finally {
      if (c && c.et1 != null && c.p0 == null) { c.p0 = a; c.p1 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { c.f = performance.now(); })); } } };
    window.__ready = 1;
  }, 5);
};

async function session(s, browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  await page.goto(BASE + '/example/');
  const res = await page.request.post(BASE + '/example/upload', { multipart: { uploadedFile: { name: 'typing.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: fs.readFileSync(FILE) } } });
  const name = (await res.json()).filename;
  await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  let f; const dl = Date.now() + 120000;
  for (;;) {
    if (Date.now() > dl) throw new Error('editor did not complete');
    f = page.frames().find(x => x.name() === 'frameEditor');
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete && window.__ready && !(editor.WordControl.m_oLogicDocument.FullRecalc.Id != null))).catch(() => false)) break;
    await new Promise(r => setTimeout(r, 50));
  }
  await new Promise(r => setTimeout(r, 1500));
  const box = await (await f.frameElement()).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 260); // into the first page's text
  await new Promise(r => setTimeout(r, 500));
  await f.evaluate(() => { window.__k.length = 0; });
  for (let i = 0; i < KEYS + 2; i++) { await page.keyboard.press('abcdefghij'[i % 10]); await new Promise(r => setTimeout(r, 250)); }
  await new Promise(r => setTimeout(r, 500));
  const ks = (await f.evaluate(() => window.__k)).slice(2); // first 2 keys: warm-up (JIT)
  await browser.contexts().forEach(() => {});
  await ctx.close();
  return ks.map(k => ({ s,
    input: k.kd - k.ev, handler: (k.et0 - k.kd) + (k.et1 - k.et0 - k.rc), layout: k.rc,
    wait: k.p0 - k.et1, paint: k.p1 - k.p0, frame: k.f - k.p1, total: k.f - k.ev, nrc: k.nrc, rcLate: k.rcLate || 0,
    pre: k.et0 - k.kd, model: k.et1 - k.et0 - k.rc }));
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  try { for (let s = 0; s < SESSIONS; s++) all.push(...await session(s, browser)); } finally { await browser.close(); }
  const ok = all.filter(k => Object.values(k).every(v => Number.isFinite(v)));
  if (!ok.length) throw new Error('no complete keystroke: ' + JSON.stringify(all.slice(0, 2)));
  const med = key => { const v = ok.map(x => x[key]).sort((a, b) => a - b); return +v[(v.length - 1) >> 1].toFixed(2); };
  const keys = Object.keys(ok[0]).filter(k => k !== 's');
  const p50 = Object.fromEntries(keys.map(k => [k, med(k)]));
  const mean = Object.fromEntries(keys.map(k => [k, +(ok.reduce((a, x) => a + x[k], 0) / ok.length).toFixed(2)]));
  process.stderr.write(JSON.stringify({ incomplete: all.length - ok.length, p50, mean }) + '\n');
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify({ keys: ok, p50, mean }, null, 1));
  const t = ok.map(x => x.total).sort((a, b) => a - b);
  console.log(`total_ms=${Math.round(med('total'))} min_ms=${Math.round(t[0])} max_ms=${Math.round(t[t.length - 1])} runs=${ok.length}`);
})().catch(e => { console.error('FAIL typing', e.message); process.exit(1); });
