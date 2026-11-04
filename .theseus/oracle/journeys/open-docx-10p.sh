#!/bin/sh
# Journey open-docx-10p (PKT-0126): select a 10-page docx and wait until it is fully rendered (first open),
# against the integrated build (serve-integrated.sh up). Prints: total_ms=<p50> min_ms= max_ms= runs=<n>.
# Env: RUNS (default 5), JOURNEY_JSON=<file> (per-run marks), JOURNEY_BASE (default http://127.0.0.1),
# NO_INTEGRATED=1 to measure the packaged build as installed (A/B).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NO_INTEGRATED" ]; then bash "$HERE/../serve-integrated.sh" up >&2; fi
[ -n "$PLAYWRIGHT_BROWSERS_PATH" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)" exec node "$HERE/open-docx-10p-run.cjs"
