// End-to-end ConvertService probe (PKT-0015).
// Usage: node .theseus/oracle/perf/e2e-convert.js [runs] [concurrency] [base] [hostIp]
// Needs the full-stack container running on :8080 with JWT_ENABLED=false (see .theseus/adapter/environment.md).
// Serves the sample files (perf/samples, the image's own en-US "new.*" templates) over HTTP on the docker
// bridge gateway so the container can download them, then times POST /ConvertService.ashx (sync) per pair:
// request -> DocService -> RabbitMQ -> FileConverter/x2t -> result URL, plus the download of the result.
const http = require('http'), fs = require('fs'), path = require('path');
const RUNS = +(process.argv[2] || 10);
const CONC = +(process.argv[3] || 1);
const BASE = process.argv[4] || 'http://127.0.0.1:8080';
const HOST = process.argv[5] || '172.17.0.1';
const ASYNC = process.env.SYNC !== '1'; // SYNC=1 measures the server's own sync mode instead
const POLL = 50;
const DIR =path.join(__dirname, 'samples');
const PAIRS = [['docx', 'pdf'], ['docx', 'odt'], ['xlsx', 'pdf'], ['xlsx', 'ods'], ['pptx', 'pdf'], ['pptx', 'odp'], ['pdf', 'docx']];

const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

function post(url, body) {
  return new Promise((res, rej) => {
    const r = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }, rs => {
      let d = ''; rs.on('data', c => d += c); rs.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(new Error(d.slice(0, 200))); } });
    });
    r.on('error', rej); r.end(JSON.stringify(body));
  });
}
function get(url) {
  return new Promise((res, rej) => http.get(url.replace(/^https?:\/\/[^/]+/, BASE), rs => { let n = 0; rs.on('data', c => n += c.length); rs.on('end', () => res(n)); }).on('error', rej));
}

async function one(from, to, i) {
  const t = process.hrtime.bigint();
  const body = {
    async: ASYNC, filetype: from, outputtype: to, key: `k${from}${to}${i}${Date.now()}${Math.random()}`.replace('.', ''),
    title: 'new.' + from, url: `http://${HOST}:${srv.address().port}/new.${from}`,
  };
  let r = await post(BASE + '/ConvertService.ashx', body);
  // Async mode: re-post the same key every POLL ms until endConvert (the sync mode polls internally every ~1 s,
  // which quantizes its answer to whole seconds).
  while (ASYNC && !r.error && !r.endConvert) { await new Promise(s => setTimeout(s, POLL)); r = await post(BASE + '/ConvertService.ashx', body); }
  const tConv = Number(process.hrtime.bigint() - t) / 1e6;
  if (r.error || !r.fileUrl) return { err: r.error || 'nofile' };
  const bytes = await get(r.fileUrl);
  return { conv: tConv, total: Number(process.hrtime.bigint() - t) / 1e6, bytes };
}

let srv;
async function main() {
  srv = http.createServer((q, s) => fs.createReadStream(path.join(DIR, path.basename(q.url))).on('error', () => { s.statusCode = 404; s.end(); }).pipe(s));
  await new Promise(r => srv.listen(0, '0.0.0.0', r));
  const out = {};
  for (const [from, to] of PAIRS) {
    await one(from, to, -1); // warm-up, not counted
    const k = `${from}->${to}`; out[k] = { conv: [], total: [], errors: 0 };
    const t0 = Date.now();
    for (let i = 0; i < RUNS; i += CONC) {
      const rs = await Promise.all(Array.from({ length: Math.min(CONC, RUNS - i) }, (_, j) => one(from, to, i + j)));
      for (const r of rs) if (r.err) out[k].errors++; else { out[k].conv.push(r.conv); out[k].total.push(r.total); }
    }
    out[k].throughputPerS = +(RUNS / ((Date.now() - t0) / 1000)).toFixed(2);
  }
  srv.close();
  const s = a => a.length ? { n: a.length, p50: +pct(a, 0.5).toFixed(0), p99: +pct(a, 0.99).toFixed(0), min: +Math.min(...a).toFixed(0), max: +Math.max(...a).toFixed(0) } : null;
  const res = {};
  for (const k in out) res[k] = { convertMs: s(out[k].conv), withDownloadMs: s(out[k].total), errors: out[k].errors, throughputPerS: out[k].throughputPerS };
  console.log(JSON.stringify({ runs: RUNS, concurrency: CONC, results: res }, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
