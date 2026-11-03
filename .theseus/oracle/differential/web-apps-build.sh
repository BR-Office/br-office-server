#!/usr/bin/env bash
# PKT-0096: build one side of the web-apps differential oracle (desktop editor bundle), cached by content.
# Usage: web-apps-build.sh <web-apps-checkout> <editor>   (editor: documenteditor, ...)
#   -> prints the output dir; it holds web-apps/apps/<editor>/main/{app.js,code.js,app.css,locale/...}
# Builds what the upstream pipeline (build/scripts/build-pipeline.js) produces for that editor with webpack:
# sprites into the exported source, then `webpack --config webpack.<editor>.mjs`. HTML, vendor, sdkjs and
# resources stay the installed Document Server's (same for both sides).
# Key: the checkout's HEAD tree plus its uncommitted diff and untracked files (the new side's working state counts).
# Sources are exported with `git archive` (+ working diff) into a fresh dir per build, node_modules is shared
# by package-lock hash, and the webpack cache is memory-only (factory config), so builds never share output
# (baseline.md: a shared persistent cache made a second build reuse the first one's output).
set -euo pipefail
SRC=$(cd "$1" && pwd); ED=$2
C=${THESEUS_CACHE_DIR:-$HOME/.cache/theseus}/web-apps-differential
mkdir -p "$C"
TREE=$(git -C "$SRC" rev-parse HEAD^{tree})
DIFF=$( { git -C "$SRC" diff HEAD -- . ':!build/node_modules'; git -C "$SRC" ls-files -o --exclude-standard -z -- . ':!build/node_modules' ':!deploy' | xargs -0r sha1sum; } | sha1sum | cut -c1-12)
KEY=$TREE-$DIFF
OUT=$C/out/$KEY
NM=$C/node_modules/$(sha1sum < "$SRC/build/package-lock.json" | cut -c1-12)
exec 9>"$C/.lock"; flock 9
if [ -s "$OUT/web-apps/apps/$ED/main/app.js" ]; then echo "$OUT"; exit 0; fi
if [ ! -d "$NM/node_modules" ]; then
  rm -rf "$NM"; mkdir -p "$NM"
  cp "$SRC/build/package.json" "$SRC/build/package-lock.json" "$NM/"
  (cd "$NM" && npm ci --no-audit --no-fund >&2)
fi
W=$C/src/$KEY; rm -rf "$W"; mkdir -p "$W"
git -C "$SRC" archive HEAD | tar -x -C "$W"
git -C "$SRC" diff HEAD --binary -- . | (cd "$W" && git apply --allow-empty 2>/dev/null || git apply)
git -C "$SRC" ls-files -o --exclude-standard -z -- . ':!build/node_modules' ':!deploy' | (cd "$SRC" && xargs -0r cp --parents -t "$W")
ln -s "$NM/node_modules" "$W/build/node_modules"
echo "differential: building web-apps $ED from $SRC ($KEY)" >&2
T0=$(date +%s)
rm -rf "$OUT.tmp"; mkdir -p "$OUT.tmp"
export BUILD_ROOT=$OUT.tmp PRODUCT_VERSION=${PRODUCT_VERSION:-9.3.7} BUILD_NUMBER=${BUILD_NUMBER:-1} THEME=${THEME:-euro-office} NODE_ENV=production
(cd "$W/build" && node scripts/deploy-sprites.js >&2 \
  && NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}" node_modules/.bin/webpack --config "webpack.$ED.mjs" >&2)
rm -rf "$OUT"; mv "$OUT.tmp" "$OUT"
echo "differential: built web-apps $ED in $(( $(date +%s) - T0 )) s" >&2
rm -rf "$W"
echo "$OUT"
