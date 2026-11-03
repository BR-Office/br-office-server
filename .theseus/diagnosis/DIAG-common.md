---
id: DIAG-common
module: common
verdict: keep
target_language: null
confidence: high
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 5ad1b11
round: 2
wave: 0
---

## Summary
**Keep, now unconditional.** Round 1's only packet (PKT-0026) measured Common at 3–4 % of DocService CPU self,
15–25 % inclusive, ≈ 1 % of wall time and ≈ 4.6 ms of a 125–1 000 ms conversion: far below the 20 % CPU / 10 ms p50
thresholds that would have moved the verdict to refactor. Round 2 measurements (`oracle/rounds/common-r2.md`)
show the same picture. No change to Common would move a number users feel.

## What round 1 proved and did not
- **Proved:** Common is not a performance hotspot (PKT-0026, baseline.md "Common's share of DocService CPU").
  The keep condition (`conditional_on: P1`) is met.
- **Proved (side finding):** DEBUG logging adds ≈ 50 % DocService CPU under co-edit load, in log4js appenders,
  not in `Common/sources/logger.js`. It is still on in this VM (`log4js/production.json` level DEBUG); stock is WARN.
  This is deployment configuration, not a Common code change.
- **Not delivered toward the goal:** nothing. Round 1 was measurement only, by design; no user-visible number changed
  and none was expected to.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed | Common ≈ 1 % of wall, 0.01 core under 50 × 5 co-edit; < 4 % of conversion latency. Broadcast p50 4 ms / p99 78 ms today. | baseline.md PKT-0026; common-r2.md |
| Goal: speed, hot paths | formatchecker 0.25–0.91 µs p50, unchanged. | common-r2.md bench |
| Goal: quality | 259/904 fix commits (29 %), 4 crash fixes, below DocService (421/1 115, 13). No Common change since round 1; unit oracle passes except one test needing internet DNS. | baseline.md PKT-0017; common-r2.md |
| Oracle (D1) | `partial`; no migrate/rewrite proposed. | atlas card |
| Coupling | Root of the dependency graph; `Context.toJSON()` is the queue wire format. A language change would add a boundary crossing to every call. | atlas card |
| Target language | None: the time is in the client and x2t. | baseline.md |

## Discarded alternatives
- **refactor**: the largest Common entries (`utils.fillResponse`, `utils.postRequestPromise`) are socket/HTTP I/O wrappers; restructuring them does not reduce I/O. Tenant config ≈ 1 %, storage-base < 2 %, queue < 1.5 %.
- **migrate / rewrite**: no measurable gain; adds interop cost at the graph root.
- **retire**: live core library.

## Path of change
None. Round 2 plans no packets for Common.

## Initial packet plan
No packets. The `mailService.tests.js` network dependency and the DEBUG log level are environment issues, not Common work.

```yaml
packets: []
```

## Risks
- Untested storage backends, task queues and `tenantManager` remain; a regression would surface as upstream fix/crash commits in `Common/sources/` (PKT-0017 script).
- Measured on a 2-CPU VM with fs storage; S3/Azure latency or many tenants were not exercised.

## What would change this verdict
- A re-profile showing Common > 20 % of DocService CPU or > 10 ms p50 of a user-visible server segment → refactor that path.
- Upstream fix/crash rate in `Common/sources/` above DocService's, or a user-visible crash traced to Common → refactor with characterization of storage, queues and `operationContext`.
- DocService migrated to another language (DIAG-docservice) → reassess Common as an interop boundary.
