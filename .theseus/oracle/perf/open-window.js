// Document editor open window split by resource and by CPU (PKT-0047).
// Usage: node .theseus/oracle/perf/open-window.js <out.json> <file.docx>... [--runs N] [--base URL] [--keep DIR]
//   Per file and run (new browser context = cold HTTP cache): CDP Network events (all frames, same process) and a
//   CDP CPU profile (--interval µs, default 1000; each profiled open is paired with an unprofiled one for the marks) from page.goto until isDocumentLoadComplete. Two marks, ms after goto:
//   - LoadDoc: first call of asc_docs_api.prototype.asc_LoadDocument (wrapped by an init script in the editor frame);
//   - Bin: Network.requestWillBeSent of Editor.bin.
//   Resources: per category, count, KB on the wire (encodedDataLength), first request start, last finish.
//   CPU: main-thread samples in [goto, mark], self time by the leaf frame's script, idle split out. app.js (webpack)
//   is split per module: a module defining `Common.*` objects counts as apps/common, `DE.*` as the documenteditor
//   app, anything else as vendor (Backbone, jQuery plugins, ...). Controller launch = inclusive samples under
//   `onLaunch` frames of app.js, named after the controller the module defines (X.Controllers.Name=). ctlCode = busy
//   samples attributed to the nearest controller module on the stack (leaf first): the UI build each controller drives
//   (e.g. Main.onEditorPermissions -> Toolbar.onAppShowed -> Views.Toolbar.render counts as Toolbar).
// Needs the native Document Server with the example (see .theseus/adapter/environment.md) and Playwright.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv.splice(i, 2)[1]; };
const RUNS = +opt('--runs', 5), INTERVAL = +opt('--interval', 1000), BASE = opt('--base', 'http://localhost/example/'), KEEP = opt('--keep', null);
const [OUT, ...FILES] = argv;
const APPJS = '/var/www/euro-office/documentserver/web-apps/apps/documenteditor/main/app.js';

