// Co-edit round trip split into client and server segments (PKT-0018).
// Usage: node .theseus/oracle/perf/coedit-split.js [runs] [clients] [edits] [fileName] [base]
//   fileName: optional existing file in the example storage (e.g. large-100p.docx); default a new docx per run.
// Needs the native package with the example on port 80 and DocService logging at DEBUG to /tmp/ds-doc.log
// (log4js level DEBUG in /etc/euro-office/documentserver/log4js/production.json, see baseline.md).
// Per edit, client 0 (A) types a marker; segments, all on the host clock:
//   type      A: keyboard.type start -> A's WebSocket send of saveChanges (in-page hook)
//   up        A send -> DocService logs `data.type = saveChanges` (nginx + Socket.IO + event loop)
//   server    DocService receive -> last `sendData: type = saveChanges` (lock, PostgreSQL insert, pub/sub, emit)
//   down      server emit -> B's WebSocket message event (network + B's main thread getting scheduled)
//   apply     B message -> marker present in B's model (polling 20 ms)
// Host CPU busy % (from /proc/stat, sampled every 100 ms) and per-process CPU shares are reported too.
const { chromium } = require('playwright');
const fs = require('fs');
const RUNS = +(process.argv[2] || 3), N = +(process.argv[3] || 2), EDITS = +(process.argv[4] || 20);
const FILE = process.argv[5] || '', BASE = process.argv[6] || 'http://127.0.0.1/example/';
const LOG = '/tmp/ds-doc.log';
const pct = (a, q) => { const s = a.filter(x => !isNaN(x)).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const st = a => ({ n: a.filter(x => !isNaN(x)).length, p50: pct(a, .5), p90: pct(a, .9), p99: pct(a, .99), max: pct(a, 1) });

const WS_HOOK = () => {
  const W = window.WebSocket; if (!W || W.__hooked) return;
  window.__ws = [];
  const send = W.prototype.send;
  W.prototype.send = function (d) {
    if (typeof d === 'string' && d.indexOf('"saveChanges"') >= 0) window.__ws.push({ dir: 'out', t: Date.now() });
    if (!this.__h) { this.__h = 1; this.addEventListener('message', e => {
      if (typeof e.data === 'string' && e.data.indexOf('"saveChanges"') >= 0) window.__ws.push({ dir: 'in', t: Date.now() }); }); }
    return send.call(this, d);
  };
  W.__hooked = 1;
};
async function editorFrame(page, timeout = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => /documenteditor/.test(f.url()) && /index/.test(f.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete && editor.WordControl.m_oLogicDocument)).catch(() => false)) return f;
    await page.waitForTimeout(25);
  }
  throw new Error('editor not ready');
}
const hasText = (f, m) => f.waitForFunction(m => editor.WordControl.m_oLogicDocument.GetText().indexOf(m) >= 0, m, { polling: 20, timeout: 30000 });
const wsLog = f => f.evaluate(() => { const a = window.__ws || []; window.__ws = []; return a; });

// DocService log lines appended since byte offset `from`: [{t, kind}] with kind 'recv' | 'emit'.
function serverEvents(from) {
  const buf = fs.readFileSync(LOG).subarray(from).toString();
  const ev = [];
  for (const l of buf.split('\n')) {
    const m = /^\[(\d{4}-\d\d-\d\dT[\d:.]+)\]/.exec(l); if (!m) continue;
    const t = Date.parse(m[1] + 'Z');
    if (l.includes('data.type = saveChanges')) ev.push({ t, kind: 'recv' });
    else if (l.includes('sendData: type = saveChanges')) ev.push({ t, kind: 'emit' });
  }
  return ev;
}
// CPU: host busy fraction per 100 ms, and cumulative jiffies of chromium vs docservice vs the rest.
function cpuSampler() {
  const rd = () => fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].split(/\s+/).slice(1).map(Number);
  const proc = () => { const o = { chromium: 0, docservice: 0, other: 0 };
    for (const p of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) { try {
      const s = fs.readFileSync(`/proc/${p}/stat`, 'utf8'); const name = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'));
      const f = s.slice(s.lastIndexOf(')') + 2).split(' '); const j = +f[11] + +f[12];
      const cmd = fs.readFileSync(`/proc/${p}/cmdline`, 'utf8');
      o[/chrom|headless_shell/.test(name + cmd) ? 'chromium' : /docservice/.test(cmd) ? 'docservice' : 'other'] += j;
    } catch (e) {} } return o; };
  let prev = rd(); const busy = []; const p0 = proc();
  const id = setInterval(() => { const c = rd(); const d = c.map((x, i) => x - prev[i]); const tot = d.reduce((a, b) => a + b, 0);
    busy.push(tot ? 1 - (d[3] + d[4]) / tot : 0); prev = c; }, 100);
  return () => { clearInterval(id); const p1 = proc(); const share = {}; let sum = 0;
    for (const k in p1) { share[k] = p1[k] - p0[k]; sum += share[k]; }
    for (const k in share) share[k] = +(share[k] / sum).toFixed(2);
    return { busyMean: +(busy.reduce((a, b) => a + b, 0) / busy.length).toFixed(2), busyP90: +pct(busy, .9).toFixed(2), shareOfCpuTime: share }; };
}

