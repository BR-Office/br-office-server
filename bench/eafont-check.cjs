// SPDX-License-Identifier: AGPL-3.0-only
// Functional check of script-aware font loading: open the real document (no Korean text, a Korean font named in
// its styles) and list the font files loaded; then type a Korean syllable and see the Korean font arrive.
// Usage: node eafont-check.cjs <base> <docx>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block', ignoreHTTPSErrors: true });
	const page = await ctx.newPage();
	const errors = []; const fontReqs = [];
	page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
	page.on('requestfinished', (r) => { if (/\/fonts\//.test(r.url())) fontReqs.push({ id: r.url().split('/').pop().split('?')[0], at: Date.now() }); });
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
	let frame; for (let i = 0; i < 2400; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	await page.waitForTimeout(1500);
	const names = await frame.evaluate((ids) => { const F = AscFonts.g_font_files, I = AscFonts.g_font_infos; return ids.map((id) => { const i = F.findIndex((f) => f.Id === id); const r = I.find((x) => [x.indexR, x.indexI, x.indexB, x.indexBI].includes(i)); return r ? r.Name : id; }); }, fontReqs.map((r) => r.id));
	const atOpen = fontReqs.length;
	console.log(`font files at open: ${atOpen}`); console.log('  ' + [...new Set(names)].join(', '));
	const pagesBefore = await frame.evaluate(() => editor.WordControl.m_oLogicDocument.GetPagesCount());
	const docFonts = await frame.evaluate(() => editor.WordControl.m_oLogicDocument.Fonts.map((f) => f.name));
	console.log('document font list:', docFonts.join(', '));
	// type a Korean syllable at the start of the document
	const t0 = Date.now();
	await frame.evaluate(() => { const d = editor.WordControl.m_oLogicDocument; d.MoveCursorToStartPos(false); d.EnterText('한글'); });
	await page.waitForTimeout(4000);
	const after = fontReqs.slice(atOpen);
	const namesAfter = await frame.evaluate((ids) => { const F = AscFonts.g_font_files, I = AscFonts.g_font_infos; return ids.map((id) => { const i = F.findIndex((f) => f.Id === id); const r = I.find((x) => [x.indexR, x.indexI, x.indexB, x.indexBI].includes(i)); return r ? r.Name : id; }); }, after.map((r) => r.id));
	const text = await frame.evaluate(() => editor.WordControl.m_oLogicDocument.Content[0].GetText({ ParaEndToSpace: false }).slice(0, 12));
	const pagesAfter = await frame.evaluate(() => editor.WordControl.m_oLogicDocument.GetPagesCount());
	console.log(`after typing Korean: fonts fetched: ${after.map((r, i) => namesAfter[i] + ' (+' + (r.at - t0) + ' ms)').join(', ') || 'none'}`);
	console.log(`first paragraph now starts with: ${JSON.stringify(text)} | pages ${pagesBefore} -> ${pagesAfter} | page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
