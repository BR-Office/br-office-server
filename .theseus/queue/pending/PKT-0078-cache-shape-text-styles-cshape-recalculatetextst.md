---
id: PKT-0078
title: Cache shape text styles (CShape.recalculateTextStyles + style-cache sha256) on pptx open
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0073

depends_on: [PKT-0073]

target:
  files:
    - external/sdkjs/common/Drawings/Format/Shape.js
    - external/sdkjs/word/Editor/Styles/style-cache.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/drawings-functions-2026-11-02.json

requires: [documentserver, browser]

contract:
  preserve:
    - "Text styles resolved for every shape (placeholder inheritance master -> layout -> slide, theme fonts, lstStyle) stay identical"
    - "Existing sdkjs tests keep passing"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-common.sh"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 3
resume: true
---

## Goal
On pptx open, cut the ~143 ms (inclusive, median of 3, deck-50.pptx) spent in `CShape.recalculateTextStyles` /
`CShape.Get_Styles` (common/Drawings/Format/Shape.js), of which ~91 ms is `CMemory.sha256` hashing called from
`word/Editor/Styles/style-cache.js` (`StyleCache.getKey`). Each shape builds a fresh `CStyles` (new `CStyle("defaultStyle")`,
master/layout/placeholder levels) inside `ExecuteNoHistory`, then hashes it. Cache per (master, layout, placeholder type/idx,
txBody lstStyle) so shapes sharing a hierarchy reuse one object, or make the style-cache key cheaper than a sha256 of the
serialized styles. Expected gain 50-100 ms per 50-slide open; measure before/after with
`node .theseus/oracle/perf/drawings-functions.js <dir> external/sdkjs 3`.

## Essential context
- PKT-0073 breakdown in `.theseus/oracle/baseline.md` (section "drawings by function").
- `external/sdkjs` is a read-only clone: this refactor needs the sdkjs fork (not created yet) or a patched copy
  installed into the Document Server for measurement. Coordinate with the sdkjs-slide diagnosis (callers:
  `SlideLayout.recalculate`, `MasterSlide.recalculate`, `Slide.recalculateSpTree`, `CDocumentContent.GetStyles`).

## Suggested plan

## Executor log
- return: container restarted; factory restarted on Theseus 0.17.0
- return: disk filled up; factory restarted on Theseus 0.17.1
- Change: `StyleCache.getKey` (word/Editor/Styles/style-cache.js) now returns the serialized `WriteToBinary` bytes as a
  string (`String.fromCharCode` over `memory.data[0..pos)`, chunked at 8 KiB) instead of `memory.sha256()` + hex.
  Exact key (no hash collisions possible), same equality semantics as before, so resolved text styles are unchanged.
  Committed in the nested clone `external/sdkjs` on branch `pkt/PKT-0078`, commit fe036d5 (the outer repo does not track
  external/sdkjs, so the code diff lives only there until the sdkjs fork exists).
- Decision: did not add a per-(master, layout, placeholder, lstStyle) cache in `CShape.recalculateTextStyles`: its result also
  depends on bodyPr autofit (fontScale/lnSpcReduction, tmp values), fontRef/smartArt fill and the editor type, and
  `Get_Styles` consumes `compiledStyles` once; a correct invalidation needs the sdkjs-slide callers and a deck check.
  Shape.js is unchanged. The sha256 cost (~91 ms of the ~143 ms) is what this change removes.
- (Superseded: the attempt-1 note that the gain was unmeasured. Attempts 3 and 4 measured it, below.)
- Attempt 3 measurement (native Document Server 9.3.7, deck-50.pptx, CDP profile 200 us, inclusive ms, medians):
  method: `drawings-functions.js` as-is (3 runs) plus a scratch copy that also counts `style-cache.js` frames (5 runs);
  "after" = installed `sdkjs/slide/sdk-all.js` patched in place with the same getKey body as fe036d5 (python, exact-anchor
  replace), "before" = original bundle restored byte-identical (`cmp` OK) after measuring.
  | function | before | after |
  |---|---|---|
  | StyleCache.getKey (incl. key build) | 111.2 | 23.5 |
  | CMemory.sha256 | 92.9 (81.4 in 3-run) | 0 (gone) |
  | StyleCache.add | 76.3 | 23.2 |
  | StyleCache.remove | 27.6 | <0.2 (not in top 40) |
  | CShape.recalculateTextStyles | 124.8 (166.9) | 175.5 (178.1) |
  | busy open ms, runs | 2105,1809,2063,2126,1724 | 1857,2026,2603,2327,2965 |
  Cost of the new string keys: ~23.5 ms inclusive in getKey (WriteToBinary + String.fromCharCode) vs 111 ms with sha256,
  so -88 ms in the key path. BUT recalculateTextStyles inclusive and whole-open busy time did NOT drop in these runs
  (busy medians 2063 -> 2327, spread 1724-2965 on this 2-CPU VM): the key-path saving is not visible end to end, either
  noise or cost moved elsewhere (long string keys in a plain-object map: hashing/interning, GC). Not resolved here.
