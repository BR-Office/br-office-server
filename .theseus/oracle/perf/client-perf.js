// Client-side performance probe (PKT-0014).
// Usage: node .theseus/oracle/perf/client-perf.js [runs] [base]
// Needs a running Document Server with EXAMPLE_ENABLED=true (see .theseus/adapter/environment.md).
// Measures in headless Chromium: open+render, typing latency, remote co-edit apply latency, JS heap.
const { chromium } = require('playwright');
const RUNS = +(process.argv[2] || 3);
const BASE = process.argv[3] || 'http://127.0.0.1:8080/example/';

const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const med = a => pct(a, 0.5);

async function editorFrame(page, timeout = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => /documenteditor/.test(f.url()));
    if (f) {
      const ok = await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete && editor.WordControl.m_oLogicDocument)).catch(() => false);
      if (ok) return f;
    }
    await page.waitForTimeout(50);
  }
  throw new Error('editor not ready');
}
const docText = f => f.evaluate(() => editor.WordControl.m_oLogicDocument.GetText ? editor.WordControl.m_oLogicDocument.GetText() : '');

async function main() {
  const browser = await chromium.launch();
  const out = { open: [], openSecond: [], type: [], remote: [], heapMB: [] };
  for (let r = 0; r < RUNS; r++) {
    const ctxA = await browser.newContext(), ctxB = await browser.newContext();
    const a = await ctxA.newPage(), b = await ctxB.newPage();
    // Open: new docx from the example, until the editor is interactive.
    let t = Date.now();
    await a.goto(BASE + 'editor?fileExt=docx');
    const fa = await editorFrame(a);
    out.open.push(Date.now() - t);
    // Second user opens the same document (co-edit session join, cached file).
    t = Date.now();
    await b.goto(a.url());
    const fb = await editorFrame(b);
    out.openSecond.push(Date.now() - t);
    await a.waitForTimeout(1500);
    await fa.click('#id_main_view', { position: { x: 200, y: 150 } }).catch(() => {});
    // Typing latency: keypress -> character in the model -> next animation frame (painted).
    for (let i = 0; i < 20; i++) {
      const before = (await docText(fa)).length;
      t = Date.now();
      await a.keyboard.type('x');
      await fa.waitForFunction(n => editor.WordControl.m_oLogicDocument.GetText().length > n, before, { polling: 'raf', timeout: 5000 });
      await fa.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
      out.type.push(Date.now() - t);
    }
    // Remote co-edit: A types a marker; time until B's model contains it (fast co-edit mode, autosave).
    for (let i = 0; i < 5; i++) {
      const mark = 'm' + r + 'q' + i;
      t = Date.now();
      await a.keyboard.type(mark);
      await fb.waitForFunction(m => editor.WordControl.m_oLogicDocument.GetText().indexOf(m) >= 0, mark, { polling: 50, timeout: 30000 })
        .then(() => out.remote.push(Date.now() - t), () => out.remote.push(NaN));
    }
    const heap = await fa.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
    out.heapMB.push(+(heap / 1048576).toFixed(1));
    await ctxA.close(); await ctxB.close();
  }
  await browser.close();
  const s = k => ({ n: out[k].length, p50: med(out[k]), p90: pct(out[k], 0.9), min: Math.min(...out[k]), max: Math.max(...out[k]) });
  console.log(JSON.stringify({ open: s('open'), openSecond: s('openSecond'), typing: s('type'), remoteApply: s('remote'), heapMB: out.heapMB, raw: out }, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
