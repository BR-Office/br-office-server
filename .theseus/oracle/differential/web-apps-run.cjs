// PKT-0096: differential oracle for web-apps, original (external/web-apps.base) against new (external/web-apps).
// Usage: node web-apps-run.cjs <module-name> <editor> <original-build> <new-build> <inputs-dir> <intended-file> <case>...
//   build = output of web-apps-build.sh (web-apps/apps/<editor>/main/{app.js,code.js,app.css,locale/*.json})
// For each case (a file the editor opens: docx, txt, rtf...) and each side, against the running Document Server
// (example on http://localhost/example/): user A and user B open the same fresh upload in Chromium, with the side's
// app.js/code.js/app.css/locale injected by Playwright routing (HTML, vendor, sdkjs, resources are the server's,
// identical for both sides); A makes scripted local edits through the UI (typing, the toolbar Bold button, keys),
// B makes scripted remote (co-editing) edits; A saves (download as DOCX through the server's File menu path) and
// converts (TXT); the saved file is uploaded again and reopened.
// Compared: model dumps after co-editing, what A and B sent (saveChanges, normalized as in run.cjs), what is shown
// (open dialogs answered, document canvases hash of the reopened saved document, and "ui": the visible web-apps DOM of A: toolbar, status bar, left/right panels, with
// ids, classes, text, disabled/pressed state), the reopened saved document and the converted text.
// A difference fails unless "<case> <check>" is listed in the intended file. One timing line per case and side.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [MOD, ED, ORIG, NEW, INPUTS, INTENDED, ...CASES] = process.argv.slice(2);
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

const DUMP = () => {
	const d = editor.WordControl.m_oLogicDocument;
	const el = e => e.constructor.name === 'CTable'
		? { t: 'table', rows: e.Content.map(r => r.Content.map(c => c.Content.Content.map(p => p.GetText()).join('/'))) }
		: { t: e.constructor.name, text: e.GetText(), lines: e.Lines ? e.Lines.length : null,
			runs: e.Content ? e.Content.map(r => (r.Pr && r.Pr.Bold ? 'b' : '') + (r.Pr && r.Pr.FontSize || '')).join(',') : null };
	return { pages: d.GetPagesCount(), content: d.Content.map(el) };
};
const CANVAS = () => [...document.querySelectorAll('#id_viewer, #id_main_view canvas, #id_main canvas')]
	.filter((c, i, a) => !/overlay/i.test(c.id) && a.indexOf(c) === i && c.width > 0).map(c => c.toDataURL()).join('|');
// What web-apps shows: visible elements of the editor chrome, as "tag#id.classes[state] text" lines.
const UI = () => {
	const roots = ['#toolbar', '#statusbar', '#left-menu', '#right-menu', '#viewport-hbox-layout > .layout-item:first-child', '#header']
		.map(s => document.querySelector(s)).filter(Boolean);
	const out = [];
	const walk = (e, depth) => {
		if (depth > 40) return;
		const st = getComputedStyle(e);
		if (st.display === 'none' || st.visibility === 'hidden') return;
		// Co-editors presence box: shown when A hears that B joined or left, timing-dependent (it differed on identical code).
		if (e.id === 'tlb-box-users' || e.classList.contains('box-cousers')) return;
		const cls = [...e.classList].filter(c => !/^(over|hover|active-?focus|focused|x-huge)$/.test(c) && !/\d{3,}/.test(c)).sort().join('.');
		// Status bar action label ("All changes saved"...): transient, timing-dependent text; its element is kept.
		const own = e.id === 'label-action' ? '' : [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
		const state = [e.disabled || e.classList.contains('disabled') ? 'D' : '', e.classList.contains('active') || e.getAttribute('aria-pressed') === 'true' ? 'P' : ''].join('');
		const id = e.id && !/\d{3,}/.test(e.id) ? '#' + e.id : '';
		out.push(' '.repeat(Math.min(depth, 20)) + e.tagName.toLowerCase() + id + (cls ? '.' + cls : '') + (state ? `[${state}]` : '') + (own ? ' ' + own.slice(0, 60) : ''));
		for (const c of e.children) walk(c, depth + 1);
	};
	for (const r of roots) walk(r, 0);
	return out.join('\n');
};

// A: local edits through the UI. B: remote edits at the end. Text through the API (typed keys raced autocorrect).
const STEPS = {
	A: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToStartPos() },
		{ type: 'Local edit ' }, { click: '#id-toolbar-btn-bold' }, { type: 'bold' }, { click: '#id-toolbar-btn-bold' },
		{ press: 'Enter' }, { type: 'second line' }, { press: 'Backspace' }, { press: 'Enter' }],
	B: [{ js: () => editor.WordControl.m_oLogicDocument.MoveCursorToEndPos() }, { press: 'Enter' },
		{ type: 'Remote edit by B' }, { press: 'Enter' }, { type: 'more' }],
	expect: ['Local edit bold', 'Remote edit by B'],
};

