// PKT-0095: differential oracle for sdkjs, original (external/sdkjs.base) against new (external/sdkjs).
// Usage: node run.cjs <module-name> <original-build-dir> <new-build-dir> <inputs-dir> <intended-file> <case>...
//   case = <input file>  (docx -> word editor, pptx -> slide editor)
// For each case and each side, against the running Document Server (example on http://localhost/example/):
//   user A and user B open the same fresh upload in Chromium, with the side's sdk-all{,-min}.js injected by
//   Playwright routing (sdk-all.{bin,cache} answered 404, so both sides load from source the same way);
//   A makes scripted local edits, B makes scripted remote (co-editing) edits;
//   A saves (download as docx/pptx through the server) and converts (txt for docx, odp for pptx);
//   the saved file is uploaded again and reopened.
// Compared between the sides: A's and B's model dumps after co-editing, what A and B sent (saveChanges,
// with the per-point description records dropped: they carry a time-based checksum), what is shown (hash of
// the editor's document canvases), the reopened saved document's dump and the converted file.
// Case "large*.docx" (PKT-0110): A types 30 characters over ~100 pages instead of the scripted edits, shown is
// B's canvases on the pages typed on, and the timing (B's receive busy time, typing latency) is a median of 3 runs.
// A difference fails unless "<case> <check>" is listed in the intended file. One timing line per case.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [MOD, ORIG, NEW, INPUTS, INTENDED, ...CASES] = process.argv.slice(2);
const BASE = process.env.DIFF_EXAMPLE || 'http://localhost/example/';
const intended = new Set((fs.existsSync(INTENDED) ? fs.readFileSync(INTENDED, 'utf8') : '').split('\n')
	.map(l => l.replace(/#.*/, '').trim().split(/\s+/).join(' ')).filter(Boolean));
const sha = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 16);

async function upload(file, name) {
	const fd = new FormData();
	fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), name || path.basename(file));
	const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
	if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
	return r.filename;
}

// Model dump: what the document holds after the edits (text, structure, layout counts).
const DUMP = {
	word: () => {
		const d = editor.WordControl.m_oLogicDocument;
		const el = e => e.constructor.name === 'CTable'
			? { t: 'table', rows: e.Content.map(r => r.Content.map(c => c.Content.Content.map(p => p.GetText()).join('/'))) }
			: { t: e.constructor.name, text: e.GetText(), lines: e.Lines ? e.Lines.length : null,
				runs: e.Content ? e.Content.map(r => (r.Pr && r.Pr.Bold ? 'b' : '') + (r.Pr && r.Pr.FontSize || '')).join(',') : null };
		return { pages: d.GetPagesCount(), content: d.Content.map(el) };
	},
	slide: () => {
		const d = editor.WordControl.m_oLogicDocument;
		return { slides: d.Slides.map(s => s.cSld.spTree.map(sp => ({
			t: sp.constructor.name, x: Math.round(sp.x || 0), y: Math.round(sp.y || 0),
			text: sp.txBody ? sp.txBody.content.Content.map(p => p.GetText()) : null }))) };
	},
};
// Scripted edits. A: local edits at the start; B: remote edits elsewhere, applied by A through co-editing.
const EDITS = {
	word: {
		A: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToStartPos() },
			{ type: 'Local edit ' }, { bold: true }, { type: 'bold' }, { bold: false }, { press: 'Enter' },
			{ type: 'second line' }, { press: 'Backspace' }, { press: 'Enter' }],
		B: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToEndPos() }, { press: 'Enter' },
			{ type: 'Remote edit by B' }, { press: 'Enter' }, { type: 'more' }],
		save: 'DOCX', convert: 'TXT', ext: 'docx', expect: ['Local edit bold', 'Remote edit by B'],
	},
	slide: {
		A: [{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			const sp = d.Slides[0].cSld.spTree, txt = sp.filter(o => o.txBody);  // a text shape, the body if any
			c.resetSelection(); c.selectObject(txt.find(o => o !== sp[0]) || txt[0], 0); } },
			{ type: ' local edit' }, { press: 'Enter' }, { type: 'new paragraph' }, { press: 'Backspace' }],
		B: [{ js: () => { const d = editor.WordControl.m_oLogicDocument; editor.WordControl.GoToPage(d.Slides.length - 1); } },
			{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			c.resetSelection(); c.selectObject(d.Slides[d.Slides.length - 1].cSld.spTree[0], d.Slides.length - 1); } },
			{ type: ' remote edit by B' }],
		save: 'PPTX', convert: 'ODP', ext: 'pptx', expect: ['local edit', 'remote edit by B'],
	},
};
const CANVAS = () => [...document.querySelectorAll('#id_viewer, #id_main_view canvas, #id_main canvas')]
	.filter((c, i, a) => !/overlay/i.test(c.id) && a.indexOf(c) === i && c.width > 0).map(c => c.toDataURL()).join('|');

