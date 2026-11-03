#!/usr/bin/env bash
# PKT-0094: build one side of the x2t differential oracle from a core checkout, cached by git tree.
# Usage: x2t-build.sh <core-checkout>   -> prints the side's mirror dir (a runnable copy of the installed
#   Document Server layout whose server/FileConverter/bin has the built x2t and core libraries).
# Key = HEAD tree + hash of the uncommitted diff, so the same tree is built once whatever the worktree path
# (original and new share one build when their trees are equal). Sources are exported with `git archive`
# into $C/src/<key> (stable path and mtimes: make stays incremental across runs); third-party projects
# (V8, ICU, boost...) are built once in $C/third_party and shared by every key.
# Env: X2T_JOBS (default nproc; falls back to 1 on failure).
set -euo pipefail
SRC=$(cd "$1" && pwd)
C=${THESEUS_CACHE_DIR:-$HOME/.cache/theseus}/x2t
D=/var/www/euro-office/documentserver
TREE=$(git -C "$SRC" rev-parse HEAD^{tree})
DIFF=$( { git -C "$SRC" diff HEAD; git -C "$SRC" ls-files -o --exclude-standard -z | (cd "$SRC" && xargs -0r sha1sum); } | sha1sum | cut -c1-12)
KEY=$TREE-$DIFF; W=$C/src/$KEY; B=$C/build/$KEY; M=$C/mirror/$KEY
mkdir -p "$C"; exec 9>"$C/.lock"; flock 9
if [ ! -x "$M/server/FileConverter/bin/x2t" ]; then
  if [ ! -f "$W/.exported" ]; then
    rm -rf "$W"; mkdir -p "$W"
    git -C "$SRC" archive HEAD | tar -x -C "$W"
    git -C "$SRC" diff HEAD --binary | (cd "$W" && git apply --allow-empty)
    git -C "$SRC" ls-files -o --exclude-standard -z | (cd "$SRC" && xargs -0r cp --parents -t "$W")
    touch "$W/.exported"
  fi
  echo "differential: building x2t from $SRC ($KEY) in $B" >&2
  T0=$(date +%s)
  [ -f "$B/CMakeCache.txt" ] || cmake -S "$W" -B "$B" -DCMAKE_BUILD_TYPE=Release \
      -DEO_CORE_3RD_PARTY_DIR="$C/third_party" >&2
  # Some units (OdfFormatLib/odf_writer.cpp) need >3 GB to compile: parallel jobs can be OOM-killed on the
  # 7 GB VM, so a failed parallel build is resumed (incrementally) with one job.
  cmake --build "$B" --target x2t -j "${X2T_JOBS:-$(nproc)}" >&2 || cmake --build "$B" --target x2t -j 1 >&2
  echo "differential: built x2t in $(( $(date +%s) - T0 )) s" >&2
  # Mirror: installed layout (sdkjs, fonts, DoctRenderer.config's ../../../sdkjs) with the built binaries.
  rm -rf "$M"; mkdir -p "$M/server/FileConverter"
  for e in "$D"/*; do n=$(basename "$e"); [ "$n" = server ] || ln -s "$e" "$M/$n"; done
  for e in "$D"/server/*; do n=$(basename "$e"); [ "$n" = FileConverter ] || ln -s "$e" "$M/server/$n"; done
  cp -a "$D/server/FileConverter/bin" "$M/server/FileConverter/bin"
  BIN=$M/server/FileConverter/bin; n=0
  # Every installed library the build produced is replaced by the built one (same soname file name).
  while IFS= read -r -d '' f; do
    b=$(basename "$f"); [ -e "$BIN/$b" ] || [ -L "$BIN/$b" ] || continue
    rm -f "$BIN/$b"; cp -L "$f" "$BIN/$b"; n=$((n + 1))
  done < <(find "$B" -path "$B/third_party" -prune -o \( -name '*.so' -o -name '*.so.*' \) \( -type f -o -type l \) -print0)
  X=$(find "$B" -path "$B/third_party" -prune -o -name x2t -type f -perm -u+x -print | head -1)
  [ -n "$X" ] || { echo "differential: no x2t binary in $B" >&2; exit 2; }
  rm -f "$BIN/x2t"; cp "$X" "$BIN/x2t"
  sha1sum "$BIN/x2t" > "$M/.built"; echo "libraries replaced: $n" >> "$M/.built"
  echo "differential: mirror $M (x2t + $n libraries from the build)" >&2
fi
echo "$M"
