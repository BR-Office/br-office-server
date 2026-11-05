// SPDX-License-Identifier: AGPL-3.0-only
// Quality sweep: open each file through the example in its editor, do a few edits where the editor is a text
// document, and report what the user would see go wrong: modal windows, uncaught errors, console errors and
// failed requests. One line per file; details below it.
// Usage: node sweep.cjs <base> <file> [<file> ...]
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, ...FILES] = process.argv.slice(2);
const NOISE = /docserviceworker|Service Worker registration|responded with a status of 404|ERR_ABORTED/;
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	for (const FILE of FILES) {
		const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
		const page = await ctx.newPage();
		const errors = [], failed = [];
		page.on('pageerror', (e) => errors.push('uncaught: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
		page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errors.push(m.type() + ': ' + m.text().replace(/\s+/g, ' ').slice(0, 400)); });
		page.on('requestfailed', (r) => { if (!NOISE.test(r.url()) && !NOISE.test((r.failure() || {}).errorText || '')) failed.push(r.url().replace(/^.*\/(sdkjs|web-apps)\//, '$1/').slice(0, 160) + ' ' + (r.failure() || {}).errorText); });
		const t0 = Date.now(); let name, loaded = false, info = {};
		try {
			await page.goto(BASE + '/example/');
			name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
			await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
			let frame;
			for (let i = 0; i < 1200; i++) {
				frame = page.frames().find((x) => x.name() === 'frameEditor');
				if (frame && await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); }).catch(() => false)) { loaded = true; break; }
				await page.waitForTimeout(50);
			}
			await page.waitForTimeout(4000);
			if (frame) {
				info = await frame.evaluate(() => {
					const e = window.editor || (window.Asc && Asc.editor);
					const out = { app: location.pathname.replace(/^.*\/web-apps\/apps\//, '').replace(/\/main.*$/, ''), modals: [...document.querySelectorAll('.asc-window')].filter((w) => getComputedStyle(w).display !== 'none' && w.offsetParent !== null).map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 220)) };
					if (e && e.WordControl && e.WordControl.m_oLogicDocument && e.WordControl.m_oLogicDocument.Pages) out.pages = e.WordControl.m_oLogicDocument.Pages.length;
					return out;
				});
				const isWord = /documenteditor/.test(info.app || '');
				if (loaded && isWord && info.pages) {
					info.edit = await frame.evaluate(() => { try { const e = window.editor; const d = e.WordControl.m_oLogicDocument; d.MoveCursorToStartPos(false); d.EnterText('Teste. '); d.SelectAll(); e.put_TextPrBold(true); e.Undo(); e.Undo(); return 'ok'; } catch (x) { return 'ERROR ' + x.message; } });
					await page.waitForTimeout(800);
					info.modalsAfterEdit = await frame.evaluate(() => [...document.querySelectorAll('.asc-window')].filter((w) => getComputedStyle(w).display !== 'none' && w.offsetParent !== null).map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 220)));
				}
			}
		} catch (e) { errors.push('script: ' + e.message.split('\n')[0]); }
		const uniq = [...new Set(errors)];
		const bad = (info.modals && info.modals.length) || (info.modalsAfterEdit && info.modalsAfterEdit.length) || uniq.some((x) => /^uncaught|^error/.test(x)) || failed.length || !loaded;
		console.log(`${bad ? 'CHECK ' : 'ok    '} ${path.basename(FILE).padEnd(22)} ${(info.app || '?').padEnd(20)} loaded ${loaded ? ((Date.now() - t0) / 1000).toFixed(1) + ' s' : 'NO'}${info.pages ? ', ' + info.pages + ' pages' : ''}${info.edit ? ', edit ' + info.edit : ''}; modals ${(info.modals || []).length}${info.modalsAfterEdit && info.modalsAfterEdit.length ? ' (+' + info.modalsAfterEdit.length + ' after edit)' : ''}; console ${uniq.length}; failed requests ${failed.length}`);
		for (const m of (info.modals || [])) console.log(`        modal: ${m}`);
		for (const m of (info.modalsAfterEdit || [])) console.log(`        modal after edit: ${m}`);
		for (const e of uniq.slice(0, 6)) console.log(`        ${e}`);
		for (const f of failed.slice(0, 4)) console.log(`        failed: ${f}`);
		await ctx.close();
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
