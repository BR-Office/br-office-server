# PKT-0125: summarise toolbar-ab.sh output: per file and side, median / min-max / p25-p75 over all runs of
# ctlCode.LoadDoc.Toolbar (profiled opens) and the unprofiled LoadDoc and Ready marks; plus median of per-block
# paired differences (new - base) and how many blocks moved the same way.
# Usage: python3 toolbar-ab-summary.py <out-dir>
import json, glob, os, statistics as st, sys
D = sys.argv[1]
def q(xs, p): xs = sorted(xs); k = (len(xs) - 1) * p; f = int(k); return xs[f] + (xs[min(f + 1, len(xs) - 1)] - xs[f]) * (k - f)
data = {}
for fn in sorted(glob.glob(os.path.join(D, '*-*.json'))):
    side, blk = os.path.basename(fn)[:-5].split('-')
    for f, v in json.load(open(fn))['files'].items():
        for r, rn in zip(v['raw'], v['rawNoProfiler']):
            data.setdefault(f, {}).setdefault(side, {}).setdefault(int(blk), []).append(
                {'Toolbar': r['ctlCode']['LoadDoc'].get('Toolbar', 0), 'LoadDoc': rn['marks']['LoadDoc'], 'Ready': rn['marks']['Ready']})
for f, sides in data.items():
    print(f'\n{f}')
    print('| metric | base median (p25–p75, min–max) | new median (p25–p75, min–max) | Δ median | per-block Δ (median; blocks new<base) |')
    print('|---|---|---|---|---|')
    for m in ('Toolbar', 'LoadDoc', 'Ready'):
        cell = {}
        for s in ('base', 'new'):
            xs = [r[m] for b in sides[s].values() for r in b]
            cell[s] = (st.median(xs), xs)
            n = len(xs)
        fmt = lambda c: f'{c[0]:.0f} ({q(c[1],.25):.0f}–{q(c[1],.75):.0f}, {min(c[1]):.0f}–{max(c[1]):.0f})'
        bd = [st.median([r[m] for r in sides['new'][b]]) - st.median([r[m] for r in sides['base'][b]]) for b in sorted(sides['base']) if b in sides['new']]
        print(f"| {m} (n={n}) | {fmt(cell['base'])} | {fmt(cell['new'])} | {cell['new'][0]-cell['base'][0]:+.0f} | {st.median(bd):+.0f}; {sum(d < 0 for d in bd)}/{len(bd)} |")
