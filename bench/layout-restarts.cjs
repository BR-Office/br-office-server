// SPDX-License-Identifier: AGPL-3.0-only
// Who starts a layout pass during the open, and what else runs on the main thread between the slices.
const fs = require('fs'); const { chromium } = require('playwright');
const [BASE, FILE] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block', viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    window.__ev = [];
    const iv = setInterval(() => {
      const D = window.AscCommonWord && AscCommonWord.CDocument; if (!D || D.prototype.__w) return; clearInterval(iv); D.prototype.__w = 1;
      const wrap = (name, tag) => { const f = D.prototype[name]; if (!f) return; D.prototype[name] = function () {
        const st = (new Error().stack || '').split('\n').slice(2, 7).map(l => l.trim().replace(/^at /, '').replace(/\(.*\//, '(').replace(/:\d+\)$/, ')')).join(' < ');
        const s = performance.now(); const r = f.apply(this, arguments);
        window.__ev.push({ at: Math.round(s), ms: +(performance.now() - s).toFixed(1), tag, page: this.FullRecalc ? this.FullRecalc.StartPage : -1, st }); return r; }; };
      wrap('private_Recalculate', 'recalc'); wrap('RecalculateFromStart', 'fromStart'); wrap('ContinueRecalculationLoop', 'slice');
      // long tasks on the main thread, attributed by the script running
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ev.push({ at: Math.round(e.startTime), ms: +e.duration.toFixed(0), tag: 'longtask', st: (e.attribution || []).map(a => a.containerSrc || a.containerName || a.name).join(',') }); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
    }, 2);
  });
  const p = await ctx.newPage(); await p.goto(BASE + '/example/');
  const name = await p.evaluate(async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const fd = new FormData(); fd.append('uploadedFile', new File([bin], 'doc.docx')); return (await (await fetch('/example/upload', { method: 'POST', body: fd })).json()).filename; }, fs.readFileSync(FILE).toString('base64'));
  await p.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  let f; for (let i = 0; i < 2400; i++) { f = p.frames().find(x => x.name() === 'frameEditor'); if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break; await p.waitForTimeout(25); }
  await f.evaluate(() => new Promise(res => { const t = () => { const d = editor.WordControl.m_oLogicDocument; if (d.FullRecalc.Id != null) return setTimeout(t, 5); requestAnimationFrame(() => requestAnimationFrame(res)); }; t(); }));
  await p.waitForTimeout(1500);
  const ev = await f.evaluate(() => window.__ev.sort((a, b) => a.at - b.at));
  for (const e of ev) { if (e.tag === 'slice' && e.ms < 60) continue; console.log(`${String(e.at).padStart(6)} ${String(e.ms).padStart(6)}ms ${e.tag.padEnd(9)} ${e.page >= 0 ? 'from p' + e.page : ''} ${e.st || ''}`); }
  await b.close();
})();
