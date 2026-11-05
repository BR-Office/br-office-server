// SPDX-License-Identifier: AGPL-3.0-only
// CPU cost of the editor's scripts during the open: Chrome trace events EvaluateScript / v8.compile per script URL,
// and for sdk-all.js the gap between download end and evaluation end. Same journey as coverage-open.cjs.
// Usage: node trace-eval.cjs <base> <docx> <trace.json>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, OUT] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await browser.startTracing(page, { path: OUT, categories: ['devtools.timeline', 'v8', 'v8.execute', 'disabled-by-default-v8.compile', 'blink.user_timing', 'loading'] });
	const t0 = Date.now();
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 12000; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	const painted = Date.now() - t0;
	await browser.stopTracing();
	await browser.close();
	const ev = JSON.parse(fs.readFileSync(OUT, 'utf8')); const events = ev.traceEvents || ev;
	const short = (u) => (u || '').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '');
	const byUrl = {};
	const add = (u, k, d) => { if (!u) return; const s = short(u); byUrl[s] = byUrl[s] || { evaluate: 0, compile: 0, finish: null, evalEnd: null, evalStart: null }; byUrl[s][k] += d; };
	let tMin = Infinity; for (const e of events) if (e.ts) tMin = Math.min(tMin, e.ts);
	for (const e of events) {
		const d = e.args && e.args.data;
		if (e.name === 'EvaluateScript' && d && d.url && e.dur) { add(d.url, 'evaluate', e.dur / 1000); const s = short(d.url); byUrl[s].evalStart = (e.ts - tMin) / 1000; byUrl[s].evalEnd = (e.ts + e.dur - tMin) / 1000; }
		else if ((e.name === 'v8.compile' || e.name === 'V8.CompileScript' || e.name === 'v8.parseOnBackground' || e.name === 'V8.ParseOnBackground') && d && d.url && e.dur) add(d.url, 'compile', e.dur / 1000);
		else if (e.name === 'ResourceFinish' && d && d.requestId) { /* url unknown here */ }
	}
	// resource url by requestId, to place download end next to evaluation
	const reqUrl = {}; for (const e of events) if (e.name === 'ResourceSendRequest' && e.args && e.args.data) reqUrl[e.args.data.requestId] = e.args.data.url;
	for (const e of events) if (e.name === 'ResourceFinish' && e.args && e.args.data && reqUrl[e.args.data.requestId]) { const s = short(reqUrl[e.args.data.requestId]); if (byUrl[s]) byUrl[s].finish = (e.ts - tMin) / 1000; }
	console.log(`painted after ${painted} ms (goto -> layout done, no network emulation)`);
	console.log('\n  evaluate   compile   dl-end  eval-start  eval-end   script  (ms from first trace event)');
	for (const [u, v] of Object.entries(byUrl).sort((a, b) => b[1].evaluate - a[1].evaluate).slice(0, 14)) console.log(`  ${v.evaluate.toFixed(0).padStart(8)}  ${v.compile.toFixed(0).padStart(8)}  ${(v.finish == null ? '-' : v.finish.toFixed(0)).padStart(7)}  ${(v.evalStart == null ? '-' : v.evalStart.toFixed(0)).padStart(10)}  ${(v.evalEnd == null ? '-' : v.evalEnd.toFixed(0)).padStart(8)}   ${u}`);
	// total main-thread time in top-level script evaluation vs everything else
	const names = {}; for (const e of events) if (e.dur && e.ph === 'X' && e.tid === events.find((x) => x.name === 'EvaluateScript')?.tid) names[e.name] = (names[e.name] || 0) + e.dur / 1000;
	console.log('\n  main-thread time by event name (ms, nested events double count):'); for (const [n, d] of Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${d.toFixed(0).padStart(8)}  ${n}`);
})().catch((e) => { console.error(e); process.exit(1); });
