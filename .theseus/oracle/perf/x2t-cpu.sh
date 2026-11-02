#!/usr/bin/env bash
# PKT-0054: CPU time (user+sys, from bash `times` of the child) and wall time of x2t <in> -> pdf.
# CPU time is stable on the shared factory VM where wall time swings 2x with load.
# Usage: x2t-cpu.sh <workdir> <input>...
set -euo pipefail
W=$(realpath -m "$1"); shift; mkdir -p "$W"; B=/var/www/euro-office/documentserver/server/FileConverter/bin
for IN in "$@"; do
  OUT="$W/$(basename "${IN%.*}").pdf"; rm -f "$OUT"
  python3 -I - "$B" "$IN" "$OUT" <<'PY'
import os,sys,time,resource,subprocess
b,i,o=sys.argv[1:]; t=time.time()
subprocess.run(['./x2t',i,o],cwd=b,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
r=resource.getrusage(resource.RUSAGE_CHILDREN)
print(f"{os.path.basename(i)}: wall={time.time()-t:.1f}s cpu={r.ru_utime+r.ru_stime:.1f}s maxrss={r.ru_maxrss//1024}MB pdf={os.path.getsize(o)//1024 if os.path.exists(o) else 0}KB")
PY
done