let userSeed = 0;
// What is shown: hash of the document canvases once rendering is stable (two equal reads), cursor hidden.
async function shownHash(u) {
	await u.f.evaluate(() => { try { editor.WordControl.m_oDrawingDocument.TargetEnd(); } catch (e) {} });
	let prev = '';
	for (let i = 0; i < 50; i++) {
		await u.page.waitForTimeout(300);
		const h = sha(await u.f.evaluate(CANVAS));
		if (h === prev) return h;
		prev = h;
	}
	return prev;
}

async function newUser(browser, bundle, editorKind, url) {
	const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
	// Seeded Math.random per user (ParaIds and other durable ids are random): same ids on both sides.
	await ctx.addInitScript(seed => { let x = seed >>> 0 || 1;
		Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }, ++userSeed);
	// Receiver busy time (PKT-0110): time spent in incoming WebSocket message handlers, and long tasks.
	await ctx.addInitScript(() => { const W = window.WebSocket; if (!W) return; window.__busy = { recv: 0, long: 0 };
		const wrap = h => function (...a) { const t = performance.now(); try { return h.apply(this, a); } finally { window.__busy.recv += performance.now() - t; } };
		const ael = W.prototype.addEventListener;
		W.prototype.addEventListener = function (k, h, ...r) { return ael.call(this, k, k === 'message' && typeof h === 'function' ? wrap(h) : h, ...r); };
		const d = Object.getOwnPropertyDescriptor(W.prototype, 'onmessage');
		Object.defineProperty(W.prototype, 'onmessage', { configurable: true, get() { return d.get.call(this); },
			set(h) { d.set.call(this, typeof h === 'function' ? wrap(h) : h); } });
		try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__busy.long += e.duration; }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
	});
	const re = new RegExp(`/sdkjs/${editorKind}/sdk-all(-min)?\\.(js|bin|cache)(\\?|$)`);
	await ctx.route(re, r => {
		const m = r.request().url().match(re);
		if (m[2] !== 'js') return r.fulfill({ status: 404, body: '' });
		return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(bundle, editorKind, `sdk-all${m[1] || ''}.js`)) });
	});
	const page = await ctx.newPage(), sent = [];
	page.on('websocket', ws => ws.on('framesent', d => { if (/"saveChanges"/.test(d.payload)) sent.push(String(d.payload)); }));
	const t0 = Date.now();
	await page.goto(url);
	let f;
	for (let i = 0; ; i++) {
		if (i > 240) throw new Error('editor did not load ' + url);
		f = page.frames().find(f => /web-apps\/apps\/\w+editor\/main\/index/.test(f.url()));
		if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break;
		await page.waitForTimeout(100);
	}
	const routed = await f.evaluate(() => [...performance.getEntriesByType('resource')].some(e => /sdk-all/.test(e.name)));
	if (!routed) throw new Error('side bundle not loaded');
	return { ctx, page, f, sent, openMs: Date.now() - t0 };
}

async function play(u, steps, pause = 150) {
	for (const s of steps) {
		await u.f.waitForFunction(() => !AscCommon.CollaborativeEditing.Get_GlobalLock(), null, { timeout: 30000 });
		if (s.js) await u.f.evaluate(s.js, s.arg);
		await u.f.evaluate(() => { const a = document.querySelector('#area_id'); if (a) a.focus(); });
		// Text and formatting through the API (typed keystrokes raced with autocorrect and shortcuts).
		if (s.type) await u.f.evaluate(t => editor.asc_enterText([...t].map(c => c.codePointAt(0))), s.type);
		if (s.bold !== undefined) await u.f.evaluate(v => editor.put_TextPrBold(v), s.bold);
		if (s.press) await u.page.keyboard.press(s.press);
		if (pause) await u.page.waitForTimeout(pause);
		// Co-editing: an action waits for the server's lock answer; input sent meanwhile is dropped. Wait for it.
		await u.f.waitForFunction(() => !AscCommon.CollaborativeEditing.Get_GlobalLock(), null, { timeout: 30000 });
	}
}

// Wait until both users' dumps agree and are stable (co-editing settled).
async function settle(a, b, dump) {
	let prev = '';
	for (let i = 0; i < 100; i++) {
		const da = JSON.stringify(await a.f.evaluate(dump)), db = JSON.stringify(await b.f.evaluate(dump));
		if (da === db && da === prev) return da;
		prev = da === db ? da : '';
		await a.page.waitForTimeout(200);
	}
	throw new Error('co-editing did not converge');
}

async function download(u, type, out) {
	const dl = u.page.waitForEvent('download', { timeout: 60000 });
	await u.f.evaluate(t => editor.asc_DownloadAs(new Asc.asc_CDownloadOptions(Asc.c_oAscFileType[t])), type);
	await (await dl).saveAs(out);
	return fs.readFileSync(out);
}