async function main() {
  const browser = await chromium.launch();
  const seg = { total: [], type: [], up: [], server: [], down: [], apply: [] }, cpu = [], open = [];
  let batches = 0, missing = 0;
  for (let r = 0; r < RUNS; r++) {
    const ctx = [], pages = [], frames = [];
    for (let i = 0; i < N; i++) { ctx.push(await browser.newContext()); pages.push(await ctx[i].newPage()); await ctx[i].addInitScript(WS_HOOK); }
    let t = Date.now();
    await pages[0].goto(BASE + (FILE ? 'editor?fileName=' + encodeURIComponent(FILE) : 'editor?fileExt=docx'));
    frames.push(await editorFrame(pages[0])); open.push(Date.now() - t);
    for (let i = 1; i < N; i++) { await pages[i].goto(pages[0].url()); frames.push(await editorFrame(pages[i])); }
    await pages[0].waitForTimeout(1500);
    await frames[0].click('#id_main_view', { position: { x: 200, y: 150 } }).catch(() => {});
    await pages[0].keyboard.type('w'); await Promise.all(frames.slice(1).map(f => hasText(f, 'w').catch(() => {})));
    await pages[0].waitForTimeout(500);
    const stop = cpuSampler();
    for (let e = 0; e < EDITS; e++) {
      await Promise.all(frames.map(wsLog));
      const off = fs.statSync(LOG).size, mark = `r${r}e${e}z`; t = Date.now();
      await pages[0].keyboard.type(mark);
      const done = await Promise.all(frames.slice(1).map(f => hasText(f, mark).then(() => Date.now(), () => NaN)));
      await pages[0].waitForTimeout(300); // pause also lets the log flush
      const a = (await wsLog(frames[0])).filter(x => x.dir === 'out');
      const sv = serverEvents(off);
      if (a.length > 1) batches++;
      const tSend = a.length ? a[0].t : NaN;
      const recv = sv.find(x => x.kind === 'recv' && x.t >= tSend - 2);
      const emits = recv ? sv.filter(x => x.kind === 'emit' && x.t >= recv.t).slice(0, N - 1) : [];
      if (!recv || emits.length < N - 1) missing++;
      const tEmit = emits.length ? Math.max(...emits.map(x => x.t)) : NaN;
      for (let i = 1; i < N; i++) {
        const b = (await wsLog(frames[i])).filter(x => x.dir === 'in' && x.t >= tSend);
        const tIn = b.length ? b[0].t : NaN;
        seg.total.push(done[i - 1] - t); seg.type.push(tSend - t); seg.up.push(recv ? recv.t - tSend : NaN);
        seg.server.push(tEmit - (recv ? recv.t : NaN)); seg.down.push(tIn - tEmit); seg.apply.push(done[i - 1] - tIn);
      }
    }
    cpu.push(stop());
    for (const c of ctx) await c.close();
    await new Promise(z => setTimeout(z, 1000));
  }
  await browser.close();
  const out = { runs: RUNS, clients: N, edits: EDITS, file: FILE || 'new docx', open: st(open), multiBatchEdits: batches, unmatchedServerLines: missing, cpu };
  for (const k in seg) out[k] = st(seg[k]);
  // Where does each tail sample go? For the slowest 5 % of round trips, mean of every segment.
  const idx = seg.total.map((v, i) => i).filter(i => !isNaN(seg.total[i])).sort((x, y) => seg.total[y] - seg.total[x]).slice(0, Math.max(1, Math.ceil(seg.total.length * .05)));
  out.slowest5pct = {}; for (const k in seg) out.slowest5pct[k] = Math.round(idx.reduce((s, i) => s + (seg[k][i] || 0), 0) / idx.length);
  console.log(JSON.stringify(out));
}
main().catch(e => { console.error(e); process.exit(1); });
