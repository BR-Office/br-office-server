#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
// Paired A/B bench of the "open a document" journey against a running Document Server.
//
// One run = what a user does: upload the file through the example (/example/upload, paying the uplink),
// open the editor page, wait until the document is fully rendered (editor.isDocumentLoadComplete, layout
// finished, two animation frames). Every run uses a new browser (cold HTTP cache: first open).
//
// Two sides, A and B, run interleaved per pair (A B, then B A, ...) so machine drift hits both alike.
// A side is defined by the knobs below; the result is the median of the per-pair differences (B - A),
// with the spread, so a gain is only claimed when it beats the noise of identical code.
//
// Usage:
//   node bench/open-journey-ab.cjs --file samples/aluno-moderno.docx --pairs 7 \
//        [--base http://127.0.0.1] [--net home|slow|fast|none] [--cpu 4] [--out results.json] \
//        [--a-block <regex>] [--b-block <regex>]            abort requests whose URL matches (e.g. the preloader)
//        [--a-serve <regex>=<localfile>] [--b-serve ...]    serve a local file for matching URLs (a built bundle)
//        [--a-cmd '<shell>'] [--b-cmd '<shell>']            run before every run of that side (swap an installed file)
//        [--cert <pem>]                                     HTTPS with a self-signed certificate: trust it by its public key
//
// The browser cache matters: a warm-up page can only help a later page through it. Two things switch it off, so the
// bench avoids both unless told otherwise: request interception (--block / --serve install it for that side only, and
// that side then runs without a cache, so prefer --cmd for anything but a small file) and an ignored certificate
// error (--cert makes Chromium accept the certificate by its public key instead, which keeps the cache working).
//
// Network profiles (CDP emulation on the page, all frames): home = 50 Mbps down, 10 Mbps up, 30 ms RTT;
// slow = 10/2 Mbps, 60 ms (a weak mobile or ADSL link, where bytes are the constraint); fast = 200/50 Mbps, 10 ms;
// none = no emulation (localhost).
//
// Output: one JSON line per run on stderr; a summary table on stdout; everything in --out.
// Per run: marks (upload, goto, loadDoc, binEnd, complete, painted) in ms after the user's action,
// bytes and request count by category (fonts, sdk scripts, app scripts, bin, media, other), and the
// Cache-Control / Content-Encoding headers seen on fonts and scripts (tells whether the server lets a
// returning user skip them).
//
// Requires: playwright (PLAYWRIGHT_BROWSERS_PATH or a global install), Node 18+, the example enabled on the server.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const args = parseArgs(process.argv.slice(2));
const BASE = args.base || 'http://127.0.0.1';
const FILE = args.file;
const PAIRS = +(args.pairs || 7);
const NET = args.net || 'home';
const CPU = +(args.cpu || 1);
const OUT = args.out || `bench-open-${Date.now()}.json`;
const TIMEOUT = 240000;
if (!FILE || !fs.existsSync(FILE)) { console.error('--file <docx> is required'); process.exit(2); }
// SPKI hash of --cert, for --ignore-certificate-errors-spki-list (the certificate is then trusted, not "ignored")
const SPKI = args.cert ? execSync(`openssl x509 -in "${args.cert}" -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`, { shell: '/bin/bash' }).toString().trim() : null;

const NETS = {
	home: { latency: 30, downloadThroughput: 50e6 / 8, uploadThroughput: 10e6 / 8 },
	slow: { latency: 60, downloadThroughput: 10e6 / 8, uploadThroughput: 2e6 / 8 },
	fast: { latency: 10, downloadThroughput: 200e6 / 8, uploadThroughput: 50e6 / 8 },
	none: null,
};

function parseArgs(argv) {
	const o = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) continue;
		const k = a.slice(2);
		const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
		if (k.endsWith('-serve') || k.endsWith('-block')) (o[k] = o[k] || []).push(v); else o[k] = v;
	}
	return o;
}

function side(name) {
	const p = name.toLowerCase();
	return {
		name,
		block: (args[`${p}-block`] || []).map((r) => new RegExp(r)),
		serve: (args[`${p}-serve`] || []).map((s) => { const i = s.indexOf('='); return { re: new RegExp(s.slice(0, i)), file: s.slice(i + 1) }; }),
		cmd: args[`${p}-cmd`],
	};
}

