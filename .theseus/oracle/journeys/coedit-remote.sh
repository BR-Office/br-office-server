#!/bin/sh
# Journey coedit-remote (PKT-0129): two users in the same Word document; A presses a key until the character is
# drawn on B's screen, against the integrated build (serve-integrated.sh up).
# Prints: total_ms=<p50> min_ms= max_ms= runs=<n> (n = remote changes measured).
# Env: SESSIONS (default 3), KEYS (keys per session, default 20), JOURNEY_JSON=<file> (per-change stages),
# NO_INTEGRATED=1 (packaged build, A/B), DS_LOG (DocService log, default the native package's out.log).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NO_INTEGRATED" ]; then bash "$HERE/../serve-integrated.sh" up >&2; fi
[ -n "$PLAYWRIGHT_BROWSERS_PATH" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)" exec node "$HERE/coedit-remote-run.cjs"
