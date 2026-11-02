// Theseus PKT-0013: micro-benchmarks of server-side hot paths that run per user action.
// Run from the repository root: node .theseus/oracle/perf/bench-hotpaths.js
// No database, Redis or RabbitMQ needed (in-memory editor data).
'use strict';
const path = require('path');
// The development config uses paths relative to DocService/ (as the tests do).
process.chdir(path.join(__dirname, '../../../DocService'));
process.env.NODE_CONFIG_DIR = '../Common/config';
process.env.NODE_ENV = process.env.NODE_ENV || 'development-linux'; // same as tests/env-setup.js
const {performance} = require('perf_hooks');
const operationContext = require('../../../Common/sources/operationContext');
const formatChecker = require('../../../Common/sources/formatchecker');
const {EditorData} = require('../../../DocService/sources/editorDataMemory');

function stats(name, samples, unit) {
  samples.sort((a, b) => a - b);
  const p = q => samples[Math.min(samples.length - 1, Math.floor(q * samples.length))];
  const total = samples.reduce((a, b) => a + b, 0);
  console.log(
    `${name}\tn=${samples.length}\tp50=${(p(0.5) * 1000).toFixed(2)}us\tp99=${(p(0.99) * 1000).toFixed(2)}us\tthroughput=${Math.round(samples.length / (total / 1000))} ${unit}/s`
  );
}
async function bench(name, n, fn, unit = 'op') {
  for (let i = 0; i < Math.min(1000, n); i++) await fn(i); // warm-up
  const s = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await fn(i);
    s.push(performance.now() - t);
  }
  stats(name, s, unit);
}

(async () => {
  const ctx = new operationContext.Context();
  const ed = new EditorData();
  // Co-edit: a typical change batch (50 changes of ~200 bytes) parsed and re-serialised per message.
  const changes = Array.from({length: 50}, (_, i) => ({docid: 'doc1', change: 'x'.repeat(200) + i, time: Date.now(), user: 'u' + (i % 5)}));
  const msg = JSON.stringify({type: 'saveChanges', changes: JSON.stringify(changes), startSaveChanges: true, endSaveChanges: true});
  await bench(
    'coedit.parse+stringify(50 changes)',
    20000,
    () => {
      const m = JSON.parse(msg);
      JSON.stringify(JSON.parse(m.changes));
    },
    'msg'
  );
  // Co-edit: lock add/get/remove on the in-memory editor data.
  await bench('coedit.locks add/get/remove', 20000, async i => {
    const d = 'doc' + (i % 100);
    const key = 'b' + i;
    await ed.addLocks(ctx, d, {[key]: {user: 'u', block: key}});
    await ed.getLocks(ctx, d);
    await ed.removeLocks(ctx, d, {[key]: {}});
  });
  await bench('coedit.addMessage', 20000, i => ed.addMessage(ctx, 'doc' + (i % 100), msg), 'msg');
  // Open/convert: format detection from the file signature (runs before conversions).
  const zipHead = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(4092)]);
  const pdfHead = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(4087)]);
  await bench('open.formatBySignature(pdf)', 50000, () => formatChecker.getDocumentFormatBySignature(pdfHead));
  await bench('open.formatBySignature(zip)', 50000, () => formatChecker.getDocumentFormatBySignature(zipHead));
  await bench('open.formatFromString', 200000, i => formatChecker.getFormatFromString(i % 2 ? 'docx' : 'xlsx'));
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
