// SPDX-License-Identifier: AGPL-3.0-only
// How long does the editor shell take on its own? Open the same document twice in one browser: the second open has
// every script and font in the browser cache, so goto -> loadDoc is the shell's boot (app.js, UI, DocInfo) plus the
// sdk's evaluation, with no download in the way. Marks are polled from the editor frame every 20 ms.
// Usage: node warm-open.cjs <base> <docx> [net]
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE, NET = 'home'] = process.argv.slice(2);
const NETS = { home: { latency: 30, downloadThroughput: 50e6 / 8, uploadThroughput: 10e6 / 8 }, slow: { latency: 60, downloadThroughput: 10e6 / 8, uploadThroughput: 2e6 / 8 }, none: null };
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + require('child_process').execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim()] });
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
	const page = await ctx.newPage();
	const cdp = await ctx.newCDPSession(page);
	if (NETS[NET]) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] }); }
	await page.goto(BASE + '/example/');
	const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
	const url = BASE + '/example/editor?fileName=' + encodeURIComponent(name);
	async function open(label) {
		const t0 = Date.now(); const marks = {};
		await page.goto(url, { waitUntil: 'domcontentloaded' });
		for (let i = 0; i < 4000; i++) {
			const frame = page.frames().find((x) => x.name() === 'frameEditor');
			if (frame) {
				const st = await frame.evaluate(() => { const e = window.editor; if (!e) return null; return { full: !!e.isLoadFullApi, doc: !!(e.DocInfo), loaded: !!e.isDocumentLoadComplete, recalc: !!(e.WordControl && e.WordControl.m_oLogicDocument && e.WordControl.m_oLogicDocument.FullRecalc && e.WordControl.m_oLogicDocument.FullRecalc.Id == null && e.isDocumentLoadComplete) }; }).catch(() => null);
				if (st) { const now = Date.now() - t0; if (!marks.api) marks.api = now; if (st.full && !marks.sdkLoaded) marks.sdkLoaded = now; if (st.doc && !marks.docInfo) marks.docInfo = now; if (st.loaded && !marks.complete) marks.complete = now; if (st.recalc) { marks.layoutDone = now; break; } }
			}
			await page.waitForTimeout(20);
		}
		console.log(`${label}: ${JSON.stringify(marks)}  (ms after goto; api = editor object exists, sdkLoaded = sdk-all evaluated, docInfo = shell handed the document over, complete = isDocumentLoadComplete, layoutDone = all pages laid out)`);
	}
	await open('cold (empty cache)');
	await open('warm (same browser, cache full)');
	await open('warm again');
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
