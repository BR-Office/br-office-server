---
id: PKT-0163
title: "Serve the whole integrated build in the journeys: server, web-apps and core, not only the sdkjs word bundle"
type: measure
priority: critical
exclusive: true
module: project

origin:
  type: human
  ref: null

depends_on: []
requires: [documentserver]

target:
  files:
    - .theseus/oracle/serve-integrated.sh
    - .theseus/oracle/baseline.md
    - .theseus/oracle/integrated-status.sh
  create_in:
    - .theseus/oracle

context:
  cards: [project]
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks"
    - "serve-integrated.sh up|down|status keeps its interface; down restores the installed package exactly"
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/serve-integrated.sh up
    - bash .theseus/oracle/integrated-status.sh
    - bash .theseus/oracle/journeys/save.sh
    - bash .theseus/oracle/journeys/open-docx-real.sh
    - theseus validate

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
Every journey must measure what users would get from the integrated work: the project's branch `theseus-v2`
and the forks' `theseus` branches, **all of them**. Today `serve-integrated.sh up` overlays only the sdkjs word
bundle: the server keeps running the packaged binary and web-apps and core print "overlay not implemented,
packaged build used". So the integrated server changes (PKT-0137 save without the 5 s wait, PKT-0070, 0113,
0114, the sync conversion work) and web-apps changes (PKT-0125) have never been measured by a journey: `save`
still measures 5.8 s with a fixed 5 s wait inside.

1. `up` serves the integrated build of every module that differs from the installed package: DocService and
   FileConverter run from this repository's sources (node, same config as the packaged service) instead of the
   pkg binaries; web-apps documenteditor is built from the fork's `theseus` branch and overlaid; core (x2t) is
   overlaid when its `theseus` branch differs from `main` (use the x2t build the differential oracle already
   caches under `$THESEUS_CACHE_DIR`, do not rebuild if a build for that commit exists). `down` restores the package.
2. Write `.theseus/oracle/integrated-status.sh`: prints one line per component (`server`, `sdkjs`, `web-apps`,
   `core`) with the commit that is served and the commit of its integrated branch, and exits non-zero when any
   served component is not its integrated branch. Every journey measure runs it after `up` and fails if it fails.
3. Run `save` and `open-docx-real` on the full integrated build and record both, with the A/B against the
   installed package (`NO_INTEGRATED=1`), interleaved runs, in `.theseus/oracle/baseline.md`.

## Essential context
- Found by the operator on 2026-11-04 while answering "what real gains do we have so far": after PKT-0125 every
  journey moved up to +20% although PKT-0125 (web-apps) was not even served, so the journey scoreboard shows
  machine noise, not the integrated work.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
