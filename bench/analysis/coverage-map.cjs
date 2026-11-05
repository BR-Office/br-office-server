// SPDX-License-Identifier: AGPL-3.0-only
// Map executed bytes of sdk-all.js (V8 precise coverage from coverage-open.cjs) onto source files through the bundle's source map.
// Nested-range semantics: ranges are sorted by start, the innermost range covering a byte decides whether it executed.
// Usage: node coverage-map.cjs <sdk-all.js> <sdk-all.js.map> <coverage.json> [open|edit]
const SDKJS = process.env.SDKJS_DIR || require('path').resolve(__dirname, require('fs').existsSync(require('path').resolve(__dirname, '../../../sdkjs')) ? '../../../sdkjs' : '../../../br-office-sdkjs'); // the sdkjs checkout (sibling repo), for its build/node_modules
const fs = require('fs');
const { SourceMapConsumer } = require(SDKJS + '/build/node_modules/source-map-js');
const [JS, MAP, COV, WHICH = 'open'] = process.argv.slice(2);
const js = fs.readFileSync(JS, 'utf8');
const map = new SourceMapConsumer(JSON.parse(fs.readFileSync(MAP, 'utf8')));
// V8 offsets are UTF-16 code units, like JS string indexes: js.length and charCodeAt match them exactly
const lineStart = [0]; for (let i = 0; i < js.length; i++) if (js.charCodeAt(i) === 10) lineStart.push(i + 1);
// for each generated line, the sorted list of (column, source) segments
const segs = new Map();
map.eachMapping((m) => { if (!segs.has(m.generatedLine)) segs.set(m.generatedLine, []); segs.get(m.generatedLine).push([m.generatedColumn, m.source]); }, null, SourceMapConsumer.GENERATED_ORDER);
for (const arr of segs.values()) arr.sort((a, b) => a[0] - b[0]);
// flatten the segments into absolute [start, end, source] over the whole file
const fileSegs = [];
for (let L = 0; L < lineStart.length; L++) {
	const start = lineStart[L], end = L + 1 < lineStart.length ? lineStart[L + 1] : js.length;
	const arr = segs.get(L + 1); if (!arr) continue;
	for (let i = 0; i < arr.length; i++) { const c0 = arr[i][0], c1 = i + 1 < arr.length ? arr[i + 1][0] : end - start; if (c1 > c0) fileSegs.push([start + c0, start + c1, arr[i][1]]); }
}
const total = new Map(); for (const [s, e, src] of fileSegs) total.set(src, (total.get(src) || 0) + (e - s));
// executed intervals from the nested ranges: process ranges sorted by (start asc, end desc); a later range that lies inside
// the current one overrides it. Build a flat list of [start, end, count] using a stack.
const covAll = JSON.parse(fs.readFileSync(COV, 'utf8'));
function executedIntervals(cov) {
	const key = Object.keys(cov).find((k) => /word\/sdk-all\.js$/.test(k));
	const ranges = cov[key].slice().sort((a, b) => a[0] - b[0] || b[1] - a[1]);
	const flat = []; const stack = []; let cursor = 0;
	function emit(to, count) { if (to > cursor) { flat.push([cursor, to, count]); cursor = to; } }
	for (const r of ranges) {
		while (stack.length && stack[stack.length - 1][1] <= r[0]) { const top = stack.pop(); emit(top[1], top[2]); }
		if (stack.length) emit(r[0], stack[stack.length - 1][2]); else emit(r[0], 0);
		stack.push(r);
	}
	while (stack.length) { const top = stack.pop(); emit(top[1], top[2]); }
	emit(js.length, 0);
	return flat.filter((f) => f[2] > 0).map((f) => [f[0], f[1]]);
}
// takePreciseCoverage resets the counters, so "edit" is incremental and is unioned with "open"
let executed = executedIntervals(covAll.open);
if (WHICH === 'edit') {
	executed = executed.concat(executedIntervals(covAll.edit)).sort((a, b) => a[0] - b[0]);
	const merged = []; for (const [s, e] of executed) { if (merged.length && s <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e); else merged.push([s, e]); }
	executed = merged;
}
console.error(`executed intervals ${executed.length}, executed bytes ${executed.reduce((a, f) => a + f[1] - f[0], 0)}`);
// intersect executed intervals with source segments (both sorted)
const used = new Map(); let j = 0;
for (const [s, e] of executed) {
	while (j < fileSegs.length && fileSegs[j][1] <= s) j++;
	for (let k = j; k < fileSegs.length && fileSegs[k][0] < e; k++) { const ov = Math.min(e, fileSegs[k][1]) - Math.max(s, fileSegs[k][0]); if (ov > 0) used.set(fileSegs[k][2], (used.get(fileSegs[k][2]) || 0) + ov); }
}
const short = (src) => src.replace(/^.*?\/(common|word|cell|slide|pdf|visio|vendor)\//, '$1/');
const rows = [...total.entries()].map(([src, t]) => ({ src: short(src), total: t, used: used.get(src) || 0 })).sort((a, b) => (b.total - b.used) - (a.total - a.used));
const sumT = rows.reduce((a, r) => a + r.total, 0), sumU = rows.reduce((a, r) => a + r.used, 0);
console.log(`bundle ${(sumT / 1048576).toFixed(1)} MB mapped, executed ${(sumU / 1048576).toFixed(2)} MB (${(100 * sumU / sumT).toFixed(1)} %) during "${WHICH}"`);
const zero = rows.filter((r) => r.used === 0); const zeroBytes = zero.reduce((a, r) => a + r.total, 0);
console.log(`files with nothing executed: ${zero.length} of ${rows.length}, ${(zeroBytes / 1048576).toFixed(1)} MB`);
const low = rows.filter((r) => r.used > 0 && r.used / r.total < 0.02); const lowBytes = low.reduce((a, r) => a + r.total, 0);
console.log(`files under 2 % executed: ${low.length}, ${(lowBytes / 1048576).toFixed(1)} MB`);
const byDir = {}; for (const r of rows) { const d = r.src.split('/').slice(0, 2).join('/'); byDir[d] = byDir[d] || { total: 0, used: 0 }; byDir[d].total += r.total; byDir[d].used += r.used; }
console.log('\nby folder (KB total / executed):'); for (const [d, v] of Object.entries(byDir).sort((a, b) => b[1].total - a[1].total).slice(0, 24)) console.log(`  ${(v.total / 1024).toFixed(0).padStart(7)} / ${(v.used / 1024).toFixed(0).padStart(6)}  ${d}`);
console.log('\nlargest files by unexecuted bytes (KB total / executed):'); for (const r of rows.slice(0, 50)) console.log(`  ${(r.total / 1024).toFixed(0).padStart(7)} / ${(r.used / 1024).toFixed(0).padStart(6)}  ${r.src}`);
fs.writeFileSync(COV.replace(/\.json$/, `-${WHICH}-files.json`), JSON.stringify(rows, null, 1));
