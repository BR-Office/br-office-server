#!/bin/sh
# Journey save (PKT-0130): close an edited Word document until the saved file is in the example storage,
# against the integrated build (serve-integrated.sh up). Prints: total_ms=<p50> min_ms= max_ms= runs=<n>
# (n = closes measured). Env: RUNS (default 5),
# JOURNEY_JSON=<file> (per-run timestamps and logs), NO_INTEGRATED=1 (packaged build, A/B).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NO_INTEGRATED" ]; then bash "$HERE/../serve-integrated.sh" up >&2; fi
[ -n "$PLAYWRIGHT_BROWSERS_PATH" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)" exec node "$HERE/save-run.cjs"
