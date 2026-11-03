// PKT-0094: browser part of the x2t differential oracle (structure copied from PKT-0095's sdkjs runner).
// The running Document Server spawns the x2t installed in server/FileConverter/bin for every open, save and
// conversion; x2t.sh installs one side's build there (original or new), runs this script, and swaps.
// Usage:
//   node x2t-run.cjs side <out.json> <inputs-dir> <case>...    one side, with the x2t currently installed
//   node x2t-run.cjs compare <intended> <orig.json>... -- <new.json>...   compare; timing medians over repeats
// Per case (docx -> word editor, xlsx -> cell editor, pptx -> slide editor), in Chromium against the example:
//   user A and user B open a fresh upload (x2t: file -> Editor.bin); A makes scripted local edits, B scripted
//   remote (co-editing) edits elsewhere, applied by A; A saves (download in the own format: x2t assembles
//   Editor.bin + both users' changes) and converts (pdf, and odt/ods/odp); the saved file is uploaded and reopened.
// Compared: the model of A and B after co-editing, what A and B sent to the other user (saveChanges, minus the
// time-based description record), what is shown (canvas hash), the saved and converted files BY CONTENT
// (x2t-direct.py --fingerprint: per-entry normalized XML, PDF text), and the reopened document's model.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const BASE = process.env.DIFF_EXAMPLE || 'http://localhost/example/';
const sha = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 16);
const fingerprint = f => execFileSync('python3', ['-I', path.join(__dirname, 'x2t-direct.py'), '--fingerprint', f], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

async function upload(file, name) {
	const fd = new FormData();
	fd.append('uploadedFile', new Blob([fs.readFileSync(file)]), name || path.basename(file));
	const r = await (await fetch(BASE + 'upload', { method: 'POST', body: fd })).json();
	if (!r.filename) throw new Error('upload failed ' + JSON.stringify(r));
	return r.filename;
}

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
	cell: () => editor.wbModel.aWorksheets.map(ws => {
		const rows = [];
		for (let r = 0; r < 12; r++) { const row = []; for (let c = 0; c < 6; c++) row.push(ws.getCell3(r, c).getValue()); rows.push(row.join('|')); }
		return { name: ws.getName(), rows };
	}),
};
const EDITS = {
	word: {
		A: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToStartPos() },
			{ type: 'Local edit ' }, { press: 'Control+b' }, { type: 'bold' }, { press: 'Control+b' }, { press: 'Enter' },
			{ type: 'Second line' }, { press: 'Backspace' }, { press: 'Enter' }],
		B: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToEndPos() }, { press: 'Enter' },
			{ type: 'Remote edit by B' }, { press: 'Enter' }, { type: 'More' }],
		save: 'DOCX', convert: ['PDF', 'ODT'], ext: 'docx',
	},
	slide: {
		A: [{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			c.resetSelection(); c.selectObject(d.Slides[0].cSld.spTree[d.Slides[0].cSld.spTree.length > 1 ? 1 : 0], 0); } },
			{ type: ' Local edit' }, { press: 'Enter' }, { type: 'New paragraph' }, { press: 'Backspace' }],
		B: [{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			editor.WordControl.GoToPage(d.Slides.length - 1); } }, { wait: 800 },
			{ js: () => { const d = editor.WordControl.m_oLogicDocument, c = d.GetCurrentController();
			const sl = d.Slides[d.Slides.length - 1]; c.resetSelection(); c.selectObject(sl.cSld.spTree[0], d.Slides.length - 1); } },
			{ type: ' Remote edit by B' }],
		save: 'PPTX', convert: ['PDF', 'ODP'], ext: 'pptx',
	},
	cell: {
		A: [{ press: 'Control+Home' }, { type: 'Local A1' }, { press: 'Enter' }, { type: '42' }, { press: 'Enter' }],
		B: [{ press: 'Control+Home' }, { press: 'ArrowRight' }, { press: 'ArrowRight' }, { press: 'ArrowRight' },
			{ press: 'ArrowDown' }, { press: 'ArrowDown' }, { type: 'Remote by B' }, { press: 'Enter' }],
		save: 'XLSX', convert: ['PDF', 'ODS'], ext: 'xlsx',
	},
};
const CANVAS = () => [...document.querySelectorAll('#id_viewer, #id_main_view canvas, #id_main canvas, #ws-canvas')]
	.filter((c, i, a) => !/overlay/i.test(c.id) && a.indexOf(c) === i && c.width > 0).map(c => c.toDataURL()).join('|');

