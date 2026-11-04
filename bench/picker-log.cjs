// SPDX-License-Identifier: AGPL-3.0-only
const fs = require('fs'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    window.__pick = []; window.onLogPickFont = (s) => { window.__pick.push({ s, st: (new Error().stack || '').split('\n').slice(3, 8).map(l => l.trim().replace(/^at /, '').replace(/\(.*\//, '(').replace(/:\d+\)$/, ')')).join(' < ') }); };
  });
  const p = await ctx.newPage(); await p.goto(BASE + '/example/');
  const name = await p.evaluate(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], 'doc.docx')); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, fs.readFileSync(FILE).toString('base64'));
  await p.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  let f; for (let i = 0; i < 2400; i++) { f = p.frames().find(x => x.name() === 'frameEditor'); if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await p.waitForTimeout(50); }
  await p.waitForTimeout(1500);
  const picks = await f.evaluate(() => window.__pick);
  for (const x of picks) { const m = /FontBySymbol: (\d+) => (.*)/.exec(x.s); const code = m ? parseInt(m[1]) : null; console.log(x.s + (code ? ' (' + JSON.stringify(String.fromCodePoint(code)) + ' U+' + code.toString(16).toUpperCase() + ')' : ''), '\n     ', x.st); }
  await b.close();
})();
