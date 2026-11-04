'use strict';
// Runner of convert-docx-pdf.sh (PKT-0131). Per run: a fresh key; POST /ConvertService.ashx {async:true,
// filetype:docx, outputtype:pdf, url:<local file server>/open-docx-10p.docx}, re-posted every POLL ms until
// endConvert; then GET fileUrl until the last byte of the PDF (t_end). t0 = first POST sent.
// Stages from the DocService and converter DEBUG logs (same machine clock, 1 ms resolution), filtered by key.
// JWT: signed with services.CoAuthoring.secret.inbox.string of local.json (or $JWT_SECRET), as perf/e2e-convert.js.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = process.env.JOURNEY_BASE || 'http://127.0.0.1';
const RUNS = +(process.env.RUNS || 7), POLL = +(process.env.POLL || 20);
const FILE = path.join(__dirname, 'open-docx-10p.docx');
const DSLOG = process.env.DS_LOG || '/var/log/euro-office/documentserver/docservice/out.log';
const CVLOG = process.env.CV_LOG || '/var/log/euro-office/documentserver/converter/out.log';
const SECRET = process.env.JWT_SECRET || (() => { try { return JSON.parse(fs.readFileSync('/etc/euro-office/documentserver/local.json', 'utf8')).services.CoAuthoring.secret.inbox.string; } catch { return null; } })();
const b64u = b => Buffer.from(b).toString('base64url');
const sign = p => { const d = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify(p)); return d + '.' + crypto.createHmac('sha256', SECRET).update(d).digest('base64url'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const size = f => { try { return fs.statSync(f).size; } catch { return 0; } };
const ts = l => { const m = /^\[(\d{4}-\d\d-\d\dT[\d:.]+)\]/.exec(l); return m ? Date.parse(m[1]) : NaN; };
const DOC = fs.readFileSync(FILE);
const srv = http.createServer((q, s) => { s.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': DOC.length }); s.end(DOC); });
function post(body) {
  return new Promise((res, rej) => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (SECRET) headers.Authorization = 'Bearer ' + sign({ payload: body });
    const r = http.request(BASE + '/ConvertService.ashx', { method: 'POST', headers }, rs => { let d = ''; rs.on('data', c => d += c); rs.on('end', () => { try { res(JSON.parse(d)); } catch { rej(new Error(d.slice(0, 200))); } }); });
    r.on('error', rej); r.end(JSON.stringify(body));
  });
}
const get = url => new Promise((res, rej) => http.get(url.replace(/^https?:\/\/[^/]+/, BASE), rs => { let n = 0; rs.on('data', c => n += c.length); rs.on('end', () => res({ n, status: rs.statusCode })); }).on('error', rej));

async function run(i) {
  const key = 'jc' + Date.now() + i;
  const body = { async: true, filetype: 'docx', outputtype: 'pdf', key, title: 'open-docx-10p.docx', url: `http://127.0.0.1:${srv.address().port}/open-docx-10p.docx` };
  const ds0 = size(DSLOG), cv0 = size(CVLOG);
  const t0 = Date.now();
  let r = await post(body), polls = 1;
  while (!r.error && !r.endConvert) { await sleep(POLL); r = await post(body); polls++; }
  const tConv = Date.now();
  if (r.error || !r.fileUrl) throw new Error('convert error ' + JSON.stringify(r));
  const g = await get(r.fileUrl);
  const tEnd = Date.now();
  if (g.status !== 200 || g.n < 1000) throw new Error('bad pdf download ' + JSON.stringify(g));
  await sleep(300);
  const L = f => fs.readFileSync(f).slice(f === DSLOG ? ds0 : cv0).toString().split('\n').filter(l => l.includes(key));
  const ds = L(DSLOG), cv = L(CVLOG);
  const first = (A, re) => { const l = A.find(x => re.test(x)); return l ? ts(l) : NaN; };
  const m = {
    t0, tConv, tEnd, polls, pdfBytes: g.n,
    req: first(ds, /Start convert request/),             // DocService converterservice.convertRequest got the POST
    cvStart: first(cv, /Start Task/),                     // FileConverter took the task from RabbitMQ
    dl: first(cv, /downloadFile complete/),               // source docx downloaded from the integrator URL
    x2tEnd: first(cv, /ExitCode/),                        // x2t docx -> pdf (DoctRenderer + sdkjs word) exited
    cvEnd: first(cv, /End Task/),                         // output.pdf uploaded to storage, postProcess
    recv: first(ds, /receiveTask start/),                 // DocService got the converter response
  };
  const st = { request: m.req - t0, queue: m.cvStart - m.req, download: m.dl - m.cvStart, x2t: m.x2tEnd - m.dl,
    upload: m.cvEnd - m.x2tEnd, result: m.recv - m.cvEnd, poll: tConv - m.recv, fetch: tEnd - tConv, total: tEnd - t0 };
  st.unattributed = st.total - Object.entries(st).filter(([k]) => k !== 'total').reduce((x, [, v]) => x + v, 0);
  return { m, st };
}
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const all = [];
  try { for (let i = 0; i < RUNS; i++) all.push(await run(i)); } finally { srv.close(); }
  if (process.env.JOURNEY_JSON) fs.writeFileSync(process.env.JOURNEY_JSON, JSON.stringify(all, null, 1));
  const ok = all.filter(r => Object.values(r.st).every(Number.isFinite));
  const med = k => { const v = ok.map(r => r.st[k]).sort((a, b) => a - b); return v[(v.length - 1) >> 1]; };
  const mean = k => +(ok.reduce((a, r) => a + r.st[k], 0) / ok.length).toFixed(1);
  const ks = Object.keys(all[0].st);
  process.stderr.write(JSON.stringify({ incomplete: all.length - ok.length, p50: Object.fromEntries(ks.map(k => [k, med(k)])), mean: Object.fromEntries(ks.map(k => [k, mean(k)])), runs: all.map(r => r.st.total) }) + '\n');
  const t = all.map(r => r.st.total).sort((a, b) => a - b);
  console.log(`total_ms=${t[(t.length - 1) >> 1]} min_ms=${t[0]} max_ms=${t[t.length - 1]} runs=${t.length}`);
})().catch(e => { console.error('FAIL convert-docx-pdf', e.message); process.exit(1); });
