# PKT-0077: A/B CPU time of x2t <xlsx> -> pdf in two mirrors (see sdkjs-mirror.sh), runs interleaved
# A,B,A,B... so VM load drifts hit both sides. Prints one line per run and the median per side.
# Usage: python3 -I x2t-cpu-ab.py <mirror-A> <mirror-B> <runs> <out-dir> <input.xlsx>...
import os, resource, statistics, subprocess, sys
a, b, n, out, *ins = sys.argv[1:]; n = int(n); os.makedirs(out, exist_ok=True)
def run(m, i, o):
    r0 = resource.getrusage(resource.RUSAGE_CHILDREN)
    subprocess.run(['./x2t', i, o], cwd=os.path.join(m, 'server/FileConverter/bin'),
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    r1 = resource.getrusage(resource.RUSAGE_CHILDREN)
    return r1.ru_utime + r1.ru_stime - r0.ru_utime - r0.ru_stime, r1.ru_maxrss // 1024
for i in map(os.path.abspath, ins):
    res = {a: [], b: []}
    for k in range(n):
        for m in (a, b):
            o = os.path.join(out, f'{os.path.basename(m)}-{os.path.basename(i)[:-5]}.pdf')
            if os.path.exists(o): os.remove(o)
            c, rss = run(m, i, o); res[m].append(c)
            print(f'{os.path.basename(i)} {os.path.basename(m)} run{k}: cpu={c:.1f}s maxrss<={rss}MB '
                  f'pdf={os.path.getsize(o)//1024 if os.path.exists(o) else 0}KB', flush=True)
    ma, mb = statistics.median(res[a]), statistics.median(res[b])
    print(f'{os.path.basename(i)} median A={ma:.1f}s B={mb:.1f}s saving={(1-mb/ma)*100:.0f}%', flush=True)