let userSeed = 0;
async function shownHash(u) {
	// Spell check off: its underlines arrive asynchronously (the same RTF gave two hashes on identical code).
	await u.f.evaluate(() => { try { editor.asc_setSpellCheck(false); } catch (e) {}
		try { editor.WordControl.m_oDrawingDocument.TargetEnd(); } catch (e) {} });
	let prev = '', same = 0;
	for (let i = 0; i < 60; i++) {
		await u.page.waitForTimeout(300);
		const h = sha(await u.f.evaluate(CANVAS));
		same = h === prev ? same + 1 : 0; prev = h;
		if (same >= 3) return h;
	}
	return prev;
}

async function newUser(browser, build, url) {
	const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
	await ctx.addInitScript(seed => { let x = seed >>> 0 || 1;
		Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }, ++userSeed);
	const re = new RegExp(`/web-apps/apps/${ED}/main/(app\\.js|code\\.js|app\\.css|locale/[\\w-]+\\.json)(\\?|$)`);
	const served = new Set();
	await ctx.route(re, r => {
		const rel = r.request().url().match(re)[1], file = path.join(build, 'web-apps/apps', ED, 'main', rel);
		if (!fs.existsSync(file)) return r.fulfill({ status: 404, body: '' });
		served.add(rel);
		const type = rel.endsWith('.js') ? 'application/javascript' : rel.endsWith('.css') ? 'text/css' : 'application/json';
		return r.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
	});
	const page = await ctx.newPage(), sent = [];
	page.on('websocket', ws => ws.on('framesent', d => { if (/"saveChanges"/.test(d.payload)) sent.push(String(d.payload)); }));
	const t0 = Date.now();
	await page.goto(url);
	let f, dialogs = 0;
	for (let i = 0; ; i++) {
		if (i > 300) throw new Error('editor did not load ' + url);
		f = page.frames().find(f => new RegExp(`web-apps/apps/${ED}/main/index`).test(f.url()));
		if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)
			&& !document.querySelector('.asc-loadmask, #loading-mask:not([style*="none"])')).catch(() => false)) break;
		// Open options dialog of web-apps (txt encoding, csv...): accept the defaults with its OK button, as a user would.
		if (f && i % 5 === 0) { const ok = f.getByRole('button', { name: 'OK', exact: true });
			if (await ok.isVisible().catch(() => false)) { await ok.click().catch(() => {}); dialogs++; } }
		await page.waitForTimeout(100);
	}
	const openMs = Date.now() - t0;
	if (!served.has('app.js') || !served.has('app.css')) throw new Error('side bundle not loaded: ' + [...served]);
	return { ctx, page, f, sent, openMs, dialogs };
}

const unlocked = u => u.f.waitForFunction(() => !AscCommon.CollaborativeEditing.Get_GlobalLock(), null, { timeout: 30000 });
async function play(u, steps) {
	for (const s of steps) {
		await unlocked(u);
		if (s.js) await u.f.evaluate(s.js);
		if (s.click) await u.f.click(s.click);
		await u.f.evaluate(() => { const a = document.querySelector('#area_id'); if (a) a.focus(); });
		if (s.type) await u.f.evaluate(t => editor.asc_enterText([...t].map(c => c.codePointAt(0))), s.type);
		if (s.press) await u.page.keyboard.press(s.press);
		await u.page.waitForTimeout(150);
		await unlocked(u);
	}
}

