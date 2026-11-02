// Attribute word-editor CPU profiles to sdkjs submodules (PKT-0043).
// Usage: node .theseus/oracle/perf/attribute-word.js <profile-dir> [sdk-all.js] [sdkjs-src] [--json]
//   Reads open-*/type-*/apply-* .cpuprofile and marks.json written by profile-word.js. Open profiles are cut to
//   "Editor.bin received -> load complete". Idle is excluded; shares are of busy (non-idle) main-thread time.
// Frame -> source file: frames of sdkjs/word/sdk-all.js carry (line, column) in the bundle; the bundle is scanned
//   for definitions (`function X(`, `X.prototype.y=function`, `AscX.Y=function`) whose names are looked up in the
//   sdkjs sources (external/sdkjs); a position maps to the file of the nearest preceding definition, so anonymous
//   closures land in their file too. Names defined in more than one source file are skipped as anchors.
// Buckets (one per frame): word submodules, sdkjs/common parts, fonts, the mangled base bundle (sdk-all-min.js),
//   web-apps/vendor UI, and the browser (GC, (program) = native/V8/Blink outside JS).
// Samples under a Playwright evaluate/predicate frame (the harness polling the model) are excluded from busy.
// Two cross-cutting rows count samples with any *Recalc* or *Draw*/*Paint* sdkjs function on the stack.
// Self = leaf frame; inclusive = bucket appears anywhere on the stack (a sample counts once per bucket).
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2).filter(a => a !== '--json'), JSONOUT = process.argv.includes('--json');
const DIR = args[0];
const BUNDLE = args[1] || '/var/www/euro-office/documentserver/sdkjs/word/sdk-all.js';
const SRC = args[2] || path.join(__dirname, '../../../external/sdkjs');

// 1. Source index: definition name -> file (relative to sdkjs).
const DEF_RE = /(?:^|[^\w$.])function\s+([A-Za-z_$][\w$]*)\s*\(|([A-Za-z_$][\w$]*\.prototype\.[A-Za-z_$][\w$]*)\s*=\s*function/g;
const nameFile = new Map(), dup = new Set();
// Only the files that configs/word.json puts in sdk-all.js ("sdk.common" + "sdk.word"; "sdk.min" is sdk-all-min.js).
const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'configs/word.json'))).sdk;
const bundleFiles = Object.entries(cfg).filter(([k]) => k !== 'min').flatMap(([, v]) => Array.isArray(v) ? v : []);
for (const rel of bundleFiles) {
  { const p = path.join(SRC, rel); if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    for (const m of t.matchAll(DEF_RE)) {
      const n = m[1] || m[2];
      if (nameFile.has(n) && nameFile.get(n) !== rel) dup.add(n); else nameFile.set(n, rel);
    }
  }
}
for (const n of dup) nameFile.delete(n);

// 2. Bundle anchors: [line, col, file] sorted.
const anchors = [];
fs.readFileSync(BUNDLE, 'utf8').split('\n').forEach((line, ln) => {
  for (const m of line.matchAll(DEF_RE)) {
    const f = nameFile.get(m[1] || m[2]);
    if (f) anchors.push([ln, m.index, f]);
  }
});
anchors.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
function fileAt(ln, col) {
  let lo = 0, hi = anchors.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1, a = anchors[m]; if (a[0] < ln || (a[0] === ln && a[1] <= col)) { r = m; lo = m + 1; } else hi = m - 1; }
  return r < 0 ? null : anchors[r][2];
}

