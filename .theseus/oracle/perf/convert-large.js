// ConvertService and raw x2t on large files, native package with JWT on (PKT-0018).
// Usage: node .theseus/oracle/perf/convert-large.js <dir> [runs] [concurrency]
//   <dir>: samples from make-samples.py (and/or PKT-0016's), every .docx/.xlsx/.pptx is converted to pdf and to
//   its ODF format; also to its own format (docx->docx etc.), which is the server's save path (x2t internal -> OOXML
//   is what assembling a save runs, the open path is OOXML -> internal Editor.bin, timed raw below).
// The token secret is read from /etc/euro-office/documentserver/local.json; jsonwebtoken from DocService/node_modules.
// Per conversion: POST /ConvertService.ashx (async, re-posted every 50 ms) -> DocService -> RabbitMQ -> x2t -> result.
// Raw x2t (no DocService) is timed once per file for OOXML -> Editor.bin (the open conversion) and -> pdf.
// Run it on an idle server, or before load-coedit.js (PKT-0021): FileConverter maxprocesscount = 1 and conversions
// share one RabbitMQ queue with save assembly, so a conversion waits behind every save a load test left queued
// (that is what produced PKT-0018's 124 s pptx -> pdf). main() first waits until a small probe conversion is fast.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const jwt = require(path.resolve(__dirname, '../../../DocService/node_modules/jsonwebtoken'));
const DIR = process.argv[2], RUNS = +(process.argv[3] || 3), CONC = +(process.argv[4] || 1);
const BASE = 'http://127.0.0.1';
const SECRET = JSON.parse(fs.readFileSync('/etc/euro-office/documentserver/local.json')).services.CoAuthoring.secret.inbox.string;
const X2T = '/var/www/euro-office/documentserver/server/FileConverter/bin';
const ODF = { docx: 'odt', xlsx: 'ods', pptx: 'odp' };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const host = () => Object.values(os.networkInterfaces()).flat().find(i => i.family === 'IPv4' && !i.internal).address;

function post(body) {
  const token = jwt.sign(body, SECRET);
  return new Promise((res, rej) => {
    const r = http.request(BASE + '/ConvertService.ashx', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token } }, rs => {
      let d = ''; rs.on('data', c => d += c); rs.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(new Error(d.slice(0, 200))); } });
    });
    r.on('error', rej); r.end(JSON.stringify({ ...body, token }));
  });
}
async function one(file, to, port) {
  const from = path.extname(file).slice(1), t = Date.now();
  const body = { async: true, filetype: from, outputtype: to, key: `k${Date.now()}${Math.random()}`.replace('.', ''), title: 'x.' + from, url: `http://${host()}:${port}/${encodeURIComponent(file)}` };
  let r = await post(body);
  while (!r.error && !r.endConvert && Date.now() - t < 600000) { await new Promise(s => setTimeout(s, 50)); r = await post(body); }
  return r.error || !r.fileUrl ? { err: r.error || 'timeout' } : { ms: Date.now() - t };
}
// Raw x2t through an XML task file, like FileConverter does (m_sFileFrom / m_sFileTo / m_nFormatTo).
function rawX2t(src, outExt, formatTo) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'x2t-')), dst = path.join(tmp, 'out.' + outExt);
  const xml = path.join(tmp, 'p.xml');
  fs.writeFileSync(xml, `<?xml version="1.0" encoding="utf-8"?><TaskQueueDataConvert><m_sFileFrom>${src}</m_sFileFrom><m_sFileTo>${dst}</m_sFileTo>` +
    (formatTo ? `<m_nFormatTo>${formatTo}</m_nFormatTo>` : '') + `<m_sFontDir>/usr/share/fonts</m_sFontDir><m_sAllFontsPath>${X2T}/AllFonts.js</m_sAllFontsPath><m_bIsNoBase64>false</m_bIsNoBase64><m_sTempDir>${tmp}</m_sTempDir></TaskQueueDataConvert>`);
  const t = Date.now(); let ok = true;
  try { execFileSync(path.join(X2T, 'x2t'), [xml], { cwd: X2T, env: { ...process.env, LD_LIBRARY_PATH: X2T }, stdio: 'ignore', timeout: 600000 }); } catch (e) { ok = false; }
  const ms = Date.now() - t, size = fs.existsSync(dst) ? fs.statSync(dst).size : 0;
  fs.rmSync(tmp, { recursive: true, force: true });
  return { ms, ok: ok && size > 0, size };
}

async function main() {
  const srv = http.createServer((q, s) => fs.createReadStream(path.join(DIR, path.basename(decodeURIComponent(q.url)))).on('error', () => { s.statusCode = 404; s.end(); }).pipe(s));
  await new Promise(r => srv.listen(0, '0.0.0.0', r));
  const port = srv.address().port, out = {};
  const files = fs.readdirSync(DIR).filter(f => /\.(docx|xlsx|pptx)$/.test(f)).sort();
  // Drain: repeat a cheap conversion (smallest file -> own format, ~0.1-0.2 s idle) until it takes < 3 s (max 15 min).
  const probe = [...files].sort((a, b) => fs.statSync(path.join(DIR, a)).size - fs.statSync(path.join(DIR, b)).size)[0];
  for (const t0 = Date.now(); probe && Date.now() - t0 < 900000;) {
    const r = await one(probe, path.extname(probe).slice(1), port);
    console.error('drain probe', probe, JSON.stringify(r));
    if (!r.err && r.ms < 3000) break;
  }
  for (const f of files) {
    const ext = path.extname(f).slice(1), abs = path.join(DIR, f);
    const row = out[f] = { kB: Math.round(fs.statSync(abs).size / 1024) };
    // Open conversion: OOXML -> Editor.bin (internal format; 8192 = AVS_OFFICESTUDIO_FILE_CANVAS).
    row.rawOpenToBin = rawX2t(abs, 'bin', 8192);
    row.rawToPdf = rawX2t(abs, 'pdf');
    for (const to of ['pdf', ODF[ext], ext]) {
      const ms = []; let errors = 0; const t0 = Date.now();
      for (let i = 0; i < RUNS; i += CONC) {
        const rs = await Promise.all(Array.from({ length: Math.min(CONC, RUNS - i) }, () => one(f, to, port)));
        for (const r of rs) r.err ? errors++ : ms.push(r.ms);
      }
      row[`service->${to}`] = ms.length ? { n: ms.length, p50: pct(ms, .5), max: pct(ms, 1), errors, perS: +(RUNS / ((Date.now() - t0) / 1000)).toFixed(2) } : { errors };
    }
    console.error(f, JSON.stringify(row));
  }
  srv.close();
  console.log(JSON.stringify({ runs: RUNS, concurrency: CONC, results: out }));
}
main().catch(e => { console.error(e); process.exit(1); });
