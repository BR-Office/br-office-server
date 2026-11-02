// Windowed CPU profile of DocService (PKT-0026). Preload: node --require .theseus/oracle/perf/profile-toggle.js sources/server.js
// with PROF_OUT=/tmp/prof/ds; kill -USR2 <pid> starts the V8 profiler, a second USR2 writes $PROF_OUT.<ms>.cpuprofile.
// Needed because --cpu-prof profiles startup (module loading dominates) and writes only on a clean exit.
const inspector = require('inspector'), fs = require('fs');
const s = new inspector.Session(); s.connect();
let on = false;
process.on('SIGUSR2', () => {
  if (!on) { on = true; s.post('Profiler.enable', () => s.post('Profiler.setSamplingInterval', { interval: 500 }, () => s.post('Profiler.start'))); return; }
  on = false;
  s.post('Profiler.stop', (e, r) => { fs.writeFileSync(process.env.PROF_OUT + '.' + Date.now() + '.cpuprofile', JSON.stringify(r.profile)); });
});
