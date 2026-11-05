#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
// CPU profile of the client side of the open journey: from Editor.bin received to the document painted
// (layout finished, two frames). Same journey as open-journey-ab.cjs (upload, editor, cold browser), no
// network emulation by default, so the window is CPU. Prints self and total time per function and per
// source file of the editor frame, median over runs.
//
// Usage: node bench/profile-open.cjs --file doc.docx [--runs 3] [--base https://127.0.0.1] [--out prof.json]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = {};
for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith('--')) args[process.argv[i].slice(2)] = process.argv[++i];
const BASE = args.base || 'https://127.0.0.1';
const RUNS = +(args.runs || 3);
const FILE = args.file;

function short(url) { return (url || '').replace(/^.*\/(sdkjs|web-apps|vendor)\//, '$1/').replace(/\?.*$/, '') || '(native)'; }

async function run() {
	const browser = await chromium.launch();
	try {
		const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block', ignoreHTTPSErrors: true });
		const page = await ctx.newPage();
		await page.goto(BASE + '/example/');
		const name = await page.evaluate(async ([b64, fname]) => {
			const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
			const fd = new FormData(); fd.append('uploadedFile', new File([bin], fname));
			return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename;
		}, [fs.readFileSync(FILE).toString('base64'), path.basename(FILE)]);
		let binAt = null;
		page.on('requestfinished', (r) => { if (!binAt && /Editor\.bin/.test(r.url())) binAt = Date.now(); });
		await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
		let frame;
		for (let i = 0; i < 4000 && !frame; i++) { frame = page.frames().find((x) => x.name() === 'frameEditor'); if (!frame) await page.waitForTimeout(5); }
		// profile the editor frame's target (same renderer process as the page in Chromium headless)
		const cdp = await ctx.newCDPSession(page);
		await cdp.send('Profiler.enable');
		await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
		await cdp.send('Profiler.start');
		const t0 = Date.now();
		for (;;) {
			const ok = await frame.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false);
			if (ok) break;
			if (Date.now() - t0 > 180000) throw new Error('editor did not complete');
			await new Promise((r) => setTimeout(r, 5));
		}
		await frame.evaluate(() => new Promise((res) => {
			const t = () => { const d = editor.WordControl && editor.WordControl.m_oLogicDocument; if (d && d.FullRecalc && d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); };
			t();
		}));
		const end = Date.now();
		const { profile } = await cdp.send('Profiler.stop');
		return { profile, binAt, end };
	} finally { await browser.close().catch(() => {}); }
}

function attribute(profile, fromUs) {
	// keep samples after Editor.bin arrived (fromUs: profile-clock microseconds)
	const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
	const parent = new Map();
	for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
	const self = new Map(), total = new Map(), fileSelf = new Map();
	let t = profile.startTime, busy = 0;
	for (let i = 0; i < profile.samples.length; i++) {
		t += profile.timeDeltas[i];
		if (t < fromUs) continue;
		const dt = (profile.timeDeltas[i + 1] || 0) / 1000;
		const leaf = nodes.get(profile.samples[i]);
		const cf = leaf.callFrame;
		const key = `${cf.functionName || '(anonymous)'}  ${short(cf.url)}:${cf.lineNumber + 1}`;
		if (cf.functionName === '(idle)') continue;
		busy += dt;
		self.set(key, (self.get(key) || 0) + dt);
		const f = /^\(/.test(cf.functionName) && !cf.url ? cf.functionName : short(cf.url);
		fileSelf.set(f, (fileSelf.get(f) || 0) + dt);
		const seen = new Set();
		for (let id = leaf.id; id != null; id = parent.get(id)) {
			const c = nodes.get(id).callFrame;
			const k = `${c.functionName || '(anonymous)'}  ${short(c.url)}:${c.lineNumber + 1}`;
			if (seen.has(k)) continue; seen.add(k);
			total.set(k, (total.get(k) || 0) + dt);
		}
	}
	return { busy, self, total, fileSelf };
}

(async () => {
	const runs = [];
	for (let r = 0; r < RUNS; r++) {
		const { profile, binAt, end } = await run();
		// map wall clock to profile clock: profile.endTime ~ end
		const fromUs = profile.endTime - (end - binAt) * 1000;
		const a = attribute(profile, fromUs);
		runs.push(a);
		process.stderr.write(`run ${r}: window ${end - binAt} ms, busy ${a.busy.toFixed(0)} ms\n`);
	}
	const med = (xs) => { xs = [...xs].sort((a, b) => a - b); return xs[xs.length >> 1]; };
	const merge = (k) => { const keys = new Set(runs.flatMap((r) => [...r[k].keys()])); return [...keys].map((x) => [x, med(runs.map((r) => r[k].get(x) || 0))]).sort((a, b) => b[1] - a[1]); };
	console.log(`busy ms (median): ${med(runs.map((r) => r.busy)).toFixed(0)}`);
	console.log('\nself ms by file:'); for (const [k, v] of merge('fileSelf').slice(0, 15)) console.log(`  ${v.toFixed(0).padStart(6)}  ${k}`);
	console.log('\nself ms by function:'); for (const [k, v] of merge('self').slice(0, 30)) console.log(`  ${v.toFixed(0).padStart(6)}  ${k}`);
	console.log('\ntotal ms by function:'); for (const [k, v] of merge('total').slice(0, 40)) console.log(`  ${v.toFixed(0).padStart(6)}  ${k}`);
	if (args.out) fs.writeFileSync(args.out, JSON.stringify({ self: merge('self'), total: merge('total'), files: merge('fileSelf') }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
