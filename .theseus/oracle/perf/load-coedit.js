// Co-edit load test with raw Socket.IO clients instead of browsers (PKT-0018).
// Usage: NODE_PATH=<dir with socket.io-client@4.8.1> node .theseus/oracle/perf/load-coedit.js <docs> <clients> [seconds] [ratePerDoc] [fileName]
//   e.g. mkdir -p /tmp/sio && (cd /tmp/sio && npm i socket.io-client@4.8.1); NODE_PATH=/tmp/sio/node_modules node ... 20 5 60 2
// Opens <docs> documents (each a fresh key on a copy of an existing example file, default medium-10p.docx) with
// <clients> clients each, authenticating like the editor does (handshake {data: auth, token: JWT signed with the
// browser secret from local.json}). Then in every document the clients take turns: isSaveLock -> saveChanges
// with one real sdkjs change (captured from a browser, replayed: the server stores changes without reading them)
// -> unSaveLock, at <ratePerDoc> changes/s per document. Timed per change: send -> sender's unSaveLock (ack)
// and send -> each other client's `saveChanges` broadcast. Also: open (auth -> documentOpen), CPU of docservice.
// The load generator shares the CPUs with the server; its own CPU is reported so its share can be judged.
//
// Valid saves (PKT-0023). The mode above replays one isolated change, which x2t cannot apply (status 3). Two more modes:
//   node load-coedit.js capture ["text"] [out.json]   Playwright: open a new docx in the example, type <text>, record
//       every saveChanges payload the browser sends, from the first one, in order (writes out.json, default stdout).
//   node load-coedit.js replay <docs> [seq.json]       per document: a fresh key on a pristine copy of the en-US blank
//       template, ONE client, isSaveLock -> every captured batch in order -> close; timed: open, ack, and save
//       assembly = socket close -> callback (savetimeoutdelay 5 s + queue + x2t), with the callback status counted.
//   Default sequence: SEQ below ("hello world" typed in a new docx, captured on 9.3.7-1). It starts with a `64;`
//   change (document info) before the first `35;` (add text): replaying only the `35;` change is what failed before.
//   The base must be the untouched template: the capture's own file is overwritten by the browser's save, and
//   replaying onto it fails with status 3 again.
const io = require('socket.io-client'), jwt = require(require('path').resolve(__dirname, '../../../DocService/node_modules/jsonwebtoken'));
const fs = require('fs'), http = require('http');
const K = +process.argv[2] || 1, N = +process.argv[3] || 2, SECS = +(process.argv[4] || 30), RATE = +(process.argv[5] || 2);
const FILE = process.argv[6] || 'medium-10p.docx', BASE = 'http://127.0.0.1';
// DS_SOCKET=http://127.0.0.1:8000 bypasses nginx (its stock worker_connections 768 caps at ~700 sockets, see baseline).
const SOCK = process.env.DS_SOCKET || BASE;
const SECRET = JSON.parse(fs.readFileSync('/etc/euro-office/documentserver/local.json')).services.CoAuthoring.secret.browser.string;
// One character inserted, as sdkjs serialises it (from a browser capture of typing in a new docx).
const CHANGE = '35;BgAAADYANwAyAAEAHAABAAAAAAAAAAEAAABoAAAAAAMAAAA=';
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };
const st = a => ({ n: a.length, p50: pct(a, .5), p90: pct(a, .9), p99: pct(a, .99), max: pct(a, 1) });
let cbSrv, saves = 0, saveErr = 0; // status 3 = assembly failed: the replayed change does not fit the document; timed anyway

