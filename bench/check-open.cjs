// SPDX-License-Identifier: AGPL-3.0-only
// Functional smoke check of the installed bundles: open a file in the example, wait for the first paint, do a few
// edits, and report page errors, console errors and failed requests. Works for .docx (documenteditor) and .pdf (pdfeditor).
// Usage: node check-open.cjs <base> <file> [--no-edit]
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, FLAG] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	const errors = [], failed = [], scripts = [];
	page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
	page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
	page.on('requestfailed', (r) => failed.push(r.url().replace(/^.*\/(sdkjs|web-apps)\//, '$1/') + ' ' + (r.failure() || {}).errorText));
	page.on('response', (r) => { const u = r.url(); if (/sdkjs\/.*\.js(\?|$)/.test(u) && !/\/fonts\//.test(u)) scripts.push(`${r.status()} ${u.replace(/^.*\/sdkjs\//, 'sdkjs/').replace(/\?.*$/, '')} ${r.headers()['content-length'] || ''}`); });
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	const t0 = Date.now();
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame, ok = false; for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) { ok = true; break; } await page.waitForTimeout(50); }
	if (!ok) { console.log('FAILED: document did not load in 60 s'); console.log(errors.join('\n')); await browser.close(); process.exit(2); }
	const info = await frame.evaluate(() => ({ isPdf: editor.isPdfEditor(), pages: editor.WordControl && editor.WordControl.m_oLogicDocument && editor.WordControl.m_oLogicDocument.Pages ? editor.WordControl.m_oLogicDocument.Pages.length : (editor.WordControl && editor.WordControl.m_oDrawingDocument && editor.WordControl.m_oDrawingDocument.m_lPagesCount), AscPDF: typeof AscPDF !== 'undefined' ? Object.keys(AscPDF).length : 0, hasPdfShape: !!(window.AscPDF && AscPDF.CPdfShape), hasBuilder: !!(window.AscBuilder && AscBuilder.Word && AscBuilder.Word.Api), hasCompare: !!(window.AscCommonWord && AscCommonWord.CompareBinary), hasWorkbook: !!(window.AscCommonExcel && AscCommonExcel.Workbook), hasJson: !!(window.AscJsonConverter && AscJsonConverter.WriterToJSON) }));
	if (!info.isPdf) await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	const painted = Date.now() - t0;
	let edit = 'skipped';
	if (FLAG !== '--no-edit' && !info.isPdf) {
		edit = await frame.evaluate(() => { try { const d = editor.WordControl.m_oLogicDocument; d.MoveCursorToStartPos(false); d.EnterText('Olá, mundo. '); d.SelectAll(); editor.put_TextPrBold(true); editor.Undo(); editor.asc_addComment && 0; d.AddNewParagraph(); editor.asc_AddTable && 0; const t = d.AddInlineTable(2, 2); editor.Undo(); editor.Undo(); const txt = d.GetSelectedText ? 'ok' : 'ok'; return 'ok'; } catch (e) { return 'ERROR ' + e.message; } });
		await page.waitForTimeout(500);
	}
	console.log(`loaded: painted ${painted} ms, ${JSON.stringify(info)}, edit: ${edit}`);
	console.log('sdk scripts: ' + scripts.join(' ; '));
	console.log(`errors: ${errors.length}` + (errors.length ? '\n  ' + [...new Set(errors)].slice(0, 20).join('\n  ') : ''));
	console.log(`failed requests: ${failed.length}` + (failed.length ? '\n  ' + failed.slice(0, 10).join('\n  ') : ''));
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
