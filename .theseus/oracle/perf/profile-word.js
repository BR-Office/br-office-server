// CPU profiles of the word editor (PKT-0043): open, typing and remote apply, recorded with CDP Profiler.
// Usage: node .theseus/oracle/perf/profile-word.js <file.docx> <out-dir> [runs] [base]
//   Uploads the file to the example, then per run (new browser contexts each time):
//   - open-<n>.cpuprofile: profile of the whole open; Editor.bin loadingFinished and load-complete times are
//     stored in <out-dir>/marks.json (CDP monotonic µs, same clock as the profile) so the analysis keeps only
//     "Editor.bin received -> isDocumentLoadComplete".
//   - type-<n>.cpuprofile: user A types 40 characters one by one (profile of A).
//   - apply-<n>.cpuprofile: user A types 30 markers, profile of user B while it receives and applies them.
//   Sampling interval 100 µs. The word bundle sdkjs/word/sdk-all.js ships with function names (whitespace-only
//   minification); sdk-all-min.js (base/common loader) is name-mangled. Analyse with attribute-word.js.
// Needs the native Document Server with the example (see .theseus/adapter/environment.md) and Playwright
// (NODE_PATH=/opt/node-tools/node_modules on the factory VM).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [FILE, OUT] = process.argv.slice(2);
const RUNS = +(process.argv[4] || 3);
const BASE = process.argv[5] || 'http://localhost/example/';
fs.mkdirSync(OUT, { recursive: true });

async function upload(file) {
  const fd = new FormData();
  fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
  if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
  return r.filename;
}
async function editorFrame(page, timeout = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => /documenteditor/.test(f.url()) && /index/.test(f.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) return f;
    await page.waitForTimeout(10);
  }
  throw new Error('editor not ready');
}
async function startProfile(page) {
  const s = await page.context().newCDPSession(page);
  await s.send('Profiler.enable'); await s.send('Profiler.setSamplingInterval', { interval: 100 });
  await s.send('Profiler.start');
  return s;
}
const stopProfile = async (s, file) => { const { profile } = await s.send('Profiler.stop'); fs.writeFileSync(file, JSON.stringify(profile)); return profile; };

async function main() {
  const browser = await chromium.launch();
  const name = await upload(FILE);
  const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
  const marks = {};
  for (let r = 0; r < RUNS; r++) {
    // Open
    const ctx = await browser.newContext(), p = await ctx.newPage();
    const s = await startProfile(p);
    await s.send('Network.enable');
    let binDone = null; const binIds = new Set();
    s.on('Network.requestWillBeSent', e => { if (/Editor\.bin/.test(e.request.url)) binIds.add(e.requestId); });
    s.on('Network.loadingFinished', e => { if (binIds.has(e.requestId)) binDone = e.timestamp * 1e6; });
    await p.goto(url); await editorFrame(p);
    const prof = await stopProfile(s, path.join(OUT, `open-${r}.cpuprofile`));
    marks[`open-${r}`] = { from: binDone, to: prof.endTime };
    await ctx.close();
    // Typing (A) and remote apply (B)
    const ca = await browser.newContext(), cb = await browser.newContext();
    const a = await ca.newPage(), b = await cb.newPage();
    await a.goto(url); const fa = await editorFrame(a);
    await b.goto(url); const fb = await editorFrame(b);
    await a.waitForTimeout(2000);
    await fa.click('#id_main_view', { position: { x: 300, y: 200 } }).catch(() => {});
    await a.keyboard.press('Control+Home');
    const len = f => f.evaluate(() => editor.WordControl.m_oLogicDocument.GetText().length);
    let sa = await startProfile(a);
    for (let i = 0; i < 40; i++) {
      const n = await len(fa);
      await a.keyboard.type('x');
      await fa.waitForFunction(n => editor.WordControl.m_oLogicDocument.GetText().length > n, n, { polling: 'raf', timeout: 5000 });
    }
    await stopProfile(sa, path.join(OUT, `type-${r}.cpuprofile`));
    await a.waitForTimeout(1500);
    const sb = await startProfile(b);
    for (let i = 0; i < 30; i++) {
      const mark = 'zq' + i + 'k';
      await a.keyboard.type(mark);
      await fb.waitForFunction(m => editor.WordControl.m_oLogicDocument.GetText().indexOf(m) >= 0, mark, { polling: 50, timeout: 30000 });
      await a.waitForTimeout(300);
    }
    await stopProfile(sb, path.join(OUT, `apply-${r}.cpuprofile`));
    await ca.close(); await cb.close();
    console.error('run', r, 'done');
  }
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 1));
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
