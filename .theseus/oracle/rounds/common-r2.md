# Common, round 2 measurements (PKT-0101, 2026-11-03)

Native Euro-Office 9.3.7-1 stack on the factory VM (2 CPUs), log4js at **DEBUG** (as left since PKT-0018).

## Differential oracle (original against new)
Round 1 (PKT-0026) delivered a measurement only. `git log 5ad1b11..HEAD -- Common/` is empty: no Common code
changed, so "new" is identical to "original" and the differential comparison is trivially equal. The unit
oracle was run as the regression check:

- `cd DocService && jest unit --inject-globals=false --config=../tests/jest.config.js`:
  13 suites, 178 passed, 1 skipped, **1 failed**: `mailService.tests.js` "Transporters life cycle",
  `getaddrinfo ENOTFOUND api.nodemailer.com` (the test needs internet DNS; the VM has none). Environmental, not a defect.

## Hot paths (`perf/bench-hotpaths.js`)
| Bench | p50 | p99 | throughput |
|---|---|---|---|
| coedit.parse+stringify(50 changes) | 51.81 µs | 124.25 µs | 16 988 msg/s |
| coedit.locks add/get/remove | 2.69 µs | 15.50 µs | 216 849 op/s |
| coedit.addMessage | 0.43 µs | 1.38 µs | 1 514 011 msg/s |
| open.formatBySignature(pdf) (Common) | 0.91 µs | 5.08 µs | 741 517 op/s |
| open.formatBySignature(zip) (Common) | 0.86 µs | 2.23 µs | 920 046 op/s |
| open.formatFromString (Common) | 0.25 µs | 0.65 µs | 3 254 213 op/s |

Same order as the baseline (formatchecker 0.2–0.9 µs).

## Co-edit load (`perf/load-coedit.js 50 5 60 2`, packaged docservice)
| Metric | Value |
|---|---|
| changes/s, broadcasts/s | 99.2, 396.6 |
| open (auth → documentOpen) p50 / p99 | 35 / 207 ms |
| ack p50 / p99 | 4 / 79 ms |
| broadcast p50 / p90 / p99 | 4 / 14 / 78 ms |
| errors | 0 |
| docservice cores | 0.19 (DEBUG) |
| saves | 50 docs, status 3 (expected: replayed isolated change, see PKT-0023) |

Broadcast p50 4 ms matches the baseline (PKT-0018 4 ms p50, ≤ 70 ms p99). Common's share was not
re-profiled: no Common code changed since PKT-0026 (3–4 % self, 15–25 % inclusive, ≈ 1 % of wall).