function category(url) {
	if (/\/fonts\/|\.ttf|\.otf|\.woff/i.test(url)) return 'fonts';
	if (/sdkjs\/.*\.(js|wasm)|AllFonts\.js|fonts\.wasm/.test(url)) return 'sdk';
	if (/web-apps\/.*\.(js|css)|\/apps\/.*\.(js|css)|require\.js|jquery|socket\.io/.test(url)) return 'app';
	if (/Editor\.bin/.test(url)) return 'bin';
	if (/\/cache\/files\//.test(url)) return 'media';
	return 'other';
}

async function oneRun(sideDef, runIndex) {
	if (sideDef.cmd) execSync(sideDef.cmd, { stdio: 'inherit', shell: '/bin/bash' });
	const browser = await chromium.launch({ args: SPKI ? ['--ignore-certificate-errors-spki-list=' + SPKI] : [] });
	try {
		// Without --cert a self-signed certificate is ignored, which also switches the browser cache off (see the header).
		const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block', ignoreHTTPSErrors: !SPKI && BASE.startsWith('https') });
		await ctx.addInitScript(() => {
			window.__m = {};
			const iv = setInterval(() => {
				const p = window.asc_docs_api && window.asc_docs_api.prototype;
				if (!p || !p.asc_LoadDocument || p.__w) return;
				const f = p.asc_LoadDocument; p.__w = 1; clearInterval(iv);
				p.asc_LoadDocument = function () { window.__m.loadDoc = Date.now(); return f.apply(this, arguments); };
			}, 2);
		});
		const page = await ctx.newPage();
		// Request interception switches the browser cache off for the page, so it is installed only for a side
		// that blocks or serves something.
		if (sideDef.block.length || sideDef.serve.length) await page.route('**/*', (route) => {
			const url = route.request().url();
			if (sideDef.block.some((re) => re.test(url))) return route.abort();
			const s = sideDef.serve.find((x) => x.re.test(url));
			// A served file goes to the browser uncompressed (Playwright does not let a route answer with a
			// content-encoding), so --serve is for small files such as preload.html. A bundle must be
			// installed on the server for its side with --a-cmd / --b-cmd, so nginx compresses it as in
			// production (see README).
			if (s) return route.fulfill({ status: 200, body: fs.readFileSync(s.file), contentType: url.endsWith('.css') ? 'text/css' : url.endsWith('.js') ? 'application/javascript' : url.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
			return route.continue();
		});
		const cdp = await ctx.newCDPSession(page);
		await cdp.send('Network.enable');
		await cdp.send('Network.setBypassServiceWorker', { bypass: true });
		if (NETS[NET]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] });
		// --cpu N slows the page's main thread N times (CDP CPU throttling): a laptop or phone instead of the bench's server CPU
		if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
		const reqs = new Map();
		const headers = { fonts: {}, sdk: {}, app: {} };
		cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, start: e.timestamp }));
		cdp.on('Network.responseReceived', (e) => {
			const q = reqs.get(e.requestId); if (!q) return;
			const cat = category(q.url);
			if (headers[cat]) {
				const h = e.response.headers || {};
				const key = `${h['cache-control'] || h['Cache-Control'] || '-'} | ${h['content-encoding'] || h['Content-Encoding'] || 'identity'}`;
				headers[cat][key] = (headers[cat][key] || 0) + 1;
			}
		});
		cdp.on('Network.loadingFinished', (e) => { const q = reqs.get(e.requestId); if (q) { q.bytes = e.encodedDataLength; q.end = e.timestamp; } });

		await page.goto(BASE + '/example/');
		const t0 = Date.now();
		const m = {};
		const buf = fs.readFileSync(FILE);
		const name = await page.evaluate(async ([b64, fname]) => {
			const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
			const fd = new FormData();
			fd.append('uploadedFile', new File([bin], fname));
			return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename;
		}, [buf.toString('base64'), path.basename(FILE)]);
		m.upload = Date.now() - t0;
		page.on('requestfinished', (r) => { if (/Editor\.bin/.test(r.url()) && !m.binEnd) m.binEnd = Date.now() - t0; });
		await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
		m.goto = Date.now() - t0;
		let frame = null;
		const deadline = Date.now() + TIMEOUT;
		for (;;) {
			if (Date.now() > deadline) throw new Error('editor did not complete');
			frame = page.frames().find((x) => x.name() === 'frameEditor');
			const ok = frame && await frame.evaluate(() => { const e = window.editor || (window.Asc && Asc.editor); return !!(e && e.isDocumentLoadComplete); }).catch(() => false);
			if (ok) break;
			await new Promise((r) => setTimeout(r, 5));
		}
		m.complete = Date.now() - t0;
		const loadDoc = await frame.evaluate(() => window.__m && window.__m.loadDoc).catch(() => null);
		if (loadDoc) m.loadDoc = loadDoc - t0;
		// painted: layout finished and two frames drawn. Text: the document's background layout (FullRecalc) is idle;
		// presentation: no recalculation running; spreadsheet: the sheet draws synchronously on open, two frames after complete.
		const painted = await frame.evaluate(() => new Promise((res) => {
			const e = window.editor || Asc.editor;
			const t = () => {
				const d = e.WordControl && e.WordControl.m_oLogicDocument;
				const busy = d && ((d.FullRecalc && d.FullRecalc.Id != null) || (d.Is_OnRecalculate && d.Is_OnRecalculate()));
				if (busy) return setTimeout(t, 5);
				const pages = d && d.GetPagesCount ? d.GetPagesCount() : (d && d.Slides ? d.Slides.length : (e.wbModel ? e.wbModel.getWorksheetCount() : 0));
				requestAnimationFrame(() => requestAnimationFrame(() => res({ pages, at: Date.now() })));
			};
			t();
		}));
		m.painted = painted.at - t0;
		m.pages = painted.pages;

		const dl = {};
		for (const q of reqs.values()) {
			if (!q.bytes) continue;
			const c = category(q.url);
			dl[c] = dl[c] || { requests: 0, bytes: 0 };
			dl[c].requests++; dl[c].bytes += q.bytes;
		}
		const biggest = [...reqs.values()].filter((q) => q.bytes).sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((q) => ({ url: q.url.replace(BASE, ''), bytes: q.bytes }));
		// every font and sdk file of the run, so the font families and styles can be named afterwards
		const files = [...reqs.values()].filter((q) => q.bytes && ['fonts', 'sdk'].includes(category(q.url))).map((q) => ({ url: q.url.replace(BASE, ''), bytes: q.bytes, ms: Math.round((q.end - q.start) * 1000) }));
		const row = { side: sideDef.name, run: runIndex, net: NET, cpu: CPU, marks: m, downloads: dl, headers, biggest, files, load: fs.existsSync('/proc/loadavg') ? +fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0] : null };
		process.stderr.write(JSON.stringify(row) + '\n');
		return row;
	} finally {
		await browser.close().catch(() => {});
	}
}

