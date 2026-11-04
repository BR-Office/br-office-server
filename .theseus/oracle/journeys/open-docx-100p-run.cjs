'use strict';
// Runner of open-docx-100p.sh (PKT-0127, from the 10p runner of PKT-0126). One run = what a user does: select the 100-page docx in the
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
// PROFILE=1 (PKT-0134): separate profiling runs, never mixed with the timed runs above (the profiler slows the page).
//   Each run takes a CDP CPU profile (Profiler, 100 us) and the CDP Network events of Editor.bin, and attributes
//   self-time per module over the windows bin (Editor.bin request -> loadingFinished), open (loadingFinished ->
//   isDocumentLoadComplete) and layout (complete -> painted). Attribution as PKT-0045 (perf/profile-client.js):
//   the served word bundles are mapped back to external/sdkjs source files by anchors of configs/word.json.
//   Network split of Editor.bin: ttfb (request -> response headers), body (headers -> loadingFinished), and the
//   main-thread busy time inside that window. Prints a JSON summary (p50 over runs) on stdout; PROFILE_JSON=<file>
//   keeps every run. SDKJS_SRC (default external/sdkjs of the worktree).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const RUNS = +(process.env.RUNS || 5);
const FILE = path.join(__dirname, 'open-docx-100p.docx');
const PAGES = 0, T = 240000;

