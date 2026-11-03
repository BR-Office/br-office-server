#!/usr/bin/env bash
# PKT-0096: differential oracle for the web-apps-documenteditor module: original web-apps (external/web-apps.base)
# against new (external/web-apps), in Chromium against the running Document Server (see web-apps-run.cjs for
# what is compared). Intended differences: web-apps-documenteditor.intended next to this script.
# Builds (web-apps-build.sh) are cached by content in $THESEUS_CACHE_DIR (default ~/.cache/theseus).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
C=${THESEUS_CACHE_DIR:-$HOME/.cache/theseus}/web-apps-differential
curl -sf http://127.0.0.1/healthcheck >/dev/null || { echo "differential: Document Server not running (healthcheck)"; exit 2; }
[ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ] || [ ! -d /opt/pw-browsers ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)"
ORIG=$(bash "$HERE/web-apps-build.sh" "$ROOT/external/web-apps.base" documenteditor)
NEW=$(bash "$HERE/web-apps-build.sh" "$ROOT/external/web-apps" documenteditor)
# Inputs: the sdkjs oracle's docx (gen-inputs.py) plus a plain text and an RTF file (other kinds the editor opens).
IN=$C/inputs/$(cat "$HERE/gen-inputs.py" "$0" | sha1sum | cut -c1-12)
if [ ! -s "$IN/simple.rtf" ]; then
  python3 "$HERE/gen-inputs.py" "$IN"
  printf 'Plain text line one.\nSecond line with more words in it.\n\nThird paragraph after a blank line.\n' > "$IN/plain.txt"
  printf '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 RTF first paragraph with {\\b bold} and {\\i italic}.\\par Second RTF paragraph.\\par}\n' > "$IN/simple.rtf"
fi
echo "differential: original $(git -C "$ROOT/external/web-apps.base" rev-parse --short HEAD) ($ORIG)"
echo "differential: new      $(git -C "$ROOT/external/web-apps" rev-parse --short HEAD) ($NEW)"
exec node "$HERE/web-apps-run.cjs" web-apps-documenteditor documenteditor "$ORIG" "$NEW" "$IN" "$HERE/web-apps-documenteditor.intended" ${DIFF_CASES:-text.docx styles.docx plain.txt simple.rtf}
