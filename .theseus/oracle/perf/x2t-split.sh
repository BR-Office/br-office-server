#!/usr/bin/env bash
# PKT-0041 (run and fixed by PKT-0051): split raw x2t time into phases using strace file-open timestamps (installed native package).
# Usage: .theseus/oracle/perf/x2t-split.sh <workdir> <input>...   (input .docx/.xlsx/.pptx -> pdf;
#        input ending in /Editor.bin -> save conversion with m_bFromChanges, a changes/ dir must sit next to it)
# Markers (first openat after the previous marker):
#   start   execve -> first open of the input            (process start, dynamic loading)
#   native  input -> DoctRenderer.config                  (native OOXML -> Editor.bin, or bin read)
#   v8init  DoctRenderer.config -> sdkjs/<ed>/sdk-all-min.js  (CDoctrenderer ctor, V8 platform/isolate)
#   script  sdk-all-min.js -> AllFonts.js after it        (compile+run sdk-all-min/sdk-all.js with .cache)
#   layout  AllFonts.js -> last font_selection.bin before the output open (open bin, Execute: layout / apply changes)
#   write   -> exit_group                                 (CPdfFile / OOXML writer, cleanup)
set -euo pipefail
W=$1; shift; mkdir -p "$W"
B=/var/www/euro-office/documentserver/server/FileConverter/bin
for IN in "$@"; do
  base=$(basename "$IN"); T="$W/trace-$base-$RANDOM.txt"
  if [[ $IN == */Editor.bin ]]; then
    OUT="$W/out-$(basename "$(dirname "$IN")").docx"; X="$W/p-$RANDOM.xml"
    cat > "$X" <<X
<?xml version="1.0" encoding="utf-8"?><TaskQueueDataConvert><m_sFileFrom>$IN</m_sFileFrom><m_sFileTo>$OUT</m_sFileTo><m_nFormatTo>65</m_nFormatTo><m_bFromChanges>true</m_bFromChanges><m_sAllFontsPath>$B/AllFonts.js</m_sAllFontsPath><m_bIsNoBase64>false</m_bIsNoBase64></TaskQueueDataConvert>
X
    ARGS=("$X")
  else
    OUT="$W/${base%.*}.pdf"; ARGS=("$IN" "$OUT")
  fi
  rm -f "$OUT"
  (cd "$B" && strace -f -ttt -e trace=execve,openat,exit_group -o "$T" ./x2t "${ARGS[@]}" >/dev/null 2>&1) || echo "x2t failed: $IN" >&2
  python3 -I - "$T" "$IN" "$OUT" <<'PY'
import sys,re
t,inp,out=sys.argv[1:]
ev=[]
for l in open(t):
    m=re.match(r'\d+\s+([\d.]+)\s+(\w+)\((?:AT_FDCWD, )?"?([^",]*)',l)
    if m and 'ENOENT' not in l: ev.append((float(m.group(1)),m.group(2),m.group(3)))
def first(pred,after):
    for e in ev:
        if e[0]>=after and pred(e): return e[0]
    return None
t0=ev[0][0]; tend=[e for e in ev if e[1]=='exit_group'][-1][0]
a=first(lambda e:e[2]==inp,t0)
b=first(lambda e:e[2].endswith('DoctRenderer.config'),a)
c=first(lambda e:e[2].endswith('sdk-all-min.js'),b) if b else None
d=first(lambda e:e[2].endswith('AllFonts.js'),c) if c else None
o=first(lambda e:e[2]==out,d or a)
fs=[e[0] for e in ev if d and d<=e[0]<=(o or tend) and e[2].endswith('font_selection.bin')]
e_=fs[-1] if len(fs)>1 else (o or tend)
marks=[('start',t0,a),('native',a,b),('v8init',b,c),('script',c,d),('layout',d,e_),('write',e_,tend)]
s=' '.join(f"{n}={(y-x)*1000:.0f}" if x and y else f"{n}=-" for n,x,y in marks)
snap=sorted({e[2].split('/')[-1] for e in ev if 'sdk-all' in e[2] and e[1]=='openat'})
print(f"{inp.split('/')[-2] if inp.endswith('Editor.bin') else inp.split('/')[-1]}: total={(tend-t0)*1000:.0f}ms {s} sdk-files={','.join(snap)}")
PY
done