async function run(i) {
  const browser = await chromium.launch();
  try { return await run1(i, browser); } finally { await browser.close().catch(() => {}); }
}
async function run1(i, browser) {
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
  let cdp = null; const bin = {};
  if (PROFILE) {
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent', e => { if (/Editor\.bin/.test(e.request.url) && !bin.id) { bin.id = e.requestId; bin.req = e.timestamp * 1e6; bin.off = e.wallTime * 1e6 - e.timestamp * 1e6; } });
    cdp.on('Network.responseReceived', e => { if (e.requestId === bin.id) bin.hdr = e.timestamp * 1e6; });
    cdp.on('Network.dataReceived', e => { if (e.requestId === bin.id) { bin.data = (bin.data || 0) + e.dataLength; if (!bin.first) bin.first = e.timestamp * 1e6; } });
    cdp.on('Network.loadingFinished', e => { if (e.requestId === bin.id) { bin.fin = e.timestamp * 1e6; bin.bytes = e.encodedDataLength; } });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  }
  page.on('request', r => { const u = r.url(); const k = /Editor\.bin/.test(u) ? 'binReq' : /sdk-all-min\.js/.test(u) ? 'sdk' : /api\.js/.test(u) ? 'apiReq' : null; if (k && !net[k]) net[k] = Date.now(); });
  page.on('requestfinished', r => { const u = r.url(); if (/Editor\.bin/.test(u) && !net.binEnd) net.binEnd = Date.now(); if (/api\.js/.test(u) && !net.api) net.api = Date.now(); });
  await page.goto(BASE + '/example/');
  // the user's action: choose the file in the picker
  const t0 = Date.now();
  const buf = fs.readFileSync(FILE);
  const res = await page.request.post(BASE + '/example/upload', { multipart: { uploadedFile: { name: 'open-docx-100p.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: buf } } });
  const name = (await res.json()).filename;
  m.upload = Date.now() - t0;
  if (cdp) await cdp.send('Profiler.start');
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
  const completeWall = Date.now();
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
  if (cdp) {
    const { profile } = await cdp.send('Profiler.stop');
    const mono = wallMs => wallMs * 1000 - bin.off; // wall ms -> CDP monotonic us
    const tc = mono(completeWall), tp = mono(r.at);
    m.profile = {
      net: { ttfbMs: ms(bin.hdr - bin.req), bodyMs: ms(bin.fin - bin.hdr), totalMs: ms(bin.fin - bin.req), bytes: bin.bytes,
        finToPlaywrightMs: m.binEnd != null ? Math.round(net.binEnd - (bin.fin + bin.off) / 1000) : null },
      bin: attribute(profile, bin.req, bin.fin),
      open: attribute(profile, bin.fin, tc),
      layout: attribute(profile, tc, tp),
      all: attribute(profile, bin.req, tp),
    };
  }
  process.stderr.write(JSON.stringify({ run: i, ...m, profile: undefined }) + '\n');
  return m;
}

// ---------- PROFILE: attribution (from perf/profile-client.js, PKT-0045) ----------
const PROFILE = process.env.PROFILE === '1';
const SRC = process.env.SDKJS_SRC || path.join(__dirname, '../../../external/sdkjs');
const DS = '/var/www/euro-office/documentserver/sdkjs';
const ms = us => Math.round(us / 1000);
const maps = {};
function fileMap(ed, min) {
  const key = ed + (min ? '-min' : '');
  if (maps[key]) return maps[key];
  const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'configs', ed + '.json'))).sdk;
  const files = min ? cfg.min : cfg.common;
  const bundle = fs.readFileSync(path.join(DS, ed, min ? 'sdk-all-min.js' : 'sdk-all.js'), 'utf8');
  const lineStart = [0]; for (let i = 0; i < bundle.length; i++) if (bundle[i] === '\n') lineStart.push(i + 1);
  const owner = new Map();
  for (const f of files) {
    let src; try { src = fs.readFileSync(path.join(SRC, f), 'utf8'); } catch { continue; }
    for (const mm of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]{4,})\s*\(/g)) owner.set(mm[1], owner.has(mm[1]) && owner.get(mm[1]) !== f ? null : f);
  }
  const bounds = [], hit = new Set();
  for (const [n, f] of owner) {
    if (!f) continue;
    const pat = 'function ' + n + '(', i = bundle.indexOf(pat);
    if (i < 0 || bundle.indexOf(pat, i + 1) >= 0) continue;
    bounds.push([i, f]); hit.add(f);
  }
  bounds.sort((x, y) => x[0] - y[0]);
  return (maps[key] = { bounds, lineStart, found: hit.size, total: files.length });
}
function srcFile(ed, min, line, col) {
  const mp = fileMap(ed, min), off = (mp.lineStart[line] || 0) + col;
  let lo = 0, hi = mp.bounds.length - 1, r = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (mp.bounds[mid][0] <= off) { r = mp.bounds[mid][1]; lo = mid + 1; } else hi = mid - 1; }
  return r || 'unmapped';
}
// Modules as in the journey map: sdkjs-word, sdkjs-common, web-apps-documenteditor, browser (project).
function moduleOf(cf) {
  const u = cf.url || '';
  if (!u) return /^\(idle\)$/.test(cf.functionName) ? '(idle)' : 'browser: ' + (/^\((garbage collector|program)\)$/.test(cf.functionName) ? cf.functionName : '(native)');
  if (/^wasm:|\.wasm/.test(u)) return 'sdkjs-common|fonts wasm';
  const b = u.match(/sdkjs\/(\w+)\/sdk-all(-min)?\.js/);
  if (b) {
    const f = srcFile(b[1], !!b[2], cf.lineNumber, cf.columnNumber);
    const mod = /^common\//.test(f) ? 'sdkjs-common' : /^word\//.test(f) ? 'sdkjs-word' : /^vendor\//.test(f) ? 'sdkjs-vendor' : 'sdkjs-unmapped';
    return mod + '|' + f;
  }
  if (/\/sdkjs\/common\//.test(u)) return 'sdkjs-common|' + u.replace(/.*\/sdkjs\//, '');
  if (/\/sdkjs\//.test(u)) return 'sdkjs-other|' + u.replace(/.*\/sdkjs\//, '');
  if (/\/web-apps\//.test(u)) return 'web-apps-documenteditor|' + u.replace(/.*\/web-apps\//, '').replace(/\?.*/, '');
  return 'other scripts|' + u.replace(/\?.*/, '');
}
function attribute(prof, a, b) {
  const cat = new Map(prof.nodes.map(n => [n.id, moduleOf(n.callFrame)]));
  const fnName = new Map(prof.nodes.map(n => [n.id, (n.callFrame.functionName || '(anonymous)') + ' ' + (cat.get(n.id).split('|')[1] || '')]));
  const self = {}, files = {}, fns = {};
  let t = prof.startTime, busy = 0, idle = 0;
  for (let i = 0; i < prof.samples.length; i++) {
    t += prof.timeDeltas[i];
    if (t < a || t > b) continue;
    const d = (prof.timeDeltas[i + 1] ?? prof.timeDeltas[i]) / 1000, id = prof.samples[i], c = cat.get(id), g = c.split('|')[0];
    if (g === '(idle)') { idle += d; continue; }
    busy += d; self[g] = (self[g] || 0) + d;
    const f = c.split('|')[1]; if (f) files[f] = (files[f] || 0) + d;
    const fn = fnName.get(id); fns[fn] = (fns[fn] || 0) + d;
  }
  const top = (o, n) => Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]));
  return { windowMs: ms(b - a), busyMs: Math.round(busy), idleMs: Math.round(idle), self: top(self, 99), topFiles: top(files, 12), topFunctions: top(fns, 12) };
}
function summarize(all) {
  const med = v => { v = v.filter(x => x != null).sort((x, y) => x - y); return v[(v.length - 1) >> 1]; };
  const out = { runs: all.length, pages: med(all.map(x => x.pages)), net: {}, maps: Object.fromEntries(Object.entries(maps).map(([k, v]) => [k, { filesLocated: v.found, filesInConfig: v.total }])) };
  for (const k of Object.keys(all[0].profile.net)) out.net[k] = med(all.map(x => x.profile.net[k]));
  for (const w of ['bin', 'open', 'layout', 'all']) {
    const ps = all.map(x => x.profile[w]), mods = new Set(ps.flatMap(p => Object.keys(p.self)));
    out[w] = { windowMs: med(ps.map(p => p.windowMs)), busyMs: med(ps.map(p => p.busyMs)), idleMs: med(ps.map(p => p.idleMs)),
      self: Object.fromEntries([...mods].map(k => [k, med(ps.map(p => p.self[k] || 0))]).sort((x, y) => y[1] - x[1])),
      topFiles: ps[(ps.length - 1) >> 1].topFiles, topFunctions: ps[(ps.length - 1) >> 1].topFunctions };
  }
  return out;
}

(async () => {
  const all = [];
  if (PROFILE) {
    for (let i = 0; i < RUNS; i++) all.push(await run('profile' + i));
    if (process.env.PROFILE_JSON) fs.writeFileSync(process.env.PROFILE_JSON, JSON.stringify(all, null, 1));
    console.log(JSON.stringify(summarize(all), null, 1));
    return;
  }
  if (process.env.WARMUP !== '0') await run('warmup'); // server-side caches (font list, JIT of docservice) as after a day of use; the browser is still cold
  for (let i = 0; i < RUNS; i++) all.push(await run(i));
  const med = k => { const v = all.map(x => x[k]).filter(x => x != null).sort((a, b) => a - b); return v[(v.length - 1) >> 1]; };
  const keys = Object.keys(all[0]);
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify({ runs: all, p50: Object.fromEntries(keys.map(k => [k, med(k)])) }, null, 1));
  const tot = all.map(x => x.painted).sort((a, b) => a - b);
  console.log(`total_ms=${med('painted')} min_ms=${tot[0]} max_ms=${tot[tot.length - 1]} runs=${all.length}`);
})().catch(e => { console.error('FAIL open-docx-100p', e.message); process.exit(1); });
