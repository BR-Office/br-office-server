#!/bin/sh
# Journey convert-docx-pdf (PKT-0131): an integrator POSTs open-docx-10p.docx to ConvertService (outputtype pdf)
# and polls until the PDF is returned and downloaded, against the integrated build (serve-integrated.sh up).
# Prints: total_ms=<p50> min_ms= max_ms= runs=<n>. Env: RUNS (default 7), POLL (ms, default 20),
# JOURNEY_JSON=<file> (per-run marks and stages), NO_INTEGRATED=1 (packaged build, A/B).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$NO_INTEGRATED" ]; then bash "$HERE/../serve-integrated.sh" up >&2; fi
exec node "$HERE/convert-docx-pdf-run.cjs"
