#!/bin/sh
# Theseus oracle for the sdkjs-common module (PKT-0046): the external/sdkjs/tests/common QUnit
# suites, headless: the common entries (and skips) of upstream tests/runAll.js, then every other
# tests/common/**/*.html except *-compiled.html. Every suite must pass; the `known` map in sdkjs-common-run.cjs
# (empty since PKT-0090) can record a failure that must then recur exactly. Fails if no suite runs.
# Setup is done once per worktree (npm ci in build, npm run develop, node-qunit-puppeteer).
# Uses the preinstalled Playwright Chromium instead of downloading one for puppeteer.
# Usage: .theseus/oracle/sdkjs-common.sh [suite-filter-substring]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SDK="$(cd "$HERE/../../external/sdkjs" && pwd)"
cd "$SDK"
if [ -z "$PUPPETEER_EXECUTABLE_PATH" ]; then
	PUPPETEER_EXECUTABLE_PATH="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux64/chrome 2>/dev/null | tail -1)"
	export PUPPETEER_EXECUTABLE_PATH
fi
[ -d build/node_modules ] || (cd build && npm ci)
# sdkjs has no root package.json: create node_modules first so npm installs here, not in a parent repo.
[ -d node_modules/node-qunit-puppeteer ] || { mkdir -p node_modules && PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-save --no-package-lock node-qunit-puppeteer; }
[ -f develop/sdkjs/word/scripts.js ] && [ -f develop/sdkjs/cell/scripts.js ] && [ -f develop/sdkjs/slide/scripts.js ] && [ -f develop/sdkjs/visio/scripts.js ] || (cd build && npm run develop)
exec node "$HERE/sdkjs-common-run.cjs" "$SDK" "$@"