function client(key, u, url, title) {
  const user = { id: 'load-' + u, name: 'Load ' + u };
  const cfg = { document: { fileType: 'docx', key, title, url, permissions: { edit: true, comment: true, download: true } },
    documentType: 'word', editorConfig: { callbackUrl: `${BASE.replace('127.0.0.1', '127.0.0.1:' + cbSrv.address().port)}/cb`, mode: 'edit', user } };
  const token = jwt.sign(cfg, SECRET, { expiresIn: '1h' });
  const auth = { type: 'auth', docid: key, documentCallbackUrl: cfg.editorConfig.callbackUrl, token: 'x', user: { id: user.id, username: user.name, indexUser: -1 },
    editorType: 0, lastOtherSaveTime: -1, block: [], sessionId: null, sessionTimeConnect: null, sessionTimeIdle: 0, documentFormatSave: 65,
    isCloseCoAuthoring: false, openCmd: { c: 'open', id: key, userid: user.id, format: 'docx', url, title, nobase64: true, outputformat: 8193 },
    lang: 'en', mode: 'edit', permissions: cfg.document.permissions, encrypted: false, IsAnonymousUser: false, timezoneOffset: 0, coEditingMode: 'fast',
    jwtOpen: token, time: 0, supportAuthChangesAck: true };
  const s = io(SOCK, { path: `/doc/${key}/c/`, query: { shardkey: key }, transports: ['websocket'], auth: { data: auth, token }, forceNew: true });
  const c = { s, u, idx: 0, handlers: [], opened: null };
  c.t0 = Date.now();
  c.ready = new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('open timeout ' + key + ' ' + u)), 120000);
    s.on('connect_error', e => { clearTimeout(to); rej(e); });
    s.on('message', m => {
      if (m.type === 'license') s.emit('message', auth);
      else if ((m.type === 'auth' && m.result !== 1) || m.type === 'error' || m.type === 'disconnectReason') { clearTimeout(to); rej(new Error('auth ' + JSON.stringify(m).slice(0, 200))); }
      else if (m.type === 'documentOpen' || (m.type === 'auth' && u > 0 && m.result === 1)) { if (!c.opened) { c.opened = Date.now() - c.t0; clearTimeout(to); res(); } }
      for (const h of c.handlers) h(m);
    });
  });
  return c;
}
const once = (c, pred) => new Promise(res => { const h = m => { if (pred(m)) { c.handlers.splice(c.handlers.indexOf(h), 1); res(m); } }; c.handlers.push(h); });

async function main() {
  cbSrv = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { try { const x = JSON.parse(b).status; if (x === 2 || x === 3) saves++; if (x === 3) saveErr++; } catch (e) {} r.end('{"error":0}'); }); });
  await new Promise(r => cbSrv.listen(0, '127.0.0.1', r));
  const url = `${BASE}/example/download?fileName=${encodeURIComponent(FILE)}&useraddress=127.0.0.1`;
  const docs = [];
  for (let k = 0; k < K; k++) {
    const key = `load${Date.now()}k${k}`, cl = [];
    cl.push(client(key, 0, url, FILE)); await cl[0].ready;  // first opener triggers the x2t open conversion
    for (let u = 1; u < N; u++) cl.push(client(key, u, url, FILE));
    await Promise.all(cl.map(c => c.ready));
    // Release the auth lock taken when the 2nd editor joins, as the real editor does (PKT-0021). Without it the
    // server drops the lock holder after expire.lockDoc (30 s) and, when the sequential open phase lasts longer
    // than that (e.g. 200 docs), later saveLock waits never return.
    cl[0].s.emit('message', { type: 'unLockDocument', unlock: true, isSave: false });
    docs.push(cl);
  }
  const open = docs.flat().map(c => c.opened), ack = [], bcast = [], errs = { lockBusy: 0, noLockReply: 0, missing: 0 };
  const cpu0 = procCpu(), w0 = Date.now(), tEnd = Date.now() + SECS * 1000;
  let sent = 0;
  await Promise.all(docs.map(async (cl, k) => {
    let turn = 0, sync = 0;
    await new Promise(r => setTimeout(r, Math.random() * 1000 / RATE));
    while (Date.now() < tEnd) {
      const next = Date.now() + 1000 / RATE, w = cl[turn++ % N];
      w.s.emit('message', { type: 'isSaveLock', syncChangesIndex: sync });
      // Timed out (PKT-0021): an unanswered isSaveLock used to hang the whole run.
      const lk = await Promise.race([once(w, m => m.type === 'saveLock'), new Promise(r => setTimeout(() => r(null), 10000))]);
      if (!lk) { errs.noLockReply++; } else if (lk.saveLock) { errs.lockBusy++; } else {
        const t = Date.now();
        const got = cl.filter(c => c !== w).map(c => Promise.race([once(c, m => m.type === 'saveChanges').then(() => Date.now() - t), new Promise(r => setTimeout(() => r(NaN), 10000))]));
        w.s.emit('message', { type: 'saveChanges', changes: JSON.stringify([CHANGE]), startSaveChanges: true, endSaveChanges: true, isCoAuthoring: N > 1,
          isExcel: false, deleteIndex: null, excelAdditionalInfo: '{}', unlock: false, releaseLocks: false, syncChangesIndex: sync });
        const un = await Promise.race([once(w, m => m.type === 'unSaveLock'), new Promise(r => setTimeout(() => r(null), 10000))]);
        if (un) { ack.push(Date.now() - t); sync = un.syncChangesIndex; } else errs.missing++;
        for (const v of await Promise.all(got)) isNaN(v) ? errs.missing++ : bcast.push(v);
        sent++;
      }
      await new Promise(r => setTimeout(r, Math.max(0, next - Date.now())));
    }
  }));
  const wall = (Date.now() - w0) / 1000, cpu1 = procCpu(), tick = 100;
  const cpu = {}; for (const k in cpu1) cpu[k] = +((cpu1[k] - (cpu0[k] || 0)) / tick / wall).toFixed(2); // cores used
  // Close and wait for the saves (savetimeoutdelay 5 s + x2t assembly).
  const tc = Date.now(); for (const c of docs.flat()) c.s.close();
  while (saves < K && Date.now() - tc < 60000 + K * 3000) await new Promise(r => setTimeout(r, 200));
  cbSrv.close();
  console.log(JSON.stringify({ docs: K, clientsPerDoc: N, seconds: SECS, ratePerDoc: RATE, file: FILE, changesPerS: +(sent / wall).toFixed(1),
    broadcastsPerS: +(bcast.length / wall).toFixed(1), openMs: st(open), ackMs: st(ack), broadcastMs: st(bcast), errors: errs,
    coresUsed: cpu, savedDocs: saves, saveStatus3: saveErr, saveAllMs: Date.now() - tc }));
  process.exit(0);
}
function procCpu() {
  const o = {};
  for (const p of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) { try {
    const s = fs.readFileSync(`/proc/${p}/stat`, 'utf8'), f = s.slice(s.lastIndexOf(')') + 2).split(' ');
    const cmd = fs.readFileSync(`/proc/${p}/cmdline`, 'utf8');
    const k = +p === process.pid ? 'loadgen' : /docservice/.test(cmd) ? 'docservice' : /postgres/.test(cmd) ? 'postgres' : /redis/.test(cmd) ? 'redis' : /beam/.test(cmd) ? 'rabbitmq' : /nginx/.test(cmd) ? 'nginx' : 'other';
    o[k] = (o[k] || 0) + +f[11] + +f[12];
  } catch (e) {} }
  return o;
}