// app.js module map: [startOffset, group, controllerName] for every webpack module `123(module,exports,...){`.
const appSrc = fs.readFileSync(APPJS, 'utf8');
const lineStarts = [0]; for (let i = 0; i < appSrc.length; i++) if (appSrc[i] === '\n') lineStarts.push(i + 1);
const mods = [];
for (const m of appSrc.matchAll(/(?:^|[,{])(\d+)\(module,exports,__webpack_require__\)\{/gm)) mods.push({ at: m.index });
mods.forEach((m, i) => {
  const body = appSrc.slice(m.at, i + 1 < mods.length ? mods[i + 1].at : appSrc.length);
  const ctl = body.match(/\b(?:Common|DE)\.Controllers\.(\w+)\s*=/);
  m.ctl = ctl ? ctl[1] : null;
  m.group = /\bDE\.(?:Views|Controllers|Models|Collections|Templates)\.\w+\s*=/.test(body) ? 'de-app'
    : /\bCommon\.(?:Views|Controllers|Models|Collections|UI|Utils|util|Gateway|Locale|NotificationCenter|component)\b/.test(body) ? 'apps/common'
    : 'vendor-in-app.js';
});
const appModule = (line, col) => { // 0-based line/col as in cpuprofile callFrame
  const off = lineStarts[line] + col; let lo = 0, hi = mods.length - 1, r = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (mods[mid].at <= off) { r = mid; lo = mid + 1; } else hi = mid - 1; }
  return r < 0 ? { group: 'app.js-runtime', ctl: null } : mods[r];
};

const resCat = u => {
  if (/Editor\.bin/.test(u)) return 'Editor.bin';
  if (/\/sdkjs\/.*sdk-all-min\.js/.test(u)) return 'sdkjs sdk-all-min.js';
  if (/\/sdkjs\/.*sdk-all\.js/.test(u)) return 'sdkjs sdk-all.js';
  if (/\/fonts\/|\.(ttf|otf|woff2?)(\?|$)/.test(u)) return 'fonts (files)';
  if (/\/sdkjs\//.test(u)) return 'sdkjs other (fonts.js/wasm, loaders, ...)';
  if (/documenteditor\/main\/app\.js/.test(u)) return 'web-apps documenteditor app.js';
  if (/\/locale\/|\.json(\?|$)/.test(u)) return 'locale / json';
  if (/\.css(\?|$)/.test(u)) return 'css';
  if (/\/apps\/common\//.test(u)) return 'web-apps apps/common (separate files)';
  if (/\/vendor\//.test(u)) return 'web-apps vendor';
  if (/\/web-apps\/.*\.(png|svg|jpg|gif|ico)/.test(u)) return 'web-apps images';
  if (/\/web-apps\//.test(u)) return 'web-apps other';
  if (/\/example\//.test(u)) return 'example host page';
  return 'other';
};
const cpuCat = (cf) => {
  const u = cf.url || '';
  if (!u) return cf.functionName === '(idle)' ? 'idle' : cf.functionName === '(garbage collector)' ? 'browser GC'
    : cf.functionName === '(program)' ? 'browser (program): parse/compile/style/layout' : 'browser native builtins';
  if (/sdk-all-min\.js/.test(u)) return 'sdkjs sdk-all-min.js';
  if (/sdk-all\.js/.test(u)) return 'sdkjs sdk-all.js';
  if (/\/sdkjs\//.test(u)) return 'sdkjs other (fonts, loaders)';
  if (/documenteditor\/main\/app\.js/.test(u)) { const g = appModule(cf.lineNumber, cf.columnNumber).group;
    return g === 'de-app' ? 'web-apps documenteditor (app.js DE.*)' : g === 'apps/common' ? 'web-apps apps/common (in app.js)' : 'web-apps vendor (in app.js) + webpack runtime'; }
  if (/\/vendor\//.test(u)) return 'web-apps vendor (separate files)';
  if (/\/web-apps\//.test(u)) return 'web-apps other';
  if (/\/example\//.test(u)) return 'example host page / api.js';
  return 'other JS';
};

const HOOK = () => {
  window.__marks = [];
  const t = setInterval(() => {
    const p = window.Asc && Asc.asc_docs_api && Asc.asc_docs_api.prototype;
    if (!p || !p.asc_LoadDocument || p.__w) return;
    const f = p.asc_LoadDocument; p.__w = 1;
    p.asc_LoadDocument = function () { window.__marks.push(['LoadDoc', performance.timeOrigin + performance.now()]); return f.apply(this, arguments); };
    clearInterval(t);
  }, 1);
  setTimeout(() => clearInterval(t), 60000);
};

async function upload(file) {
  const fd = new FormData();
  fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
  if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
  return r.filename;
}

async function openOnce(browser, url, keep, prof = true) {
  const ctx = await browser.newContext(); await ctx.addInitScript(HOOK);
  const p = await ctx.newPage(), s = await ctx.newCDPSession(p);
  const reqs = new Map(); let mono2wall = null;
  s.on('Network.requestWillBeSent', e => {
    if (mono2wall == null) mono2wall = e.wallTime * 1000 - e.timestamp * 1000;
    if (process.env.DBG && !reqs.has(e.requestId)) console.error('REQ', e.request.url.slice(0,120));
    if (!/^data:/.test(e.request.url) && !reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, start: e.timestamp * 1000 });
  });
  s.on('Network.dataReceived', e => { const r = reqs.get(e.requestId); if (r) { r.wire = (r.wire || 0) + Math.max(0, e.encodedDataLength); r.body = (r.body || 0) + e.dataLength; } });
  s.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp * 1000;
    r.kb = Math.max(e.encodedDataLength, r.wire || 0) / 1024; r.bodyKb = (r.body || 0) / 1024; } });
  await s.send('Network.enable'); await s.send('Network.setCacheDisabled', { cacheDisabled: false });
  if (prof) { await s.send('Profiler.enable'); await s.send('Profiler.setSamplingInterval', { interval: INTERVAL }); await s.send('Profiler.start'); }
  const tGoto = Date.now();
  await p.goto(url);
  let f = null;
  for (const t0 = Date.now(); Date.now() - t0 < 180000; await p.waitForTimeout(10)) {
    f = p.frames().find(f => /documenteditor/.test(f.url()) && /index/.test(f.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; else f = null;
  }
  if (!f) throw new Error('editor not ready');
  const tReady = Date.now();
  const profile = prof ? (await s.send('Profiler.stop')).profile : { nodes: [], samples: [], timeDeltas: [], startTime: 0 };
  const marks = await f.evaluate(() => window.__marks);
  await ctx.close();
  if (keep && prof) fs.writeFileSync(keep, JSON.stringify(profile));
  const toRel = mono => mono + mono2wall - tGoto; // CDP monotonic ms -> ms after goto
  const rs = [...reqs.values()].map(r => ({ ...r, cat: resCat(r.url), s: toRel(r.start), e: r.end != null ? toRel(r.end) : null }));
  const bin = rs.find(r => r.cat === 'Editor.bin');
  const loadDoc = marks.find(m => m[0] === 'LoadDoc');
  const M = { LoadDoc: loadDoc ? loadDoc[1] - tGoto : null, Bin: bin ? bin.s : null, Ready: tReady - tGoto };

  // Resources requested before each mark
  const resources = {};
  for (const r of rs) {
    const c = resources[r.cat] || (resources[r.cat] = { n: 0, kb: 0, bodyKb: 0, first: Infinity, last: 0, nBeforeLoadDoc: 0, kbBeforeLoadDoc: 0 });
    c.n++; c.kb += r.kb || 0; c.bodyKb += r.bodyKb || 0; c.first = Math.min(c.first, r.s); c.last = Math.max(c.last, r.e || r.s);
    if (M.LoadDoc != null && r.s < M.LoadDoc) { c.nBeforeLoadDoc++; c.kbBeforeLoadDoc += r.kb || 0; }
  }
  // CPU: sample time → node; parents for inclusive (onLaunch) attribution
  const byId = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const ctlOf = new Map(); // node id -> controller name if an ancestor is onLaunch of app.js
  const launchCtl = id => {
    if (ctlOf.has(id)) return ctlOf.get(id);
    const n = byId.get(id); let v = null;
    if (n.callFrame.functionName === 'onLaunch' && /documenteditor\/main\/app\.js/.test(n.callFrame.url))
      v = appModule(n.callFrame.lineNumber, n.callFrame.columnNumber).ctl || '?';
    const pa = parent.get(id); const up = pa != null ? launchCtl(pa) : null;
    v = up || v; ctlOf.set(id, v); return v; // outermost onLaunch wins
  };
  const nearOf = new Map(); // node id -> nearest controller module (Controllers.X) on the stack, leaf first
  const nearCtl = id => {
    if (nearOf.has(id)) return nearOf.get(id);
    const cf = byId.get(id).callFrame; let v = null;
    if (/documenteditor\/main\/app\.js/.test(cf.url)) v = appModule(cf.lineNumber, cf.columnNumber).ctl;
    if (!v) { const pa = parent.get(id); v = pa != null ? nearCtl(pa) : null; }
    nearOf.set(id, v); return v;
  };
  const cpu = { LoadDoc: {}, Bin: {}, Ready: {} }, launch = { LoadDoc: {}, Bin: {}, Ready: {} }, ctlCode = { LoadDoc: {}, Bin: {}, Ready: {} };
  let t = profile.startTime / 1000;
  profile.samples.forEach((id, i) => {
    t += profile.timeDeltas[i] / 1000; const rel = toRel(t), dt = (profile.timeDeltas[i + 1] || 0) / 1000;
    if (rel < 0) return;
    const cat = cpuCat(byId.get(id).callFrame), lc = launchCtl(id), nc = cat === 'idle' ? null : nearCtl(id);
    for (const k of Object.keys(cpu)) if (M[k] != null && rel <= M[k]) {
      cpu[k][cat] = (cpu[k][cat] || 0) + dt;
      if (lc) launch[k][lc] = (launch[k][lc] || 0) + dt;
      if (nc) ctlCode[k][nc] = (ctlCode[k][nc] || 0) + dt;
    }
  });
  return { marks: M, resources, cpu, launch, ctlCode };
}

const med = a => { const s = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const medObj = (objs) => { const keys = new Set(objs.flatMap(o => Object.keys(o))), r = {};
  for (const k of keys) r[k] = Math.round(med(objs.map(o => o[k] || 0)) * 10) / 10; return r; };

async function main() {
  const browser = await chromium.launch();
  const result = { date: new Date().toISOString(), runs: RUNS, files: {} };
  for (const file of FILES) {
    const name = await upload(file);
    const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
    await openOnce(browser, url); // warm-up (server side: conversion cache), not counted
    const runs = [], plain = [];
    for (let r = 0; r < RUNS; r++) {
      plain.push((await openOnce(browser, url, null, false)));
      runs.push(await openOnce(browser, url, KEEP && path.join(KEEP, `${path.basename(file)}-${r}.cpuprofile`)));
      console.error(path.basename(file), r, JSON.stringify(runs[r].marks));
    }
    const resCats = [...new Set(runs.flatMap(r => Object.keys(r.resources)))];
    result.files[path.basename(file)] = {
      marksNoProfiler: medObj(plain.map(r => r.marks)),
      resourcesNoProfiler: Object.fromEntries(resCats.map(c => [c, medObj(plain.map(r => r.resources[c] || {}))])),
      marks: medObj(runs.map(r => r.marks)),
      resources: Object.fromEntries(resCats.map(c => [c, medObj(runs.map(r => r.resources[c] || {}))])),
      cpu: Object.fromEntries(Object.keys(runs[0].cpu).map(k => [k, medObj(runs.map(r => r.cpu[k]))])),
      launch: Object.fromEntries(Object.keys(runs[0].launch).map(k => [k, medObj(runs.map(r => r.launch[k]))])),
      ctlCode: Object.fromEntries(Object.keys(runs[0].ctlCode).map(k => [k, medObj(runs.map(r => r.ctlCode[k]))])),
      raw: runs, rawNoProfiler: plain.map(r => ({ marks: r.marks, resources: r.resources })),
    };
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
