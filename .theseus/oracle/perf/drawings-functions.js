// Per-function breakdown of the common "drawings" group (common/Drawings, Shapes, SmartArts) on client open (PKT-0073).
// Usage: node .theseus/oracle/perf/drawings-functions.js <dir-with-samples> <sdkjs-src> [runs] [base] > out.json
// Same open window, CDP profile (200 us) and bundle -> source-file mapping as profile-client.js (PKT-0045), whose
// helpers it loads (everything before its main()). Adds, for frames mapped to the drawings group:
//   selfByFunction  : self ms per "file:function"
//   inclByFunction  : inclusive ms per "file:function" (counted once per sample)
//   entry           : self ms of drawings grouped by the nearest NON-drawings caller ("file:function"), i.e. who
//                     calls into Drawings/Format (the editor side to coordinate with sdkjs-slide)
// Medians over runs are in `summary`.
const fs = require('fs'), path = require('path');
const pcSrc = fs.readFileSync(path.join(__dirname, 'profile-client.js'), 'utf8');
const lib = {};
new Function('require', 'process', 'lib', '__dirname', pcSrc.slice(0, pcSrc.indexOf('async function main()')) +
  '\nObject.assign(lib, { catFrame, editorFrame, upload, HOOK, chromium, EDITOR });')(require, process, lib, __dirname);
const { catFrame, editorFrame, upload, HOOK, chromium, EDITOR } = lib;
const [DIR] = [process.argv[2]];
const RUNS = +(process.argv[4] || 3);
const BASE = process.argv[5] || 'http://localhost/example/';
const DRAW = 'common: drawings';

function breakdown(ed, prof, t0, t1) {
  const parent = new Map();
  for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const info = new Map(prof.nodes.map(n => { const c = catFrame(ed, n.callFrame); const [g, f] = c.split('|');
    return [n.id, { g, key: (f || g) + ':' + (n.callFrame.functionName || '(anon)') + '@' + n.callFrame.lineNumber + ':' + n.callFrame.columnNumber }]; }));
  const self = {}, incl = {}, entry = {}; let total = 0, busy = 0, t = prof.startTime;
  for (let i = 0; i < prof.samples.length; i++) {
    t += prof.timeDeltas[i]; if (t < t0 || t > t1) continue;
    const d = (prof.timeDeltas[i + 1] ?? prof.timeDeltas[i]) / 1000, id = prof.samples[i], me = info.get(id);
    if (me.g !== '(idle)') busy += d;
    const seen = new Set();
    for (let x = id; x != null; x = parent.get(x)) { const k = info.get(x); if (k.g === DRAW && !seen.has(k.key)) { seen.add(k.key); incl[k.key] = (incl[k.key] || 0) + d; } }
    if (me.g !== DRAW) continue;
    total += d; self[me.key] = (self[me.key] || 0) + d;
    let x = parent.get(id); while (x != null && info.get(x).g === DRAW) x = parent.get(x);
    const ek = x == null ? '(root)' : info.get(x).key; entry[ek] = (entry[ek] || 0) + d;
  }
  return { busyMs: busy, drawingsSelfMs: total, self, incl, entry };
}

async function open(browser, url, ed) {
  const ctx = await browser.newContext(); await ctx.addInitScript(HOOK);
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  let binEnd = null; const req = new Map();
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', e => req.set(e.requestId, e.request.url));
  cdp.on('Network.loadingFinished', e => { if (/Editor\.bin/.test(req.get(e.requestId) || '')) binEnd = e.timestamp; });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.goto(url); await editorFrame(page);
  const { profile } = await cdp.send('Profiler.stop'); await ctx.close();
  return breakdown(ed, profile, binEnd * 1e6, profile.endTime);
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
function summarize(runs, field, n) {
  const keys = new Set(runs.flatMap(r => Object.keys(r[field])));
  return Object.fromEntries([...keys].map(k => [k, Math.round(med(runs.map(r => r[field][k] || 0)) * 10) / 10])
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n));
}
async function main() {
  const browser = await chromium.launch();
  const out = { date: new Date().toISOString().slice(0, 10), packet: 'PKT-0073', runs: RUNS, files: {} };
  for (const f of fs.readdirSync(DIR).filter(f => /\.(docx|xlsx|pptx)$/.test(f)).sort()) {
    const ed = EDITOR[f.split('.').pop()];
    const url = BASE + 'editor?fileName=' + encodeURIComponent(await upload(path.join(DIR, f)));
    const runs = []; for (let r = 0; r < RUNS; r++) runs.push(await open(browser, url, ed));
    out.files[f] = { editor: ed, summary: {
      busyMs: runs.map(r => Math.round(r.busyMs)), drawingsSelfMs: runs.map(r => Math.round(r.drawingsSelfMs)),
      selfByFunction: summarize(runs, 'self', 40), inclByFunction: summarize(runs, 'incl', 40), entry: summarize(runs, 'entry', 20) } };
    console.error('done', f, out.files[f].summary.drawingsSelfMs);
  }
  await browser.close(); console.log(JSON.stringify(out, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
