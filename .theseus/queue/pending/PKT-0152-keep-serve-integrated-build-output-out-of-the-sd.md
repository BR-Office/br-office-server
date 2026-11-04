---
id: PKT-0152
title: Keep serve-integrated build output out of the sdkjs checkout
type: chore
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0133

depends_on: []

target:
  files:
    - .theseus/oracle/serve-integrated.sh
  create_in: []

context:
  cards: [sdkjs-word]
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks (external/sdkjs tracked files)"
    - "serve-integrated.sh up/down keeps serving the same integrated build at the same URL"
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/serve-integrated.sh up
    - test -z "$(git -C external/sdkjs status --porcelain)"

requires: [documentserver]

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
Keep serve-integrated build output out of the sdkjs checkout.

## Essential context
PKT-0133 attempt 2 was rejected (R2) because `serve-integrated.sh up` writes deploy-integrated/ (.rev, sdk-all*.js) inside
external/sdkjs and the factory committed it. Make the script build outside the checkout, or add the path to the checkout's
.git/info/exclude itself, so any packet using the integrated build leaves sdkjs clean.

## Suggested plan
1. Have `up` write its build output under a directory outside external/sdkjs (or ensure `/deploy-integrated/` is in the checkout's info/exclude before building).
2. Point the served path at the new location.
3. Run the acceptance commands and check `git -C external/sdkjs status --porcelain` is empty.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