- Reachability of fe036d5: the outer repo does not track external/sdkjs and target.create_in is empty, so the commit is
  reproduced below as `git format-patch` output (apply with `git -C external/sdkjs am`). It is also on branch
  pkt/PKT-0078 of this worktree's nested clone. I did not push to the shared mirror under .external/.
```diff
From fe036d5bbe0c9e053ae358e2418b8e48a90e1b1b Mon Sep 17 00:00:00 2001
From: Rafael Petinati <rafael.petinati@gmail.com>
Date: Mon, 2 Nov 2026 23:02:19 +0000
Subject: [PATCH] perf(style-cache): use exact byte-string key instead of
 sha256
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GfMVS4GJ2FBm26wB5X9Aot
---
 word/Editor/Styles/style-cache.js | 16 +++++++++++++++-
 1 file changed, 15 insertions(+), 1 deletion(-)
diff --git a/word/Editor/Styles/style-cache.js b/word/Editor/Styles/style-cache.js
index ee0cfe2..df350a9 100644
--- a/word/Editor/Styles/style-cache.js
+++ b/word/Editor/Styles/style-cache.js
@@ -73,9 +73,23 @@
 	{
 		memory.Seek(0);
 		data.WriteToBinary(memory);
-		return memory.sha256();
+		// Exact key: the serialized bytes themselves, as a string. Cheaper than sha256 + hex on every
+		// CTextPr compile (shape text on pptx open) and it cannot collide.
+		return bytesToKey(memory.data, memory.pos);
 	};
+	function bytesToKey(bytes, len)
+	{
+		const CHUNK = 8192;
+		if (len <= CHUNK)
+			return String.fromCharCode.apply(null, bytes.subarray(0, len));
+
+		let key = "";
+		for (let pos = 0; pos < len; pos += CHUNK)
+			key += String.fromCharCode.apply(null, bytes.subarray(pos, Math.min(pos + CHUNK, len)));
+		return key;
+	}
+
 	//--------------------------------------------------------export----------------------------------------------------
 	AscWord.g_textPrCache = new StyleCache();
--
2.43.0
```
- Attempt 4 change: second sdkjs commit 2dc4784 on top of fe036d5 (branch pkt/PKT-0078 of the nested clone):
  `StyleCache` stores entries in a `Map` and remembers each cached object's key in a `WeakMap`, so `remove(data)` (always
  called with the cached object itself by ParaRun.Get_CompiledPr) no longer serializes; it falls back to `getKey` for an
  unknown object, as before. On ref 0 both entries are dropped. Same equality semantics (exact byte key), so the resolved
  styles do not change. Shape.js is unchanged.
- Attempt 4 measurement (native DS 9.3.7, deck-50.pptx, CDP 200 us, installed slide/sdk-all.js patched and restored
  byte-identical, `cmp` OK). 3 rounds, interleaved orig -> v2 (fe036d5+2dc4784) -> v1 (fe036d5 only), 3 opens each = 9 opens per variant:
  | | orig (sha256) | v1 string key | v2 string key + remembered keys |
  |---|---|---|---|
  | busy ms, 9 opens | 2018,2306,2979,1984,2042,1936,2212,2708,2707 | 1697,1968,1897,2088,(27590 outlier),2870,2235,2551,2822 | 2124,1848,2043,2241,2621,1943,2040,2785,2636 |
  | busy median | 2212 | 2235 | 2124 |
  | StyleCache.getKey incl (per-round medians) | 128.7/93.1/105.8 | 13.7/32/38.3 | 13.6/28/32.1 |
  | CMemory.sha256 | 106.4/83.2/91.7 | 0 | 0 |
  | StyleCache.add | 97.2/73.4/79.5 | 10/27.5/31.2 | 17.5/29.5/35.6 |
  | StyleCache.remove | 32.2/26.6/31.4 | ~0 | ~0 |
  | CShape.recalculateTextStyles | 147.1/120.8/181.9 | 119.9/210.3/163.7 | 120.6/137.7/183.5 |
  Cost of the new string keys: everything under style-cache.js together (WriteToBinary + String.fromCharCode + Map
  lookup) is 24.1 ms per open (median of 3, call-chain probe below) against 129.6 ms with sha256, so about -105 ms.
  Whole-open busy time moves by -88 ms median for v2, which is inside the run-to-run spread on this 2-CPU VM
  (1848-2785), so the end-to-end gain cannot be shown with 9 opens.
