// SPDX-License-Identifier: AGPL-3.0-only
// Save/export sweep: open each file in its editor, ask the editor to export it in the given formats (the server
// converts with x2t), fetch each result and report status, size and time, plus any asc_onError the editor raises.
// Usage: node roundtrip.cjs <base> <file>[:fmt,fmt] ...   formats: pdf docx xlsx pptx odt ods odp txt csv png
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, ...SPECS] = process.argv.slice(2);
(async () => {
	const fetcher = await require('playwright').request.newContext({ ignoreHTTPSErrors: true }); // fetches the converted files (the local certificate is self-signed)
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	for (const spec of SPECS) {
		const [FILE, fmts] = spec.split(':'); const formats = (fmts || 'pdf').split(',');
		const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
		const page = await ctx.newPage(); const errors = [];
		page.on('pageerror', (e) => errors.push('uncaught: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
		await page.goto(BASE + '/example/');
		const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
		await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
		let frame, loaded = false;
		for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); }).catch(() => false)) { loaded = true; break; } await page.waitForTimeout(50); }
		if (!loaded) { console.log(`CHECK  ${path.basename(FILE)}: did not load`); await ctx.close(); continue; }
		await page.waitForTimeout(2500);
		const results = [];
		for (const fmt of formats) {
			const r = await frame.evaluate(async (fmt) => {
				const e = window.editor || Asc.editor; const t0 = performance.now();
				const type = Asc.c_oAscFileType[fmt.toUpperCase()];
				if (type === undefined) return { fmt, error: 'unknown format' };
				return await new Promise((resolve) => {
					let done = false; const finish = (r) => { if (!done) { done = true; resolve(Object.assign({ fmt, ms: Math.round(performance.now() - t0) }, r)); } };
					const onUrl = (url, fileType) => { e.asc_unregisterCallback('asc_onDownloadUrl', onUrl); e.asc_unregisterCallback('asc_onError', onErr); finish({ url, fileType }); };
					const onErr = (id, level) => { e.asc_unregisterCallback('asc_onDownloadUrl', onUrl); e.asc_unregisterCallback('asc_onError', onErr); finish({ error: 'asc_onError ' + id + ' level ' + level }); };
					e.asc_registerCallback('asc_onDownloadUrl', onUrl); e.asc_registerCallback('asc_onError', onErr);
					setTimeout(() => finish({ error: 'timeout 40 s' }), 40000);
					// isDownloadEvent = true: the editor reports the url through asc_onDownloadUrl instead of starting a browser download
					try { e.asc_DownloadAs(new Asc.asc_CDownloadOptions(type, true)); } catch (x) { finish({ error: 'throw ' + x.message }); }
				});
			}, fmt);
			if (r.url) {
				try { const resp = await fetcher.get(r.url); const body = await resp.body(); r.status = resp.status(); r.bytes = body.length; const magic = body.slice(0, 4).toString('latin1'); r.magic = magic.startsWith('%PDF') ? 'pdf' : magic.startsWith('PK') ? 'zip' : JSON.stringify(magic); } catch (x) { r.error = 'fetch ' + x.message; }
			}
			results.push(r);
		}
		const bad = results.some((r) => r.error || r.status !== 200 || !r.bytes) || errors.length;
		console.log(`${bad ? 'CHECK ' : 'ok    '} ${path.basename(FILE).padEnd(22)} ` + results.map((r) => `${r.fmt}: ${r.error ? r.error : r.status + ' ' + r.magic + ' ' + (r.bytes / 1024).toFixed(0) + ' KB in ' + r.ms + ' ms'}`).join(' | '));
		for (const e of [...new Set(errors)].slice(0, 4)) console.log(`        ${e}`);
		await ctx.close();
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
