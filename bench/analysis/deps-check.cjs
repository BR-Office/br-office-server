// SPDX-License-Identifier: AGPL-3.0-only
// Load-time dependency check for splitting the sdk-all bundle.
// Parses every file of the word bundle (sdk.min + sdk.common) with acorn and records, at IIFE top level only
// (code that runs when the script loads), the namespace symbols each file DEFINES (NS.Sym = ...) and REFERENCES.
// Given a partition (regex of files going to a later chunk), reports every top-level reference in the files that
// stay in the earlier chunks to a symbol defined only by the later chunk: those would throw at load.
// Also lists, per deferred symbol, the non-deferred files that reference it inside functions (runtime entry points).
// Usage: node deps-check.cjs <sdkjs root> <deferred-regex> [--verbose]
const SDKJS = process.env.SDKJS_DIR || require('path').resolve(__dirname, require('fs').existsSync(require('path').resolve(__dirname, '../../../sdkjs')) ? '../../../sdkjs' : '../../../br-office-sdkjs'); // the sdkjs checkout (sibling repo), for its build/node_modules
const fs = require('fs'); const path = require('path');
const acorn = require(SDKJS + '/build/node_modules/acorn');
const [ROOT, DEFER_RE, VERBOSE] = process.argv.slice(2);
const deferRe = new RegExp(DEFER_RE);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/word.json'), 'utf8')).sdk;
const files = [...cfg.min.map((f) => ({ f, chunk: 'min' })), ...cfg.common.map((f) => ({ f, chunk: deferRe.test(f) ? 'deferred' : 'all' }))];
const NS = new Set(['AscCommon', 'AscFormat', 'AscCommonWord', 'AscWord', 'AscCommonExcel', 'AscCommonSlide', 'AscPDF', 'AscViewer', 'AscDFH', 'Asc', 'AscMath', 'AscFonts', 'AscBuilder', 'AscVisio', 'AscCommonDraw', 'AscTest', 'AscPlugin', 'AscH']);
const KNOWN = new Set(['window', 'document', 'undefined', 'Math', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Function', 'Date', 'RegExp', 'Error', 'TypeError', 'JSON', 'console', 'navigator', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'escape', 'unescape', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'XMLHttpRequest', 'FileReader', 'Blob', 'File', 'FormData', 'Image', 'Worker', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'location', 'history', 'localStorage', 'sessionStorage', 'Infinity', 'NaN', 'arguments', 'this', 'eval', 'globalThis', 'self', 'top', 'parent', 'screen', 'getComputedStyle', 'TextDecoder', 'TextEncoder', 'URL', 'DOMParser', 'XMLSerializer', 'Intl', 'crypto', 'atob', 'btoa', 'alert', 'WebAssembly', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MutationObserver', 'ResizeObserver', 'queueMicrotask', 'structuredClone', 'BigInt', 'Audio', 'speechSynthesis', 'SpeechSynthesisUtterance', 'CanvasRenderingContext2D', 'OffscreenCanvas', 'ImageData', 'Path2D', 'DOMMatrix', 'fetch', 'Headers', 'Request', 'Response', 'AbortController', 'devicePixelRatio', 'innerWidth', 'innerHeight', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'postMessage', 'open', 'close', 'focus', 'blur', 'scrollTo', 'scrollBy', 'getSelection', 'MessageChannel', 'Notification', 'ClipboardItem', 'DragEvent', 'KeyboardEvent', 'MouseEvent', 'TouchEvent', 'WheelEvent', 'Range', 'Text', 'Document', 'Window', 'HTMLCanvasElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLDivElement', 'Option', 'XRegExp', 'jQuery', '$', 'io', 'require', 'module', 'exports', 'define', 'process', 'global', 'Buffer', 'SharedArrayBuffer', 'Atomics', 'WebSocket', 'EventSource', 'IntersectionObserver', 'PerformanceObserver', 'ReadableStream', 'WritableStream', 'TransformStream', 'CompressionStream', 'DecompressionStream', 'Iterator', 'AggregateError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError', 'FinalizationRegistry', 'WeakRef', 'name', 'status', 'event', 'external', 'opener', 'frames', 'length', 'origin', 'print', 'stop', 'confirm', 'prompt', 'matchMedia', 'getEventListeners', 'DOMException', 'NodeFilter', 'XPathResult', 'MediaRecorder', 'AudioContext', 'ImageBitmap', 'createImageBitmap', 'SVGElement', 'XMLDocument', 'HTMLDocument', 'HTMLIFrameElement', 'HTMLScriptElement', 'HTMLStyleElement', 'HTMLLinkElement', 'HTMLAnchorElement', 'HTMLBodyElement', 'HTMLHtmlElement', 'HTMLHeadElement', 'HTMLSelectElement', 'HTMLOptionElement', 'HTMLTableElement', 'HTMLButtonElement', 'HTMLSpanElement', 'HTMLLabelElement', 'HTMLFormElement', 'HTMLVideoElement', 'HTMLAudioElement', 'HTMLMediaElement', 'HTMLUListElement', 'HTMLLIElement', 'HTMLParagraphElement', 'HTMLPreElement', 'HTMLBRElement', 'HTMLHRElement', 'HTMLTableRowElement', 'HTMLTableCellElement', 'HTMLTableSectionElement', 'ClipboardEvent', 'InputEvent', 'CompositionEvent', 'FocusEvent', 'UIEvent', 'PointerEvent', 'Touch', 'TouchList', 'DataTransfer', 'Clipboard', 'FontFace', 'FontFaceSet', 'CSS', 'CSSStyleDeclaration', 'StyleSheet', 'CSSStyleSheet', 'MediaQueryList', 'Selection', 'TreeWalker', 'NodeIterator', 'DocumentFragment', 'ShadowRoot', 'Comment', 'CDATASection', 'ProcessingInstruction', 'Attr', 'NamedNodeMap', 'NodeList', 'HTMLCollection', 'DOMTokenList', 'DOMStringList', 'DOMRect', 'DOMRectReadOnly', 'DOMPoint', 'DOMPointReadOnly', 'DOMQuad', 'Path2D', 'TextMetrics', 'ImageBitmapRenderingContext', 'WebGLRenderingContext', 'WebGL2RenderingContext', 'CanvasGradient', 'CanvasPattern']);
const KNOWN_SDK_GLOBALS = new Set(['editor', 'Api', 'AscDesktopEditor', 'NATIVE_EDITOR_ENJINE', 'native', 'g_oTableId', 'History', 'g_oIdCounter', 'CollaborativeEditing', 'g_fontApplication', 'g_font_loader', 'g_image_loader', 'g_fontManager', 'g_oTextMeasurer', 'g_oDocumentRenderer', 'GlobalSkin', 'g_dKoef_mm_to_pix', 'g_dKoef_pix_to_mm', 'g_dKoef_mm_to_pt', 'g_dKoef_pt_to_mm', 'g_dKoef_in_to_mm', 'g_dKoef_mm_to_in', 'g_dKoef_emu_to_mm', 'g_dKoef_mm_to_emu', 'g_dKoef_twips_to_pt', 'g_dKoef_pt_to_twips', 'g_dKoef_twips_to_mm', 'g_dKoef_mm_to_twips', 'g_dKoef_twips_to_in', 'g_dKoef_in_to_twips', 'ZLib', 'Hyphenation', 'sdkjs_fonts', 'sdk_scripts']);

