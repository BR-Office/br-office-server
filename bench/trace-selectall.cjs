// SPDX-License-Identifier: AGPL-3.0-only
// Chrome trace of the editor around a select-all: what the main thread does between the key and the paint that
// shows the selection (JS by script, style/layout recalculations and who forced them, paint), to tell editor work
// (sdkjs) from shell work (web-apps) and from the browser's own layout.
// Usage: node trace-selectall.cjs <base> <docx> <trace.json>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, OUT] = process.argv.slice(2);
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
	const canvas = await frame.$('#id_viewer') || await frame.$('canvas'); const box = await canvas.boundingBox();
	await page.mouse.click(box.x + box.width / 2, box.y + 200); await page.waitForTimeout(400);
	await browser.startTracing(page, { path: OUT, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'disabled-by-default-devtools.timeline.invalidationTracking', 'v8.execute', 'blink.user_timing'] });
	await frame.evaluate(() => performance.mark('selectall-key'));
	await page.keyboard.press('Control+a');
	await page.waitForTimeout(1500);
	await frame.evaluate(() => performance.mark('selectall-end'));
	await browser.stopTracing();
	await browser.close();
	const ev = JSON.parse(fs.readFileSync(OUT, 'utf8')); const events = ev.traceEvents || ev;
	const key = events.find((e) => e.name === 'selectall-key'); const end = events.find((e) => e.name === 'selectall-end');
	const t0 = key ? key.ts : Math.min(...events.filter((e) => e.ts).map((e) => e.ts)); const t1 = end ? end.ts : Infinity;
	const short = (u) => (u || '').replace(/^.*\/(sdkjs|web-apps)\//, '$1/').replace(/\?.*$/, '');
	const inWin = events.filter((e) => e.ph === 'X' && e.dur && e.ts >= t0 && e.ts <= t1);
	const byName = {}; for (const e of inWin) byName[e.name] = (byName[e.name] || 0) + e.dur / 1000;
	console.log(`window: ${((t1 - t0) / 1000).toFixed(0)} ms from the key. Complete events by name (ms, nested events double count):`);
	for (const [n, d] of Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log(`  ${d.toFixed(0).padStart(6)}  ${n}`);
	// layouts and style recalcs: who forced them (top stack frame url)
	const forced = inWin.filter((e) => (e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.args && e.args.beginData && e.args.beginData.stackTrace && e.args.beginData.stackTrace.length);
	const byInit = {}; for (const e of forced) { const f = e.args.beginData.stackTrace[0]; const k = `${f.functionName || '(anon)'} @ ${short(f.url)}:${f.lineNumber}`; byInit[k] = byInit[k] || { n: 0, ms: 0 }; byInit[k].n++; byInit[k].ms += e.dur / 1000; }
	console.log(`\nforced style/layout work (${forced.length} events with a JS stack), by initiator:`);
	for (const [k, v] of Object.entries(byInit).sort((a, b) => b[1].ms - a[1].ms).slice(0, 12)) console.log(`  ${v.ms.toFixed(0).padStart(5)} ms  ×${String(v.n).padStart(3)}  ${k}`);
	// JS by script: FunctionCall / EvaluateScript / TimerFire with data.url or stack
	const js = {}; for (const e of inWin) { if (!/FunctionCall|TimerFire|EventDispatch|RunMicrotasks|FireAnimationFrame/.test(e.name)) continue; const d = e.args && e.args.data; const u = d && (d.url || (d.stackTrace && d.stackTrace[0] && d.stackTrace[0].url)); const k = u ? short(u) : e.name; js[k] = (js[k] || 0) + e.dur / 1000; }
	console.log('\nJS tasks by script (ms, outer events):'); for (const [k, d] of Object.entries(js).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${d.toFixed(0).padStart(6)}  ${k}`);
	// long tasks in the window: top-level events > 50 ms with their first child names
	const longs = inWin.filter((e) => e.dur > 50000 && /RunTask|FunctionCall|TimerFire|EventDispatch/.test(e.name)).sort((a, b) => a.ts - b.ts);
	console.log(`\ntasks longer than 50 ms after the key:`); for (const e of longs.slice(0, 10)) { const d = e.args && e.args.data; console.log(`  +${((e.ts - t0) / 1000).toFixed(0).padStart(5)} ms  ${(e.dur / 1000).toFixed(0).padStart(4)} ms  ${e.name} ${d && d.type ? d.type : ''} ${d && d.url ? short(d.url) : ''}`); }
	const paints = inWin.filter((e) => e.name === 'Paint').sort((a, b) => a.ts - b.ts);
	console.log(`\nfirst paints after the key: ${paints.slice(0, 5).map((p) => '+' + ((p.ts - t0) / 1000).toFixed(0) + ' ms').join(', ')}`);
})().catch((e) => { console.error(e); process.exit(1); });
