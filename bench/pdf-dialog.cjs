// SPDX-License-Identifier: AGPL-3.0-only
// Open a file and report what the shell shows the user: modal windows, their text, and the error notifications.
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await page.waitForTimeout(4000);
	const info = await frame.evaluate(() => ({
		mode: (() => { try { const c = window.DE && DE.getController ? null : null; return c; } catch (e) { return null; } })(),
		modals: [...document.querySelectorAll('.asc-window')].filter((w) => w.offsetParent !== null || getComputedStyle(w).display !== 'none').map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 300)),
		toasts: [...document.querySelectorAll('.notification-center, .toast, .asc-loadmask-title, .msg-box')].map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 200)),
		title: document.title,
		tabs: [...document.querySelectorAll('#toolbar .tabs li, .toolbar .tabs li, section.tabs li')].map((l) => l.innerText.trim()).filter(Boolean).slice(0, 20),
		isPDFForm: !!(window.editor && editor.isPdfEditor && editor.isPdfEditor()),
	}));
	await page.screenshot({ path: path.join(__dirname, 'pdf-open.png') });
	console.log(JSON.stringify(info, null, 1));
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
