#!/bin/sh
# Journey open-docx-real-internet (PKT-0141): as open-docx-real, browser on emulated 50/10 Mbps, 30 ms link; select samples/aluno-moderno.docx (11 pages, images, tables, CJK) and wait until it is fully rendered (first open),
# against the integrated build (serve-integrated.sh up). Prints: total_ms=<p50> min_ms= max_ms= runs=<n>.
# Env: RUNS (default 5), JOURNEY_JSON=<file> (per-run marks), JOURNEY_BASE (default http://127.0.0.1),
# NO_INTEGRATED=1 to measure the packaged build as installed (A/B).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NO_INTEGRATED" ]; then bash "$HERE/../serve-integrated.sh" up >&2; fi
[ -n "$PLAYWRIGHT_BROWSERS_PATH" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)" exec node "$HERE/open-docx-real-internet-run.cjs"
