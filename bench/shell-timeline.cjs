// SPDX-License-Identifier: AGPL-3.0-only
// Timeline of the main thread during the open, in 100 ms buckets from the shell handing the document over to the
// paint: busy ms by owner (sdk / shell / browser) and the shell function that owns most of the bucket. Tells whether
// the shell's work overlaps a wait (free) or the editor's parse and layout (on the critical path).
// Usage: node shell-timeline.cjs <base> <file> [cpuThrottle]
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, CPU = '1'] = process.argv.slice(2);
const short = (u) => (u || '').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '');
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	const cdp = await ctx.newCDPSession(page);
	if (+CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +CPU });
	await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
	const marks = {}; const t0 = Date.now();
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame;
	for (let i = 0; i < 6000; i++) {
		frame = page.frames().find((x) => x.name() === 'frameEditor');
		if (frame) { const st = await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); if (!e) return null; const word = e.WordControl && e.WordControl.m_oLogicDocument && e.WordControl.m_oLogicDocument.FullRecalc; if (e.isDocumentLoadComplete && !window.__loadedAt) window.__loadedAt = performance.now(); return { doc: !!e.DocInfo, bin: !!(e.openResult || window.__binSeen || (window.__binSeen = !!(e.WordControl && e.WordControl.m_oLogicDocument && e.WordControl.m_oLogicDocument.Content && e.WordControl.m_oLogicDocument.Content.length > 1))), loaded: !!e.isDocumentLoadComplete, done: !!(e.isDocumentLoadComplete && (word ? word.Id == null : performance.now() - window.__loadedAt > 600)), now: performance.timeOrigin + performance.now() }; }).catch(() => null);
			if (st) { if (st.doc && !marks.docInfo) marks.docInfo = st.now; if (st.bin && !marks.bin) marks.bin = st.now; if (st.loaded && !marks.complete) marks.complete = st.now; if (st.done) { marks.painted = st.now; break; } } }
		await page.waitForTimeout(20);
	}
	const { profile } = await cdp.send('Profiler.stop');
	const off = profile.endTime - Date.now() * 1000; const W = (ms) => ms * 1000 + off;
	const byId = new Map(profile.nodes.map((n) => [n.id, n])); const parent = new Map(); for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
	const from = W(marks.docInfo - 200), to = W(marks.painted + 100); const B = 100000; const nb = Math.ceil((to - from) / B);
	const buckets = Array.from({ length: nb }, () => ({ sdk: 0, shell: 0, prog: 0, fn: new Map() }));
	let t = profile.startTime;
	for (let i = 0; i < profile.samples.length; i++) {
		t += profile.timeDeltas[i] || 0; const d = (profile.timeDeltas[i] || 0) / 1000; if (t < from || t >= to) continue;
		const b = buckets[Math.floor((t - from) / B)]; let id = profile.samples[i]; const leaf = byId.get(id).callFrame; if (leaf.functionName === '(idle)') continue;
		const lu = short(leaf.url); const owner = /sdk-all|fonts\.wasm|sdkjs\//.test(lu) ? 'sdk' : /web-apps/.test(lu) ? 'shell' : 'prog'; b[owner] += d;
		// attribute the sample to the outermost named shell function on the stack (what the shell is doing)
		let top = null; while (id !== undefined) { const cf = byId.get(id).callFrame; if (/web-apps\/apps\/[a-z]+editor\/main\/(app|code)\.js/.test(short(cf.url)) && cf.functionName && cf.functionName !== '(anon)' && !/^[a-z]{1,2}$|^__webpack_require__$|^D\.r$|^h\.View$/.test(cf.functionName)) top = cf.functionName; id = parent.get(id); }
		if (top) b.fn.set(top, (b.fn.get(top) || 0) + d);
	}
	console.log(`cpu ×${CPU}; marks after page start: DocInfo +${Math.round(marks.docInfo - t0)} ms, document content +${marks.bin ? Math.round(marks.bin - t0) : '?'}, complete +${Math.round(marks.complete - t0)}, painted +${Math.round(marks.painted - t0)}`);
	console.log('bucket(ms from DocInfo)   sdk  shell  brow  | main shell function in the bucket');
	buckets.forEach((b, i) => { const start = Math.round(((from + i * B) - W(marks.docInfo)) / 1000); const tag = [marks.bin, marks.complete, marks.painted].map((m, k) => m && Math.abs(W(m) - (from + i * B)) < B ? ['<content', '<complete', '<painted'][k] : '').join(''); const fn = [...b.fn.entries()].sort((x, y) => y[1] - x[1])[0]; console.log(`${String(start).padStart(6)}  ${b.sdk.toFixed(0).padStart(5)} ${b.shell.toFixed(0).padStart(6)} ${b.prog.toFixed(0).padStart(5)}  | ${fn ? fn[0] + ' ' + fn[1].toFixed(0) : ''} ${tag}`); });
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
