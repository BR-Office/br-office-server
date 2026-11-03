#!/usr/bin/env bash
# PKT-0094: differential oracle for the x2t module: the original core (external/core.base, the upstream code
# the fork was made from) against the new core (external/core, the packet branch with the merged changes).
# 1. Builds x2t from each checkout (x2t-build.sh, cached by git tree in $THESEUS_CACHE_DIR, default
#    ~/.cache/theseus) and proves each build runs (docx -> Editor.bin from its own mirror).
# 2. Direct: both builds on the same inputs in the server's directions, outputs compared by content,
#    interleaved repeats for timing (x2t-direct.py).
# 3. Browser: installs each build in turn as the running Document Server's x2t and drives users A and B in
#    Chromium (open, scripted local + remote co-editing edits, save, convert, reopen), interleaved repeats;
#    the installed x2t is restored on exit (x2t-run.cjs).
# Fails on any difference not listed in x2t.intended ("<case> <check>" per line, with the intending packet).
# Env: DIFF_RUNS (direct repeats, default 3), DIFF_REPEATS (browser repeats per side, default 2),
#      DIFF_CASES (browser cases, default all three), X2T_JOBS (build parallelism).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
C=${THESEUS_CACHE_DIR:-$HOME/.cache/theseus}/x2t
D=/var/www/euro-office/documentserver; BIN=$D/server/FileConverter/bin
INTENDED=$HERE/x2t.intended
curl -sf http://127.0.0.1/healthcheck >/dev/null || { echo "differential: Document Server not running (healthcheck)"; exit 2; }
for s in core.base core; do git -C "$ROOT/external/$s" rev-parse HEAD >/dev/null; done
ORIG=$(bash "$HERE/x2t-build.sh" "$ROOT/external/core.base")
NEW=$(bash "$HERE/x2t-build.sh" "$ROOT/external/core")
echo "differential: original core.base $(git -C "$ROOT/external/core.base" rev-parse --short HEAD) tree $(git -C "$ROOT/external/core.base" rev-parse --short HEAD^{tree}) -> $ORIG"
echo "differential: new      core      $(git -C "$ROOT/external/core" rev-parse --short HEAD) tree $(git -C "$ROOT/external/core" rev-parse --short HEAD^{tree}) -> $NEW"
[ "$ORIG" = "$NEW" ] && echo "differential: both trees are equal: one build serves both sides (expected while core has no merged change)"

# Inputs: the package's en-US templates + the deterministic make-corpus.py output (dir must be named corpus).
IN=$C/inputs/$(sha1sum < "$ROOT/.theseus/oracle/x2t/make-corpus.py" | cut -c1-12)/corpus
[ -s "$IN/slides-12.pptx" ] || python3 "$ROOT/.theseus/oracle/x2t/make-corpus.py" "$IN" >/dev/null
T=$D/document-templates/new/en-US

# Proof that each build runs: its own x2t + libraries (no installed library on the path) open a docx.
for M in "$ORIG" "$NEW"; do
  P=$(mktemp -d); B=$M/server/FileConverter/bin
  (cd "$B" && LD_LIBRARY_PATH="$B" ./x2t "$IN/text-10p.docx" "$P/Editor.bin" >/dev/null 2>&1) || true
  [ -s "$P/Editor.bin" ] || { echo "differential: the build in $M does not run (no Editor.bin)"; exit 2; }
  echo "differential: build runs: $M x2t $(cut -c1-12 "$M/.built" | head -1), $(tail -1 "$M/.built"), Editor.bin $(stat -c %s "$P/Editor.bin") bytes"
  rm -rf "$P"
done

fail=0
python3 -I "$HERE/x2t-direct.py" "$ORIG/server/FileConverter/bin" "$NEW/server/FileConverter/bin" "${DIFF_RUNS:-3}" "$INTENDED" \
  "$T/new.docx" "$T/new.xlsx" "$T/new.pptx" "$IN/text-10p.docx" "$IN/rows-500.xlsx" "$IN/slides-12.pptx" || fail=1

# Browser part: swap the server's x2t (FileConverter spawns $BIN/x2t per task with LD_LIBRARY_PATH=$BIN),
# under a lock shared by every worktree on this machine; the pristine installed bin is kept in $C/installed-bin.
exec 8>"$C/.server.lock"; flock 8
if [ -f "$C/.swapped" ]; then echo "differential: restoring the installed x2t left by an interrupted run"; rm -rf "$BIN"; cp -a "$C/installed-bin" "$BIN"; rm -f "$C/.swapped"; fi
[ -f "$C/installed-bin/.complete" ] || { rm -rf "$C/installed-bin"; cp -a "$BIN" "$C/installed-bin"; touch "$C/installed-bin/.complete"; }
restore() { rm -rf "$BIN"; cp -a "$C/installed-bin" "$BIN"; rm -f "$BIN/.complete" "$C/.swapped"; }
trap restore EXIT
install_side() { touch "$C/.swapped"; rm -rf "$BIN"; cp -a "$1/server/FileConverter/bin" "$BIN"; chmod -R a+rX "$BIN"; }
R=$(mktemp -d); trap 'restore; rm -rf "$R"' EXIT
CASES=${DIFF_CASES:-text-10p.docx rows-500.xlsx slides-12.pptx}
O=(); N=()
for k in $(seq 1 "${DIFF_REPEATS:-2}"); do
  install_side "$ORIG"; node "$HERE/x2t-run.cjs" side "$R/o$k.json" "$IN" $CASES; O+=("$R/o$k.json")
  install_side "$NEW";  node "$HERE/x2t-run.cjs" side "$R/n$k.json" "$IN" $CASES; N+=("$R/n$k.json")
done
node "$HERE/x2t-run.cjs" compare "$INTENDED" "${O[@]}" -- "${N[@]}" || fail=1
echo "differential x2t: $([ $fail = 0 ] && echo PASS || echo FAIL)"
exit $fail
