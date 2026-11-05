// SPDX-License-Identifier: AGPL-3.0-only
// Open a file and, after a long wait, report the editor's state: loaded or not, loading mask text, modals, asc_onError events, console errors.
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, WAIT = '90000'] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' }); const page = await ctx.newPage(); const log = [];
	page.on('pageerror', (e) => log.push('uncaught: ' + (e.stack || e.message).split('\n').slice(0, 5).join(' | ')));
	page.on('console', (m) => { if (m.type() === 'error' && !/docserviceworker|404/.test(m.text())) log.push('console: ' + m.text().slice(0, 300)); });
	page.on('response', (r) => { if (/Editor\.bin|\/doc\/|convert|downloadas|\/coauthoring\//.test(r.url()) && r.status() >= 400) log.push(`http ${r.status()} ${r.url().slice(0, 140)}`); });
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; const t0 = Date.now(); let loaded = false;
	while (Date.now() - t0 < +WAIT) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame) { try { await frame.evaluate(() => { if (!window.__errs && (window.editor || (window.Asc && Asc.editor))) { window.__errs = []; (window.editor || Asc.editor).asc_registerCallback('asc_onError', (id, level, d) => window.__errs.push('asc_onError ' + id + ' level ' + level)); } }); if (await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); })) { loaded = true; break; } } catch (e) {} } await page.waitForTimeout(250); }
	const st = frame ? await frame.evaluate(() => ({ errs: window.__errs || null, mask: [...document.querySelectorAll('.asc-loadmask, .asc-loadmask-title, #loading-mask')].map((m) => m.innerText.replace(/\s+/g, ' ').slice(0, 120)).filter(Boolean), modals: [...document.querySelectorAll('.asc-window')].filter((w) => getComputedStyle(w).display !== 'none' && w.offsetParent !== null).map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 200)), hasEditor: !!(window.editor || (window.Asc && Asc.editor)) })).catch((e) => ({ evalError: e.message })) : { noFrame: true };
	console.log(`${path.basename(FILE)}: loaded ${loaded} after ${((Date.now() - t0) / 1000).toFixed(1)} s; state ${JSON.stringify(st)}`); for (const l of [...new Set(log)].slice(0, 10)) console.log('  ' + l);
	await page.screenshot({ path: path.join(__dirname, 'open-state.png') });
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