async function settle(a, b) {
	let prev = '';
	for (let i = 0; i < 100; i++) {
		const da = JSON.stringify(await a.f.evaluate(DUMP)), db = JSON.stringify(await b.f.evaluate(DUMP));
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

// Same normalization as run.cjs: drop the TableId description record and mask new objects' random ParaId.
function normSent(msgs) {
	return msgs.map(m => {
		const o = JSON.parse(m.replace(/^\d+/, ''))[1];
		return JSON.parse(o.changes).filter(c => {
			const b = Buffer.from(c.slice(c.indexOf(';') + 1), 'base64');
			const n = b.readInt32LE(0), id = b.toString('utf16le', 4, 4 + n);
			return !(id === '1' && b.readInt32LE(4 + n) === 131071);
		}).map(c => {
			const b = Buffer.from(c.slice(c.indexOf(';') + 1), 'base64');
			const n = b.readInt32LE(0);
			if (b.toString('utf16le', 4, 4 + n) !== '1') return c;
			b.fill(0, b.length - 4); return c.slice(0, c.indexOf(';') + 1) + b.toString('base64');
		});
	}).flat();
}

async function runSide(browser, side, build, file, tmp) {
	userSeed = 0;
	const name = await upload(file, `diff-${side}-${path.basename(file)}`);
	const url = BASE + 'editor?fileName=' + encodeURIComponent(name);
	const a = await newUser(browser, build, url), b = await newUser(browser, build, url);
	const t = { open: a.openMs, join: b.openMs };
	const dialogs = a.dialogs + b.dialogs;
	const uiOpen = await a.f.evaluate(UI);
	let t0 = Date.now(); await play(a, STEPS.A); await play(b, STEPS.B);
	const model = await settle(a, b); t.edit = Date.now() - t0;
	for (const m of STEPS.expect)
		if (!model.includes(m)) throw new Error(`${side} ${path.basename(file)}: edit "${m}" missing from the model: ${model.slice(0, 1500)}`);
	const ui = uiOpen + '\n---after edits---\n' + await a.f.evaluate(UI);
	const sentB = JSON.stringify(normSent(b.sent)); await b.ctx.close();
	t0 = Date.now(); const saved = await download(a, 'DOCX', path.join(tmp, `${side}.docx`)); t.save = Date.now() - t0;
	t0 = Date.now(); const conv = await download(a, 'TXT', path.join(tmp, `${side}.txt`)); t.convert = Date.now() - t0;
	const r = { dialogs: String(dialogs), model, sentA: JSON.stringify(normSent(a.sent)), sentB, ui, converted: sha(conv) };
	await a.ctx.close();
	const rn = await upload(path.join(tmp, `${side}.docx`), `diff-${side}-reopen-${path.basename(file)}.docx`);
	const c = await newUser(browser, build, BASE + 'editor?fileName=' + encodeURIComponent(rn));
	t.reopen = c.openMs; r.reopened = JSON.stringify(await c.f.evaluate(DUMP));
	// What is shown: the reopened document, single user (A's canvas after co-editing carried B's collaborator
	// marks for a timing-dependent while: identical code gave different hashes).
	r.shown = await shownHash(c);
	await c.ctx.close();
	r.savedBytes = saved.length;
	return { r, t };
}

(async () => {
	// A fresh Chromium per side (memory on the 2-CPU VM: a renderer crashed in the third case with one browser for
	// all), and one retry of a side whose page crashed or did not load; the retry is printed.
	const side = async (name, build, file) => {
		for (let k = 0; ; k++) {
			const browser = await chromium.launch();
			try { return await runSide(browser, name, build, file, tmp); }
			catch (e) { if (k || !/crashed|did not load|closed/i.test(e.message)) throw e; console.log(`retry ${path.basename(file)} ${name}: ${e.message.split('\n')[0]}`); }
			finally { await browser.close().catch(() => {}); }
		}
	};
	const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'web-apps-diff-'));
	let fail = 0;
	for (const cs of CASES) {
		const file = path.join(INPUTS, cs);
		const o = await side('original', ORIG, file);
		const n = await side('new', NEW, file);
		const ft = t => Object.entries(t).map(([k, v]) => `${k}=${v}`).join(' ');
		console.log(`timing ${MOD} ${cs} | original ${ft(o.t)} | new ${ft(n.t)}`);
		for (const k of ['dialogs', 'model', 'sentA', 'sentB', 'shown', 'ui', 'reopened', 'converted']) {
			if (o.r[k] === n.r[k]) { console.log(`same ${cs} ${k}`); continue; }
			const ok = intended.has(`${cs} ${k}`);
			if (!ok) fail++;
			let os = String(o.r[k]), ns = String(n.r[k]);
			if (k === 'ui') {  // show from the first differing line
				const oa = os.split('\n'), na = ns.split('\n'); let i = 0;
				while (i < oa.length && oa[i] === na[i]) i++;
				os = `line ${i}: ` + oa.slice(i, i + 4).join(' | '); ns = `line ${i}: ` + na.slice(i, i + 4).join(' | ');
			}
			if (/^sent/.test(k)) {
				const oa = JSON.parse(os), na = JSON.parse(ns); let i = 0;
				while (i < oa.length && oa[i] === na[i]) i++;
				os = `#${i}/${oa.length} ` + oa.slice(i, i + 3).join(' '); ns = `#${i}/${na.length} ` + na.slice(i, i + 3).join(' ');
			}
			console.log(`${ok ? 'INTENDED' : 'DIFF'} ${cs} ${k}\n  original: ${os.slice(0, 400)}\n  new:      ${ns.slice(0, 400)}`);
		}
	}
	fs.rmSync(tmp, { recursive: true, force: true });
	console.log(fail ? `differential ${MOD}: FAIL, ${fail} unintended difference(s)` : `differential ${MOD}: PASS (${CASES.length} cases)`);
	process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
