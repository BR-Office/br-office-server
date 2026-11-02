// Share of DocService CPU spent in Common/ (PKT-0026).
// Usage: node .theseus/oracle/perf/profile-common.js <file.cpuprofile> [--json]
// The profile comes from DocService run from source with `node --cpu-prof` (the packaged `docservice` binary
// ignores NODE_OPTIONS, see baseline.md "Common's share"). Every sample is attributed two ways:
//  - self: the leaf frame's file -> Common/<file>, DocService/<file>, a node_modules package, node internals,
//    (garbage collector), (program) = native/V8 outside JS, (idle).
//  - inclusive: the sample counts for Common if ANY frame of its stack is in Common/sources (Common code and
//    everything it calls: libraries, JSON, crypto...), and for each Common file on the stack.
// "Common + its libraries" adds self time of packages only Common uses directly (log4js, amqplib, config,
// aws-sdk, ...): their async callbacks (socket reads, appenders) run without a Common frame on the stack.
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2]));
const COMMON_LIBS = /^(log4js|amqplib|amqp-connection-manager|config|@aws-sdk|@aws-crypto|@smithy|@azure|node-cache|ms|streamroller|date-format)$/;
const byId = new Map(p.nodes.map(n => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);

function cat(n) {
  const f = n.callFrame, u = f.url || '';
  if (!u) return f.functionName.startsWith('(') ? f.functionName : '(native) ' + (f.functionName || 'anonymous');
  let m = u.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/g);
  if (m) return 'lib ' + m[m.length - 1].replace('/node_modules/', '');
  m = u.match(/\/(Common|DocService)\/sources\/(.+)$/);
  if (m) return m[1] + '/' + m[2];
  if (u.startsWith('node:')) return 'node internals';
  return 'other ' + u;
}
const catOf = new Map(p.nodes.map(n => [n.id, cat(n)]));
const isLib = c => c.startsWith('lib ') && COMMON_LIBS.test(c.slice(4));
// Common files on the stack, plus '+libs' when a Common file or a Common-only library is on it, plus
// 'fn <file>:<function>' for the outermost Common frame (where the cost enters Common).
const commonFiles = id => {
  const s = new Set(); let outer = null;
  for (let x = id; x != null; x = parent.get(x)) {
    const c = catOf.get(x);
    if (c.startsWith('Common/')) { s.add(c); s.add('+libs'); outer = c + ':' + (byId.get(x).callFrame.functionName || 'anonymous'); }
    else if (isLib(c)) s.add('+libs');
  }
  if (outer) s.add('fn ' + outer);
  return s;
};
const cache = new Map();

const dt = p.timeDeltas, self = {}, incl = {};
let total = 0, idle = 0, inclCommon = 0;
for (let i = 0; i < p.samples.length; i++) {
  const id = p.samples[i], d = (dt[i + 1] ?? dt[i]) / 1000; // ms until the next sample
  total += d;
  const c = catOf.get(id);
  if (c === '(idle)') { idle += d; continue; }
  self[c] = (self[c] || 0) + d;
  if (!cache.has(id)) cache.set(id, commonFiles(id));
  const cf = cache.get(id);
  if ([...cf].some(f => f.startsWith('Common/'))) inclCommon += d;
  for (const f of cf) incl[f] = (incl[f] || 0) + d;
}
const busy = total - idle;
const sum = re => Object.entries(self).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
const commonSelf = sum(/^Common\//), docSelf = sum(/^DocService\//), libs = sum(/^lib /);
const commonLibs = Object.entries(self).filter(([k]) => k.startsWith('lib ') && COMMON_LIBS.test(k.slice(4))).reduce((a, [, v]) => a + v, 0);
const r = x => Math.round(x), pc = x => +(100 * x / busy).toFixed(1);
const out = {
  wall_ms: r(total), busy_ms: r(busy), cores: +(busy / total).toFixed(3),
  common_self_ms: r(commonSelf), common_self_pct: pc(commonSelf),
  common_inclusive_ms: r(inclCommon), common_inclusive_pct: pc(inclCommon),
  common_plus_libs_self_pct: pc(commonSelf + commonLibs),
  common_plus_libs_inclusive_pct: pc(incl['+libs'] || 0),
  common_inclusive_pct_of_wall: +(100 * inclCommon / total).toFixed(2),
  docservice_self_pct: pc(docSelf), libs_self_pct: pc(libs),
  gc_pct: pc(self['(garbage collector)'] || 0), program_pct: pc(self['(program)'] || 0), node_internals_pct: pc(self['node internals'] || 0),
  common_files_inclusive_pct: Object.fromEntries(Object.entries(incl).filter(([k]) => k.startsWith('Common/')).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, pc(v)])),
  common_entry_functions_inclusive_pct: Object.fromEntries(Object.entries(incl).filter(([k]) => k.startsWith('fn ')).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k.slice(3), pc(v)])),
  top_self_pct: Object.fromEntries(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, pc(v)])),
};
console.log(JSON.stringify(out, null, process.argv.includes('--json') ? 0 : 1));
