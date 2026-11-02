---
id: PKT-0056
title: Check out sdkjs-forms so the word js-api-forms suite runs in the oracle
type: characterize
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0044

depends_on: []

target:
  files:
    - .theseus/oracle/sdkjs-word.sh
    - .theseus/oracle/sdkjs-word-run.cjs
    - .theseus/adapter/environment.md
  create_in: []

context:
  cards: [sdkjs-word]
  references: []

contract:
  preserve:
    - The 41 word suites that pass today keep passing
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/sdkjs-word.sh

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
Have the factory check out github.com/Euro-Office/sdkjs-forms next to external/sdkjs (as upstream CI does), build develop with `SDK_ADDONS=../../sdkjs-forms`, and remove the local skip of `word/js-api/js-api-forms.html` from `.theseus/oracle/sdkjs-word-run.cjs`.

## Essential context
- PKT-0044: js-api-forms fails 0/5 with `AscTest.JsApi.CreateTextForm is not a function`; the API lives in the forms addon.
- Upstream `external/sdkjs/AGENTS.md` (Tests) runs `SDK_ADDONS=../../sdkjs-forms npm run --prefix build develop`.
- Needs a factory change (what is cloned under external/), so it may be blocked until that is decided.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
