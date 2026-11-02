#!/usr/bin/env bash
# PKT-0077: build a mirror of the installed Document Server that runs a given cell/sdk-all.js,
# with its own V8 snapshot/code cache, without touching the installed files.
# Usage: sdkjs-mirror.sh <mirror-dir> <sdk-all.js>
#   then: (cd <mirror-dir>/server/FileConverter/bin && ./x2t in.xlsx out.pdf)
# Layout: server/FileConverter/bin copied (DoctRenderer.config's ../../../sdkjs resolves to the mirror);
# every other top-level entry symlinked; sdkjs/{word,cell,slide,pdf,visio} are real dirs whose files are
# symlinks EXCEPT sdk-all.bin/sdk-all.cache (left out, so x2t -create-js-snapshots writes fresh ones here)
# and cell/sdk-all.js (the given file).
set -euo pipefail
M=$(realpath -m "$1"); JS=$(realpath "$2"); D=/var/www/euro-office/documentserver
rm -rf "$M"; mkdir -p "$M/server/FileConverter" "$M/sdkjs"
for e in "$D"/*; do n=$(basename "$e"); case $n in server|sdkjs) ;; *) ln -s "$e" "$M/$n";; esac; done
for e in "$D"/server/*; do n=$(basename "$e"); [ "$n" = FileConverter ] || ln -s "$e" "$M/server/$n"; done
cp -a "$D/server/FileConverter/bin" "$M/server/FileConverter/bin"
for e in "$D"/sdkjs/*; do
  n=$(basename "$e")
  case $n in
    word|cell|slide|pdf|visio)
      mkdir "$M/sdkjs/$n"
      for f in "$e"/*; do b=$(basename "$f"); case $b in sdk-all.bin|sdk-all.cache) ;; *) ln -s "$f" "$M/sdkjs/$n/$b";; esac; done ;;
    *) ln -s "$e" "$M/sdkjs/$n";;
  esac
done
rm "$M/sdkjs/cell/sdk-all.js"; cp "$JS" "$M/sdkjs/cell/sdk-all.js"
(cd "$M/server/FileConverter/bin" && ./x2t -create-js-snapshots >/dev/null 2>&1 || true)
ls -la "$M/sdkjs/cell/"
