#!/usr/bin/env bash
# PKT-0125: interleaved A/B of the documenteditor app.js (base vs new web-apps build) with perf/open-window.js.
# Swaps the built app.js into the installed Document Server, BLOCKS x RUNS opens per side, sides alternating per
# block (A B A B ...) so drift and other load on the VM hit both sides alike; restores the installed app.js at exit.
# Usage: toolbar-ab.sh <out-dir> <base-build-dir> <new-build-dir> <file.docx>...   (env BLOCKS=5 RUNS=3)
# Build dirs: output of .theseus/oracle/differential/web-apps-build.sh.
set -euo pipefail
OUT=$1 A=$2 B=$3; shift 3
HERE=$(cd "$(dirname "$0")" && pwd)
I=/var/www/euro-office/documentserver/web-apps/apps/documenteditor/main/app.js
REL=web-apps/apps/documenteditor/main/app.js
mkdir -p "$OUT"; [ -s "$OUT/app.js.installed" ] || cp -p "$I" "$OUT/app.js.installed"
trap 'cp -p "$OUT/app.js.installed" "$I"' EXIT
export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)"; [ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
for b in $(seq 1 "${BLOCKS:-5}"); do
  for side in base new; do
    src=$A; [ $side = new ] && src=$B
    [ -s "$OUT/$side-$b.json" ] && continue   # resume: blocks already measured are kept
    cp "$src/$REL" "$I"
    for try in 1 2 3; do   # an open can time out ("editor not ready") when other packets load the VM
      node "$HERE/open-window.js" "$OUT/$side-$b.json" "$@" --runs "${RUNS:-3}" --raw >"$OUT/$side-$b.log" 2>&1 && break
      echo "block $b $side attempt $try failed: $(tail -2 "$OUT/$side-$b.log" | head -1)"; [ $try = 3 ] && exit 1
    done
    echo "block $b $side done $(date +%T) load $(cut -d' ' -f1 /proc/loadavg)"
  done
done
