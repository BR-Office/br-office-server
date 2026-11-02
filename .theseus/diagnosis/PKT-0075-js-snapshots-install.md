# PKT-0075 — Ship V8 startup snapshots (sdk-all.bin) with every install

Decision note + patch (`PKT-0075-js-snapshots-install.patch`) for the packaging of Euro-Office/DocumentServer.
No writable fork exists yet, so the change is delivered here, ready to apply. Paths in the patch are relative to the
installed tree: `usr/bin/documentserver-generate-allfonts.sh` and the deb `debian/postrm` (map them to their
templates in the packaging repo).

## Decision: hook into `documentserver-generate-allfonts.sh`, right after `x2t -create-js-cache`

That script is already the single place where install-time generated artifacts are built, and it is called by:

- deb `postinst configure` (install **and** upgrade), when not a Docker install;
- deb `postinst triggered` (font changes) — snapshots get rebuilt too, harmless (≈ the same cost as the js cache);
- the Docker image start-up (upstream ONLYOFFICE `run-document-server.sh` calls it; **not verified** against the
  Euro-Office image here — check when the fork exists).

So one hunk covers deb install, deb upgrade and Docker. The script then runs `chown -R ds:ds "$DIR/sdkjs"`
(unless k8s), so the `.bin` files end up owned by `ds` even though postinst runs as root (PKT-0041 risk).

Stale snapshots: the hunk always `rm -f sdkjs/*/sdk-all.bin` before `x2t -create-js-snapshots`, and again if x2t
fails, so an upgrade never leaves a `.bin` from another x2t/V8/sdk-all.js build; failure degrades to "no snapshot"
(today's behaviour) with a warning, never a broken install. `postrm` (remove/purge `clean_ds_files`) now deletes
`sdk-all.bin` next to `sdk-all.cache`, since the files are not in the package file list.

Rejected: shipping prebuilt `.bin` in the .deb (bound to the build machine's exact binaries, +33 MB, and still
needs regeneration logic); a separate `postinst` step (would miss the Docker path and the font trigger).

## Proof on the factory VM (native 9.3.7-1, 2026-11-02)

1. Saved the PKT-0065 `.bin` files, backdated `word/sdk-all.bin`, ran the patched script as root
   (`sh documentserver-generate-allfonts.sh true`, as postinst does): all five
   `sdkjs/{word,cell,slide,pdf,visio}/sdk-all.bin` were recreated (new mtimes, sizes differ by a few KB from the
   old ones), owner `ds:ds`. Whole script: 55 s wall (fonts + themes + js cache + snapshots).
2. `/healthcheck` → `true`; `x2t new.docx → pdf` as `ds`: exit 0, valid `%PDF-`, 0.51 s wall (PKT-0065 measured
   518 ms raw x2t with snapshots, 605 ms without).

Not done here: a real `dpkg -i` of a rebuilt package and a Docker image build (no fork / no Docker on the VM).
