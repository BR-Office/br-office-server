// PKT-0054: V8 CPU profile of the JS part of one x2t conversion, via doctrenderer's built-in inspector.
// Usage: node .theseus/oracle/perf/x2t-cpuprofile.js <input.xlsx> <out.pdf> <out.cpuprofile> [port=8080]
// x2t is started with V8_USE_INSPECTOR=1; it blocks on a websocket (port 8080, next free one if busy) until a
// client sends Runtime.runIfWaitingForDebugger. The inspector only reads messages while V8 is paused, so the
// client starts the profiler at the first pause, wraps Asc.editor.asc_nativeGetPDF so that it hits `debugger`
// after it returns, and stops the profiler there. Prints the top self-time functions and saves the profile.
const { spawn } = require('child_process'); const fs = require('fs');
const [inp, out, prof, port = '8080'] = process.argv.slice(2);
const B = '/var/www/euro-office/documentserver/server/FileConverter/bin';
const x = spawn('./x2t', [inp, out], { cwd: B, env: { ...process.env, V8_USE_INSPECTOR: '1' }, stdio: 'inherit' });
let id = 0; let pauses = 0; const pend = {}; let ws; let wrapped = false; let done = false;
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const WRAP = `(function(){var A=globalThis.Asc;if(!A)return false;var e=A.editor||(A.spreadsheet_api&&A.spreadsheet_api.prototype)||(A.asc_docs_api&&A.asc_docs_api.prototype);
 if(!e||!e.asc_nativeGetPDF)return false;var f=e.asc_nativeGetPDF;
 e.asc_nativeGetPDF=function(){globalThis.__t0=Date.now();var r=f.apply(this,arguments);globalThis.__t1=Date.now();debugger;return r};return true})()`;
async function onPaused(m) {
  pauses++;
  if (!wrapped) {
    const r = await send('Runtime.evaluate', { expression: WRAP });
    wrapped = r.result && r.result.result && r.result.result.value === true;
  } else if (!done && (await send('Runtime.evaluate', { expression: 'globalThis.__t1|0' })).result.result.value) {
    done = true; const r = await send('Profiler.stop'); fs.writeFileSync(prof, JSON.stringify(r.result.profile));
    const t = (await send('Runtime.evaluate', { expression: 'globalThis.__t1-globalThis.__t0' })).result.result.value;
    console.log(`asc_nativeGetPDF ${t} ms`); await report(r.result.profile); await send('Debugger.disable');
  }
  send('Debugger.resume');
}
const src = {};
async function report(p) {
  const dt = {}; const byId = {}; p.nodes.forEach(n => byId[n.id] = n);
  for (let i = 0; i < p.samples.length; i++) { const n = byId[p.samples[i]]; const c = n.callFrame;
    const k = `${c.functionName || '(anon)'}|${c.scriptId}|${c.lineNumber}|${c.columnNumber}`; dt[k] = (dt[k] || 0) + (p.timeDeltas[i] || 0); }
  const tot = Object.values(dt).reduce((a, b) => a + b, 0);
  console.log(`profiled ${(tot / 1e3).toFixed(0)} ms`);
  const rows = []; Object.entries(dt).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => rows.push([k, v]));
  for (const [k, v] of rows) { const [fn, sid, ln, col] = k.split('|'); let snip = '';
    if (+sid) { if (!src[sid]) src[sid] = ((await send('Debugger.getScriptSource', { scriptId: sid })).result.scriptSource || '').split('\n');
      snip = (src[sid][+ln] || '').substr(Math.max(0, +col - 60), 160).replace(/\s+/g, ' '); }
    console.log(`${(v / 1e3).toFixed(0).padStart(7)} ms ${(100 * v / tot).toFixed(1).padStart(5)}%  ${fn} [${sid}:${ln}:${col}]  ${snip}`); }
}
(function connect(tries = 0) {
  ws = new WebSocket(`ws://127.0.0.1:${port}`);
  ws.onerror = () => { if (tries < 100) setTimeout(() => connect(tries + 1), 100); };
  ws.onopen = async () => {
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } else if (m.method === 'Debugger.paused') onPaused(m); };
    await Promise.all([send('Profiler.enable'), send('Debugger.enable'), send('Profiler.setSamplingInterval', { interval: 500 })]);
    await send('Debugger.setInstrumentationBreakpoint', { instrumentation: 'beforeScriptExecution' }); await send('Debugger.pause');
    await send('Profiler.start'); ws.send(JSON.stringify({ id: ++id, method: 'Runtime.runIfWaitingForDebugger' }));
  };
})();
x.on('exit', c => { console.log(`x2t exit ${c}, wrapped=${wrapped}, profiled=${done}, pauses=${pauses}`); process.exit(0); });
