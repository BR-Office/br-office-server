---
id: DIAG-web-apps-documenteditor
module: web-apps-documenteditor
verdict: refactor
target_language: null
confidence: low
conditional_on: "P1 (split the ~1.5 s of script loading on open) shows a measurable share in the documenteditor app bundle, locale or eager controllers, not only in sdk-all / fonts"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 4e4f637
wave: 0
---

## Summary
**Refactor (load path), conditional on measurement.** Users wait ≈ 3.4–4.4 s to open a document and ≈ 1.5 s of it passes before the last sdkjs/web-apps script arrives; this module owns the page, the boot sequence and the app bundle that load in that window. But the baseline does not split the 1.5 s between the sdk bundle (owned by sdkjs), fonts and this app's own bundle, locale and eagerly loaded controllers, and the module has no oracle. The first packets measure that split and establish an open-sequence oracle; same-language refactors (lazy controllers/views, deferred locale and dialogs) follow only if the split shows the time here. No language change is justified.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, open | Open docx 3 392 ms (10 p) / 4 168 ms (100 p); "last sdkjs/web-apps script in" at ≈ 1 515–1 526 ms, 12–13 scripts, ~500 KB per open. That window includes `sdk-all-min` (sdkjs, not this module) and the app bundle built from `main/app.js`; the split is unmeasured. The 1.9–2.4 s after Editor.bin is sdkjs parse/layout/render (DIAG-sdkjs-word), not this module. | baseline.md PKT-0016 open table; card Hotspots |
| Goal: speed, eager work | `main/app.js` lists ~30 controllers (`controllers : [` at line 127) all loaded before `Viewport.onLaunch` creates `asc_docs_api`; 18 controller files incl. `Toolbar.js` 4.4k, `Main.js` 3.5k, `DocumentHolderExt.js` 3k lines; views ~67k lines with controllers. Likely contributor to script parse/evaluation time, unproven. | `external/web-apps/apps/documenteditor/main/app.js:127`; card Proposed submodules |
| Goal: speed, co-edit / typing | Not in this module: typing and remote apply are sdkjs model/layout work; the shell only reacts to callbacks. | baseline.md PKT-0016 co-edit split; card Responsibility |
| Quality and security risk | Large UI controllers (Main.js open sequence, Toolbar.js); ordering invariants (`sdk` first dependency, `asc_LoadDocument` only after `onEditorPermissions`, controller lists in sync). Lazy loading touches exactly these invariants. No web-apps defect history measured (PKT-0017 covered the server; product issues mix all components). | card Invariants; baseline.md PKT-0017 |
| Oracle (D1) | `none`. `external/web-apps/test/documenteditor/main` exists (index.html, js, resources) but was never run; no end-to-end open check beyond the baseline scripts (`client-perf.js`, `client-breakdown.js`). | card Available oracle; `test/documenteditor/main` |
| Coupling and interop | Consumed by the host `api.js` iframe contract and `Common.Gateway` messages; depends on `apps/common` (no card) and `Asc.asc_docs_api`. Deploy page `index.html.deploy` differs from dev `index.html`, so measurements must use the built package. | card Entry points, Pitfalls |
| Target language | None. The code is UI glue in JavaScript (Backbone/RequireJS); TypeScript would add type safety, not speed, and the cost is load/parse, not computation. Rust/Go do not apply to a DOM shell. | goals.preferred_languages; card Responsibility |

## Discarded alternatives
- **keep**: open time is the largest user-felt cost and part of the script window may be this module; deciding keep before measuring it would ignore a possible gain. Becomes keep if P1 shows the time is elsewhere.
- **migrate (TypeScript)**: no speed gain for a load-bound shell; D1 oracle is none.
- **rewrite**: no evidence the design is the problem; the external contract (Gateway, `api.js`, sdk callbacks) would have to be kept anyway, and D1 forbids it without an oracle.
- **retire**: it is the live desktop editor UI.

## Path of change
Same language. P1 measures, on the native package (deploy pages), per-resource download and script evaluation time of the open (CDP Performance/Profiler): sdk-all, app bundle, locale JSON, CSS, fonts, and the time from first script to `asc_LoadDocument`. P2 makes an open-sequence oracle: the web-apps test pages if they run headless, plus a Playwright check that open, toolbar, and save still work. Refactor packets (lazy-load non-essential controllers/dialogs, defer locale/help, earlier `asc_LoadDocument`) are planned after P1 in a later wave, each gated by P2 and a before/after on `client-breakdown.js`. `external/web-apps` is a separate checkout; its packets touch it.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Split the documenteditor open script window by resource and evaluation |
| P2 | 0 | characterize | Establish an open-sequence oracle for the documenteditor shell |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Split the documenteditor open script window by resource and evaluation
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    goal: On the native package with the PKT-0016 docx samples, record per-resource timings and a CDP CPU profile from goto to asc_LoadDocument and to Editor.bin request. Attribute time to sdk-all (sdkjs), the documenteditor app bundle, apps/common, locale, CSS and fonts, and to controller launch (Main/Toolbar/Viewport onLaunch). Add the table to baseline.md.
    context: baseline.md PKT-0016 shows ~1.5 s and ~500 KB of scripts before the document loads, not split. main/app.js loads ~30 controllers eagerly. This decides whether any refactor here is worth doing.
  - key: P2
    wave: 0
    type: characterize
    title: Establish an open-sequence oracle for the documenteditor shell
    files: [.theseus/atlas/web-apps-documenteditor.md]
    create_in: [.theseus/oracle]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    goal: Run external/web-apps/test/documenteditor/main headless if possible and add a Playwright check (open docx, toolbar present, type, save callback status 2). Write a wrapper under .theseus/oracle, record pass/fail and duration, and set the card's oracle level and sources.
    context: The card's oracle is none; lazy-loading refactors touch the open-order invariants (sdk first, asc_LoadDocument after onEditorPermissions).
```

## Risks
- 2-CPU VM with server and Chromium together distorts evaluation times; compare proportions.
- Lazy loading can break the controller order invariants or plugins/external integrations that expect controllers present; P2 must cover them.
- Upstream sync: web-apps still pulls from ONLYOFFICE; keep refactors local.

## What would change this verdict
- If P1 shows < 200 ms (or < 10 % of open) in this module's bundle, locale and controller launch, move to **keep** and redirect to sdkjs bundle size and fonts.
- If P1 shows a large share in apps/common rather than documenteditor, the refactor belongs to an apps/common card (create one).
- If production defect data shows UI-shell crashes/regressions concentrated here, add quality refactors (Main.js open sequence) to the plan.
