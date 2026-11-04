'use strict';
// Runner of coedit-remote.sh (PKT-0129). A and B (two browser contexts, one Chromium) open the same copy of
// open-docx-10p.docx in the example editor (not measured); A clicks into page 1's text and presses KEYS letters,
// KEY_GAP ms apart. Every timestamp is absolute host time (performance.timeOrigin + performance.now()), so
// both pages and the DocService log share one clock. Per change:
//   A: ev (keydown timeStamp) -> et1 (CDocument.EnterText end)             stage a-input
//      et1 -> s0 (CollaborativeEditing.Send_Changes start, 40 ms _autoSave tick)   stage a-wait-send
//      s0 -> ws (WebSocket.send of saveChanges: serialization)            stage a-send
//   wire: ws -> B's WebSocket message timeStamp; split with DocService DEBUG log lines
//      `data.type = saveChanges` (recv) and `sendData: type = saveChanges` (emit): up, server, down
//   B: msg -> r1 (DocsCoApi._onSaveChanges end: Socket.IO parse + queue)  stage b-receive
//      r1 -> ap0 (Apply_Changes start, next _autoSave tick)                stage b-wait-apply
//      ap0 -> ap1 (Apply_Changes: deserialize + apply + recalc)            stage b-apply (rc = Recalculate_Page)
//      ap1 -> p0 (first WordControl.OnPaint after apply)                   stage b-wait-paint
//      p0 -> p1 (OnPaint)                                                   stage b-paint
//      p1 -> f (2 rAF: frame presented)                                     stage b-frame
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const SESSIONS = +(process.env.SESSIONS || 3), KEYS = +(process.env.KEYS || 20), GAP = +(process.env.KEY_GAP || 700);
const LOG = process.env.DS_LOG || '/var/log/euro-office/documentserver/docservice/out.log';
const FILE = path.join(__dirname, 'open-docx-10p.docx');

const INIT = () => {
  const now = () => performance.timeOrigin + performance.now();
  const A = window.__a = [], B = window.__b = [];
  let cur = null, rcur = null;
  window.addEventListener('keydown', e => { if (e.key.length === 1) { cur = { ev: performance.timeOrigin + e.timeStamp }; A.push(cur); } }, true);
  const W = window.WebSocket;
  if (W && !W.__h) { W.__h = 1; const send = W.prototype.send;
    W.prototype.send = function (d) {
      if (typeof d === 'string' && d.indexOf('"saveChanges"') >= 0) { const c = A.find(x => x.et1 != null && x.ws == null); if (c) c.ws = now(); }
      if (!this.__h) { this.__h = 1; this.addEventListener('message', e => {
        if (typeof e.data === 'string' && e.data.indexOf('"saveChanges"') >= 0) window.__lastMsg = performance.timeOrigin + e.timeStamp; }); }
      return send.call(this, d); }; }
  const iv = setInterval(() => {
    const D = window.AscWord && AscWord.CDocument || window.CDocument, ed = window.editor;
    const CE = window.AscCommon && AscCommon.CollaborativeEditing;
    const co = ed && ed.CoAuthoringApi && ed.CoAuthoringApi._CoAuthoringApi;
    if (!D || !D.prototype.EnterText || !ed || !ed.WordControl || !CE || !co || D.prototype.__w) return;
    clearInterval(iv); D.prototype.__w = 1;
    const P = D.prototype, et = P.EnterText, rp = P.Recalculate_Page;
    P.EnterText = function () { const c = cur; try { return et.apply(this, arguments); } finally { if (c && c.et1 == null) c.et1 = now(); } };
    P.Recalculate_Page = function () { const a = now(); try { return rp.apply(this, arguments); } finally { const r = rcur; if (r && r.ap0 == null && r.r1 != null && CE.__in) r.rc += now() - a; else if (r && r.ap1 != null && r.p0 == null) r.rcLate += now() - a; } };
    const sc = CE.Send_Changes;
    CE.Send_Changes = function () { const c = A.find(x => x.et1 != null && x.s0 == null); if (c) c.s0 = now(); return sc.apply(this, arguments); };
    const ac = CE.Apply_Changes;
    CE.Apply_Changes = function () { const r = rcur, a = now(); CE.__in = 1; try { return ac.apply(this, arguments); } finally { CE.__in = 0; if (r && r.r1 != null && r.ap0 == null && CE.m_aChanges.length === 0) { r.ap0 = a; r.ap1 = now(); } } };
    const os = co._onSaveChanges;
    // Socket.IO's own message listener runs before ours, so the message time is read from window.event
    co._onSaveChanges = function () { const e = window.event, m = e && e.type === 'message' ? performance.timeOrigin + e.timeStamp : (window.__lastMsg || now());
      if (rcur && rcur.msg === m) return os.apply(this, arguments); // nested call for the same message
      const r = rcur = { msg: m, rc: 0, rcLate: 0 }; B.push(r);
      try { return os.apply(this, arguments); } finally { r.r1 = now(); } };
    const wc = ed.WordControl, op = wc.OnPaint;
    wc.OnPaint = function () { const r = rcur, a = now(); try { return op.apply(this, arguments); } finally {
      if (r && r.ap1 != null && r.p0 == null) { r.p0 = a; r.p1 = now(); requestAnimationFrame(() => requestAnimationFrame(() => { r.f = now(); })); } } };
    window.__ready = 1;
  }, 5);
};

