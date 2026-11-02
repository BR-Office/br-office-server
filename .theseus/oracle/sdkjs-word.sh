#!/bin/sh
# Theseus oracle for the sdkjs-word module (PKT-0044): the external/sdkjs/tests/word QUnit
# suites, headless, with the same list and skips as upstream tests/runAll.js (word entries only).
# Setup is done once per worktree (npm ci in build, npm run develop, node-qunit-puppeteer).
# Uses the preinstalled Playwright Chromium instead of downloading one for puppeteer.
# Usage: .theseus/oracle/sdkjs-word.sh [suite-filter-substring]
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
# The forms addon (PKT-0056): word/js-api/js-api-forms.html needs it, as in upstream CI
# (external/sdkjs/AGENTS.md: SDK_ADDONS=../../sdkjs-forms npm run --prefix build develop).
# The factory does not clone it, so the oracle does, shallow, next to external/sdkjs.
FORMS="$SDK/../sdkjs-forms"
[ -d "$FORMS/.git" ] || git clone --depth 1 https://github.com/Euro-Office/sdkjs-forms "$FORMS"
# Rebuild develop when it was built without the addon (stamp written after a build with it).
STAMP=develop/.theseus-addons-forms
if [ ! -f develop/sdkjs/word/scripts.js ] || [ ! -f "$STAMP" ]; then
	(cd build && SDK_ADDONS=../../sdkjs-forms npm run develop) && touch "$STAMP"
fi
exec node "$HERE/sdkjs-word-run.cjs" "$SDK" "$@"
