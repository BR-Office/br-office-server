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
- return: factory restarted on Theseus 0.16.2
- Decision: no factory change needed. The oracle script itself shallow-clones github.com/Euro-Office/sdkjs-forms into external/sdkjs-forms when missing (not committed, like external/sdkjs), and builds develop with `SDK_ADDONS=../../sdkjs-forms`.
- Decision: a stamp file `external/sdkjs/develop/.theseus-addons-forms` forces one rebuild in worktrees whose develop was built without the addon, then is reused.
- Removed the local skip of word/js-api/js-api-forms.html from sdkjs-word-run.cjs.
- Result: `.theseus/oracle/sdkjs-word.sh` 42/42 suites, 6195/6195 assertions, 129s (js-api-forms 27/27; forms/forms and complexForm still pass). Contract kept: the 41 earlier suites pass.
- Surprise: the cloned sdkjs-forms is unpinned (HEAD 5c2f5a0 on 2026-11-02); sdkjs is d9e810c. If they drift apart the forms suite may break; pinning would need a factory mirror.

## Spawned packets

## Review

## Lessons for the Atlas
- The sdkjs-word oracle needs the sdkjs-forms addon; the oracle clones it itself, so a fresh worktree needs network on first run.
