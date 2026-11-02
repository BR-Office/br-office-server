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
  reviewer: null
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
Only `tests/unit/utils.tests.js` changed; production code untouched. Surprising behaviors asserted as-is, not fixed:
- `getJwtHsKey('')` returns a zero-length KeyObject (`symmetricKeySize` 0) instead of undefined: `createSecretKey` accepts an empty buffer. An empty JWT secret yields a usable HS key (security-relevant).
- `getJwtHsKey` caches by `String(secret)`: a string and an equal Buffer collide, and the first one cached is returned for both.
- `getJwtHsKey(123)` and `getJwtHsKey({})` swallow the error and return undefined.
- `convertLicenseInfoToFileParams`: `users_expire` is NaN when the input is undefined.
- `getContentDisposition` ignores the user agent and defaults to `attachment`.
- `getBaseUrlByRequest` preserves the protocol case as given.
- `getSecretByElem({string: ''})` returns undefined; file secrets are cached, so later disk changes are not seen; a missing file throws ENOENT.
- `convertLicenseInfoToServerParams(undefined)` throws TypeError.

## Spawned packets
- Proposed, not created (`theseus packet new` needs approval in this run): hardening packet "Reject empty JWT secrets in getJwtHsKey" (module common, type fix). It should also fix the string/Buffer cache-key collision and then update the two getJwtHsKey characterization tests.

## Review

## Lessons for the Atlas