// Changes sent by one user, normalized: drop the TableId description record (class "1", type 131071),
// which carries a time-based checksum, and mask the random ParaId of new objects; keep everything else byte for byte.
function normSent(msgs) {
	return msgs.map(m => {
		const o = JSON.parse(m.replace(/^\d+/, ''))[1];
		return JSON.parse(o.changes).filter(c => {
			const b = Buffer.from(c.slice(c.indexOf(';') + 1), 'base64');
			const n = b.readInt32LE(0), id = b.toString('utf16le', 4, 4 + n);
			return !(id === '1' && b.readInt32LE(4 + n) === 131071);
		}).map(c => {  // TableId registration of a new object: its last 4 bytes are the random ParaId: masked
			const b = Buffer.from(c.slice(c.indexOf(';') + 1), 'base64');
			const n = b.readInt32LE(0);
			if (b.toString('utf16le', 4, 4 + n) !== '1') return c;
			b.fill(0, b.length - 4); return c.slice(0, c.indexOf(';') + 1) + b.toString('base64');
		});
	}).flat();  // flattened: how changes are batched into messages depends on timing
}

// Large-document remote typing (PKT-0110, cases "large*.docx"): A types TYPE_CHARS characters, one at a time,
// at the start of paragraphs spread over the document; B receives them. Latency of a character: from A's
// input to the character in B's model. B's busy time: incoming-message handlers and long tasks during typing.
const TYPE_AT = [0.1, 0.3, 0.5, 0.7, 0.9], TYPE_TEXT = 'abcdef';  // 5 places x 6 characters = 30
async function typeRemote(a, b) {
	const n = await a.f.evaluate(() => editor.WordControl.m_oLogicDocument.Content.length);
	const at = TYPE_AT.map(x => Math.floor(n * x));
	await b.f.evaluate(() => { window.__busy.recv = 0; window.__busy.long = 0; });
	const lat = [], t0 = Date.now();
	for (const k of at) {
		await play(a, [{ js: k => { const d = editor.WordControl.m_oLogicDocument; d.RemoveSelection();
			d.Set_CurrentElement(k, true); d.Content[k].MoveCursorToStartPos(); d.UpdateSelection(); }, arg: k }]);
		let typed = '';
		for (const c of TYPE_TEXT) {
			typed += c;
			const s = Date.now();
			await play(a, [{ type: c }], 0);
			await b.f.waitForFunction(([k, t]) => editor.WordControl.m_oLogicDocument.Content[k].GetText().startsWith(t),
				[k, typed], { timeout: 30000, polling: 5 });
			lat.push(Date.now() - s);
		}
	}
	const busy = await b.f.evaluate(() => window.__busy);
	const pages = await b.f.evaluate(at => at.map(k => editor.WordControl.m_oLogicDocument.Content[k].GetAbsolutePage(0)), at);
	lat.sort((x, y) => x - y);
	return { at, pages, t: { type: Date.now() - t0, lat: lat[lat.length >> 1], latMax: lat[lat.length - 1],
		recv: Math.round(busy.recv), long: Math.round(busy.long) } };
}
// What B shows on the given pages: B scrolls to each one and hashes its canvases once stable.
async function shownPages(u, pages) {
	const h = [];
	for (const p of [...new Set(pages)]) { await u.f.evaluate(p => editor.goToPage(p), p); h.push(`${p}:${await shownHash(u)}`); }
	return h.join(' ');
}
async function openPair(browser, bundle, kind, file, side, run) {
	userSeed = 0;  // same seeds for the same user on both sides
	const name = await upload(file, `diff-${side}${run ? '-run' + run : ''}-${path.basename(file)}`);
	const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
	return [await newUser(browser, bundle, kind, url), await newUser(browser, bundle, kind, url)];
}
const RUNS = +(process.env.DIFF_RUNS || 3);
const median = xs => xs.slice().sort((x, y) => x - y)[xs.length >> 1];

