// SPDX-License-Identifier: AGPL-3.0-only
// Late font styles: open a presentation or a spreadsheet, note the font files downloaded for the open, then make
// some text bold and italic through real key events and report the font files fetched afterwards (the styles
// loaded on demand), plus any error. Also types with a new family so the picker path is exercised.
// Usage: node late-style.cjs <base> <file>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
	const fonts = []; const errors = [];
	page.on('response', (r) => { if (/\/fonts\/\d+/.test(r.url())) fonts.push({ url: r.url().replace(/^.*\/fonts\//, 'fonts/'), at: Date.now() }); });
	page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
	page.on('console', (m) => { if (m.type() === 'error' && !/docserviceworker|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); }).catch(() => false)) break; await page.waitForTimeout(50); }
	await page.waitForTimeout(3000);
	const isCell = /\.xlsx$/i.test(FILE);
	const canvas = await frame.$(isCell ? '#ws-canvas' : '#id_viewer') || await frame.$('canvas'); const box = await canvas.boundingBox();
	const atOpen = fonts.length; const t1 = Date.now();
	await frame.evaluate(() => { window.__errs = []; (window.editor || Asc.editor).asc_registerCallback('asc_onError', (id, l) => window.__errs.push('asc_onError ' + id)); });
	if (isCell) {
		await page.mouse.click(box.x + 120, box.y + 80); await page.waitForTimeout(300);
		await page.keyboard.type('Negrito tardio', { delay: 40 }); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowUp');
		await page.keyboard.press('Control+b'); await page.waitForTimeout(300); await page.keyboard.press('Control+i');
	} else {
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300);
		await page.keyboard.type(' negrito tardio', { delay: 40 });
		await page.keyboard.press('Control+a'); await page.keyboard.press('Control+b'); await page.waitForTimeout(300); await page.keyboard.press('Control+i');
	}
	await page.waitForTimeout(4000);
	const later = fonts.filter((f) => f.at > t1);
	const errs = await frame.evaluate(() => window.__errs);
	const state = await frame.evaluate(() => { const e = window.editor || Asc.editor; if (e.wb) { const ws = e.wb.getWorksheet(); const c = ws.model.getRange2 ? ws.model.getRange2('B3') : null; return c ? { B3: c.getValueWithFormat(), bold: c.getBold && c.getBold() } : 'n/a'; } return 'presentation'; });
	console.log(`${path.basename(FILE)}: fonts at open ${atOpen} files; after bold/italic ${later.length} more: ${later.map((f) => f.url).join(', ') || 'none'}; editor errors ${JSON.stringify(errs)}; page errors ${errors.length}; state ${JSON.stringify(state)}`);
	for (const e of errors.slice(0, 4)) console.log('  ' + e);
	await page.screenshot({ path: path.join(__dirname, 'late-style-' + path.basename(FILE) + '.png') });
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
