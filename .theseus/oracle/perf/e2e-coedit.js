// End-to-end open / co-edit / save probe on the full stack (PKT-0015).
// Usage: node .theseus/oracle/perf/e2e-coedit.js [runs] [clients] [edits] [base]
// Needs the container `eo` running with EXAMPLE_ENABLED=true (see .theseus/adapter/environment.md).
// Per run: N headless Chromium clients open one new docx through the example integration (DocService +
// PostgreSQL + Redis + RabbitMQ + x2t open conversion + sdkjs); client 0 types markers and we time until
// every other client's model contains them (co-edit round trip A -> server -> B); then all clients close
// and we time until the example storage receives the saved file (callback status 2 after the server's
// savetimeoutdelay, 5 s by default, + x2t assembly of the changes).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const RUNS = +(process.argv[2] || 3), N = +(process.argv[3] || 2), EDITS = +(process.argv[4] || 10);
// Use the container's bridge IP on port 80, not 127.0.0.1:8080: the example builds the callback and download
// URLs from the browser's host, and 127.0.0.1:8080 does not exist inside the container (save fails ECONNREFUSED).
const BASE = process.argv[5] || `http://${execFileSync('docker', ['inspect', 'eo', '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).toString().trim()}/example/`;
const pct = (a, q) => { const s = a.filter(x => !isNaN(x)).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

async function editorFrame(page, timeout = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => /documenteditor/.test(f.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete && editor.WordControl.m_oLogicDocument)).catch(() => false)) return f;
    await page.waitForTimeout(25);
  }
  throw new Error('editor not ready');
}
const hasText = (f, m, timeout) => f.waitForFunction(m => editor.WordControl.m_oLogicDocument.GetText().indexOf(m) >= 0, m, { polling: 20, timeout });
// Newest file in the example storage: name and mtime (ms), read inside the container.
const storage = () => {
  const o = execFileSync('docker', ['exec', 'eo', 'sh', '-c', 'find /var/lib/euro-office/documentserver-example/files -maxdepth 2 -type f -name "*.docx" -printf "%T@ %p\\n" | sort -n | tail -1']).toString().trim();
  const [t, p] = o.split(' '); return { t: +t * 1000, p };
};

async function main() {
  const browser = await chromium.launch();
  const out = { openFirst: [], openJoin: [], roundTrip: [], save: [] };
  for (let r = 0; r < RUNS; r++) {
    const ctx = [], pages = [], frames = [];
    for (let i = 0; i < N; i++) { ctx.push(await browser.newContext()); pages.push(await ctx[i].newPage()); }
    let t = Date.now();
    await pages[0].goto(BASE + 'editor?fileExt=docx');
    frames.push(await editorFrame(pages[0])); out.openFirst.push(Date.now() - t);
    for (let i = 1; i < N; i++) { t = Date.now(); await pages[i].goto(pages[0].url()); frames.push(await editorFrame(pages[i])); out.openJoin.push(Date.now() - t); }
    await pages[0].waitForTimeout(1500);
    await frames[0].click('#id_main_view', { position: { x: 200, y: 150 } }).catch(() => {});
    // Warm-up edit, not counted: the first change of a session also takes the paragraph lock and was lost
    // or delayed in the trial run.
    await pages[0].keyboard.type('w'); await Promise.all(frames.slice(1).map(f => hasText(f, 'w', 30000).catch(() => {})));
    for (let e = 0; e < EDITS; e++) {
      const mark = `r${r}e${e}z`; t = Date.now();
      await pages[0].keyboard.type(mark);
      const ts = await Promise.all(frames.slice(1).map(f => hasText(f, mark, 30000).then(() => Date.now() - t, () => NaN)));
      out.roundTrip.push(...ts);
      await pages[0].waitForTimeout(300);
    }
    const before = storage();
    t = Date.now();
    for (const c of ctx) await c.close();
    let s = NaN;
    while (Date.now() - t < 60000) { const now = storage(); if (now.p === before.p && now.t > before.t) { s = now.t - t; break; } await new Promise(z => setTimeout(z, 100)); }
    out.save.push(s);
  }
  await browser.close();
  const st = k => ({ n: out[k].length, p50: pct(out[k], 0.5), p99: pct(out[k], 0.99), min: Math.min(...out[k]), max: Math.max(...out[k]), failed: out[k].filter(isNaN).length });
  console.log(JSON.stringify({ runs: RUNS, clients: N, edits: EDITS, openFirst: st('openFirst'), openJoin: st('openJoin'), roundTrip: st('roundTrip'), saveAfterClose: st('save'), raw: out }, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