async function runSide(browser, side, bundle, file, tmp) {
	const kind = file.endsWith('.pptx') ? 'slide' : 'word', E = EDITS[kind], dump = DUMP[kind];
	const large = /^large/.test(path.basename(file));
	const [a, b] = await openPair(browser, bundle, kind, file, side, 0);
	const t = { open: a.openMs, join: b.openMs };
	let t0 = Date.now(), typing = null, model;
	if (large) {  // typing by A only; timing is the median over RUNS runs (later runs: fresh upload, typing only)
		typing = await typeRemote(a, b);
		model = await settle(a, b, dump);
		const runs = [typing.t];
		for (let i = 1; i < RUNS; i++) {
			const [a2, b2] = await openPair(browser, bundle, kind, file, side, i);
			runs.push((await typeRemote(a2, b2)).t); await a2.ctx.close(); await b2.ctx.close();
		}
		for (const k of Object.keys(typing.t)) t[k] = median(runs.map(r => r[k]));
		t.runs = runs.length;
		const pg = JSON.parse(model).pages;
		if (pg < 90) throw new Error(`${side} ${path.basename(file)}: ${pg} pages, expected about 100`);
		for (const k of typing.at) if (!JSON.parse(model).content[k].text.startsWith(TYPE_TEXT))
			throw new Error(`${side} ${path.basename(file)}: typing missing at paragraph ${k}`);
	} else {
		await play(a, E.A); await play(b, E.B);
		model = await settle(a, b, dump); t.edit = Date.now() - t0;
	}
	for (const m of large ? [] : E.expect)  // the scripted edits must have landed, or "same" would prove nothing
		if (!model.includes(m)) throw new Error(`${side} ${path.basename(file)}: edit "${m}" missing from the model: ${model.slice(0, 1500)}`);
	// Leave text editing on both sides (a held edit lock blocked the download in slides), then B leaves.
	for (const u of [a, b]) await play(u, [{ js: kind === 'slide'
		? () => editor.WordControl.m_oLogicDocument.GetCurrentController().resetSelection() : () => 0 }]);
	await settle(a, b, dump);
	const sentB = JSON.stringify(normSent(b.sent));
	// Shown: A's canvases; for the typing case B's, on every page typed on (stale pixels beyond the first page).
	const shown = large ? await shownPages(b, typing.pages) : await shownHash(a);
	await b.ctx.close();
	t0 = Date.now(); const saved = await download(a, E.save, path.join(tmp, `${side}.${E.ext}`)); t.save = Date.now() - t0;
	t0 = Date.now(); const conv = await download(a, E.convert, path.join(tmp, `${side}.${E.convert.toLowerCase()}`)); t.convert = Date.now() - t0;
	const r = { model, sentA: JSON.stringify(normSent(a.sent)), sentB, shown,
		converted: E.convert === 'TXT' ? sha(conv) : null };
	await a.ctx.close();
	const rn = await upload(path.join(tmp, `${side}.${E.ext}`), `diff-${side}-reopen-${path.basename(file)}`);
	const c = await newUser(browser, bundle, kind, BASE + 'editor?fileName=' + encodeURIComponent(rn));
	t.reopen = c.openMs; r.reopened = JSON.stringify(await c.f.evaluate(dump));
	if (E.convert !== 'TXT') {  // convert: open the converted file too (odp -> pptx in the editor)
		const cn = await upload(path.join(tmp, `${side}.${E.convert.toLowerCase()}`), `diff-${side}-conv-${path.basename(file, '.' + E.ext)}.${E.convert.toLowerCase()}`);
		const d = await newUser(browser, bundle, kind, BASE + 'editor?fileName=' + encodeURIComponent(cn));
		r.converted = JSON.stringify(await d.f.evaluate(dump)); await d.ctx.close();
	}
	await c.ctx.close();
	r.savedBytes = saved.length;
	return { r, t };
}

(async () => {
	const browser = await chromium.launch();
	const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sdkjs-diff-'));
	let fail = 0;
	for (const cs of CASES) {
		const file = path.join(INPUTS, cs);
		const o = await runSide(browser, 'original', ORIG, file, tmp);
		const n = await runSide(browser, 'new', NEW, file, tmp);
		const ft = t => Object.entries(t).map(([k, v]) => `${k}=${v}`).join(' ');
		console.log(`timing ${MOD} ${cs} | original ${ft(o.t)} | new ${ft(n.t)}`);
		for (const k of ['model', 'sentA', 'sentB', 'shown', 'reopened', 'converted']) {
			if (o.r[k] === n.r[k]) { console.log(`same ${cs} ${k}`); continue; }
			const ok = intended.has(`${cs} ${k}`);
			if (!ok) fail++;
			let os = String(o.r[k]), ns = String(n.r[k]);
			if (/^sent/.test(k)) {  // show from the first differing change
				const oa = JSON.parse(os), na = JSON.parse(ns); let i = 0;
				while (i < oa.length && oa[i] === na[i]) i++;
				os = `#${i}/${oa.length} ` + oa.slice(i, i + 3).join(' '); ns = `#${i}/${na.length} ` + na.slice(i, i + 3).join(' ');
			}
			console.log(`${ok ? 'INTENDED' : 'DIFF'} ${cs} ${k}\n  original: ${os.slice(0, 400)}\n  new:      ${ns.slice(0, 400)}`);
		}
	}
	await browser.close();
	fs.rmSync(tmp, { recursive: true, force: true });
	console.log(fail ? `differential ${MOD}: FAIL, ${fail} unintended difference(s)` : `differential ${MOD}: PASS (${CASES.length} cases)`);
	process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