async function open(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  const dl = Date.now() + 120000;
  for (;;) {
    if (Date.now() > dl) throw new Error('editor did not complete');
    const f = page.frames().find(x => x.name() === 'frameEditor');
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete && window.__ready && !(editor.WordControl.m_oLogicDocument.FullRecalc.Id != null))).catch(() => false)) return { ctx, page, f };
    await new Promise(r => setTimeout(r, 50));
  }
}
// DocService log events (absolute ms) appended since byte offset `from`. The log is in local time = UTC here.
function serverEvents(from) {
  let buf; try { const fd = fs.openSync(LOG, 'r'), n = fs.fstatSync(fd).size - from; buf = Buffer.alloc(Math.max(0, n)); fs.readSync(fd, buf, 0, buf.length, from); fs.closeSync(fd); } catch (e) { return []; }
  const ev = [];
  for (const l of buf.toString().split('\n')) {
    const m = /^\[(\d{4}-\d\d-\d\dT[\d:.]+)\]/.exec(l); if (!m) continue;
    const t = Date.parse(m[1] + 'Z');
    if (l.includes('data.type = saveChanges')) ev.push({ t, k: 'recv' }); else if (l.includes('sendData: type = saveChanges')) ev.push({ t, k: 'emit' });
  }
  return ev;
}
const logSize = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };

async function session(s, browser) {
  const ctx0 = await browser.newContext(); const p0 = await ctx0.newPage(); await p0.goto(BASE + '/example/');
  const res = await p0.request.post(BASE + '/example/upload', { multipart: { uploadedFile: { name: 'coedit.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: fs.readFileSync(FILE) } } });
  const name = (await res.json()).filename; await ctx0.close();
  const a = await open(browser, name), b = await open(browser, name);
  await new Promise(r => setTimeout(r, 2000));
  const box = await (await a.f.frameElement()).boundingBox();
  await a.page.mouse.click(box.x + box.width / 2, box.y + 260);
  await new Promise(r => setTimeout(r, 500));
  // 2 warm-up keys (JIT, first lock of the paragraph), not counted
  for (let i = 0; i < 2; i++) { await a.page.keyboard.press('x'); await new Promise(r => setTimeout(r, GAP)); }
  await a.f.evaluate(() => { window.__a.length = 0; }); await b.f.evaluate(() => { window.__b.length = 0; });
  const from = logSize();
  for (let i = 0; i < KEYS; i++) { await a.page.keyboard.press('abcdefghij'[i % 10]); await new Promise(r => setTimeout(r, GAP)); }
  await new Promise(r => setTimeout(r, 1000));
  const As = await a.f.evaluate(() => window.__a), Bs = await b.f.evaluate(() => window.__b);
  const ev = serverEvents(from);
  if (process.env.DEBUG_RAW) process.stderr.write(JSON.stringify({ As, Bs, ev: ev.length }) + "\n");
  await a.ctx.close(); await b.ctx.close();
  const out = [];
  for (const k of As) {
    if (k.ws == null) continue;
    const r = Bs.find(x => x.msg >= k.ws && !x.used); if (!r || r.f == null) continue; r.used = 1;
    const rv = ev.find(e => e.k === 'recv' && e.t >= k.ws - 2), em = rv && ev.find(e => e.k === 'emit' && e.t >= rv.t && e.t <= r.msg + 2);
    const o = { s, 'a-input': k.et1 - k.ev, 'a-wait-send': k.s0 - k.et1, 'a-send': k.ws - k.s0, wire: r.msg - k.ws,
      'b-receive': r.r1 - r.msg, 'b-wait-apply': r.ap0 - r.r1, 'b-apply': r.ap1 - r.ap0 - r.rc, 'b-recalc': r.rc,
      'b-wait-paint': r.p0 - r.ap1 - r.rcLate, 'b-recalc-late': r.rcLate, 'b-paint': r.p1 - r.p0, 'b-frame': r.f - r.p1, total: r.f - k.ev };
    if (rv && em) { o.up = Math.max(0, rv.t - k.ws); o.server = em.t - rv.t; o.down = Math.max(0, r.msg - em.t); }
    out.push(o);
  }
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  try { for (let s = 0; s < SESSIONS; s++) all.push(...await session(s, browser)); } finally { await browser.close(); }
  const core = ['a-input', 'a-wait-send', 'a-send', 'wire', 'b-receive', 'b-wait-apply', 'b-apply', 'b-recalc', 'b-wait-paint', 'b-recalc-late', 'b-paint', 'b-frame', 'total'];
  const ok = all.filter(k => core.every(c => Number.isFinite(k[c])));
  if (!ok.length) throw new Error('no complete remote change: ' + JSON.stringify(all.slice(0, 2)));
  const stat = key => { const v = ok.map(x => x[key]).filter(Number.isFinite).sort((a, b) => a - b); if (!v.length) return null;
    return { p50: +v[(v.length - 1) >> 1].toFixed(2), mean: +(v.reduce((a, x) => a + x, 0) / v.length).toFixed(2), n: v.length }; };
  const keys = Object.keys(ok[0]).filter(k => k !== 's').concat(['up', 'server', 'down'].filter(k => !(k in ok[0])));
  const st = Object.fromEntries(keys.map(k => [k, stat(k)]));
  process.stderr.write(JSON.stringify({ measured: all.length, incomplete: all.length - ok.length, stages: st }) + '\n');
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify({ changes: ok, stages: st }, null, 1));
  const t = ok.map(x => x.total).sort((a, b) => a - b);
  console.log(`total_ms=${Math.round(st.total.p50)} min_ms=${Math.round(t[0])} max_ms=${Math.round(t[t.length - 1])} runs=${ok.length}`);
})().catch(e => { console.error('FAIL coedit-remote', e.message); process.exit(1); });
