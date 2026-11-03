#!/bin/sh
# Brings the integrated build up/down on the native Document Server (PKT-0126).
# Integrated build = this repository's checkout + the forks' collecting branch `theseus` under external/.
# What is overlaid on the installed package (/var/www/euro-office/documentserver):
#   - sdkjs word bundle (word/sdk-all.js, sdk-all-min.js) built from external/sdkjs (branch theseus) with webpack;
#   - core (x2t) and web-apps: overlaid only when their `theseus` branch differs from `main`
#     (on 2026-11-03 both were identical to main, so the packaged build already is the integrated one);
#   - server (Common, DocService): the packaged pkg binary runs; the repo's main differs from it only in
#     DocsCoServer.js/converterservice.js lines off the open path (see journeys/open-docx-10p.md).
# Usage: serve-integrated.sh up|down|status
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DS=/var/www/euro-office/documentserver
BAK=/var/lib/theseus-integrated-backup
SDK="$ROOT/external/sdkjs"
case "$1" in
up)
	curl -sf http://127.0.0.1/healthcheck >/dev/null || bash "$ROOT/.theseus/adapter/scripts/start-documentserver.sh"
	for r in core web-apps; do
		if [ -n "$(git -C "$ROOT/external/$r" diff --stat origin/main origin/theseus 2>/dev/null)" ]; then
			echo "WARN: $r theseus differs from main; overlay not implemented, packaged build used" >&2
		fi
	done
	OUT="$SDK/deploy-integrated"
	if [ ! -f "$OUT/sdkjs/word/sdk-all-min.js" ] || [ "$(cat "$OUT/.rev" 2>/dev/null)" != "$(git -C "$SDK" rev-parse HEAD)" ]; then
		# webpack.word.mjs runs two compilers (min, all) and terser in parallel: over the 3.5 GB the
		# sandbox allows. Build them one at a time, `all` unminified, then terser in its own process
		# with the factory's options (compress, mangle off, ascii_only, quote_keys): 18.47 MB vs 18.55 MB packaged.
		(cd "$SDK/build" && { [ -d node_modules ] || npm ci --no-audit --no-fund; } &&
			export BUILD_ROOT="$OUT" NODE_OPTIONS=--max-old-space-size=3200 &&
			npx webpack --config webpack.word.mjs --config-name word:min &&
			npx webpack --config webpack.word.mjs --config-name word:all --no-optimization-minimize &&
			node_modules/.bin/terser "$OUT/sdkjs/word/sdk-all.js" --compress --format ascii_only=true,quote_keys=true,comments=false -o "$OUT/sdkjs/word/sdk-all.t.js" &&
			mv "$OUT/sdkjs/word/sdk-all.t.js" "$OUT/sdkjs/word/sdk-all.js")
		git -C "$SDK" rev-parse HEAD > "$OUT/.rev"
	fi
	if [ ! -d "$BAK/word" ]; then mkdir -p "$BAK/word"; cp -a "$DS/sdkjs/word/sdk-all"* "$BAK/word/"; fi
	for f in sdk-all.js sdk-all-min.js; do cp "$OUT/sdkjs/word/$f" "$DS/sdkjs/word/$f"; done
	rm -f "$DS/sdkjs/word/sdk-all.cache"   # stale V8 code cache of the packaged bundle
	echo "integrated: sdkjs $(cat "$OUT/.rev" | cut -c1-8) overlaid"
	;;
down)
	[ -d "$BAK/word" ] && cp -a "$BAK/word/"* "$DS/sdkjs/word/" && rm -rf "$BAK" && echo "packaged build restored"
	;;
status)
	[ -d "$BAK/word" ] && echo up || echo down
	;;
*) echo "usage: $0 up|down|status" >&2; exit 2 ;;
esac
