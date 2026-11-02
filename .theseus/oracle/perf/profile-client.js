// sdkjs/common share of client open and remote apply, with the font waterfall (PKT-0045).
// Usage: node .theseus/oracle/perf/profile-client.js <dir-with-samples> <sdkjs-src> [runs] [base] > out.json
//   <sdkjs-src>: external/sdkjs (used to map the installed sdk-all.js back to source files via configs/*.json).
// Per .docx/.xlsx/.pptx in <dir>: RUNS cold opens (new browser context each), each with a CDP CPU profile
// (Profiler, 200 us sampling) and the Network events of the editor. Open window = Editor.bin loadingFinished
// -> api.isDocumentLoadComplete seen by a 20 ms poll. fontPhase = the same attribution over LoadDocumentFonts ->
// onLoadFonts (what the main thread does while fonts download). For .docx/.xlsx also a two-user co-edit: B is
// profiled while A types EDITS markers; apply = B's samples in [frame received, +APPLY_MS] for every incoming
// WebSocket frame carrying saveChanges (CDP Network timestamps, same monotonic clock as the profile).
// Attribution: the installed bundles are uglified with names kept and no source map: sdk-all-min.js holds the
// configs/<editor>.json sdk.min files, sdk-all.js the sdk.common files. Anchors are names declared as
// `function <Name>(` in exactly one config file and found exactly once in the bundle; a profile frame's
// (line, column) offset belongs to the file of the nearest anchor before it ('unmapped' before the first).
// Groups: common/libfont + GlobalLoaders (fonts), common/Charts + chart formats (charts), common/Drawings +
// Shapes + SmartArts (drawings), common Serialize* + openxml + zlib (serialize), HistoryCommon/TableId/
// collaborative*/docscoapi (coauth), other common/*, editor (word|cell|slide|pdf), vendor, web-apps, fonts wasm,
// browser ((program), (garbage collector), (native)). Self time is the primary figure: inclusive is inflated by
// callbacks (the font loader's end callback runs the rest of the open).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [DIR, SRC] = [process.argv[2], process.argv[3]];
const RUNS = +(process.argv[4] || 3);
const BASE = process.argv[5] || 'http://localhost/example/';
const DS = '/var/www/euro-office/documentserver/sdkjs';
const EDITS = 20;
const APPLY_MS = 300;
const EDITOR = { docx: 'word', xlsx: 'cell', pptx: 'slide' };

