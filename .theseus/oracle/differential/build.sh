#!/usr/bin/env bash
# PKT-0095: build one side of the sdkjs differential oracle, cached by content.
# Usage: build.sh <sdkjs-checkout> <word|slide|cell|visio>...   -> prints the output dir (contains <module>/sdk-all{,-min}.js)
# The key is the checkout's HEAD tree plus its uncommitted diff (so the new side's working state counts).
# Sources are exported with `git archive` (+ the working diff) into the cache, node_modules is shared by
# npm-shrinkwrap hash, and every build uses a fresh webpack cache dir (baseline.md, PKT-0089: a shared
# persistent cache made a second build reuse the first one's output).
set -euo pipefail
SRC=$(cd "$1" && pwd); shift
C=${THESEUS_CACHE_DIR:-$HOME/.cache/theseus}/sdkjs-differential
mkdir -p "$C"
TREE=$(git -C "$SRC" rev-parse HEAD^{tree})
DIFF=$( { git -C "$SRC" diff HEAD -- . ':!build/node_modules'; git -C "$SRC" ls-files -o --exclude-standard -z -- . ':!node_modules' ':!.theseus-addons' ':!develop' | xargs -0r sha1sum; } | sha1sum | cut -c1-12)
KEY=$TREE-$DIFF
OUT=$C/out/$KEY
NM=$C/node_modules/$(sha1sum < "$SRC/build/npm-shrinkwrap.json" | cut -c1-12)
exec 9>"$C/.lock"; flock 9
if [ ! -d "$NM/node_modules" ]; then
  rm -rf "$NM"; mkdir -p "$NM"
  cp "$SRC/build/package.json" "$SRC/build/npm-shrinkwrap.json" "$NM/"
  (cd "$NM" && npm ci --no-audit --no-fund >&2)
fi
for m in "$@"; do
  [ -s "$OUT/$m/sdk-all.js" ] && continue
  W=$C/src/$KEY; rm -rf "$W"; mkdir -p "$W"
  git -C "$SRC" archive HEAD | tar -x -C "$W"
  git -C "$SRC" diff HEAD --binary -- . | (cd "$W" && git apply --allow-empty 2>/dev/null || git apply)
  git -C "$SRC" ls-files -o --exclude-standard -z -- . ':!node_modules' ':!.theseus-addons' ':!develop' | (cd "$SRC" && xargs -0r cp --parents -t "$W")
  ln -s "$NM/node_modules" "$W/build/node_modules"
  echo "differential: building $m from $SRC ($KEY)" >&2
  T0=$(date +%s)
  # One chunk config at a time (min, then all): together in one process the slide build passed the
  # ~4 GB memory cgroup of an agent's shell and was OOM-killed.
  # If terser still does not fit (other agents share the cgroup), build that chunk once more without minimizing:
  # same code, only not minified; recorded in $OUT/$m/unminified and printed by the oracle.
  mkdir -p "$OUT/$m"; rm -f "$OUT/$m/unminified"
  wp() { (cd "$W/build" && NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}" BUILD_ROOT="$W/deploy-root" WEBPACK_CACHE_DIR="$W/.wp-$ch" npx webpack --config "webpack.$m.mjs" --config-name "$m:$ch" "$@" >&2); }
  for ch in min all; do
    wp || { echo "differential: $m:$ch minified build failed (memory?), building it unminified" >&2; echo "$m:$ch" >> "$OUT/$m/unminified"; wp --no-optimization-minimize; }
  done
  cp "$W/deploy-root/sdkjs/$m"/sdk-all*.js "$OUT/$m/"
  echo "differential: built $m in $(( $(date +%s) - T0 )) s" >&2
  rm -rf "$W"
done
echo "$OUT"
