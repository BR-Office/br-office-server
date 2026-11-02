#!/usr/bin/env node
// Defect and crash rate from upstream history (PKT-0017). Node, no dependencies. Prints Markdown.
//
//   node defect-history.js git <bare-repo.git> <name>   fix / crash commits per year, month, module, file
//   node defect-history.js issues                      bug / crash issue counts via the GitHub search API
//
// Get the repos with: git clone --bare --filter=blob:none https://github.com/Euro-Office/server eo.git
//                     git clone --bare --filter=blob:none https://github.com/ONLYOFFICE/server oo.git
// (blob-less clone is enough: `git log --name-only` needs trees only.)
//
// Classification of a commit subject (case-insensitive):
const FIX = /\b(fix(e[sd])?|fixing|bugfix|hotfix|bug\s*#?\d+|regression)\b/i;
const CRASH = /\b(crash\w*|segfault|unhandled|uncaught|oom|out of memory|hang\w*|deadlock|exit code|process exit|restart\w*)\b/i;
// A commit is "fix" if FIX matches; "crash" if FIX and CRASH both match, or the subject contains "crash".
// Duplicates (same author date + subject, new hash: Euro-Office's rebased history) are counted once.
// The issue API uses only /search/issues (the per-repo API is not reachable from the factory).
const { execFileSync } = require('child_process');

function table(head, rows) {
  return ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
    ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
}
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

function gitMode(dir, name) {
  const out = execFileSync('git', ['--git-dir', dir, 'log', '--no-merges', '--date=short',
    '--format=\x01%ad\x02%s', '--name-only'], { maxBuffer: 1 << 30 }).toString();
  const seen = new Set(); const commits = []; let dups = 0;
  for (const chunk of out.split('\x01').slice(1)) {
    const [hdr, ...files] = chunk.split('\n');
    const [date, subject] = hdr.split('\x02');
    const key = date + '\x00' + subject;
    if (seen.has(key)) { dups++; continue; }
    seen.add(key);
    const fix = FIX.test(subject);
    const crash = /crash/i.test(subject) || (fix && CRASH.test(subject));
    commits.push({ date, subject, files: files.filter(Boolean), fix, crash });
  }
  const agg = keyFn => {
    const m = new Map();
    for (const c of commits) for (const k of [].concat(keyFn(c))) {
      const a = m.get(k) || { n: 0, fix: 0, crash: 0 }; a.n++; a.fix += c.fix; a.crash += c.crash; m.set(k, a);
    }
    return m;
  };
  const nFix = commits.filter(c => c.fix).length, nCrash = commits.filter(c => c.crash).length;
  const p = [];
  p.push(`## ${name}: ${commits.length} commits (no merges, ${dups} duplicates dropped), ` +
    `${nFix} fix (${pct(nFix, commits.length)} %), ${nCrash} crash-related\n`);
  const row = ([k, a]) => [k, a.n, a.fix, pct(a.fix, a.n), a.crash];
  const H = ['period', 'commits', 'fix', 'fix %', 'crash'];
  p.push('### Per year\n\n' + table(H, [...agg(c => c.date.slice(0, 4))].sort().map(row)) + '\n');
  p.push('### Per month (last 24)\n\n' + table(H, [...agg(c => c.date.slice(0, 7))].sort().slice(-24).map(row)) + '\n');
  const mod = f => (f.split('/').length > 1 ? f.split('/')[0] : '(root)');
  const top = (m, n) => [...m].filter(([, a]) => a.fix).sort((x, y) => y[1].fix - x[1].fix).slice(0, n)
    .map(([k, a]) => [k, a.n, a.fix, a.crash]);
  p.push('### Fix commits per module (top directory)\n\n' +
    table(['module', 'commits', 'fix', 'crash'], top(agg(c => [...new Set(c.files.map(mod))]), 10)) + '\n');
  p.push('### Fix commits per file (top 15, excluding package*.json)\n\n' + table(['file', 'commits', 'fix', 'crash'],
    top(agg(c => c.files.filter(f => !/package(-lock)?\.json$/.test(f))), 15)) + '\n');
  p.push('### Crash-related commits\n\n' + commits.filter(c => c.crash)
    .map(c => `- ${c.date} ${c.subject.replace(/\|/g, '/')} (${c.files.slice(0, 3).join(', ')})`).join('\n') + '\n');
  console.log(p.join('\n'));
}

async function count(q) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.github.com/search/issues?per_page=1&q=' + encodeURIComponent(q),
      { headers: { 'User-Agent': 'theseus-oracle', Accept: 'application/vnd.github+json' } });
    if (r.ok) { await new Promise(s => setTimeout(s, 2200)); return (await r.json()).total_count; }
    await new Promise(s => setTimeout(s, 30000)); // 30 search requests/min
  }
  throw new Error('search failed: ' + q);
}

async function issuesMode() {
  // ONLYOFFICE/server has issues disabled: its issues live in ONLYOFFICE/DocumentServer (all components).
  // Euro-Office tracks server issues in Euro-Office/server and the product in Euro-Office/DocumentServer.
  const crashQ = '(crash OR crashes OR hang OR "out of memory")'; // search allows at most 5 ORs;
  const out = [];
  const oo = 'repo:ONLYOFFICE/DocumentServer is:issue';
  const rows = [];
  for (let y = 2016; y <= 2026; y++) {
    const d = `created:${y}-01-01..${y}-12-31`;
    const all = await count(`${oo} ${d}`), bug = await count(`${oo} label:confirmed-bug ${d}`);
    const crash = await count(`${oo} ${d} ${crashQ}`);
    rows.push([y, all, bug, pct(bug, all), crash]);
  }
  out.push('### ONLYOFFICE/DocumentServer issues per year (whole product)\n\n' +
    table(['year', 'issues', 'confirmed-bug', 'bug %', 'crash/hang'], rows) + '\n');
  for (const repo of ['Euro-Office/server', 'Euro-Office/DocumentServer']) {
    const r = [];
    for (const m of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']) {
      const [y, mo] = m.split('-').map(Number);
      const end = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
      const d = `created:${m}-01..${end}`, b = `repo:${repo} is:issue ${d}`;
      r.push([m, await count(b), await count(`${b} label:bug`), await count(`${b} ${crashQ}`)]);
    }
    const tot = await count(`repo:${repo} is:issue`), totBug = await count(`repo:${repo} is:issue label:bug`);
    out.push(`### ${repo} issues per month (total ${tot}, label bug ${totBug})\n\n` +
      table(['month', 'issues', 'label bug', 'crash/hang'], r) + '\n');
  }
  console.log(out.join('\n'));
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'git') gitMode(args[0], args[1] || args[0]);
else if (mode === 'issues') issuesMode().catch(e => { console.error(e.message); process.exit(1); });
else { console.error('usage: defect-history.js git <repo.git> <name> | issues'); process.exit(2); }
