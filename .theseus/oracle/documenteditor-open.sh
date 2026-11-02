#!/bin/sh
# Theseus oracle for web-apps-documenteditor (PKT-0048): open-sequence check against the native
# Document Server (see .theseus/adapter/environment.md). Opens a new docx through the example app,
# waits for the toolbar and the end of the load mask, types a marker, closes the editor and waits
# for the save callback (status 2: the example rewrites the file), then checks the marker is in the docx.
# Prints PASS/FAIL and the duration of each phase. Needs: server running (curl localhost/healthcheck),
# global playwright with the preinstalled Chromium in /opt/pw-browsers.
# Usage: .theseus/oracle/documenteditor-open.sh [base-url]   (default http://localhost)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -n "$PLAYWRIGHT_BROWSERS_PATH" ] || export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g)" exec node "$HERE/documenteditor-open-run.cjs" "$@"
