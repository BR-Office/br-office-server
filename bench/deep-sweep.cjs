// SPDX-License-Identifier: AGPL-3.0-only
// Deep quality sweep on one text document: two users editing the same file, a comment, track changes, an inserted
// image, a print to PDF, a save and a reopen. Edits go through the real paths (key events and the public asc_* API,
// never the document's internal methods, which skip the history point and corrupt co-editing). Each step reports
// what went wrong (modal windows, uncaught errors, console errors, failed requests, editor errors) and whether the
// other user saw the change.
// Usage: node deep-sweep.cjs <base> <docx>
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
	for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await page.waitForTimeout(50); }
	await frame.evaluate(() => new Promise((res) => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
	await page.waitForTimeout(1500);
	await frame.evaluate(() => { window.__errs = []; window.__comments = 0; editor.asc_registerCallback('asc_onError', (id, level) => window.__errs.push('asc_onError ' + id + ' level ' + level)); editor.asc_registerCallback('asc_onAddComment', () => window.__comments++); });
	const canvas = await frame.$('#id_viewer') || await frame.$('canvas'); const box = await canvas.boundingBox();
	await page.mouse.click(box.x + box.width / 2, box.y + 200); await page.waitForTimeout(300);
	return { ctx, page, frame, label };
}
const modals = (frame) => frame.evaluate(() => [...document.querySelectorAll('.asc-window')].filter((w) => getComputedStyle(w).display !== 'none' && w.offsetParent !== null).map((w) => w.innerText.replace(/\s+/g, ' ').slice(0, 200)));
const firstText = (frame) => frame.evaluate(() => { const p = editor.WordControl.m_oLogicDocument.Content[0]; return p && p.GetText ? p.GetText({ ParaEndToSpace: false }).slice(0, 80) : ''; });
const lastText = (frame) => frame.evaluate(() => { const c = editor.WordControl.m_oLogicDocument.Content; const p = c[c.length - 1]; return p && p.GetText ? p.GetText({ ParaEndToSpace: false }).slice(0, 80) : ''; });
const comments = (frame) => frame.evaluate(() => { const cm = editor.WordControl.m_oLogicDocument.Comments; const all = cm.GetAllComments ? cm.GetAllComments() : (cm.Get_AllComments ? cm.Get_AllComments() : null); return all ? (Array.isArray(all) ? all.length : Object.keys(all).length) : window.__comments; });
const commentEvents = (frame) => frame.evaluate(() => window.__comments);
const drawings = (frame) => frame.evaluate(() => editor.WordControl.m_oLogicDocument.GetAllDrawingObjects().length);
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
	// 1. A types at the start (keys), B sees it
	await A.page.keyboard.press('Control+Home'); await A.page.keyboard.type('COEDICAO ', { delay: 50 });
	report('A types at the start, B sees it', (await until(async () => (await firstText(B.frame)).startsWith('COEDICAO'))) ? 'yes' : 'NO');
	// 2. B adds a paragraph at the end (keys), A sees it
	await B.page.keyboard.press('Control+End'); await B.page.keyboard.press('Enter'); await B.page.keyboard.type('Resposta de B', { delay: 50 });
	report('B types at the end, A sees it', (await until(async () => /Resposta de B/.test(await lastText(A.frame)))) ? 'yes' : 'NO');
	// 3. A comments the first word, B sees the comment
	await A.page.keyboard.press('Control+Home'); await A.page.keyboard.press('Shift+End');
	const cA = await A.frame.evaluate(() => { try { const c = new Asc.asc_CCommentDataWord(); c.asc_putText('Comentario de teste'); c.asc_putUserName('uA'); c.asc_putTime(Date.now().toString()); editor.asc_addComment(c); return 'ok'; } catch (e) { return 'ERROR ' + e.message; } });
	const cSeen = await until(async () => (await commentEvents(B.frame)) > 0, 60);
	report('A comments, B sees the comment', `${cA}; asc_onAddComment in A ${await commentEvents(A.frame)}, in B ${await commentEvents(B.frame)}${cSeen ? '' : ' (NOT seen in 6 s)'}; comments in document (B) ${await comments(B.frame)}`);
	// 4. A turns on track changes and types; B has a revision; A accepts all
	await A.frame.evaluate(() => editor.asc_SetTrackRevisions(true));
	await A.page.keyboard.press('Control+End'); await A.page.keyboard.type(' revisado', { delay: 50 });
	const revB = await until(async () => B.frame.evaluate(() => { const m = editor.WordControl.m_oLogicDocument.TrackRevisionsManager; return m && m.Have_Changes ? m.Have_Changes() : false; }), 60);
	const acc = await A.frame.evaluate(() => { try { editor.asc_AcceptAllChanges(); editor.asc_SetTrackRevisions(false); return 'ok'; } catch (e) { return 'ERROR ' + e.message; } });
	report('A tracks a change, B sees revision', `${revB ? 'yes' : 'NO'}; accept all: ${acc}`);
	// 5. A inserts an image (1x1 png as a data url), B sees a drawing
	const d0 = await drawings(B.frame);
	const img = await A.frame.evaluate(() => { try { editor.AddImageUrl(['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']); return 'ok'; } catch (e) { return 'ERROR ' + e.message; } });
	const imgSeen = await until(async () => (await drawings(B.frame)) > d0, 80);
	report('A inserts an image, B sees it', `${img}; drawings A ${await drawings(A.frame)}, B ${await drawings(B.frame)} (was ${d0})${imgSeen ? '' : ' NOT propagated in 8 s'}`);
	// 6. print to PDF from A
	const pr = await A.frame.evaluate(() => new Promise((res) => { let done = false; const f = (r) => { if (!done) { done = true; res(r); } }; const t0 = performance.now(); editor.asc_registerCallback('asc_onPrintUrl', (url) => f({ url, ms: Math.round(performance.now() - t0) })); setTimeout(() => f({ error: 'timeout 40 s' }), 40000); try { editor.asc_Print(new Asc.asc_CDownloadOptions(null, true)); } catch (e) { f({ error: 'throw ' + e.message }); } }));
	if (pr.url) { const r = await fetcher.get(pr.url); const b = await r.body(); pr.status = r.status(); pr.kb = Math.round(b.length / 1024); pr.pdf = b.slice(0, 4).toString('latin1') === '%PDF'; }
	report('A prints to PDF', pr.error ? pr.error : `${pr.status}, pdf ${pr.pdf}, ${pr.kb} KB in ${pr.ms} ms`);
	// 7. save, both leave, C reopens
	await A.frame.evaluate(() => editor.asc_Save(false)); await A.page.waitForTimeout(3000);
	const mA = await modals(A.frame), mB = await modals(B.frame), eA = await errs(A.frame), eB = await errs(B.frame);
	await A.ctx.close(); await B.ctx.close();
	await new Promise((r) => setTimeout(r, 5000));
	const C = await openEditor(browser, name, 'uC', log);
	report('C reopens after both left', `first "${(await firstText(C.frame)).slice(0, 18)}", last "${(await lastText(C.frame)).slice(0, 24)}", comments ${await comments(C.frame)}, drawings ${await drawings(C.frame)}, modals ${(await modals(C.frame)).length}`);
	for (const m of await modals(C.frame)) console.log(`  C modal: ${m}`);
	await C.ctx.close();
	console.log(`\nmodals A ${mA.length} B ${mB.length}; editor errors A ${JSON.stringify(eA)} B ${JSON.stringify(eB)}`);
	for (const m of [...mA, ...mB]) console.log(`  modal: ${m}`);
	console.log(`browser log entries: ${log.length}`); for (const l of [...new Set(log)].slice(0, 12)) console.log(`  ${l}`);
	await fetcher.dispose(); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
