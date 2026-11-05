// SPDX-License-Identifier: AGPL-3.0-only
// Perceived latency while editing: time from each keystroke (real key events) to the paint that shows it, plus the
// cost of select-all, bold, undo, page down and wheel scrolling, in the editor frame of the example. Paints are
// detected by wrapping the editor page's OnPaint; long tasks (>50 ms) on the main thread are counted too.
// Usage: node type-latency.cjs <base> <docx>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const p90 = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.9)] : NaN; };
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 2400; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	await page.waitForTimeout(1500); // let the shell's app:ready work settle
	// instrumentation inside the editor frame
	await frame.evaluate(() => {
		const W = editor.WordControl; const log = window.__lat = { keys: [], paints: [], long: [], marks: [] };
		const origPaint = W.OnPaint.bind(W);
		W.OnPaint = function () { const t0 = performance.now(); const r = origPaint.apply(this, arguments); const t1 = performance.now(); log.paints.push([t0, t1]); return r; };
		document.addEventListener('keydown', (e) => { log.keys.push({ key: e.key, t: performance.now() }); }, true);
		new PerformanceObserver((list) => { for (const e of list.getEntries()) log.long.push([e.startTime, e.duration]); }).observe({ entryTypes: ['longtask'] });
		window.__mark = (label, fn) => { const t0 = performance.now(); fn(); const t1 = performance.now(); log.marks.push({ label, sync: t1 - t0, t: t0 }); };
	});
	// place the caret in the body text: click on the first page, then go to the start of the document
	const canvas = await frame.$('#id_viewer') || await frame.$('canvas');
	const box = await canvas.boundingBox();
	await page.mouse.click(box.x + box.width / 2, box.y + 200);
	await page.waitForTimeout(300);
	await frame.evaluate(() => { editor.WordControl.m_oLogicDocument.MoveCursorToStartPos(false); });
	await page.waitForTimeout(300);
	// 1. type a sentence with real key events, 80 ms apart (a fast typist)
	const text = 'A latencia percebida comeca na primeira letra que o usuario digita. ';
	await page.keyboard.type(text, { delay: 80 });
	await page.waitForTimeout(800);
	// 2. select all, bold, undo, undo (synchronous costs)
	await frame.evaluate(() => { const d = editor.WordControl.m_oLogicDocument; __mark('selectAll', () => d.SelectAll()); });
	await page.waitForTimeout(400);
	await frame.evaluate(() => { __mark('bold on all', () => editor.put_TextPrBold(true)); });
	await page.waitForTimeout(600);
	await frame.evaluate(() => { __mark('undo bold', () => editor.Undo()); });
	await page.waitForTimeout(600);
	await frame.evaluate(() => { __mark('undo typing', () => editor.Undo()); });
	await page.waitForTimeout(600);
	await frame.evaluate(() => { editor.WordControl.m_oLogicDocument.RemoveSelection(); editor.WordControl.m_oLogicDocument.MoveCursorToStartPos(false); });
	// 3. page down x5 (keyboard) and wheel scrolling
	for (let i = 0; i < 5; i++) { await page.keyboard.press('PageDown'); await page.waitForTimeout(250); }
	await page.waitForTimeout(400);
	await frame.evaluate(() => { window.__lat.scrollStart = performance.now(); window.__lat.paintsBeforeScroll = window.__lat.paints.length; });
	for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(50); }
	await page.waitForTimeout(800);
	const lat = await frame.evaluate(() => window.__lat);
	await browser.close();
	// analysis: for each key, the first paint that ended after it
	const keyLat = [];
	for (const k of lat.keys) { if (k.key.length !== 1 && k.key !== ' ') continue; const p = lat.paints.find((pp) => pp[1] > k.t); if (p) keyLat.push(p[1] - k.t); }
	const pageDownLat = [];
	for (const k of lat.keys) { if (k.key !== 'PageDown') continue; const p = lat.paints.find((pp) => pp[1] > k.t); if (p) pageDownLat.push(p[1] - k.t); }
	const scrollPaints = lat.paints.slice(lat.paintsBeforeScroll).filter((p) => p[0] >= lat.scrollStart);
	const scrollDur = scrollPaints.map((p) => p[1] - p[0]);
	const typingWindow = lat.keys.length ? [lat.keys[0].t, lat.keys.filter((k) => k.key.length === 1).slice(-1)[0].t + 300] : null;
	const longDuringTyping = typingWindow ? lat.long.filter((l) => l[0] >= typingWindow[0] && l[0] <= typingWindow[1]) : [];
	console.log(`typing: ${keyLat.length} keys, key -> paint latency median ${median(keyLat).toFixed(0)} ms, p90 ${p90(keyLat).toFixed(0)} ms, max ${Math.max(...keyLat).toFixed(0)} ms; long tasks during typing: ${longDuringTyping.length} (${longDuringTyping.map((l) => l[1].toFixed(0)).join(', ')} ms)`);
	console.log(`paint cost while typing (OnPaint sync): median ${median(lat.paints.filter((p) => typingWindow && p[0] >= typingWindow[0] && p[0] <= typingWindow[1]).map((p) => p[1] - p[0])).toFixed(1)} ms`);
	for (const m of lat.marks) { const p = lat.paints.find((pp) => pp[1] > m.t); console.log(`${m.label}: sync ${m.sync.toFixed(0)} ms, to paint ${p ? (p[1] - m.t).toFixed(0) : '-'} ms`); }
	console.log(`page down: ${pageDownLat.length} keys, key -> paint median ${median(pageDownLat).toFixed(0)} ms, max ${Math.max(...pageDownLat).toFixed(0)} ms`);
	console.log(`wheel scroll (20 steps of 300 px in 1 s): ${scrollPaints.length} paints, OnPaint median ${median(scrollDur).toFixed(1)} ms, max ${Math.max(...scrollDur).toFixed(0)} ms; long tasks overall ${lat.long.length}`);
	fs.writeFileSync(path.join(__dirname, 'type-latency.json'), JSON.stringify(lat));
})().catch((e) => { console.error(e); process.exit(1); });