function parse(src) {
	try { return acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, allowHashBang: true, locations: true }); }
	catch (e) { return null; }
}
function memberName(node) {
	// returns ['NS', 'Sym'] for NS.Sym / window.NS.Sym / window['NS']['Sym'] ..., or ['window', 'X'] for window.X / window['X']
	const parts = []; let n = node;
	while (n && n.type === 'MemberExpression') { if (n.computed) { if (n.property.type === 'Literal' && typeof n.property.value === 'string') parts.unshift(n.property.value); else return null; } else parts.unshift(n.property.name); n = n.object; }
	if (!n || n.type !== 'Identifier') return null; parts.unshift(n.name);
	if (parts[0] === 'window') parts.shift();
	if (parts.length < 2) return parts.length === 1 && NS.has(parts[0]) ? null : (parts.length === 1 ? ['window', parts[0]] : null);
	if (!NS.has(parts[0])) return ['window', parts[0]];
	return [parts[0], parts[1]];
}
const defs = new Map(); // 'NS.Sym' -> Set(files)
const topRefs = []; // {file, chunk, sym, line}
const innerRefs = new Map(); // 'NS.Sym' -> Map(file -> count) for references inside functions
const bareTopDecls = new Map(); // file -> [names] declared outside any IIFE (true globals)
const bareTopRefs = []; // {file, chunk, name, line}
const parseErrors = [];
for (const { f, chunk } of files) {
	const abs = path.join(ROOT, f); let src; try { src = fs.readFileSync(abs, 'utf8'); } catch (e) { parseErrors.push(f + ': ' + e.message); continue; }
	const ast = parse(src); if (!ast) { parseErrors.push(f + ': parse error'); continue; }
	const declared = new Set(); // names declared at top level or in the outer IIFE scope (vars, functions, params)
	const topDecls = [];
	function collectDecls(body, isGlobal, params) {
		for (const p of params || []) if (p.type === 'Identifier') declared.add(p.name);
		for (const st of body) {
			if (st.type === 'VariableDeclaration') for (const d of st.declarations) { if (d.id.type === 'Identifier') { declared.add(d.id.name); if (isGlobal) topDecls.push(d.id.name); } }
			else if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') { if (st.id) { declared.add(st.id.name); if (isGlobal) topDecls.push(st.id.name); } }
		}
	}
	collectDecls(ast.body, true, []);
	const iifes = [];
	for (const st of ast.body) {
		let e = st.type === 'ExpressionStatement' ? st.expression : null;
		if (e && e.type === 'UnaryExpression') e = e.argument;
		if (e && e.type === 'CallExpression' && e.callee.type === 'FunctionExpression') { iifes.push(e.callee); collectDecls(e.callee.body.body, false, e.callee.params); }
	}
	if (topDecls.length) bareTopDecls.set(f, topDecls);
	// walk
	function walk(node, depth, parent) {
		if (!node || typeof node.type !== 'string') return;
		let d = depth;
		if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') { if (!iifes.includes(node)) d = depth + 1; }
		if (node.type === 'AssignmentExpression' && d === 0 && node.left.type === 'MemberExpression') {
			let m = memberName(node.left);
			if (m && m[0] === 'window' && declared.has(m[1])) m = null;
			if (m) { const sym = m.join('.'); if (!defs.has(sym)) defs.set(sym, new Set()); defs.get(sym).add(f); }
		}
		if (node.type === 'MemberExpression') {
			let m = memberName(node);
			// obj.x where obj is a local of this file (a var, function or parameter in the IIFE scope) is not a global symbol
			if (m && m[0] === 'window' && declared.has(m[1])) m = null;
			if (m) {
				const sym = m.join('.');
				const isDefLhs = parent && parent.type === 'AssignmentExpression' && parent.left === node;
				if (!isDefLhs) {
					if (d === 0) topRefs.push({ file: f, chunk, sym, line: node.loc.start.line });
					else { if (!innerRefs.has(sym)) innerRefs.set(sym, new Map()); const mm = innerRefs.get(sym); mm.set(f, (mm.get(f) || 0) + 1); }
				}
				// do not descend into the chain again (we handled the whole chain)
				if (node.object.type === 'MemberExpression' && node.computed) walk(node.property, d, node);
				return;
			}
		}
		if (node.type === 'Identifier' && d === 0 && parent && !(parent.type === 'MemberExpression' && parent.property === node && !parent.computed) && !(parent.type === 'Property' && parent.key === node && !parent.computed) && !(parent.type === 'MethodDefinition' && parent.key === node) && !(parent.type === 'VariableDeclarator' && parent.id === node) && !(parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' || parent.type === 'ClassDeclaration') && !(parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement')) {
			if (!declared.has(node.name) && !KNOWN.has(node.name) && !NS.has(node.name) && !KNOWN_SDK_GLOBALS.has(node.name)) bareTopRefs.push({ file: f, chunk, name: node.name, line: node.loc.start.line });
		}
		for (const k of Object.keys(node)) { if (k === 'loc' || k === 'type') continue; const v = node[k]; if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, d, node); } else if (v && typeof v.type === 'string') walk(v, d, node); }
	}
	walk(ast, 0, null);
}
const chunkOf = new Map(files.map(({ f, chunk }) => [f, chunk]));
const deferredOnly = (sym) => { const s = defs.get(sym); return s && [...s].every((f) => chunkOf.get(f) === 'deferred'); };
console.log(`files: ${files.length} (deferred: ${files.filter((x) => x.chunk === 'deferred').length}); symbols defined: ${defs.size}; parse errors: ${parseErrors.length}`);
for (const e of parseErrors) console.log('  ! ' + e);
// 1. load-time violations
const viol = topRefs.filter((r) => r.chunk !== 'deferred' && deferredOnly(r.sym));
console.log(`\n== load-time references from earlier chunks to deferred-only symbols: ${viol.length}`);
for (const v of viol.slice(0, 200)) console.log(`  ${v.file}:${v.line}  ${v.sym}   (defined in ${[...defs.get(v.sym)].join(', ')})`);
// 2. order inside: deferred files referencing at load time symbols defined ONLY by later chunks? not applicable (deferred is last)
// 3. runtime entry points: deferred-only symbols referenced inside functions of non-deferred files
const entries = [];
for (const [sym, m] of innerRefs) if (deferredOnly(sym)) for (const [file, n] of m) if (chunkOf.get(file) !== 'deferred') entries.push({ sym, file, n });
const bySym = {}; for (const e of entries) { bySym[e.sym] = bySym[e.sym] || []; bySym[e.sym].push(`${e.file.replace(/^.*\//, '')}×${e.n}`); }
console.log(`\n== deferred-only symbols used inside functions of non-deferred files: ${Object.keys(bySym).length} symbols, ${entries.length} (file,symbol) pairs`);
for (const [sym, arr] of Object.entries(bySym).sort((a, b) => b[1].length - a[1].length).slice(0, VERBOSE ? 400 : 80)) console.log(`  ${sym.padEnd(50)} ${arr.join(' ')}`);
// 4. bare globals declared by deferred files (true top-level var/function outside IIFE) and referenced elsewhere
const deferredGlobals = new Set(); for (const [f, names] of bareTopDecls) if (chunkOf.get(f) === 'deferred') for (const n of names) deferredGlobals.add(n);
console.log(`\n== bare globals declared by deferred files: ${deferredGlobals.size}`);
if (deferredGlobals.size) console.log('  ' + [...deferredGlobals].slice(0, 100).join(', '));
const bareViol = bareTopRefs.filter((r) => r.chunk !== 'deferred' && deferredGlobals.has(r.name));
console.log(`== load-time bare references to them from earlier chunks: ${bareViol.length}`);
for (const v of bareViol.slice(0, 50)) console.log(`  ${v.file}:${v.line}  ${v.name}`);
// 5. symbols both chunks define (same NS.Sym assigned in deferred and non-deferred files): a deferred load would overwrite
const dup = [...defs.entries()].filter(([sym, s]) => { const cs = new Set([...s].map((f) => chunkOf.get(f))); return cs.has('deferred') && cs.size > 1; });
console.log(`\n== symbols assigned both in deferred and earlier files: ${dup.length}`);
for (const [sym, s] of dup.slice(0, 60)) console.log(`  ${sym.padEnd(50)} ${[...s].map((f) => f.replace(/^.*\//, '')).join(', ')}`);
fs.writeFileSync(path.join(__dirname, 'deps-check-last.json'), JSON.stringify({ viol, entries, dup: dup.map(([s, f]) => [s, [...f]]), bareTopDecls: [...bareTopDecls] }, null, 1));
// 6. bare top-level declarations (outside any IIFE) in EARLIER chunks that deferred files read anywhere: in the single
// sdk-all wrapper those are shared locals; split into separate files they become ReferenceErrors in the later chunk.
const earlierBare = new Map(); for (const [f, names] of bareTopDecls) if (chunkOf.get(f) !== 'deferred' && chunkOf.get(f) !== 'min') for (const n of names) { if (!earlierBare.has(n)) earlierBare.set(n, []); earlierBare.get(n).push(f.replace(/^.*\//, '')); }
console.log(`\n== bare top-level declarations in the 'all' chunk (outside IIFEs), non-deferred files: ${earlierBare.size} names in ${[...bareTopDecls].filter(([f]) => chunkOf.get(f) === 'all').length} files`);
console.log('  ' + [...earlierBare.keys()].slice(0, 80).join(', '));
// identifier reads in deferred files (any depth) of those names, when not declared in the deferred file itself
const acornWalkReads = (f) => { const src = fs.readFileSync(path.join(ROOT, f), 'utf8'); const ast = parse(src); const declaredHere = new Set(); const reads = new Map();
	function decl(body, params) { for (const p of params || []) if (p.type === 'Identifier') declaredHere.add(p.name); for (const st of body) { if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') declaredHere.add(d.id.name); else if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') if (st.id) declaredHere.add(st.id.name); } }
	decl(ast.body, []); for (const st of ast.body) { let e = st.type === 'ExpressionStatement' ? st.expression : null; if (e && e.type === 'UnaryExpression') e = e.argument; if (e && e.type === 'CallExpression' && e.callee.type === 'FunctionExpression') decl(e.callee.body.body, e.callee.params); }
	(function w(node, parent) { if (!node || typeof node.type !== 'string') return; if (node.type === 'Identifier' && earlierBare.has(node.name) && !declaredHere.has(node.name) && !(parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed) && !(parent && parent.type === 'Property' && parent.key === node && !parent.computed)) reads.set(node.name, (reads.get(node.name) || 0) + 1); for (const k of Object.keys(node)) { if (k === 'loc' || k === 'type') continue; const v = node[k]; if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') w(c, node); } else if (v && typeof v.type === 'string') w(v, node); } })(ast, null);
	return reads; };
let crossBare = 0;
for (const { f, chunk } of files) if (chunk === 'deferred') { const reads = acornWalkReads(f); for (const [n, c] of reads) { crossBare++; console.log(`  ${f}: reads bare '${n}' ×${c} (declared in ${earlierBare.get(n).join(', ')})`); } }
console.log(`== cross-chunk bare variable reads from deferred files: ${crossBare}`);
