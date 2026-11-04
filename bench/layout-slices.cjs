// SPDX-License-Identifier: AGPL-3.0-only
// Slices of the background layout on open: per ContinueRecalculationLoop call, wall time inside it, gap before it.
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block', viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    window.__s = []; window.__t0 = performance.now();
    const iv = setInterval(() => {
      const D = window.AscCommonWord && AscCommonWord.CDocument; if (!D || D.prototype.__w) return; clearInterval(iv); D.prototype.__w = 1;
      const f = D.prototype.ContinueRecalculationLoop;
      D.prototype.ContinueRecalculationLoop = function () { const s = performance.now(), p0 = this.FullRecalc.PageIndex; const r = f.apply(this, arguments); window.__s.push({ at: Math.round(s), ms: +(performance.now() - s).toFixed(1), pages: this.FullRecalc.PageIndex - p0 }); return r; };
    }, 2);
  });
  const p = await ctx.newPage(); await p.goto(BASE + '/example/');
  const name = await p.evaluate(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], 'doc.docx')); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, fs.readFileSync(FILE).toString('base64'));
  await p.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  let f; for (let i = 0; i < 2400; i++) { f = p.frames().find(x => x.name() === 'frameEditor'); if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await p.waitForTimeout(25); }
  await f.evaluate(() => new Promise(res => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
  const s = await f.evaluate(() => ({ s: window.__s, now: Math.round(performance.now()), pages: editor.WordControl.m_oLogicDocument.GetPagesCount() }));
  const calc = s.s.reduce((a, x) => a + x.ms, 0); const first = s.s[0] ? s.s[0].at : 0, last = s.s.length ? s.s[s.s.length - 1].at + s.s[s.s.length - 1].ms : 0;
  console.log(`pages ${s.pages}, slices ${s.s.length}, compute ${calc.toFixed(0)} ms, first slice at ${first} ms, last ends ${last.toFixed(0)} ms => span ${(last - first).toFixed(0)} ms, idle inside span ${(last - first - calc).toFixed(0)} ms`);
  console.log(s.s.map(x => `@${x.at} ${x.ms}ms/${x.pages}p`).join('  '));
  await b.close();
})();