async function newUser(browser, url) {
	const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
	const page = await ctx.newPage(), sent = [], got = [];
	page.on('websocket', ws => {
		ws.on('framesent', d => { if (/"saveChanges"/.test(d.payload)) sent.push(String(d.payload)); });
		ws.on('framereceived', d => { if (/"saveChanges"/.test(d.payload)) got.push(String(d.payload)); });
	});
	// the cell editor only exposes Asc.editor: alias it so every snippet can say `editor`
	await ctx.addInitScript(() => { let e; Object.defineProperty(window, 'editor', { configurable: true,
		get: () => e || (window.Asc && Asc.editor), set: v => { e = v; } }); });
	const t0 = Date.now();
	await page.goto(url);
	let f;
	for (let i = 0; ; i++) {
		if (i > 600) throw new Error('editor did not load ' + url);
		f = page.frames().find(f => /web-apps\/apps\/\w+editor\/main\/index/.test(f.url()));
		if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break;
		await page.waitForTimeout(100);
	}
	return { ctx, page, f, sent, got, openMs: Date.now() - t0 };
}

async function play(u, steps) {
	for (const s of steps) {
		if (s.js) await u.f.evaluate(s.js);
		if (s.wait) await u.page.waitForTimeout(s.wait);
		await u.f.evaluate(() => { const a = document.querySelector('#area_id'); if (a && document.activeElement !== a) a.focus(); });
		if (s.type) await u.page.keyboard.type(s.type, { delay: 60 });
		if (s.press) await u.page.keyboard.press(s.press);
		await u.page.waitForTimeout(400);
	}
}

async function settle(a, b, dump, kind) {
	let prev = '';
	for (let i = 0; i < 150; i++) {
		if (kind === 'cell') for (const u of [a, b]) await u.f.evaluate(() => editor.asc_Save && editor.asc_Save()).catch(() => {});
		const da = JSON.stringify(await a.f.evaluate(dump)), db = JSON.stringify(await b.f.evaluate(dump));
		if (da === db && da === prev) return da;
		prev = da === db ? da : '';
		await a.page.waitForTimeout(300);
	}
	throw new Error('co-editing did not converge');
}

async function download(u, type, out) {
	const dl = u.page.waitForEvent('download', { timeout: 120000 });
	await u.f.evaluate(t => editor.asc_DownloadAs(new Asc.asc_CDownloadOptions(Asc.c_oAscFileType[t])), type);
	await (await dl).saveAs(out);
	return out;
}

// Changes one user sent to the other, normalized: the TableId description record (class "1", type 131071,
// a time-based checksum) is dropped; every other record is kept as <object id>:<change type>:<byte length>,
// because records that create objects carry ids the client draws at random (e.g. shape ids), so their bytes
// differ between two runs of the same side; flattened, because batching into messages follows typing timing.
function normSent(msgs) {
	return msgs.map(m => {
		const o = JSON.parse(m.replace(/^\d+/, ''))[1];
		const ch = typeof o.changes === 'string' ? JSON.parse(o.changes) : o.changes;
		return ch.map(c => {
			if (typeof c !== 'string' || c.indexOf(';') < 0) return JSON.stringify(c);
			const b = Buffer.from(c.slice(c.indexOf(';') + 1), 'base64');
			if (b.length < 8) return c;
			const n = b.readInt32LE(0); if (n < 0 || 4 + n + 4 > b.length) return c;
			const id = b.toString('utf16le', 4, 4 + n), type = b.readInt32LE(4 + n);
			return id === '1' && type === 131071 ? null : `${id}:${type}:${b.length}`;
		}).filter(Boolean);
	}).flat();
}

