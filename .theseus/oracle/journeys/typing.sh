#!/bin/sh
# Journey typing (PKT-0128): type in an open Word document, key press -> character drawn on screen,
# against the integrated build (serve-integrated.sh up). Prints: total_ms=<p50> min_ms= max_ms= runs=<n>
# (n = keystrokes measured). Env: SESSIONS (default 3), KEYS (keys per session, default 30),
# JOURNEY_JSON=<file> (per-key stages), NO_INTEGRATED=1 (packaged build, A/B).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NO_INTEGRATED" ]; then bash "$HERE/../serve-integrated.sh" up >&2; fi
[ -n "$PLAYWRIGHT_BROWSERS_PATH" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)" exec node "$HERE/typing-run.cjs"
