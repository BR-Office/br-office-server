// SPDX-License-Identifier: AGPL-3.0-only
// What runs between Ctrl+A and the paint that shows the selection: CPU profile of the editor frame around a
// select-all on the real document, top self-time functions by script, plus the paint timeline around the mark.
// Usage: node selectall-profile.cjs <base> <docx>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 2400; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	await page.waitForTimeout(1500);
	await frame.evaluate(() => { const W = editor.WordControl; const log = window.__lat = { paints: [], marks: [] }; const o = W.OnPaint.bind(W); W.OnPaint = function () { const t0 = performance.now(); const r = o.apply(this, arguments); log.paints.push([t0, performance.now()]); return r; }; });
	const canvas = await frame.$('#id_viewer') || await frame.$('canvas'); const box = await canvas.boundingBox();
	await page.mouse.click(box.x + box.width / 2, box.y + 200); await page.waitForTimeout(400);
	const cdp = await ctx.newCDPSession(page);
	await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
	for (const round of [1, 2]) {
		await cdp.send('Profiler.start');
		const t0 = await frame.evaluate(() => { const t = performance.now(); window.__lat.marks.push(t); return t; });
		await page.keyboard.press('Control+a');
		await page.waitForTimeout(1200);
		const { profile } = await cdp.send('Profiler.stop');
		// aggregate self time by function (url:name)
		const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map(); const byUrl = new Map();
		const dt = profile.timeDeltas; let total = 0;
		for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const d = (dt[i] || 0) / 1000; total += d; const cf = n.callFrame; const key = `${cf.functionName || '(anon)'} @ ${(cf.url || '').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '')}:${cf.lineNumber}`; self.set(key, (self.get(key) || 0) + d); const u = (cf.url || '(native/' + cf.functionName + ')').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, ''); byUrl.set(u, (byUrl.get(u) || 0) + d); }
		const lat = await frame.evaluate(() => window.__lat);
		const after = lat.paints.filter((p) => p[0] >= t0 - 1).slice(0, 6).map((p) => `start +${(p[0] - t0).toFixed(0)} dur ${(p[1] - p[0]).toFixed(0)}`);
		console.log(`\n== select all, round ${round}: ${total.toFixed(0)} ms sampled in 1.2 s; paints after the key: ${after.join(' | ')}`);
		console.log('  by script (ms self):'); for (const [u, d] of [...byUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`    ${d.toFixed(0).padStart(5)}  ${u}`);
		console.log('  top functions (ms self):'); for (const [k, d] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`    ${d.toFixed(0).padStart(5)}  ${k}`);
		await frame.evaluate(() => { editor.WordControl.m_oLogicDocument.RemoveSelection(); }); await page.waitForTimeout(500);
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
