---
id: PKT-0021
title: "Characterize the remaining pure helpers of utils.js"
type: characterize
priority: medium
module: common

origin:
  type: diagnosis
  ref: DIAG-common

depends_on: []

target:
  files:
    - "tests/unit/utils.tests.js"
  create_in: []

context:
  cards: [common]
  references: [.theseus/adapter/interop-javascript-typescript.md]

contract:
  preserve:
    - "Production code is not changed: only tests are added"
    - "Existing tests keep passing unchanged"
    - "Tests assert what the code does today; surprising behavior is recorded in the packet, not fixed"
  forbidden: []

acceptance:
  commands:
    - ".theseus/oracle/unit.sh"
    - "npx eslint tests/unit/utils.tests.js"

budget:
  max_files_changed: 1
  max_diff_lines: 900
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-sonnet-5-5
  reviewer: claude-opus-5-5
rejected_reviews: 1
---

## Goal
Cover the remaining pure or fake-able helpers of `Common/sources/utils.js`, preparing the wave 2 split of `utils.js`.

## Essential context
- DIAG-common plan #8. PKT-0002 and PKT-0004 covered 18 pure helpers and their empty/null inputs.
- Helpers to cover: `getContentDisposition`, `mapAscServerErrorToOldError`, `changeOnlyOfficeUrl`, `getSecretByElem`, `getJwtHsKey`, `convertLicenseInfoTo*`, `checkIpFilter`, `getBaseUrlByRequest` (with a fake request object).
- `checkPathTraversal` is in the backlog for a later hardening packet: do not test it here.
- Use config values from the test setup, or mock as the existing tests do.

## Suggested plan
1. Read each helper.
2. Add table-driven tests in the existing file.
3. Run the oracle; log surprises.

## Executor log

## Spawned packets

## Review
- Rejected by claude-opus-5-5: Fill in the packet's Executor log with the surprising behaviours the tests record (empty-string getJwtHsKey key, string/Buffer cache-key collision, NaN users_expire, ignored user agent, preserved protocol case, empty string secret → undefined), as contract.preserve requires, and spawn or record a hardening packet for the empty JWT secret.
- Approved by claude-opus-5-5: The tests accurately describe current behavior and nothing in production code changed; the empty-secret hardening packet still needs to be created.

## Lessons for the Atlas