const SEQ = { text: 'hello world', batches: [{ changes: JSON.stringify(['64;AgAAADEA//8BAAQ0z5DtEQAALQEAAAUAAAAAAAAAAAAAAAMAAAAAAAAA9v///w4AAAA5AC4AMwAuADcALgAwAA==',
  '35;BgAAADYANwAyAAEAHAABAAAAAAAAAAEAAABoAAAAAAMAAAA=', '35;BgAAADYANwAyAAEAHAABAAAAAQAAAAEAAABlAAAAAAMAAAA=', '35;BgAAADYANwAyAAEAHAABAAAAAgAAAAEAAABsAAAAAAMAAAA=',
  '35;BgAAADYANwAyAAEAHAABAAAAAwAAAAEAAABsAAAAAAMAAAA=', '35;BgAAADYANwAyAAEAHAABAAAABAAAAAEAAABvAAAAAAMAAAA=',
  '64;AgAAADEA//8BAAQ0z5DtEQAApwAAAAEAAAABAAAAAAAAAAMAAAAAAAAA9v///w4AAAA5AC4AMwAuADcALgAwAA==', '34;BgAAADYANwAyAAEAHAABAAAABQAAAAIAAAAgAAAAAwAAAA==',
  '64;AgAAADEA//8BAAQ0z5DtEQAAiAEAAAIAAAACAAAAAAAAAAMAAAAAAAAA9v///w4AAAA5AC4AMwAuADcALgAwAA==', '35;BgAAADYANwAyAAIAHAABAAAAAAAAAAEAAABoAAAAAAAAAAA=',
  '35;BgAAADYANwAyAAEAHAABAAAAAAAAAAEAAABIAAAAAAMAAAA=', '64;AgAAADEA//8BAAQ0z5DtEQAALQEAAAUAAAADAAAAAAAAAAMAAAAAAAAA9v///w4AAAA5AC4AMwAuADcALgAwAA==',
  '35;BgAAADYANwAyAAEAHAABAAAABgAAAAEAAAB3AAAAAAMAAAA=', '35;BgAAADYANwAyAAEAHAABAAAABwAAAAEAAABvAAAAAAMAAAA=', '35;BgAAADYANwAyAAEAHAABAAAACAAAAAEAAAByAAAAAAMAAAA=',
  '35;BgAAADYANwAyAAEAHAABAAAACQAAAAEAAABsAAAAAAMAAAA=', '35;BgAAADYANwAyAAEAHAABAAAACgAAAAEAAABkAAAAAAMAAAA=']), excelAdditionalInfo: '{}' }] };
const STORE = '/var/lib/euro-office/documentserver-example/files/127.0.0.1';