async function runCase(browser, file, tmp, tag) {
	const kind = { docx: 'word', pptx: 'slide', xlsx: 'cell' }[file.split('.').pop()], E = EDITS[kind], dump = DUMP[kind];
	const base = path.basename(file);
	const name = await upload(file, `x2tdiff-${tag}-${base}`);
	const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
	const a = await newUser(browser, url), b = await newUser(browser, url);
	const t = { open: a.openMs, join: b.openMs };
	let t0 = Date.now(); await play(a, E.A); await play(b, E.B);
	const model = await settle(a, b, dump, kind); t.edit = Date.now() - t0;
	const shown = sha(await a.f.evaluate(CANVAS));
	const savedF = path.join(tmp, `${tag}-saved.${E.ext}`);
	t0 = Date.now(); await download(a, E.save, savedF); t.save = Date.now() - t0;
	const r = { model, sentA: JSON.stringify(normSent(a.sent)), sentB: JSON.stringify(normSent(b.sent)), shown,
		saved: fingerprint(savedF) };
	for (const cv of E.convert) {
		const f = path.join(tmp, `${tag}-conv.${cv.toLowerCase()}`);
		t0 = Date.now(); await download(a, cv, f); t[`to${cv.toLowerCase()}`] = Date.now() - t0;
		r[`converted.${cv.toLowerCase()}`] = fingerprint(f);
	}
	await a.ctx.close(); await b.ctx.close();
	const rn = await upload(savedF, `x2tdiff-${tag}-reopen-${base}`);
	const c = await newUser(browser, BASE + 'editor?fileName=' + encodeURIComponent(rn));
	t.reopen = c.openMs; r.reopened = JSON.stringify(await c.f.evaluate(dump));
	await c.ctx.close();
	if (process.env.DIFF_DEBUG) console.error(base, r.sentA.length, r.sentB.length, model.slice(0, 600));
	if (!r.sentA.length || r.sentA === '[]' || r.sentB === '[]') throw new Error(`${base}: a user sent no changes (edits not applied)`);
	return { r, t };
}

async function side(out, inputs, cases) {
	const browser = await chromium.launch();
	const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'x2t-diff-'));
	const res = {};
	for (const cs of cases) res[cs] = await runCase(browser, path.join(inputs, cs), tmp, crypto.randomBytes(4).toString('hex'));
	await browser.close();
	if (!process.env.DIFF_KEEP) fs.rmSync(tmp, { recursive: true, force: true }); else console.error('kept', tmp);
	fs.writeFileSync(out, JSON.stringify(res));
}

function compare(intendedFile, orig, nw) {
	const intended = new Set((fs.existsSync(intendedFile) ? fs.readFileSync(intendedFile, 'utf8') : '').split('\n')
		.map(l => l.replace(/#.*/, '').trim().split(/\s+/).slice(0, 2).join(' ')).filter(Boolean));
	const O = orig.map(f => JSON.parse(fs.readFileSync(f))), N = nw.map(f => JSON.parse(fs.readFileSync(f)));
	const med = v => { const s = [...v].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
	const ft = runs => Object.keys(runs[0]).map(k => `${k}=${med(runs.map(t => t[k]))}`).join(' ');
	let fail = 0;
	for (const cs of Object.keys(O[0])) {
		console.log(`timing x2t-browser ${cs} (median of ${O.length} ms) | original ${ft(O.map(o => o[cs].t))} | new ${ft(N.map(n => n[cs].t))}`);
		for (const k of Object.keys(O[0][cs].r)) {
			// every repeat of each side must agree with the first original run
			const vals = [...O, ...N].map(x => x[cs].r[k]), ref = vals[0];
			const oStable = O.every(x => x[cs].r[k] === ref);
			if (vals.every(v => v === ref)) { console.log(`same ${cs} ${k}`); continue; }
			const ok = intended.has(`${cs} ${k}`);
			if (!ok) fail++;
			const n = N.find(x => x[cs].r[k] !== ref) || N[0];
			console.log(`${ok ? 'INTENDED' : 'DIFF'} ${cs} ${k}${oStable ? '' : ' (original side itself unstable across repeats)'}\n  original: ${String(ref).slice(0, 500)}\n  new:      ${String(n[cs].r[k]).slice(0, 500)}`);
		}
	}
	console.log(fail ? `x2t-browser: FAIL, ${fail} unintended difference(s)` : `x2t-browser: PASS (${Object.keys(O[0]).length} cases, ${O.length} repeat(s) per side)`);
	process.exit(fail ? 1 : 0);
}

const [mode, ...args] = process.argv.slice(2);
(async () => {
	if (mode === 'side') await side(args[0], args[1], args.slice(2));
	else if (mode === 'compare') { const i = args.indexOf('--'); compare(args[0], args.slice(1, i), args.slice(i + 1)); }
	else throw new Error('usage: side|compare');
})().catch(e => { console.error(e); process.exit(2); });
