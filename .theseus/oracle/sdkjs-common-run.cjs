// PKT-0046: runs the common entries of external/sdkjs/tests/runAll.js plus every other
// tests/common/**/*.html except *-compiled.html (those need a full `npm run build`); known-broken suites must
// fail exactly as recorded in `known`. Runs suites (concurrency from
// TESTS_CONCURRENCY, default 2 on this 2-CPU VM) and prints pass/fail/duration per suite.
const fs = require('fs');
const path = require('path');
const sdk = process.argv[2];
const filter = process.argv[3] || '';
const src = fs.readFileSync(path.join(sdk, 'tests/runAll.js'), 'utf8');
const all = [...new Set([...src.matchAll(/^\s*'(common\/[^']+\.html)',/gm)].map(m => m[1]))];
const walk = d => fs.readdirSync(path.join(sdk, 'tests', d), { withFileTypes: true }).flatMap(e =>
	e.isDirectory() ? walk(d + '/' + e.name) : e.name.endsWith('.html') ? [d + '/' + e.name] : []);
for (const t of walk('common').sort()) if (!all.includes(t)) all.push(t);
const skipped = {};
for (const m of src.matchAll(/'(common\/[^']+\.html)'\s*:\s*'([^']*)'/g)) skipped[m[1]] = m[2];
// Local skips (this repo only, not upstream): suites that need what external/ lacks here.
for (const t of all) if (t.endsWith('-compiled.html')) skipped[t] = 'local: loads deploy/ bundles, needs a full npm run build (not done by this oracle)';
// Known-broken suites (not in upstream runAll.js; PKT-0046 baseline). They run by default and pass only if
// they still fail exactly as recorded, so a fix or a new regression both turn the oracle red.
const COLOR_MODS = ['Check colors with mods', 'Check colors with satMod', 'Test lumOff mod', 'Test satOff mod',
	'Test hueMod mod', 'Test sat mod', 'Test lum mod', 'Test alphaMod mod', 'Test alphaOff mod', 'Test hue mod', 'Test hueOff mod']
	.map(n => 'Test applying color mods > ' + n);
const known = {
	'common/color-mods/color-mods.html': { passed: 9766, total: 10023, failing: COLOR_MODS },
	'common/charts/chartEx-serialize.html': { timeout: true },
};
const sameSet = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const { runQunitPuppeteer } = require(path.join(sdk, 'node_modules/node-qunit-puppeteer'));
process.on('unhandledRejection', r => console.error('late rejection: ' + r));
const conc = parseInt(process.env.TESTS_CONCURRENCY, 10) || 2;
(async () => {
	const todo = all.filter(t => !skipped[t] && t.includes(filter));
	for (const t of all) if (skipped[t] && t.includes(filter)) console.log(`SKIP ${t} (${skipped[t]})`);
	if (!todo.length) { console.log('FAIL no suite matched' + (filter ? ` filter "${filter}"` : '')); process.exit(1); }
	const failed = [];
	let total = 0, passed = 0;
	const t0 = Date.now();
	for (let i = 0; i < todo.length; i += conc) {
		await Promise.all(todo.slice(i, i + conc).map(async t => {
			const s = Date.now();
			const k = known[t];
			let ok, line, names = [];
			try {
				const r = await runQunitPuppeteer({ targetUrl: 'file://' + path.join(sdk, 'tests', t), timeout: 120000,
					puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'] });
				total += r.stats.total; passed += r.stats.passed;
				for (const [mod, tests] of Object.entries(r.modules || {}))
					for (const x of tests.tests || []) if (x.failed) names.push(`${mod} > ${x.name}`);
				if (k && k.failing) ok = r.stats.passed === k.passed && r.stats.total === k.total && sameSet(names, k.failing);
				else ok = !k && r.stats.failed === 0;
				line = `${r.stats.passed}/${r.stats.total}`;
			} catch (e) {
				ok = !!(k && k.timeout && /could not finish/.test(String(e)));
				line = 'error: ' + String(e).slice(0, 200);
			}
			if (!ok) failed.push(t);
			console.log(`${ok ? 'PASS' : 'FAIL'}${k ? ' (known-broken, as recorded)' : ''} ${t} ${line} ${((Date.now() - s) / 1000).toFixed(1)}s`);
			for (const n of names) console.log(`    ${n}`);
			if (!ok && k) console.log('    expected: ' + JSON.stringify(k) + ' — update `known` and the card if this changed on purpose');
		}));
	}
	console.log(`\n${todo.length - failed.length}/${todo.length} suites passed, ${passed}/${total} assertions, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
	process.exit(failed.length ? 1 : 0);
})();
