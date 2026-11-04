'use strict';
// Runner of save.sh (PKT-0130). Per run: upload open-docx-10p.docx to the example, open it, type 5 letters,
// wait until the client has sent its changes (not measured), then close the editor tab (t0 = page.close()).
// End = the example's stored file is replaced by the saved version (mtime/size change, polled every 10 ms).
// Stages are attributed from the DocService and converter DEBUG logs (same machine clock, ms resolution).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const RUNS = +(process.env.RUNS || 5);
const FILE = path.join(__dirname, 'open-docx-10p.docx');
const STORE = process.env.EXAMPLE_STORE || '/var/lib/euro-office/documentserver-example/files/127.0.0.1';
const DSLOG = process.env.DS_LOG || '/var/log/euro-office/documentserver/docservice/out.log';
const CVLOG = process.env.CV_LOG || '/var/log/euro-office/documentserver/converter/out.log';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const size = f => { try { return fs.statSync(f).size; } catch { return 0; } };
const tail = (f, from) => { const b = fs.readFileSync(f); return b.slice(from).toString(); };
const ts = l => { const m = /^\[(\d{4}-\d\d-\d\dT[\d:.]+)\]/.exec(l); return m ? Date.parse(m[1]) : NaN; };

async function run(i, browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/example/');
  const res = await page.request.post(BASE + '/example/upload', { multipart: { uploadedFile: { name: 'save.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: fs.readFileSync(FILE) } } });
  const name = (await res.json()).filename;
  const fp = path.join(STORE, name);
  await page.goto(BASE + '/example/editor?fileName=' + encodeURIComponent(name), { waitUntil: 'domcontentloaded' });
  let f; const dl = Date.now() + 120000;
  for (;;) {
    if (Date.now() > dl) throw new Error('editor did not complete');
    f = page.frames().find(x => x.name() === 'frameEditor');
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => false)) break;
    await sleep(50);
  }
  await sleep(1500);
  const box = await (await f.frameElement()).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 260);
  for (const k of 'saved') { await page.keyboard.press(k); await sleep(100); }
  // wait until the client has no unsent changes (CoAuthoringApi saveChanges acknowledged)
  for (let d = Date.now() + 20000; Date.now() < d; await sleep(100))
    if (await f.evaluate(() => !editor.asc_isDocumentModified || !AscCommon.CollaborativeEditing.Have_OtherChanges && !editor.CoAuthoringApi.get_isExistChanges?.() ).catch(() => true)) break;
  await sleep(1500);
  const st0 = fs.statSync(fp), ds0 = size(DSLOG), cv0 = size(CVLOG);
  const t0 = Date.now();
  await page.close({ runBeforeUnload: false });
  const tClosed = Date.now();
  let tEnd;
  for (const d = t0 + 120000; Date.now() < d; await sleep(10)) {
    let s; try { s = fs.statSync(fp); } catch { continue; }
    if (s.mtimeMs !== st0.mtimeMs || s.size !== st0.size) { tEnd = Date.now(); break; }
  }
  await ctx.close();
  if (!tEnd) throw new Error('saved file never appeared');
  await sleep(300);
  const ds = tail(DSLOG, ds0).split('\n'), cv = tail(CVLOG, cv0).split('\n');
  const first = (L, re) => { const l = L.find(x => re.test(x)); return l ? ts(l) : NaN; };
  const last = (L, re) => { const l = L.filter(x => re.test(x)).pop(); return l ? ts(l) : NaN; };
  const m = {
    t0, tClosed, tEnd,
    closed: first(ds, /Connection closed or timed out/),        // DocService sees the socket close
    sfc: first(ds, /Start saveFromChanges/),                     // after savetimeoutdelay (createSaveTimer)
    addTask: first(ds, /AddTask saveFromChanges/),
    cvStart: first(cv, /Start Task/),
    chEnd: first(cv, /processChanges end/),                      // Editor.bin + changes downloaded, written to temp
    x2tEnd: first(cv, /ExitCode/),                               // x2t (doctrenderer applies changes, writes docx)
    cvEnd: first(cv, /End Task/),                                // upload output.docx, postProcess
    recv: first(ds, /receiveTask start/),
    post: first(ds, /postData request/),                         // status 2 callback to the integrator
    postRes: first(ds, /postData response/),
  };
  const st = {
    disconnect: m.closed - t0, save_delay: m.sfc - m.closed, queue: m.cvStart - m.sfc, prepare: m.chEnd - m.cvStart,
    x2t: m.x2tEnd - m.chEnd, upload: m.cvEnd - m.x2tEnd, result: m.post - m.cvEnd, integrator: tEnd - m.post,
    total: tEnd - t0 };
  st.unattributed = st.total - Object.entries(st).filter(([k]) => k !== 'total').reduce((x, [, v]) => x + v, 0);
  return { m, st, ds: ds.filter(Boolean), cv: cv.filter(Boolean) };
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  try { for (let i = 0; i < RUNS; i++) all.push(await run(i, browser)); } finally { await browser.close(); }
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify(all, null, 1));
  const ok = all.filter(r => Object.values(r.st).every(Number.isFinite));
  const med = k => { const v = ok.map(r => r.st[k]).sort((a, b) => a - b); return v[(v.length - 1) >> 1]; };
  const mean = k => +(ok.reduce((a, r) => a + r.st[k], 0) / ok.length).toFixed(1);
  process.stderr.write(JSON.stringify({ incomplete: all.length - ok.length, p50: Object.fromEntries(Object.keys(ok[0].st).map(k => [k, med(k)])), mean: Object.fromEntries(Object.keys(ok[0].st).map(k => [k, mean(k)])) }) + '\n');
  const t = all.map(r => r.m.tEnd - r.m.t0).sort((a, b) => a - b);
  console.log(`total_ms=${t[(t.length - 1) >> 1]} min_ms=${t[0]} max_ms=${t[t.length - 1]} runs=${t.length}`);
})().catch(e => { console.error('FAIL save', e.message); process.exit(1); });
