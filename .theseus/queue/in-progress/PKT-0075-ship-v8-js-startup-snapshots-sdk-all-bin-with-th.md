---
id: PKT-0075
title: Ship V8 JS startup snapshots (sdk-all.bin) with the Document Server install
type: refactor
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0065

depends_on: [PKT-0065]
requires: [documentserver]

target:
  files: []
  create_in:
    - .theseus/diagnosis

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-0065-x2t-js-snapshots.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/unit.sh
    - npm run lint:check

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Make every install (deb postinst, Docker image) generate the V8 startup snapshots `sdkjs/<editor>/sdk-all.bin`
with `x2t -create-js-snapshots` as user `ds`, and regenerate them on upgrade. PKT-0065 measured −90…110 ms per
PDF export through ConvertService (≈12–14 %) with corpus-oracle equal output. Deliver the packaging change as a
patch + decision note under .theseus/diagnosis until a writable fork of Euro-Office/DocumentServer exists.

## Essential context
- The 9.3.7-1 package does not ship sdk-all.bin; it was created by hand on the factory VM (see PKT-0065 note).
- Snapshots are tied to the exact x2t/V8 build and sdk-all.js: a stale .bin after an upgrade must be removed or rebuilt.
- Files must be owned by `ds` (PKT-0041 saw x2t silently regenerate the code cache as root).

## Suggested plan

## Executor log
- Decision: hook `x2t -create-js-snapshots` into `documentserver-generate-allfonts.sh` right after `-create-js-cache`
  (one place reached by postinst install/upgrade, the font trigger and the Docker start-up); always `rm -f` old
  `sdk-all.bin` first and on failure; the script's existing `chown -R ds:ds sdkjs` gives ownership to `ds`.
  `postrm clean_ds_files` also removes `sdk-all.bin`. Patch + note: `.theseus/diagnosis/PKT-0075-js-snapshots-install.{patch,md}`.
- Proof: ran the patched script as root on the VM: five .bin recreated, owner ds; healthcheck true; x2t docx→pdf as ds 0.51 s.
- Surprise: `target.files` is empty — the real change lives in the packaging repo (no fork), so it ships as a patch only.
- Not done: real `dpkg -i` of a rebuilt package and a Docker build (no fork, no Docker); that the Euro-Office
  Docker entrypoint calls generate-allfonts.sh is assumed from upstream, unverified.
- Surprise: `.theseus/oracle/unit.sh` is flaky (rc 0,1,0 over 3 runs; 1 test in docsCoServerCrashPaths.tests.js), unrelated to this packet (no JS touched). Final runs pass; follow-up requested in .theseus/spawn/.
- Rework (review R6): filled the spawn request's target (the test file), contract (no prod code change, no weakened tests, no retry masking) and acceptance (unit.sh, 5x loop, lint). Re-ran unit.sh and lint: both pass.
- Side effect: the VM's .bin files are now regenerated ones (old copies in the session scratchpad).

## Spawned packets
- Request: stabilize flaky tests/unit/docsCoServerCrashPaths.tests.js (.theseus/spawn/).

## Review

## Lessons for the Atlas
- x2t (install): install-time generated artifacts (AllFonts, themes, js cache, now js snapshots) all come from
  `documentserver-generate-allfonts.sh`; it is the hook point for anything bound to the exact x2t/sdkjs build.
