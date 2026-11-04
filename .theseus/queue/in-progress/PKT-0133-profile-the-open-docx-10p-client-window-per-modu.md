---
id: PKT-0133
title: Profile the open-docx-10p client window per module (replace the PKT-0043 share estimate)
type: measure
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0126

depends_on: []

target:
  files:
    - .theseus/journeys/open-docx-10p.md
  create_in:
    - .theseus/oracle/journeys

context:
  cards: [sdkjs-word]
  references:
    - .theseus/journeys/open-docx-10p.md
    - .theseus/oracle/perf/profile-word.js
    - .theseus/oracle/perf/attribute-word.js

contract:
  preserve:
    - No change to the code of the project or of its forks
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/journeys/open-docx-10p-profile.sh
    - theseus validate

requires: [documentserver, browser]

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
Profile the open-docx-10p client window per module (replace the PKT-0043 share estimate).

## Essential context
PKT-0126 mapped the journey with marks only. It split the client window Editor.bin→isDocumentLoadComplete (2.5 s p50)
across sdkjs-word, sdkjs-common, web-apps and the browser using the CPU-profile shares of PKT-0043 (native package, not the
integrated build). Write `open-docx-10p-profile.sh`: CDP CPU profile of the same journey against the integrated build
(serve-integrated.sh up), attributed with perf/attribute-word.js. Also profile the shell boot (goto→asc_LoadDocument, 1.26 s)
and the post-complete recalc (0.74 s). Update the stages in open-docx-10p.md with the measured split. Run on a quiet VM:
PKT-0126 ran with load average ~6.

## Suggested plan

## Executor log
- attempt 1: changed external/sdkjs/deploy-integrated/.rev, outside the target (rule R2)

## Spawned packets

## Review

## Lessons for the Atlas