// ---------- sdk-all.js -> source file map ----------
const maps = {};
// Two bundles per editor: sdk-all-min.js = sdk.min files, sdk-all.js = sdk.common files.
function fileMap(ed, min) {
  const key = ed + (min ? '-min' : '');
  if (maps[key]) return maps[key];
  const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'configs', ed + '.json'))).sdk;
  const files = min ? cfg.min : cfg.common;
  const bundle = fs.readFileSync(path.join(DS, ed, min ? 'sdk-all-min.js' : 'sdk-all.js'), 'utf8');
  const lineStart = [0]; for (let i = 0; i < bundle.length; i++) if (bundle[i] === '\n') lineStart.push(i + 1);
  // Anchors: names declared (`function N(` or `N.prototype.x=`) in exactly one config file and found exactly
  // once in the bundle as `function N(`. Each bundle offset belongs to the file of the nearest anchor before it.
  const owner = new Map();
  for (const f of files) {
    let src; try { src = fs.readFileSync(path.join(SRC, f), 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]{4,})\s*\(/g)) owner.set(m[1], owner.has(m[1]) && owner.get(m[1]) !== f ? null : f);
  }
  const bounds = []; const hit = new Set();
  for (const [n, f] of owner) {
    if (!f) continue;
    const pat = 'function ' + n + '(', i = bundle.indexOf(pat);
    if (i < 0 || bundle.indexOf(pat, i + 1) >= 0) continue;
    bounds.push([i, f]); hit.add(f);
  }
  bounds.sort((x, y) => x[0] - y[0]);
  const found = hit.size;
  maps[key] = { bounds, lineStart, found, total: files.length };
  return maps[key];
}
function srcFile(ed, min, line, col) {
  const m = fileMap(ed, min), off = (m.lineStart[line] || 0) + col;
  let lo = 0, hi = m.bounds.length - 1, r = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (m.bounds[mid][0] <= off) { r = m.bounds[mid][1]; lo = mid + 1; } else hi = mid - 1; }
  return r || 'unmapped';
}
function group(f) {
  if (/^common\/(libfont\/|GlobalLoaders|downloaderfiles)/.test(f)) return 'common: fonts (libfont, GlobalLoaders)';
  if (/^common\/(Charts\/|Drawings\/Format\/Chart|SerializeChart)/.test(f)) return 'common: charts';
  if (/^common\/(Drawings\/|Shapes\/(?!Serialize)|SmartArts\/|Overlay|geometry)/.test(f)) return 'common: drawings';
  if (/^common\/(Shapes\/Serialize|SerializeCommon|openxml|stringserialize|custom-xml|zlib)/.test(f) || /Serialize/.test(f) && f.startsWith('common/')) return 'common: serialize';
  if (/^common\/(HistoryCommon|TableId|collaborativeHistory|CollaborativeEditingBase|docscoapi)/.test(f)) return 'common: coauth (History, TableId, CoApi)';
  if (/^common\//.test(f)) return 'common: other';
  if (/^vendor\//.test(f)) return 'vendor';
  if (/^(word|cell|slide|pdf|visio)\//.test(f)) return 'editor: ' + f.split('/')[0];
  return 'unmapped';
}
function catFrame(ed, cf) {
  const u = cf.url || '';
  if (!u) {
    if (/^\((garbage collector|program|idle|root)\)$/.test(cf.functionName)) return cf.functionName;
    return '(native)';
  }
  if (/^wasm:/.test(u) || /\.wasm/.test(u)) return 'wasm (fonts engine)';
  const b = u.match(/sdkjs\/(\w+)\/sdk-all(-min)?\.js/);
  if (b) { const f = srcFile(b[1], !!b[2], cf.lineNumber, cf.columnNumber); return group(f) + '|' + f; }
  if (/\/sdkjs\/common\/libfont\//.test(u)) return 'common: fonts (libfont, GlobalLoaders)|' + u.replace(/.*\/sdkjs\//, '');
  if (/\/sdkjs\/common\//.test(u)) return 'common: other|' + u.replace(/.*\/sdkjs\//, '');
  if (/\/sdkjs\//.test(u)) return 'editor: other sdkjs|' + u.replace(/.*\/sdkjs\//, '');
  if (/\/web-apps\//.test(u)) return 'web-apps';
  return 'other scripts';
}
// Self and inclusive (any frame of the group on the stack) time, ms, of samples in [t0, t1] (profile us).
function attribute(ed, prof, t0, t1, wins) {
  wins = wins || [[t0, t1]];
  const byId = new Map(prof.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const cat = new Map(prof.nodes.map(n => [n.id, catFrame(ed, n.callFrame)]));
  const self = {}, incl = {}, files = {}, stackCache = new Map();
  let t = prof.startTime, busy = 0, idle = 0;
  for (let i = 0; i < prof.samples.length; i++) {
    t += prof.timeDeltas[i];
    if (!wins.some(([a, b]) => t >= a && t <= b)) continue;
    const d = (prof.timeDeltas[i + 1] ?? prof.timeDeltas[i]) / 1000, id = prof.samples[i];
    const c = cat.get(id), g = c.split('|')[0];
    if (g === '(idle)') { idle += d; continue; }
    busy += d; self[g] = (self[g] || 0) + d;
    if (c.includes('|')) { const f = c.split('|')[1]; files[f] = (files[f] || 0) + d; }
    if (!stackCache.has(id)) { const s = new Set(); for (let x = id; x != null; x = parent.get(x)) s.add(cat.get(x).split('|')[0]); stackCache.set(id, s); }
    for (const gg of stackCache.get(id)) incl[gg] = (incl[gg] || 0) + d;
  }
  const r = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v)]));
  const top = Object.fromEntries(Object.entries(files).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => [k, Math.round(v)]));
  return { windowMs: Math.round(wins.reduce((a, [x, y]) => a + y - x, 0) / 1000), busyMs: Math.round(busy), idleMs: Math.round(idle), self: r(self), inclusive: r(incl), topFilesSelf: top };
}

// ---------- browser helpers ----------
const EDITOR_RE = /(document|spreadsheet|presentation)editor/;
async function editorFrame(page, timeout = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = page.frames().find(f => EDITOR_RE.test(f.url()) && /index/.test(f.url()));
    if (f) {
      const ok = await f.evaluate(() => { const a = window.editor || (window.Asc && Asc.editor); return !!(a && a.isDocumentLoadComplete); }).catch(() => false);
      if (ok) return f;
    }
    await page.waitForTimeout(20);
  }
  throw new Error('editor not ready');
}
// In every frame: record client logs (onLoadFonts...) and each 50 ms font poll once sdkjs is there.
const HOOK = () => {
  window.__clog = []; window.__polls = []; let logged = false;
  const now = () => performance.timeOrigin + performance.now();
  const iv = setInterval(() => {
    const A = window.AscCommon; if (!A || !A.sendClientLog) return;
    if (!logged) { const o = A.sendClientLog; A.sendClientLog = A['sendClientLog'] = function (lvl, msg) { window.__clog.push({ t: now(), lvl, msg }); return o.apply(this, arguments); }; logged = true; }
    const L = A.g_font_loader; if (!L || !L.check_loaded_list) return;
    const o = L.check_loaded_list; L.check_loaded_list = function () { window.__polls.push(now()); return o.apply(this, arguments); };
    const s = L.LoadDocumentFonts; L.LoadDocumentFonts = function () { window.__fontsStart = now(); return s.apply(this, arguments); };
    window.__hookAt = now(); clearInterval(iv);
  }, 2);
};

async function upload(file) {
  const fd = new FormData();
  fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
  if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
  return r.filename;
}

async function profiledOpen(browser, url, ed) {
  const ctx = await browser.newContext(); await ctx.addInitScript(HOOK);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const req = new Map();
  await cdp.send('Network.enable');
  let wallOff = null; // epoch seconds - monotonic seconds
  cdp.on('Network.requestWillBeSent', e => { if (wallOff == null) wallOff = e.wallTime - e.timestamp; req.set(e.requestId, { url: e.request.url, start: e.timestamp }); });
  cdp.on('Network.responseReceived', e => { const r = req.get(e.requestId); if (r) { r.resp = e.timestamp; r.status = e.response.status; r.sw = e.response.fromServiceWorker; r.cache = e.response.fromDiskCache; } });
  cdp.on('Network.loadingFinished', e => { const r = req.get(e.requestId); if (r) { r.end = e.timestamp; r.bytes = e.encodedDataLength; } });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const tGoto = Date.now();
  await page.goto(url);
  const fr = await editorFrame(page);
  const tReady = Date.now();
  const { profile } = await cdp.send('Profiler.stop');
  const clog = await fr.evaluate(() => ({ clog: window.__clog, polls: window.__polls, hookAt: window.__hookAt, fontsStart: window.__fontsStart })).catch(() => ({ clog: [], polls: [] }));
  await ctx.close();
  // Clock: CDP timestamps are monotonic seconds, profile times monotonic us (same base). Map ready to it via
  // the profile's endTime (Profiler.stop is right after the ready poll).
  const all = [...req.values()];
  const bin = all.find(r => /Editor\.bin/.test(r.url));
  const readyUs = profile.endTime; // Profiler.stop follows the ready poll (<= 20 ms poll + one CDP round trip)
  const binEndUs = bin.end * 1e6;
  const fonts = all.filter(r => /\/fonts\/|\.(ttf|otf|woff2?)(\?|$)/.test(r.url) && !/AllFonts/.test(r.url)).sort((a, b) => a.start - b.start);
  const ms = (a, b) => Math.round((a - b) * 1000);
  const wf = fonts.map((f, i) => ({ file: f.url.replace(/.*\/fonts\//, ''), start: ms(f.start, bin.end), ttfb: ms(f.resp, f.start), end: ms(f.end, bin.end), kb: Math.round((f.bytes || 0) / 1024), status: f.status, sw: f.sw,
  }));
  // Client-side font phase on the same axis (ms after Editor.bin received): epoch ms -> monotonic via wallOff.
  const rel = ep => ep == null ? null : Math.round(ep - (bin.end + wallOff) * 1000);
  const onLoad = clog.clog.filter(x => /onLoadFonts/.test(x.msg));
  const done = onLoad.length ? rel(onLoad[0].t) : null, lastEnd = wf.length ? Math.max(...wf.map(x => x.end)) : null;
  const polls = clog.polls.map(rel);
  const toUs = rel_ => (bin.end * 1000 + rel_) * 1000;
  const fontPhase = clog.fontsStart && done != null ? attribute(ed, profile, toUs(rel(clog.fontsStart)), toUs(done)) : null;
  return {
    totalMs: tReady - tGoto, fontPhase, binToReadyMs: Math.round((readyUs - binEndUs) / 1000),
    profile: attribute(ed, profile, binEndUs, readyUs),
    fonts: { n: wf.length, firstStart: wf.length ? wf[0].start : null, lastEnd: wf.length ? wf[wf.length - 1].end : null,
      maxParallel: maxPar(fonts), loadDocumentFontsAt: rel(clog.fontsStart), lastFontReceivedAt: lastEnd, fontsDoneAt: done,
      tailAfterLastFontMs: done != null && lastEnd != null ? done - lastEnd : null, polls50ms: clog.polls.length, firstPollAt: polls[0] ?? null, lastPollAt: polls[polls.length - 1] ?? null, hookBeforeFonts: !!clog.fontsStart && clog.hookAt < clog.fontsStart, onLoadFonts: onLoad.map(x => x.msg), waterfall: wf },
    clientLog: clog.clog.map(x => x.msg).slice(0, 20),
  };
}
function maxPar(fs_) { let m = 0; for (const a of fs_) m = Math.max(m, fs_.filter(b => b.start <= a.start && b.end > a.start).length); return m; }

async function coedit(browser, url, ed) {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  await a.goto(url); const fa = await editorFrame(a);
  await b.goto(url); await editorFrame(b);
  await a.waitForTimeout(2500);
  if (ed === 'word') { await fa.click('#id_main_view', { position: { x: 300, y: 200 } }).catch(() => {}); await a.keyboard.press('Control+Home'); }
  else { await fa.click('#ws-canvas-outer', { position: { x: 200, y: 120 } }).catch(() => {}); }
  const cdp = await ctxB.newCDPSession(b);
  const recv = []; // monotonic s of B's incoming Socket.IO frames carrying saveChanges (same clock as the profile)
  await cdp.send('Network.enable');
  cdp.on('Network.webSocketFrameReceived', e => { if (/saveChanges/.test(e.response.payloadData)) recv.push(e.timestamp); });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  for (let i = 0; i < EDITS; i++) {
    await a.keyboard.type('zq' + i + 'k');
    if (ed === 'cell') await a.keyboard.press('Enter');
    await a.waitForTimeout(700); // A's change goes out, B receives and applies; 700 ms covers the p-max of PKT-0016
  }
  const { profile } = await cdp.send('Profiler.stop');
  await ctxA.close(); await ctxB.close();
  // Apply windows: APPLY_MS after each received change (PKT-0016: received -> in model p90 105-143 ms).
  const wins = recv.map(t => [t * 1e6, t * 1e6 + APPLY_MS * 1000]);
  const r = attribute(ed, profile, 0, 0, wins);
  const bg = attribute(ed, profile, profile.startTime, profile.endTime); // whole loop, for comparison
  r.edits = EDITS; r.changesReceived = recv.length; r.busyPerChangeMs = recv.length ? Math.round(r.busyMs / recv.length) : null;
  r.wholeLoop = { windowMs: bg.windowMs, busyMs: bg.busyMs, self: bg.self };
  return r;
}

async function main() {
  const browser = await chromium.launch();
  const files = fs.readdirSync(DIR).filter(f => /\.(docx|xlsx|pptx)$/.test(f)).sort();
  const out = { date: new Date().toISOString().slice(0, 10), packet: 'PKT-0045', runs: RUNS, maps: {}, files: {} };
  for (const f of files) {
    const ed = EDITOR[f.split('.').pop()];
    for (const min of [true, false]) { const m = fileMap(ed, min); out.maps[ed + (min ? '-min' : '')] = { filesLocated: m.found, filesInConfig: m.total }; }
    const name = await upload(path.join(DIR, f));
    const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
    const opens = [];
    for (let r = 0; r < RUNS; r++) opens.push(await profiledOpen(browser, url, ed));
    out.files[f] = { editor: ed, opens };
    if (ed === 'word' || ed === 'cell') out.files[f].remoteApplyB = await coedit(browser, url, ed);
    console.error('done', f);
  }
  await browser.close();
  console.log(JSON.stringify(out));
}
main().catch(e => { console.error(e); process.exit(1); });