// 3. Buckets.
function bucketOfFile(f) {
  const rules = [
    [/^word\/Editor\/Serialize2\.js|^common\/SerializeCommonWordExcel|^common\/SerializeChart|^common\/openxml|^common\/stringserialize/, 'word: Serialize2 reader (Editor.bin)'],
    [/CollaborativeEditing|Changes\.js$|History|^common\/collaboration|applyDocumentChanges|TableId/, 'collab: changes, history, apply'],
    [/^word\/Editor\/(Paragraph|Run|ParagraphContent|Paragraph_Recalculate|Hyperlink|Field|Math|annotations|StructuredDocumentTags)/, 'word: paragraph/run layout & model'],
    [/^word\/Editor\/Table/, 'word: table layout & model'],
    [/^word\/Editor\/(Styles|Numbering)/, 'word: styles & numbering'],
    [/^word\/Editor\/(Document|DocumentContent|sections|Layout|HeaderFooter|FlowObjects|FootEndNote|Footnotes|Endnotes|LogicDocumentController|document)/, 'word: document recalc & pagination'],
    [/^word\/Editor\/(GraphicObjects|DrawingsController)|^word\/Drawing\/|^common\/Drawings|^common\/Shapes|^common\/Charts|^common\/Overlay/, 'drawing & render (word/Drawing, common/Drawings)'],
    [/^word\/Editor\/SpellChecker|^common\/spell/, 'spellcheck'],
    [/^word\//, 'word: other'],
    [/^common\/libfont|[Ff]ont/, 'fonts (common/libfont)'],
    [/^common\//, 'sdkjs/common: other'],
  ];
  for (const [re, b] of rules) if (re.test(f)) return b;
  return 'sdkjs: other (' + f.split('/')[0] + ')';
}
function frameInfo(cf) {
  const u = cf.url || '', fn = cf.functionName;
  if (!u) {
    if (fn === '(idle)') return { b: '(idle)', f: '(idle)' };
    if (fn === '(garbage collector)') return { b: 'browser: GC', f: fn };
    if (fn === '(root)') return { b: '(root)', f: fn };
    if (fn === '(program)') return { b: 'browser: (program) native/Blink', f: fn };
    return { b: 'browser: native builtins', f: '(native) ' + (fn || 'anonymous') };
  }
  if (/sdkjs\/word\/sdk-all\.js/.test(u)) { const f = fileAt(cf.lineNumber, cf.columnNumber) || '(unmapped sdk-all.js)'; return { b: f.startsWith('(') ? 'sdkjs: unmapped' : bucketOfFile(f), f }; }
  if (/sdk-all-min\.js/.test(u)) return { b: 'sdkjs base bundle (sdk-all-min.js, mangled)', f: 'sdk-all-min.js' };
  if (/libfont|fonts\.js|AllFonts/.test(u)) return { b: 'fonts (common/libfont)', f: u.replace(/.*\/sdkjs\//, '') };
  if (/\/sdkjs\//.test(u)) return { b: 'sdkjs/common: other', f: u.replace(/.*\/sdkjs\//, '').replace(/\?.*/, '') };
  if (/web-apps/.test(u)) return { b: 'web-apps & vendor UI', f: u.replace(/.*\/web-apps\//, 'web-apps/').replace(/\?.*/, '') };
  return { b: 'other scripts', f: u };
}

function analyse(file, from, to) {
  const p = JSON.parse(fs.readFileSync(file));
  const info = new Map(p.nodes.map(n => [n.id, frameInfo(n.callFrame)]));
  const nodeOf = new Map(p.nodes.map(n => [n.id, n]));
  const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const stackCache = new Map();
  // Code run by the harness (Playwright evaluate / waitForFunction predicates) is counted apart, not as busy.
  const isHarness = cf => !cf.url && (cf.functionName === 'evaluate' || cf.functionName === 'predicate');
  const stackBuckets = id => {
    if (!stackCache.has(id)) { const s = new Set(); for (let x = id; x != null; x = parent.get(x)) { s.add(info.get(x).b); const cf = nodeOf.get(x).callFrame; if (isHarness(cf)) s.add('HARNESS');
        if (/sdk-all/.test(cf.url)) { if (/Recalc/i.test(cf.functionName)) s.add('[stack] any *Recalc* function'); if (/Draw|Paint|Render/i.test(cf.functionName)) s.add('[stack] any *Draw*/*Paint* function'); } } stackCache.set(id, s); }
    return stackCache.get(id);
  };
  const self = {}, incl = {}, selfFile = {}, selfFn = {};
  let t = p.startTime, busy = 0, harness = 0;
  for (let i = 0; i < p.samples.length; i++) {
    t += p.timeDeltas[i];
    const d = (p.timeDeltas[i + 1] ?? 0) / 1000;
    if ((from && t < from) || (to && t > to)) continue;
    const id = p.samples[i], fi = info.get(id);
    if (fi.b === '(idle)') continue;
    if (stackBuckets(id).has('HARNESS')) { harness += d; continue; }
    busy += d;
    self[fi.b] = (self[fi.b] || 0) + d;
    selfFile[fi.f] = (selfFile[fi.f] || 0) + d;
    const fk = fi.f + ' ' + (nodeOf.get(id).callFrame.functionName || '(anonymous)');
    selfFn[fk] = (selfFn[fk] || 0) + d;
    for (const b of stackBuckets(id)) if (b !== '(idle)' && b !== '(root)') incl[b] = (incl[b] || 0) + d;
  }
  return { busy, harness, self, incl, selfFile, selfFn, wall: ((to || p.endTime) - (from || p.startTime)) / 1000 };
}

const marks = fs.existsSync(path.join(DIR, 'marks.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'marks.json'))) : {};
const out = {};
for (const phase of ['open', 'type', 'apply']) {
  const files = fs.readdirSync(DIR).filter(f => f.startsWith(phase + '-') && f.endsWith('.cpuprofile')).sort();
  if (!files.length) continue;
  const acc = { runs: files.length, busy: 0, harness: 0, wall: 0, self: {}, incl: {}, selfFile: {}, selfFn: {} };
  for (const f of files) {
    const m = marks[f.replace('.cpuprofile', '')] || {};
    const r = analyse(path.join(DIR, f), m.from, m.to);
    acc.busy += r.busy; acc.harness += r.harness; acc.wall += r.wall;
    for (const k of ['self', 'incl', 'selfFile', 'selfFn']) for (const [n, v] of Object.entries(r[k])) acc[k][n] = (acc[k][n] || 0) + v;
  }
  const n = files.length, top = (o, k) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k).map(([name, v]) => ({ name, ms: Math.round(v / n), pct: +(100 * v / acc.busy).toFixed(1) }));
  out[phase] = { runs: n, wallMsPerRun: Math.round(acc.wall / n), busyMsPerRun: Math.round(acc.busy / n), harnessMsPerRun: Math.round(acc.harness / n),
    buckets: Object.keys({ ...acc.self, ...acc.incl }).map(b => ({ bucket: b, selfMs: Math.round((acc.self[b] || 0) / n), selfPct: +(100 * (acc.self[b] || 0) / acc.busy).toFixed(1), inclMs: Math.round((acc.incl[b] || 0) / n), inclPct: +(100 * (acc.incl[b] || 0) / acc.busy).toFixed(1) })).sort((a, b) => b.selfMs - a.selfMs),
    topFiles: top(acc.selfFile, 15), topFunctions: top(acc.selfFn, 20) };
}
out.mapping = { sourceNames: nameFile.size, ambiguousNamesSkipped: dup.size, bundleAnchors: anchors.length };
if (JSONOUT) console.log(JSON.stringify(out));
else for (const [ph, r] of Object.entries(out)) {
  if (ph === 'mapping') { console.log('mapping', r); continue; }
  console.log(`\n== ${ph}: ${r.runs} runs, wall ${r.wallMsPerRun} ms, busy ${r.busyMsPerRun} ms per run (harness polling excluded: ${r.harnessMsPerRun} ms)`);
  for (const b of r.buckets) console.log(`${String(b.selfMs).padStart(6)} ${String(b.selfPct).padStart(5)}%  incl ${String(b.inclMs).padStart(6)} ${String(b.inclPct).padStart(5)}%  ${b.bucket}`);
  console.log('-- top files (self)'); for (const x of r.topFiles) console.log(`${String(x.ms).padStart(6)} ${String(x.pct).padStart(5)}%  ${x.name}`);
  console.log('-- top functions (self)'); for (const x of r.topFunctions) console.log(`${String(x.ms).padStart(6)} ${String(x.pct).padStart(5)}%  ${x.name}`);
}
