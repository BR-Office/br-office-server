// Runs the word entries of external/sdkjs/tests/runAll.js one by one (concurrency from
// TESTS_CONCURRENCY, default 2 on this 2-CPU VM) and prints pass/fail/duration per suite.
const fs = require('fs');
const path = require('path');
const sdk = process.argv[2];
const filter = process.argv[3] || '';
const src = fs.readFileSync(path.join(sdk, 'tests/runAll.js'), 'utf8');
const all = [...new Set([...src.matchAll(/^\s*'(word\/[^']+\.html)',/gm)].map(m => m[1]))];
const skipped = {};
for (const m of src.matchAll(/'(word\/[^']+\.html)'\s*:\s*'([^']*)'/g)) skipped[m[1]] = m[2];
// Local skips (this repo only, not upstream): suites that need what external/ lacks here.
skipped['word/js-api/js-api-forms.html'] = 'local: needs the sdkjs-forms addon (AscTest.JsApi.CreateTextForm), not checked out under external/';
const { runQunitPuppeteer } = require(path.join(sdk, 'node_modules/node-qunit-puppeteer'));
process.on('unhandledRejection', r => console.error('late rejection: ' + r));
const conc = parseInt(process.env.TESTS_CONCURRENCY, 10) || 2;
(async () => {
	const todo = all.filter(t => !skipped[t] && t.includes(filter));
	for (const t of all) if (skipped[t] && t.includes(filter)) console.log(`SKIP ${t} (${skipped[t]})`);
	const failed = [];
	let total = 0, passed = 0;
	const t0 = Date.now();
	for (let i = 0; i < todo.length; i += conc) {
		await Promise.all(todo.slice(i, i + conc).map(async t => {
			const s = Date.now();
			try {
				const r = await runQunitPuppeteer({ targetUrl: 'file://' + path.join(sdk, 'tests', t), timeout: 120000,
					puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'] });
				total += r.stats.total; passed += r.stats.passed;
				const ok = r.stats.failed === 0;
				if (!ok) failed.push(t);
				console.log(`${ok ? 'PASS' : 'FAIL'} ${t} ${r.stats.passed}/${r.stats.total} ${((Date.now() - s) / 1000).toFixed(1)}s`);
				if (!ok) for (const [mod, tests] of Object.entries(r.modules || {}))
					for (const x of tests.tests || []) if (x.failed) console.log(`    ${mod} > ${x.name}`);
			} catch (e) {
				failed.push(t);
				console.log(`FAIL ${t} error ${((Date.now() - s) / 1000).toFixed(1)}s: ${String(e).slice(0, 200)}`);
			}
		}));
	}
	console.log(`\n${todo.length - failed.length}/${todo.length} suites passed, ${passed}/${total} assertions, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
	process.exit(failed.length ? 1 : 0);
})();
