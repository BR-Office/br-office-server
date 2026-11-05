// SPDX-License-Identifier: AGPL-3.0-only
// Code coverage of the editor's scripts during the open journey (and a little typing), per script URL:
// every V8 precise-coverage range with its count, saved as JSON for mapping onto source files.
// V8 ranges nest: a count-0 inner range marks unexecuted bytes inside an executed outer range, so all of them are kept.
// Usage: node coverage-open.cjs <base> <docx> <out.json>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, OUT] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	const cdp = await ctx.newCDPSession(page);
	await cdp.send('Profiler.enable');
	await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true, allowTriggeredUpdates: false });
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 12000; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	const snapshot = async (label) => {
		const { result } = await cdp.send('Profiler.takePreciseCoverage');
		const scripts = {}; const functions = {};
		for (const s of result) {
			if (!/sdkjs\/|web-apps\//.test(s.url)) continue;
			const key = s.url.replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '');
			const ranges = []; const fns = [];
			for (const f of s.functions) { for (const r of f.ranges) ranges.push([r.startOffset, r.endOffset, r.count]); fns.push([f.ranges[0].startOffset, f.ranges[0].endOffset, f.ranges[0].count, f.functionName]); }
			scripts[key] = (scripts[key] || []).concat(ranges); functions[key] = (functions[key] || []).concat(fns);
		}
		return { label, scripts, functions };
	};
	const afterOpen = await snapshot('open');
	// a little editing: type, bold, undo, scroll
	await frame.evaluate(() => { const d = editor.WordControl.m_oLogicDocument; d.MoveCursorToStartPos(false); d.EnterText('Olá, mundo. '); d.SelectAll(); editor.put_TextPrBold(true); editor.Undo(); });
	await page.waitForTimeout(1500);
	const afterEdit = await snapshot('open+edit');
	await cdp.send('Profiler.stopPreciseCoverage');
	fs.writeFileSync(OUT, JSON.stringify({ open: afterOpen.scripts, edit: afterEdit.scripts, openFunctions: afterOpen.functions, editFunctions: afterEdit.functions }));
	for (const [label, scripts] of [['open', afterOpen.scripts], ['open+edit', afterEdit.scripts]]) {
		console.log(`== ${label}`);
		for (const [k, ranges] of Object.entries(scripts)) {
			const zero = ranges.filter((r) => r[2] === 0).length;
			console.log(`  ${k.padEnd(60)} ranges ${ranges.length} (count 0: ${zero})`);
		}
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
