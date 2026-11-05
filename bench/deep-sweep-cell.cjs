// SPDX-License-Identifier: AGPL-3.0-only
// Deep quality sweep for the spreadsheet editor: two users on the same workbook through real key events, a
// formula, co-editing in both directions, an export to PDF and XLSX, save, and a third user reopening.
// Usage: node deep-sweep-cell.cjs <base> <xlsx>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
const NOISE = /docserviceworker|Service Worker registration|responded with a status of 404|ERR_ABORTED/;
async function openEditor(browser, name, label, log) {
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => log.push(`${label} uncaught: ` + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
	page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) log.push(`${label} ${m.type()}: ` + m.text().replace(/\s+/g, ' ').slice(0, 300)); });
	page.on('requestfailed', (r) => { if (!NOISE.test(r.url()) && !NOISE.test((r.failure() || {}).errorText || '')) log.push(`${label} failed: ` + r.url().slice(0, 160)); });
	await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name) + '&userid=' + label + '&name=' + label, { waitUntil: 'domcontentloaded' });
	let frame;
	for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => { const e = window.Asc && Asc.editor; return !!(e && e.isDocumentLoadComplete); }).catch(() => false)) break; await page.waitForTimeout(50); }
	await page.waitForTimeout(3000);
	await frame.evaluate(() => { window.__errs = []; Asc.editor.asc_registerCallback('asc_onError', (id, level) => window.__errs.push('asc_onError ' + id + ' level ' + level)); });
	const canvas = await frame.$('#ws-canvas') || await frame.$('canvas'); const box = await canvas.boundingBox();
	await page.mouse.click(box.x + 100, box.y + 60); await page.waitForTimeout(300);
	return { ctx, page, frame, label, box };
}
const modals = (frame) => frame.evaluate(() => [...document.querySelectorAll('.asc-window')].filter((w) => getComputedStyle(w).display !== 'none' && w.offsetParent !== null).map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 200)));
const cell = (frame, ref) => frame.evaluate((ref) => { const ws = Asc.editor.wbModel.getWorksheet(0); const r = ws.getRange2(ref); return r ? r.getValueWithFormat() : null; }, ref);
const errs = (frame) => frame.evaluate(() => window.__errs);
async function until(fn, tries = 100) { for (let i = 0; i < tries; i++) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; }
async function typeIn(user, ref, text) { await user.page.keyboard.press('Control+Home'); await user.frame.evaluate((ref) => { Asc.editor.wb.getWorksheet().setSelection(Asc.editor.wbModel.getWorksheet(0).getRange2(ref).bbox); }, ref).catch(() => {}); await user.page.keyboard.type(text, { delay: 40 }); await user.page.keyboard.press('Enter'); }
(async () => {
	const fetcher = await require('playwright').request.newContext({ ignoreHTTPSErrors: true });
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const log = [];
	const up = await browser.newPage(); await up.goto(BASE + '/example/');
	const name = await up.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await up.close();
	const A = await openEditor(browser, name, 'uA', log); const B = await openEditor(browser, name, 'uB', log);
	const report = (step, extra) => console.log(`${step.padEnd(36)} ${extra}`);
	// 1. A writes a formula in Z1 (keys: Ctrl+Home then navigate is slow; select via api, type via keys)
	await A.frame.evaluate(() => { const ws = Asc.editor.wb.getWorksheet(); ws.setSelection(Asc.editor.wbModel.getWorksheet(0).getRange2('Z1').bbox); });
	await A.page.keyboard.type('=1+2', { delay: 40 }); await A.page.keyboard.press('Enter');
	report('A types =1+2 in Z1, A sees 3', (await until(async () => (await cell(A.frame, 'Z1')) === '3')) ? 'yes' : `NO (${await cell(A.frame, 'Z1')})`);
	report('B sees Z1 = 3', (await until(async () => (await cell(B.frame, 'Z1')) === '3')) ? 'yes' : `NO (${await cell(B.frame, 'Z1')})`);
	// 2. B writes text in Z2, A sees it
	await B.frame.evaluate(() => { const ws = Asc.editor.wb.getWorksheet(); ws.setSelection(Asc.editor.wbModel.getWorksheet(0).getRange2('Z2').bbox); });
	await B.page.keyboard.type('resposta de B', { delay: 40 }); await B.page.keyboard.press('Enter');
	report('B types in Z2, A sees it', (await until(async () => (await cell(A.frame, 'Z2')) === 'resposta de B')) ? 'yes' : `NO (${await cell(A.frame, 'Z2')})`);
	// 3. A adds a sheet, B sees the new sheet
	const sheets0 = await B.frame.evaluate(() => Asc.editor.wbModel.getWorksheetCount());
	const add = await A.frame.evaluate(() => { try { Asc.editor.asc_addWorksheet('Folha teste'); return 'ok'; } catch (e) { return 'ERROR ' + e.message; } });
	report('A adds a sheet, B sees it', `${add}; ${(await until(async () => (await B.frame.evaluate(() => Asc.editor.wbModel.getWorksheetCount())) > sheets0)) ? 'yes' : 'NO'}`);
	// 4. export from A
	for (const fmt of ['PDF', 'XLSX']) {
		const r = await A.frame.evaluate(async (fmt) => new Promise((res) => { const e = Asc.editor; let done = false; const f = (x) => { if (!done) { done = true; res(x); } }; const t0 = performance.now(); const onUrl = (url) => { e.asc_unregisterCallback('asc_onDownloadUrl', onUrl); f({ url, ms: Math.round(performance.now() - t0) }); }; e.asc_registerCallback('asc_onDownloadUrl', onUrl); setTimeout(() => f({ error: 'timeout 40 s' }), 40000); try { e.asc_DownloadAs(new Asc.asc_CDownloadOptions(Asc.c_oAscFileType[fmt], true)); } catch (x) { f({ error: 'throw ' + x.message }); } }), fmt);
		if (r.url) { const resp = await fetcher.get(r.url); const b = await resp.body(); r.status = resp.status(); r.kb = Math.round(b.length / 1024); r.sig = b.slice(0, 4).toString('latin1').startsWith('%PDF') ? 'pdf' : b.slice(0, 2).toString('latin1') === 'PK' ? 'zip' : '?'; }
		report(`A exports ${fmt}`, r.error ? r.error : `${r.status} ${r.sig} ${r.kb} KB in ${r.ms} ms`);
	}
	// 5. save, both leave, C reopens
	await A.frame.evaluate(() => Asc.editor.asc_Save(false)); await A.page.waitForTimeout(3000);
	const mA = await modals(A.frame), mB = await modals(B.frame), eA = await errs(A.frame), eB = await errs(B.frame);
	await A.ctx.close(); await B.ctx.close();
	await new Promise((r) => setTimeout(r, 5000));
	const C = await openEditor(browser, name, 'uC', log);
	report('C reopens after both left', `Z1 ${JSON.stringify(await cell(C.frame, 'Z1'))}, Z2 ${JSON.stringify(await cell(C.frame, 'Z2'))}, sheets ${await C.frame.evaluate(() => Asc.editor.wbModel.getWorksheetCount())} (was ${sheets0}), modals ${(await modals(C.frame)).length}`);
	for (const m of await modals(C.frame)) console.log(`  C modal: ${m}`);
	await C.ctx.close();
	console.log(`\nmodals A ${mA.length} B ${mB.length}; editor errors A ${JSON.stringify(eA)} B ${JSON.stringify(eB)}`);
	for (const m of [...mA, ...mB]) console.log(`  modal: ${m}`);
	console.log(`browser log entries: ${log.length}`); for (const l of [...new Set(log)].slice(0, 12)) console.log(`  ${l}`);
	await fetcher.dispose(); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
