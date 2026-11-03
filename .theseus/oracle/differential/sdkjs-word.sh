#!/usr/bin/env bash
# PKT-0095: differential oracle for the sdkjs-word module: original sdkjs (external/sdkjs.base) against new
# (external/sdkjs), in Chromium against the running Document Server (see run.cjs for what is compared).
# Intended differences: sdkjs-word.intended next to this script ("<case> <check>" per line).
# Builds are cached by content in $THESEUS_CACHE_DIR (default ~/.cache/theseus).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
C=${THESEUS_CACHE_DIR:-$HOME/.cache/theseus}/sdkjs-differential
curl -sf http://127.0.0.1/healthcheck >/dev/null || { echo "differential: Document Server not running (healthcheck)"; exit 2; }
ORIG=$(bash "$HERE/build.sh" "$ROOT/external/sdkjs.base" word)
NEW=$(bash "$HERE/build.sh" "$ROOT/external/sdkjs" word)
IN=$C/inputs/$(sha1sum < "$HERE/gen-inputs.py" | cut -c1-12)
[ -s "$IN/chart.pptx" ] || python3 "$HERE/gen-inputs.py" "$IN"
echo "differential: original $(git -C "$ROOT/external/sdkjs.base" rev-parse --short HEAD) ($ORIG)"
echo "differential: new      $(git -C "$ROOT/external/sdkjs" rev-parse --short HEAD) ($NEW)"
for d in "$ORIG" "$NEW"; do for u in "$d"/*/unminified; do [ -e "$u" ] && echo "differential: $u: $(tr '\n' ' ' < "$u")(unminified, memory)"; done; done
exec node "$HERE/run.cjs" sdkjs-word "$ORIG" "$NEW" "$IN" "$HERE/sdkjs-word.intended" ${DIFF_CASES:-text.docx styles.docx}
