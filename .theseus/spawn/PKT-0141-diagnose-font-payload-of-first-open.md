---
id: SPAWN
title: Break down the 12.9 MB sdkjs-common font download of open-docx-real-internet
type: measure
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0141

depends_on: []
requires: [documentserver, browser]

target:
  files:
    []
  create_in:
    - .theseus/journeys

context:
  cards: []
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/journeys/open-docx-real-internet.sh"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
List every `/fonts/*` and other sdkjs-common response of one open-docx-real-internet run (URL, bytes, who asks it: preloader, `AllFonts.js`, `check_loaded_list`) and say which fonts the document really needs. Write it to `.theseus/journeys/open-docx-real-internet-fonts.md`.

## Essential context
PKT-0141 (attempt 2) blocked the web-apps service worker (`docserviceworker.js`) so that every byte goes through the emulated 50 Mbps link. sdkjs-common then downloads 12.9 MB (58 requests), about 2 s of pure transfer, which is now the largest download of the journey. Most of it overlaps the upload. Find out whether a first open needs all of it.
