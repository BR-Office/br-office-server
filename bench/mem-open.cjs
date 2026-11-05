// SPDX-License-Identifier: AGPL-3.0-only
// Memory of an open: in the browser, the editor tab's JavaScript heap (used / allocated) and the renderer process
// (RSS) at the paint and after 10 s idle; on the server, the peak RSS of the converter (x2t) and of DocService
// while the document opens, sampled every 40 ms. One line per file.
// Usage: node mem-open.cjs <base> <file> [<file> ...]
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process'); const { chromium } = require('playwright');
const [BASE, ...FILES] = process.argv.slice(2);
const MB = (b) => (b / 1048576).toFixed(0);
function ps() { // rss in KB by process
	const out = execSync("ps -eo pid,rss,comm,args --no-headers", { encoding: 'utf8' });
	const r = { x2t: 0, docservice: 0, converter: 0, renderer: 0, renderers: [] };
	for (const line of out.split('\n')) {
		const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/); if (!m) continue; const rss = +m[2], comm = m[3], args = m[4];
		if (comm === 'x2t') r.x2t = Math.max(r.x2t, rss);
		else if (/DocService\/docservice/.test(args)) r.docservice = Math.max(r.docservice, rss);
		else if (/FileConverter\/converter/.test(args)) r.converter = Math.max(r.converter, rss);
		else if (/--type=renderer/.test(args)) r.renderers.push(rss);
	}
	r.renderer = r.renderers.length ? Math.max(...r.renderers) : 0; return r;
}
(async () => {
	const browser = await chromium.launch({ args: ['--ignore-certificate-errors-spki-list=' + execSync('openssl x509 -in ' + (process.env.BENCH_CERT || '/etc/nginx/bench-ssl/cert.pem') + ' -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64').toString().trim(), '--enable-precise-memory-info'] });
	console.log('file                         | browser: JS heap used/allocated at paint, after 10 s idle; tab process RSS at paint, idle | server: x2t peak, DocService peak during the open (idle before)');
	for (const FILE of FILES) {
		const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
		const base = ps();
		await page.goto(BASE + '/example/');
		const name = await page.evaluate(async ([b64, fname]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname)); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
		const peak = { x2t: 0, docservice: 0, converter: 0 }; let sampling = true;
		const sampler = (async () => { while (sampling) { const s = ps(); peak.x2t = Math.max(peak.x2t, s.x2t); peak.docservice = Math.max(peak.docservice, s.docservice); peak.converter = Math.max(peak.converter, s.converter); await new Promise((r) => setTimeout(r, 40)); } })();
		await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
		let frame; for (let i = 0; i < 1200; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (frame && await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); }).catch(() => false)) break; await page.waitForTimeout(50); }
		await frame.evaluate(() => new Promise((res) => { const t = () => { const e = window.editor || Asc.editor; const d = e.WordControl && e.WordControl.m_oLogicDocument; if (d && d.FullRecalc && d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
		const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
		const heap = async () => { const { metrics } = await cdp.send('Performance.getMetrics'); const g = (n) => (metrics.find((m) => m.name === n) || {}).value || 0; return { used: g('JSHeapUsedSize'), total: g('JSHeapTotalSize') }; };
		const h1 = await heap(); const p1 = ps();
		await page.waitForTimeout(10000);
		sampling = false; await sampler;
		const h2 = await heap(); const p2 = ps();
		console.log(`${path.basename(FILE).padEnd(28)} | heap ${MB(h1.used)}/${MB(h1.total)} MB, idle ${MB(h2.used)}/${MB(h2.total)} MB; tab RSS ${(p1.renderer / 1024).toFixed(0)} MB, idle ${(p2.renderer / 1024).toFixed(0)} MB | x2t peak ${(peak.x2t / 1024).toFixed(0)} MB, DocService ${(peak.docservice / 1024).toFixed(0)} MB (idle ${(base.docservice / 1024).toFixed(0)} MB), converter service ${(peak.converter / 1024).toFixed(0)} MB`);
		await ctx.close();
	}
	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
