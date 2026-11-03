---
id: DIAG-sdkjs-common
module: sdkjs-common
verdict: keep
target_language: null
confidence: medium
conditional_on: "No common function group above 50 ms per open or per 20 changes after round 1 (PKT-0072/0073); round-1 local gains (≤ 90 ms) are not visible end to end on this VM"
diagnosed_by: [claude-opus-5-5]
agreement: null
decided_by: null
goals_hash: dcb03039
base_commit: 1912cf2
round: 2
wave: 0
---

## Summary
**Keep.** Round 1 found where common's 22–35 % of open CPU goes and showed that it is flat: fonts 170–280 ms spread
over many small functions with a 98–99 % glyph cache hit rate, drawings ~290 ms on pptx with no function above 31 ms
self. The two candidates above 50 ms were refactored (PKT-0078 sha256 key, −88 ms in its path; PKT-0084 script
direction, −20–35 ms) and PKT-0085 added a text-style cache. All are correct (unit oracle 10341/10341, differential
PASS on 3 cases) but **none delivered a measurable gain for users**: open, join, edit and reopen times move inside
the 20–40 % run-to-run spread of this VM. Round 1's own condition ("no group worth > 50 ms → keep") is met. The
remaining large client cost (xlsx remote apply re-shaping, ~200–250 ms per 20 changes) lives in sdkjs-cell, and Word
apply in sdkjs-word. Further work in common would add regression risk to five editors for gains below the noise.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Speed, open | Common self 0.5–0.8 s per open, but flat: no function above 31 ms self (drawings), fonts spread thin with 98–99 % cache hits. Font fetching is already parallel (poll tail 6–71 ms). | PKT-0045, PKT-0072, PKT-0073; baseline.md |
| What round 1 delivered | PKT-0078 −88 ms in the key path, busy open not lower (2063 → 2327 ms medians, spread 1724–2965). PKT-0084 −20–35 ms fn self, open within noise. PKT-0085 unmeasured. Differential timings (rounds/sdkjs-common-r2.md) show no consistent sign. **Correct, not delivered.** | PKT-0078/0084/0085 logs; rounds/sdkjs-common-r2.md |
| Speed, co-edit | Word apply: common 5–6 % (sdkjs-word). Xlsx apply: 291 ms per 20 changes in `StringRender.js` shapeFragment, an sdkjs-cell file (PKT-0077 patch exists there). | PKT-0045, PKT-0072 |
| Quality | Unit oracle 7/7 suites, 10341/10341; differential PASS (model, sent, shown, reopened, converted identical). | rounds/sdkjs-common-r2.md |
| Oracle (D1) | partial: QUnit (color-mods, charts, chartEx-serialize, script-direction, api) + differential in Chromium. | .theseus/oracle/sdkjs-common.sh, differential/sdkjs-common.sh |
| Target language | None: no kernel above 30 % of open, widest global coupling of the client. | PKT-0072/0073 |

## Discarded alternatives
- **refactor (more)**: the profile is flat; every remaining group is under 50 ms, and the ones above it gave gains not visible end to end.
- **migrate / rewrite**: no isolated kernel, contracts shared with all editors and x2t; D1/D3 cost without a target.
- **retire**: live code of every editor.

## Path of change
None. Round 1 changes stay (correct, harmless). Effort moves to sdkjs-cell (shapeFragment cache, PKT-0077 patch) and
sdkjs-word (apply recalculation).

## Initial packet plan
No packets (keep).

```yaml
packets: []
```

## Risks
- The VM's 20–40 % spread can hide gains of ~100 ms; a quiet machine with ≥ 10 runs might show PKT-0078/0085 gains.
- Samples have few images/charts: real documents may load drawings and charts harder.

## What would change this verdict
- A profile on real documents (images, charts) or a quiet machine shows a common function group above 50 ms self per open, or common above 35 % of open: back to **refactor** for that group.
- A median of ≥ 10 runs on deck-50 shows PKT-0085 or PKT-0078 saving ≥ 100 ms of open: extend that cache approach to other drawings paths (**refactor**).
- A self-contained kernel above 30 % of open with a narrow interface: consider **migrate** (Rust/WASM), with D3.
