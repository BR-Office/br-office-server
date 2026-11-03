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
			{ type: 'Local edit ' }, { press: 'Control+b' }, { type: 'bold' }, { press: 'Control+b' }, { press: 'Enter' },
			{ type: 'second line' }, { press: 'Backspace' }, { press: 'Enter' }],
		B: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToEndPos() }, { press: 'Enter' },
			{ type: 'Remote edit by B' }, { press: 'Enter' }, { type: 'more' }],
		save: 'DOCX', convert: 'TXT', ext: 'docx',
	},
	slide: {
		A: [{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			c.resetSelection(); c.selectObject(d.Slides[0].cSld.spTree[d.Slides[0].cSld.spTree.length > 1 ? 1 : 0], 0); } },
			{ type: ' local edit' }, { press: 'Enter' }, { type: 'new paragraph' }, { press: 'Backspace' }],
		B: [{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			const sl = d.Slides[d.Slides.length - 1]; editor.WordControl.GoToPage(d.Slides.length - 1);
			c.resetSelection(); c.selectObject(sl.cSld.spTree[0], 0); } },
			{ type: ' remote edit by B' }],
		save: 'PPTX', convert: 'ODP', ext: 'pptx',
	},
};
const CANVAS = () => [...document.querySelectorAll('#id_viewer, #id_main_view canvas, #id_main canvas')]
	.filter((c, i, a) => !/overlay/i.test(c.id) && a.indexOf(c) === i && c.width > 0).map(c => c.toDataURL()).join('|');

async function newUser(browser, bundle, editorKind, url) {
	const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
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

async function play(u, steps) {
	for (const s of steps) {
		if (s.js) await u.f.evaluate(s.js);
		await u.f.evaluate(() => { const a = document.querySelector('#area_id'); if (a) a.focus(); });
		if (s.type) await u.page.keyboard.type(s.type, { delay: 30 });
		if (s.press) await u.page.keyboard.press(s.press);
		await u.page.waitForTimeout(150);
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
// which carries a time-based checksum; keep everything else byte for byte.
function normSent(msgs) {
	return msgs.map(m => {
		const o = JSON.parse(m.replace(/^\d+/, ''))[1];
		return JSON.parse(o.changes).filter(c => {
			const b = Buffer.from(c.slice(c.indexOf(';') + 1), 'base64');
			const n = b.readInt32LE(0), id = b.toString('utf16le', 4, 4 + n);
			return !(id === '1' && b.readInt32LE(4 + n) === 131071);
		});
	}).filter(x => x.length);
}

async function runSide(browser, side, bundle, file, tmp) {
	const kind = file.endsWith('.pptx') ? 'slide' : 'word', E = EDITS[kind], dump = DUMP[kind];
	const name = await upload(file, `diff-${side}-${path.basename(file)}`);
	const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
	const a = await newUser(browser, bundle, kind, url), b = await newUser(browser, bundle, kind, url);
	const t = { open: a.openMs, join: b.openMs };
	let t0 = Date.now(); await play(a, E.A); await play(b, E.B);
	const model = await settle(a, b, dump); t.edit = Date.now() - t0;
	const shown = sha(await a.f.evaluate(CANVAS));
	t0 = Date.now(); const saved = await download(a, E.save, path.join(tmp, `${side}.${E.ext}`)); t.save = Date.now() - t0;
	t0 = Date.now(); const conv = await download(a, E.convert, path.join(tmp, `${side}.${E.convert.toLowerCase()}`)); t.convert = Date.now() - t0;
	const r = { model, sentA: JSON.stringify(normSent(a.sent)), sentB: JSON.stringify(normSent(b.sent)), shown,
		converted: E.convert === 'TXT' ? sha(conv) : null };
	await a.ctx.close(); await b.ctx.close();
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
			console.log(`${ok ? 'INTENDED' : 'DIFF'} ${cs} ${k}\n  original: ${String(o.r[k]).slice(0, 400)}\n  new:      ${String(n.r[k]).slice(0, 400)}`);
		}
	}
	await browser.close();
	fs.rmSync(tmp, { recursive: true, force: true });
	console.log(fail ? `differential ${MOD}: FAIL, ${fail} unintended difference(s)` : `differential ${MOD}: PASS (${CASES.length} cases)`);
	process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
