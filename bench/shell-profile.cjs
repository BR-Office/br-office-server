// SPDX-License-Identifier: AGPL-3.0-only
// What the shell (web-apps) does on the main thread during the open: a CPU profile of the editor frame from the
// moment the page starts until the document is painted, split into three windows: before the shell hands the
// document over (DocInfo), between DocInfo and isDocumentLoadComplete, and the second after content ready
// (the app:ready fan-out). Self time by script and by function; web-apps keeps function names (no mangling).
// Usage: node shell-profile.cjs <base> <docx> [runs]
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, RUNS = '2'] = process.argv.slice(2);
const short = (u) => (u || '').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '');
function aggregate(profile, from, to) {
	// samples between two timestamps (profile time in µs from startTime)
	const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map(); const byUrl = new Map(); let t = profile.startTime, total = 0;
	for (let i = 0; i < profile.samples.length; i++) {
		t += profile.timeDeltas[i] || 0; const d = (profile.timeDeltas[i] || 0) / 1000;
		if (t < from || t > to) continue;
		const cf = byId.get(profile.samples[i]).callFrame; const name = cf.functionName || '(anon)';
		if (name === '(idle)') continue; total += d;
		const u = cf.url ? short(cf.url) : '(' + name + ')';
		byUrl.set(u, (byUrl.get(u) || 0) + d); const k = `${name} @ ${u}:${cf.lineNumber}`; self.set(k, (self.get(k) || 0) + d);
	}
	return { total, byUrl: [...byUrl.entries()].sort((a, b) => b[1] - a[1]), self: [...self.entries()].sort((a, b) => b[1] - a[1]) };
}
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	for (let run = 1; run <= +RUNS; run++) {
		const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
		const page = await ctx.newPage();
		await page.goto(BASE + '/example/');
		const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
		const cdp = await ctx.newCDPSession(page);
		await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
		await cdp.send('Profiler.start');
		const marks = {}; const t0 = Date.now();
		await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
		let frame;
		for (let i = 0; i < 4000; i++) {
			frame = page.frames().find((x) => x.name() === 'frameEditor');
			if (frame) {
				const st = await frame.evaluate(() => { const e = window.editor; if (!e) return null; return { full: !!e.isLoadFullApi, doc: !!e.DocInfo, loaded: !!e.isDocumentLoadComplete, done: !!(e.isDocumentLoadComplete && e.WordControl && e.WordControl.m_oLogicDocument && e.WordControl.m_oLogicDocument.FullRecalc.Id == null), now: performance.timeOrigin + performance.now() }; }).catch(() => null);
				if (st) { if (!marks.api) marks.api = st.now; if (st.full && !marks.sdk) marks.sdk = st.now; if (st.doc && !marks.docInfo) marks.docInfo = st.now; if (st.loaded && !marks.complete) marks.complete = st.now; if (st.done) { marks.painted = st.now; break; } }
			}
			await page.waitForTimeout(20);
		}
		await page.waitForTimeout(1200);
		const { profile } = await cdp.send('Profiler.stop');
		// profile timestamps are µs since an arbitrary origin; align with wall clock using the profile's end time
		const profEndUs = profile.endTime; const wallEnd = Date.now() * 1000; const off = profEndUs - wallEnd; // profile µs = wall µs + off
		const W = (ms) => ms * 1000 + off;
		const windows = [['page start → shell hands the document (DocInfo)', W(t0), W(marks.docInfo / 1)], ['DocInfo → content ready', W(marks.docInfo), W(marks.complete)], ['content ready → painted', W(marks.complete), W(marks.painted)], ['painted → +1.2 s (settling)', W(marks.painted), W(marks.painted + 1200)]];
		console.log(`\n== run ${run}: api +${Math.round(marks.api - t0)} ms, sdk +${Math.round(marks.sdk - t0)}, DocInfo +${Math.round(marks.docInfo - t0)}, complete +${Math.round(marks.complete - t0)}, painted +${Math.round(marks.painted - t0)}`);
		for (const [label, a, b] of windows) {
			const agg = aggregate(profile, a, b);
			console.log(`-- ${label}: ${((b - a) / 1000).toFixed(0)} ms wall, ${agg.total.toFixed(0)} ms busy`);
			console.log('   by script: ' + agg.byUrl.slice(0, 6).map(([u, d]) => `${u} ${d.toFixed(0)}`).join(' | '));
			for (const [k, d] of agg.self.filter(([k]) => !/^\(program\)|^\(garbage/.test(k)).slice(0, 10)) console.log(`   ${d.toFixed(0).padStart(5)}  ${k}`);
		}
		await ctx.close();
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
