// SPDX-License-Identifier: AGPL-3.0-only
// Deep quality sweep for the presentation editor: two users on the same deck through real key events and the
// public API: A adds a slide and types a title, B sees it; B types on another slide, A sees it; export to PDF and
// PPTX; save; a third user reopens.
// Usage: node deep-sweep-slide.cjs <base> <pptx>
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
	for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); }).catch(() => false)) break; await page.waitForTimeout(50); }
	await page.waitForTimeout(3000);
	await frame.evaluate(() => { window.__errs = []; editor.asc_registerCallback('asc_onError', (id, level) => window.__errs.push('asc_onError ' + id + ' level ' + level)); });
	const canvas = await frame.$('#id_viewer') || await frame.$('canvas'); const box = await canvas.boundingBox();
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300);
	return { ctx, page, frame, label, box };
}
const modals = (frame) => frame.evaluate(() => [...document.querySelectorAll('.asc-window')].filter((w) => getComputedStyle(w).display !== 'none' && w.offsetParent !== null).map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 200)));
const slides = (frame) => frame.evaluate(() => editor.WordControl.m_oLogicDocument.Slides.length);
const findText = (frame, re) => frame.evaluate((re) => { const d = editor.WordControl.m_oLogicDocument; const rx = new RegExp(re); const hits = []; d.Slides.forEach((s, i) => { for (const sp of s.cSld.spTree) { const c = sp.getDocContent && sp.getDocContent(); const t = c && c.GetText ? c.GetText({ ParaEndToSpace: false }) : ''; if (rx.test(t)) hits.push(i); } }); return hits; }, re);
const slideText = (frame, i) => frame.evaluate((i) => { const s = editor.WordControl.m_oLogicDocument.Slides[i]; if (!s) return null; let t = ''; for (const sp of s.cSld.spTree) { if (sp.txBody && sp.txBody.content) t += sp.txBody.content.GetText ? sp.txBody.content.GetText({ ParaEndToSpace: false }) : (sp.getDocContent && sp.getDocContent() ? sp.getDocContent().GetText({ ParaEndToSpace: false }) : ''); t += ' '; } return t.replace(/\s+/g, ' ').trim().slice(0, 80); }, i);
const errs = (frame) => frame.evaluate(() => window.__errs);
async function until(fn, tries = 100) { for (let i = 0; i < tries; i++) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; }
(async () => {
	const fetcher = await require('playwright').request.newContext({ ignoreHTTPSErrors: true });
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const log = [];
	const up = await browser.newPage(); await up.goto(BASE + '/example/');
	const name = await up.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	await up.close();
	const A = await openEditor(browser, name, 'uA', log); const B = await openEditor(browser, name, 'uB', log);
	const report = (step, extra) => console.log(`${step.padEnd(36)} ${extra}`);
	const n0 = await slides(B.frame);
	// 1. A adds a slide (public API) and types into its title placeholder (keys after selecting it via the API)
	const add = await A.frame.evaluate(() => { try { editor.AddSlide(); return 'ok'; } catch (e) { return 'ERROR ' + e.message; } });
	report('A adds a slide, B sees it', `${add}; slides A ${await slides(A.frame)}, B ${(await until(async () => (await slides(B.frame)) > n0)) ? await slides(B.frame) : 'NO change'} (was ${n0})`);
	const cur = await A.frame.evaluate(() => editor.WordControl.m_oLogicDocument.CurPage);
	await A.frame.evaluate(() => { const d = editor.WordControl.m_oLogicDocument; const s = d.Slides[d.CurPage]; const sp = s.cSld.spTree.find((x) => x.txBody || x.getDocContent); if (sp) { d.Select_DrawingObject ? d.Select_DrawingObject(sp.Get_Id()) : null; } });
	await A.page.keyboard.type('Titulo de A', { delay: 50 });
	report('A types a title, B sees it', (await until(async () => /Titulo de A/.test(await slideText(B.frame, cur) || ''), 80)) ? 'yes' : `NO (B slide ${cur}: "${await slideText(B.frame, cur)}", A: "${await slideText(A.frame, cur)}")`);
	// 2. B types on the first slide's first text shape, A sees it
	// B: go to the first slide (keys), select all shapes' text by clicking the slide centre, then type
	await B.page.keyboard.press('Control+Home'); await B.page.waitForTimeout(300);
	await B.page.mouse.click(B.box.x + B.box.width / 2, B.box.y + B.box.height / 2); await B.page.waitForTimeout(300);
	await B.page.keyboard.type(' resposta de B', { delay: 50 });
	const inB = await findText(B.frame, 'resposta de B');
	const seenA = await until(async () => (await findText(A.frame, 'resposta de B')).length > 0, 80);
	report('B types on slide 1, A sees it', `B's text landed on slides ${JSON.stringify(inB)} in B; ${seenA ? 'A sees it on ' + JSON.stringify(await findText(A.frame, 'resposta de B')) : 'NOT seen by A'}`);
	// 3. export from A
	for (const fmt of ['PDF', 'PPTX']) {
		const r = await A.frame.evaluate(async (fmt) => new Promise((res) => { const e = editor; let done = false; const f = (x) => { if (!done) { done = true; res(x); } }; const t0 = performance.now(); const onUrl = (url) => { e.asc_unregisterCallback('asc_onDownloadUrl', onUrl); f({ url, ms: Math.round(performance.now() - t0) }); }; e.asc_registerCallback('asc_onDownloadUrl', onUrl); setTimeout(() => f({ error: 'timeout 40 s' }), 40000); try { e.asc_DownloadAs(new Asc.asc_CDownloadOptions(Asc.c_oAscFileType[fmt], true)); } catch (x) { f({ error: 'throw ' + x.message }); } }), fmt);
		if (r.url) { const resp = await fetcher.get(r.url); const b = await resp.body(); r.status = resp.status(); r.kb = Math.round(b.length / 1024); r.sig = b.slice(0, 4).toString('latin1').startsWith('%PDF') ? 'pdf' : b.slice(0, 2).toString('latin1') === 'PK' ? 'zip' : '?'; }
		report(`A exports ${fmt}`, r.error ? r.error : `${r.status} ${r.sig} ${r.kb} KB in ${r.ms} ms`);
	}
	// 4. save, both leave, C reopens
	await A.frame.evaluate(() => editor.asc_Save(false)); await A.page.waitForTimeout(3000);
	const mA = await modals(A.frame), mB = await modals(B.frame), eA = await errs(A.frame), eB = await errs(B.frame);
	await A.ctx.close(); await B.ctx.close();
	await new Promise((r) => setTimeout(r, 5000));
	const C = await openEditor(browser, name, 'uC', log);
	report('C reopens after both left', `slides ${await slides(C.frame)} (was ${n0}), B's text on slides ${JSON.stringify(await findText(C.frame, 'resposta de B'))}, new slide "${(await slideText(C.frame, cur) || '').slice(0, 30)}", modals ${(await modals(C.frame)).length}`);
	for (const m of await modals(C.frame)) console.log(`  C modal: ${m}`);
	await C.ctx.close();
	console.log(`\nmodals A ${mA.length} B ${mB.length}; editor errors A ${JSON.stringify(eA)} B ${JSON.stringify(eB)}`);
	for (const m of [...mA, ...mB]) console.log(`  modal: ${m}`);
	console.log(`browser log entries: ${log.length}`); for (const l of [...new Set(log)].slice(0, 12)) console.log(`  ${l}`);
	await fetcher.dispose(); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
