// SPDX-License-Identifier: AGPL-3.0-only
// Per source file: how many functions exist in the bundle and how many were called during open / open+edit.
// A file whose only called function is its IIFE wrapper is "defined but unused" at open: a candidate for the deferred chunk.
// Usage: node coverage-functions.cjs <sdk-all.js> <sdk-all.js.map> <coverage.json> <configs/word.json>
const SDKJS = process.env.SDKJS_DIR || require('path').resolve(__dirname, require('fs').existsSync(require('path').resolve(__dirname, '../../../sdkjs')) ? '../../../sdkjs' : '../../../br-office-sdkjs'); // the sdkjs checkout (sibling repo), for its build/node_modules
const fs = require('fs');
const { SourceMapConsumer } = require(SDKJS + '/build/node_modules/source-map-js');
const [JS, MAP, COV, CFG] = process.argv.slice(2);
const js = fs.readFileSync(JS, 'utf8');
const map = new SourceMapConsumer(JSON.parse(fs.readFileSync(MAP, 'utf8')));
const lineStart = [0]; for (let i = 0; i < js.length; i++) if (js.charCodeAt(i) === 10) lineStart.push(i + 1);
const segs = new Map();
map.eachMapping((m) => { if (!segs.has(m.generatedLine)) segs.set(m.generatedLine, []); segs.get(m.generatedLine).push([m.generatedColumn, m.source]); }, null, SourceMapConsumer.GENERATED_ORDER);
for (const arr of segs.values()) arr.sort((a, b) => a[0] - b[0]);
function lineOf(offset) { let lo = 0, hi = lineStart.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStart[mid] <= offset) lo = mid; else hi = mid - 1; } return lo; }
function sourceAt(offset) { const L = lineOf(offset); const arr = segs.get(L + 1); if (!arr) return null; const col = offset - lineStart[L]; if (arr[0][0] > col) return null; let lo = 0, hi = arr.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (arr[mid][0] <= col) lo = mid; else hi = mid - 1; } return arr[lo][1]; }
const cfgPaths = JSON.parse(fs.readFileSync(CFG, 'utf8')).sdk.common;
const short = (src) => cfgPaths.find((p) => src.endsWith('/' + p)) || src;
const cov = JSON.parse(fs.readFileSync(COV, 'utf8'));
const key = Object.keys(cov.openFunctions).find((k) => /word\/sdk-all\.js$/.test(k));
const openF = cov.openFunctions[key], editF = cov.editFunctions[key];
// function identity = start offset; called = count > 0 in either snapshot (edit is incremental)
const called = new Map();
for (const f of openF) called.set(f[0], { end: f[1], open: f[2] > 0, edit: f[2] > 0, name: f[3] });
for (const f of editF) { const c = called.get(f[0]); if (c) c.edit = c.edit || f[2] > 0; else called.set(f[0], { end: f[1], open: false, edit: f[2] > 0, name: f[3] }); }
const files = new Map();
for (const [start, c] of called) {
	if (start === 0 && c.end === js.length) continue; // the script itself
	const src = sourceAt(start + 1); if (!src) continue;
	const s = short(src); const f = files.get(s) || { fns: 0, open: 0, edit: 0, bytes: 0, openNames: [], editNames: [] };
	f.fns++; f.bytes += c.end - start;
	if (c.open) { f.open++; f.openNames.push(c.name || "(anon)"); }
	if (c.edit) { f.edit++; if (!c.open) f.editNames.push(c.name || "(anon)"); }
	files.set(s, f);
}
// size per file from the source map (bytes of generated code mapped to it)
const total = new Map();
for (let L = 0; L < lineStart.length; L++) { const start = lineStart[L], end = L + 1 < lineStart.length ? lineStart[L + 1] : js.length; const arr = segs.get(L + 1); if (!arr) continue; for (let i = 0; i < arr.length; i++) { const c0 = arr[i][0], c1 = i + 1 < arr.length ? arr[i + 1][0] : end - start; const s = short(arr[i][1]); total.set(s, (total.get(s) || 0) + Math.max(0, c1 - c0)); } }
// order from the config, so the table follows the concatenation order
const cfg = cfgPaths.slice();
const rows = [];
for (const src of cfg) { const f = files.get(src) || { fns: 0, open: 0, edit: 0 }; rows.push({ src, kb: Math.round((total.get(src) || 0) / 1024), fns: f.fns, open: f.open, edit: f.edit, openNames: f.openNames || [], editNames: f.editNames || [] }); }
for (const src of files.keys()) if (!cfg.includes(src)) { const f = files.get(src); rows.push({ src: src + ' (not in sdk.common)', kb: Math.round((total.get(src) || 0) / 1024), fns: f.fns, open: f.open, edit: f.edit, openNames: f.openNames, editNames: f.editNames }); }
fs.writeFileSync(COV.replace(/\.json$/, '-functions.json'), JSON.stringify(rows, null, 1));
const unused = rows.filter((r) => r.open <= 1); const unusedKB = unused.reduce((a, r) => a + r.kb, 0);
const unusedEdit = rows.filter((r) => r.edit <= 1); const unusedEditKB = unusedEdit.reduce((a, r) => a + r.kb, 0);
console.log(`files: ${rows.length}; only the wrapper called at open: ${unused.length} (${unusedKB} KB); after edit too: ${unusedEdit.length} (${unusedEditKB} KB)`);
console.log(`\n   KB   fns  open  edit  file   [first functions called at open | only after edit]`);
for (const r of rows) console.log(`${String(r.kb).padStart(5)} ${String(r.fns).padStart(5)} ${String(r.open).padStart(5)} ${String(r.edit).padStart(5)}  ${r.src}${r.open <= 3 ? '   [' + r.openNames.join(',') + (r.editNames.length ? ' | ' + r.editNames.join(',') : '') + ']' : ''}`);
