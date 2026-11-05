// SPDX-License-Identifier: AGPL-3.0-only
// Inclusive (total) time per shell function during the open: which web-apps initialisers, controllers and UI
// builders own the main thread between the shell handing the document over and the first paint. Same windows as
// shell-profile.cjs; a function's inclusive time counts every sample that has it on the stack (once per sample).
// Usage: node shell-profile-incl.cjs <base> <docx>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
const short = (u) => (u || '').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '');
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	const cdp = await ctx.newCDPSession(page);
	await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
	const marks = {}; const t0 = Date.now();
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame;
	for (let i = 0; i < 4000; i++) {
		frame = page.frames().find((x) => x.name() === 'frameEditor');
		if (frame) { const st = await frame.evaluate(() => { const e = window.editor; if (!e) return null; return { doc: !!e.DocInfo, loaded: !!e.isDocumentLoadComplete, done: !!(e.isDocumentLoadComplete && e.WordControl && e.WordControl.m_oLogicDocument && e.WordControl.m_oLogicDocument.FullRecalc.Id == null), now: performance.timeOrigin + performance.now() }; }).catch(() => null);
			if (st) { if (st.doc && !marks.docInfo) marks.docInfo = st.now; if (st.loaded && !marks.complete) marks.complete = st.now; if (st.done) { marks.painted = st.now; break; } } }
		await page.waitForTimeout(20);
	}
	await page.waitForTimeout(1200);
	const { profile } = await cdp.send('Profiler.stop');
	const off = profile.endTime - Date.now() * 1000; const W = (ms) => ms * 1000 + off;
	const byId = new Map(profile.nodes.map((n) => [n.id, n])); const parent = new Map(); for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
	const windows = [['page start → DocInfo', W(t0), W(marks.docInfo)], ['DocInfo → content ready', W(marks.docInfo), W(marks.complete)], ['content ready → painted', W(marks.complete), W(marks.painted)]];
	console.log(`marks: DocInfo +${Math.round(marks.docInfo - t0)} ms, complete +${Math.round(marks.complete - t0)}, painted +${Math.round(marks.painted - t0)}`);
	for (const [label, a, b] of windows) {
		const incl = new Map(); const shellSelf = { app: 0, jquery: 0, code: 0, require: 0, program: 0, sdk: 0, other: 0 }; let t = profile.startTime, total = 0;
		for (let i = 0; i < profile.samples.length; i++) {
			t += profile.timeDeltas[i] || 0; const d = (profile.timeDeltas[i] || 0) / 1000; if (t < a || t > b) continue;
			let id = profile.samples[i]; const leaf = byId.get(id).callFrame; if (leaf.functionName === '(idle)') continue; total += d;
			const lu = short(leaf.url); shellSelf[/documenteditor\/main\/app\.js/.test(lu) ? 'app' : /jquery/.test(lu) ? 'jquery' : /code\.js/.test(lu) ? 'code' : /require/.test(lu) ? 'require' : /sdk-all|fonts\.wasm|sdkjs/.test(lu) ? 'sdk' : leaf.functionName === '(program)' || leaf.functionName === '(garbage collector)' ? 'program' : 'other'] += d;
			const seen = new Set();
			while (id !== undefined) { const cf = byId.get(id).callFrame; const u = short(cf.url); if (/web-apps\/apps\/documenteditor\/main\/(app|code)\.js/.test(u) && cf.functionName && cf.functionName !== '(anon)') { const k = `${cf.functionName} @ ${u.replace(/^.*\//, '')}:${cf.lineNumber}`; if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + d); } } id = parent.get(id); }
		}
		console.log(`\n-- ${label}: ${((b - a) / 1000).toFixed(0)} ms wall, ${total.toFixed(0)} ms busy; self by owner: ` + Object.entries(shellSelf).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', '));
		console.log('   inclusive time of shell functions (ms, a sample counts once per function on its stack):');
		for (const [k, d] of [...incl.entries()].sort((x, y) => y[1] - x[1]).slice(0, 22)) console.log(`   ${d.toFixed(0).padStart(5)}  ${k}`);
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