- Why `remove` fell to ~0: before, remove was ~30 ms, almost all of it the sha256 of its getKey call. With string keys
  (v1), remove's own work is one small WriteToBinary plus a lookup, a few ms, which drops below the top-40 cut of
  `summarize()`, so it reads as 0. The difference getKey - add (~3-7 ms) is that share. In v2 remove does no
  serialization at all, so ~0 is the real cost.
- Why recalculateTextStyles did not drop (the reviewer's main point): a call-chain probe (scratch copy of
  drawings-functions.js that sums, for every sample inside style-cache.js, all of its ancestor functions; 3 opens each) shows
  that the style cache is called from ParaRun.Get_CompiledPr (96.7 of 129.6 ms before, 18.9 of 24.1 ms after), under
  CDrawingDocContent.RecalculateContent / text shaping. CShape.recalculateTextStyles is never an ancestor of a style-cache frame.
  So the packet premise ("~91 ms of the 143 ms of recalculateTextStyles is sha256") is wrong: both were large on the same
  open but in different subtrees. recalculateTextStyles (120-190 ms, noisy) is CStyle/CStyles construction and Copy()
  of ppt levels per shape, and only a cache in Shape.js can reduce it. That cache is not safe here (its result depends on
  bodyPr autofit and tmp values, fontRef/smartArt fill, editor type; Get_Styles hands the object out once), so I spawned it
  as a follow-up instead of adding it now.
- Not done: the Goal's "cut recalculateTextStyles" part. This packet removes the sha256 cost (~105 ms per open of
  style-cache work), not recalculateTextStyles. Follow-up spawned: .theseus/spawn/PKT-0078-cache-cshape-recalculatetextstyles-results-per-m.md
- Reachability: fe036d5 and 2dc4784 are on branch pkt/PKT-0078 of external/sdkjs in this worktree. The combined diff
  against upstream (fe036d5~1..2dc4784, 1 file, +42/-12) is the final style-cache.js; the attempt-3 patch above is its first half.
  Pushing to a fork is not possible yet (no sdkjs fork exists).
- Acceptance: `bash .theseus/oracle/sdkjs-common.sh` -> 6/6 suites passed (color-mods and chartEx-serialize fail as recorded).
- block: 3 attempts failed; last: Embed the full `git format-patch fe036d5~1..2dc4784` output for style-cache.js in the packet; the 2dc4784 Map/WeakMap change exists only in the untracked nested clone and is not recorded. Also add a log line saying the goal was met through its "cheaper key" alternative.
- release: Theseus 0.18.0: sdkjs changes now go to branch pkt/PKT-0078 of BR-Office/br-office-sdkjs and are reviewed and merged there

## Spawned packets
- PKT-0085: Cache CShape.recalculateTextStyles results per (master, layout, placeholder, lstStyle, autofit) on pptx open

## Review
- Rejected by claude-opus-5-5-b: Run and record the before/after timing on deck-50.pptx (the environments are up), including the cost of the new string keys, and make the external/sdkjs commit fe036d5 reachable for review
- Rejected by claude-opus-5-5-b: recalculateTextStyles and total open time did not drop (124.8→175.5 ms, 2063→2327 ms busy), so the goal isn't met; the StyleCache.remove fall to ~0 needs an explanation; the stale "Not done" log line must be fixed
- Rejected by claude-opus-5-5-b: Embed the full `git format-patch fe036d5~1..2dc4784` output for style-cache.js in the packet; the 2dc4784 Map/WeakMap change exists only in the untracked nested clone and is not recorded. Also add a log line saying the goal was met through its "cheaper key" alternative.

## Lessons for the Atlas
