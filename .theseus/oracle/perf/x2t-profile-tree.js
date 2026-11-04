// PKT-0108: inclusive (subtree) time per call-tree node of a .cpuprofile from x2t-cpuprofile.js.
// Usage: node x2t-profile-tree.js <file.cpuprofile> [minMs=15] [maxDepth=8]   prints an indented tree.
const fs = require('fs'); const [file, minMs = '15', maxDepth = '8'] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(file)); const byId = {}; p.nodes.forEach(n => { byId[n.id] = n; n.self = 0; });
p.samples.forEach((s, i) => { byId[s].self += (p.timeDeltas[i] || 0) / 1e3; });
const incl = n => (n.incl ??= n.self + (n.children || []).reduce((a, c) => a + incl(byId[c]), 0));
const root = p.nodes[0]; console.log(`total ${incl(root).toFixed(0)} ms`);
(function walk(n, d) {
  if (d > +maxDepth) return;
  const kids = (n.children || []).map(c => byId[c]).sort((a, b) => incl(b) - incl(a));
  for (const k of kids) { if (incl(k) < +minMs) continue; const c = k.callFrame;
    console.log(`${'  '.repeat(d)}${incl(k).toFixed(0).padStart(5)} ms (self ${k.self.toFixed(0)}) ${c.functionName || '(anon)'} [${c.scriptId}:${c.lineNumber}]`);
    walk(k, d + 1); }
})(root, 0);