async function capture() {
  const { chromium } = require('playwright'), text = process.argv[3] || 'hello world';
  const b = await chromium.launch(), p = await b.newPage();
  // Hook WebSocket.send in every frame before the editor loads: Socket.IO frames are '42["message",{...}]'.
  await p.addInitScript(() => { const s = WebSocket.prototype.send; window.__out = [];
    WebSocket.prototype.send = function (d) { if (typeof d === 'string' && d.includes('"saveChanges"')) window.__out.push(d); return s.call(this, d); }; });
  await p.goto(BASE + '/example/editor?fileExt=docx');
  let f; for (let i = 0; i < 2400; i++) { f = p.frames().find(x => /documenteditor/.test(x.url()) && /index/.test(x.url()));
    if (f && await f.evaluate(() => !!(window.editor && editor.isDocumentLoadComplete)).catch(() => 0)) break; f = null; await p.waitForTimeout(50); }
  if (!f) throw new Error('editor not ready');
  await p.keyboard.type(text, { delay: 150 }); await p.waitForTimeout(3000); // fast co-editing mode sends within ~1 s
  const batches = (await f.evaluate(() => window.__out)).map(d => JSON.parse(d.slice(d.indexOf('[')))[1])
    .map(m => ({ changes: m.changes, excelAdditionalInfo: m.excelAdditionalInfo }));
  const out = JSON.stringify({ capturedIn: decodeURIComponent(p.url().split('fileName=')[1] || ''), text, batches });
  await b.close();
  process.argv[4] ? fs.writeFileSync(process.argv[4], out) : console.log(out);
}

async function replay() {
  const D = +process.argv[3] || 1, seq = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4])) : SEQ;
  const base = `replay-base-${Date.now()}.docx`; // pristine blank document, never saved back (callbacks go to cbSrv)
  fs.copyFileSync('/var/www/euro-office/documentserver/document-templates/new/en-US/new.docx', `${STORE}/${base}`);
  const cbAt = {}, status = {};
  cbSrv = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { try { const m = JSON.parse(b);
    if (m.status === 2 || m.status === 3) { cbAt[m.key] = Date.now(); status[m.status] = (status[m.status] || 0) + 1; } } catch (e) {} r.end('{"error":0}'); }); });
  await new Promise(r => cbSrv.listen(0, '127.0.0.1', r));
  const url = `${BASE}/example/download?fileName=${encodeURIComponent(base)}&useraddress=127.0.0.1`;
  const cl = [];
  for (let k = 0; k < D; k++) { const key = `replay${Date.now()}k${k}`; cl.push(Object.assign(client(key, 0, url, base), { key })); }
  await Promise.all(cl.map(c => c.ready));
  const ack = [], errs = { lockBusy: 0, missing: 0 }, cpu0 = procCpu(), w0 = Date.now();
  await Promise.all(cl.map(async c => {
    c.s.emit('message', { type: 'isSaveLock', syncChangesIndex: 0 });
    const lk = await Promise.race([once(c, m => m.type === 'saveLock'), new Promise(r => setTimeout(() => r(null), 30000))]);
    if (!lk || lk.saveLock) { errs.lockBusy++; return; }
    const t = Date.now();
    seq.batches.forEach((b, i) => c.s.emit('message', { type: 'saveChanges', changes: b.changes, startSaveChanges: i === 0, endSaveChanges: i === seq.batches.length - 1,
      isCoAuthoring: false, isExcel: false, deleteIndex: null, excelAdditionalInfo: b.excelAdditionalInfo || '{}', unlock: false, releaseLocks: false, syncChangesIndex: 0 }));
    const un = await Promise.race([once(c, m => m.type === 'unSaveLock'), new Promise(r => setTimeout(() => r(null), 30000))]);
    un ? ack.push(Date.now() - t) : errs.missing++;
  }));
  // Disconnect all at once; save assembly per doc = this moment -> its callback.
  const tc = Date.now(); for (const c of cl) c.s.close();
  while (Object.keys(cbAt).length < D && Date.now() - tc < 120000 + D * 3000) await new Promise(r => setTimeout(r, 100));
  const wall = (Date.now() - w0) / 1000, cpu1 = procCpu(), cpu = {};
  for (const k in cpu1) cpu[k] = +((cpu1[k] - (cpu0[k] || 0)) / 100 / wall).toFixed(2);
  const asm = cl.filter(c => cbAt[c.key]).map(c => cbAt[c.key] - tc);
  cbSrv.close(); fs.unlinkSync(`${STORE}/${base}`);
  console.log(JSON.stringify({ mode: 'replay', docs: D, clientsPerDoc: 1, text: seq.text, batches: seq.batches.length,
    changes: seq.batches.reduce((n, b) => n + JSON.parse(b.changes).length, 0), openMs: st(cl.map(c => c.opened)), ackMs: st(ack), errors: errs,
    callbackStatus: status, noCallback: D - asm.length, assemblyMs: st(asm), allSavedMs: asm.length ? Math.max(...asm) : NaN, coresUsed: cpu }));
  process.exit(0);
}
(process.argv[2] === 'capture' ? capture() : process.argv[2] === 'replay' ? replay() : main()).catch(e => { console.error(e); process.exit(1); });