const median = (a) => { a = [...a].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : null; };
const q = (a, p) => { a = [...a].sort((x, y) => x - y); const k = (a.length - 1) * p, f = Math.floor(k); return a[f] + (a[Math.min(f + 1, a.length - 1)] - a[f]) * (k - f); };

(async () => {
	const A = side('A'), B = side('B');
	const sameSides = !A.block.length && !A.serve.length && !A.cmd && !B.block.length && !B.serve.length && !B.cmd;
	const rows = [];
	await oneRun(A, -1); // warm the server side (first conversion, caches); not counted
	// Order within each pair follows the Thue-Morse sequence (AB BA BA AB BA AB AB BA ...), not plain
	// alternation. With plain ABBA, side A always ran at positions 0 and 3 of every four runs and side B
	// at 1 and 2; a server effect with a period of four runs then showed up as a 0.5 s "gain" between
	// identical sides (noise floor of 2026-11-04). Thue-Morse puts each side on every position equally.
	const thueMorse = (n) => { let c = 0; while (n) { c ^= n & 1; n >>= 1; } return c; };
	for (let p = 0; p < PAIRS; p++) {
		const order = thueMorse(p) ? [B, A] : [A, B];
		for (const s of order) rows.push(await oneRun(s, p));
		fs.writeFileSync(OUT, JSON.stringify({ args, rows }, null, 1));
	}
	const pairs = [];
	for (let p = 0; p < PAIRS; p++) pairs.push({ a: rows.find((r) => r.side === 'A' && r.run === p), b: rows.find((r) => r.side === 'B' && r.run === p) });
	const metrics = ['upload', 'goto', 'loadDoc', 'binEnd', 'complete', 'painted'];
	console.log(`\nfile ${path.basename(FILE)}  net ${NET}  cpu x${CPU}  pairs ${PAIRS}${sameSides ? '  (A and B identical: this measures the noise floor)' : ''}`);
	console.log('| mark | A median | B median | B−A per pair median | per-pair range | pairs B<A |');
	console.log('|---|---|---|---|---|---|');
	for (const k of metrics) {
		const a = rows.filter((r) => r.side === 'A').map((r) => r.marks[k]).filter(Number.isFinite);
		const b = rows.filter((r) => r.side === 'B').map((r) => r.marks[k]).filter(Number.isFinite);
		const d = pairs.map((x) => x.a && x.b && Number.isFinite(x.a.marks[k]) && Number.isFinite(x.b.marks[k]) ? x.b.marks[k] - x.a.marks[k] : null).filter((x) => x !== null);
		if (!a.length || !b.length) continue;
		console.log(`| ${k} | ${median(a)} | ${median(b)} | ${median(d) > 0 ? '+' : ''}${median(d)} | ${Math.min(...d)} … ${Math.max(...d)} | ${d.filter((x) => x < 0).length}/${d.length} |`);
	}
	console.log('\n| category | A requests / MB (median) | B requests / MB (median) |');
	console.log('|---|---|---|');
	for (const c of ['fonts', 'sdk', 'app', 'bin', 'media', 'other']) {
		const f = (s) => { const rs = rows.filter((r) => r.side === s); return `${median(rs.map((r) => (r.downloads[c] || {}).requests || 0))} / ${(median(rs.map((r) => (r.downloads[c] || {}).bytes || 0)) / 1048576).toFixed(2)}`; };
		console.log(`| ${c} | ${f('A')} | ${f('B')} |`);
	}
	const h = rows[0].headers;
	console.log('\nresponse headers seen (cache-control | content-encoding → count), side A, first run:');
	for (const c of ['fonts', 'sdk', 'app']) console.log(`  ${c}: ${JSON.stringify(h[c])}`);
	console.log('\nbiggest downloads, side A, first run:');
	for (const b of rows[0].biggest) console.log(`  ${(b.bytes / 1048576).toFixed(2)} MB  ${b.url}`);
	console.log(`\nraw: ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
