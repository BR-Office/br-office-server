---
id: web-apps-documenteditor
title: web-apps documenteditor — document editor application shell (UI around sdkjs)
kind: index
parent: null
paths: [external/web-apps/apps/documenteditor/]
languages: null                   # tool — no graph.json yet
size: null                        # tool — no graph.json yet (see Open questions)

base_commit: 7ec34c710bf9112dee9ebcfae990f6a5e1dcb679
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool — .theseus/atlas/graph.json does not exist
metrics: null                     # tool — not computed yet

oracle:
  level: partial                  # PKT-0048: one end-to-end smoke check, see Available oracle
  sources: [.theseus/oracle/documenteditor-open.sh (Playwright, native server example app)]

verdict: null
---

## Responsibility
The browser application shell of the document editor: the HTML pages, loaders, Backbone/RequireJS controllers and views (toolbar, menus, dialogs, panels) that create the `sdkjs` editor (`Asc.asc_docs_api`), receive the config from the host page through `Common.Gateway`, and drive the open sequence [model]. It does NOT hold the document model, layout or rendering (those are in `sdkjs-word`) nor the shared UI framework (`external/web-apps/apps/common`, no card) [model].

This is an **index card**: about 90k lines of `.js`/`.jsx` excluding `locale/` and `resources/` (by `wc`, not a tool figure), far above the 20,000-line limit (spec §3) [model].

## Proposed submodules
| Submodule | Paths | Role |
|---|---|---|
| de/main-boot | `main/index.html(.deploy)`, `main/index_loader.html`, `main/app.js`, `app_dev.js`, `app_pack.js` | Desktop page, inline boot scripts, RequireJS config and controller list [model] |
| de/main-controllers | `main/app/controller/` (`Main.js` 3.5k, `Toolbar.js` 4.4k, `DocumentHolderExt.js` 3k, …) | App lifecycle, open sequence, API callbacks → UI [model] |
| de/main-views | `main/app/view/`, `template/`, `model/`, `collection/` | Toolbar, panels and settings dialogs (largest part, ~67k lines with controllers) [model] |
| de/forms | `forms/` | Lightweight form-filling app (`ApplicationController.js` 2.4k) [model] |
| de/embed | `embed/` | Read-only embedded viewer (`ApplicationController.js` 1.2k) [model] |
| de/mobile | `mobile/src/` | Separate React + Framework7 + webpack app (~50k lines incl. `lib`?) [model] |

## Entry points
- `main/index.html` (dev) / `index.html.deploy` (build template with `@@SRC_ROOT@@` inlined scripts) [model].
- `main/app.js`: RequireJS paths `sdk → ../../sdkjs/word/sdk-all-min`, `allfonts → ../../sdkjs/common/AllFonts`; creates `Backbone.Application` namespace `DE` with ~30 controllers, then `Common.Locale.apply` loads them [model].
- `main/app/controller/Viewport.js:131` `onLaunch` — `new Asc.asc_docs_api(config)` on `#editor_sdk` [model].
- `main/app/controller/Main.js`: `onLaunch` (~164) registers API callbacks and `Common.Gateway` events `init → loadConfig` (~397), `opendocument → loadDocument` (~529), `opendocumentfrombinary → loadBinary` (~3494) [model].
- Same pattern in `forms/app/controller/ApplicationController.js:100`, `embed/js/ApplicationController.js:1136`, `mobile/src/controller/Main.jsx:481` [model].

## Main flow
1. Host page (`api.js` in web-apps/apps/api, no card) creates an iframe on `main/index.html` [model].
2. Inline scripts: theme init, `htmlutils`, `docserviceworker`, loading mask [model].
3. RequireJS loads `sdk-all-min` (dev: `sdkjs/develop/sdkjs/word/scripts.js` writes one `<script>` per sdk file), vendors (jQuery, Backbone, less in dev) and locale [model].
4. Controllers load; `Viewport.onLaunch` creates `asc_docs_api`; `Main.onLaunch` wires callbacks [model].
5. Gateway `init` → `loadConfig`; `opendocument` → `loadDocument` → `api.asc_setDocInfo` (~598) [model].
6. `asc_onGetEditorPermissions` → `onEditorPermissions` (~1661) checks license/version, then `api.asc_LoadDocument()` (~1679/1853) [model].
7. Progress via `asc_onOpenDocumentProgress` (fonts + images counted) → `asc_onDocumentContentReady` → `onDocumentContentReady` (~1287) enables UI, loads external editors/plugins [model].

## Invariants
- `Asc.asc_docs_api` must exist before controllers launch: `sdk` is the first RequireJS dependency in `app.js` [model].
- `asc_LoadDocument` only after permissions and language are resolved (`onEditorPermissions`) [model].
- The controller list in `app.js` and the `require([...])` list must stay in sync [model].

## Pitfalls
- Two page variants: `index.html` (dev, document.write of many scripts) vs `index.html.deploy` (built, inlined); timings differ completely [model].
- `{{HELP_CENTER_WEB_DE}}`-style placeholders are substituted at build time [model].
- Much logic is in `apps/common` (Gateway, Locale, shared controllers), outside this path [model].
- `mobile/` is a different stack (React) sharing no controllers with `main/` [model].
- `resources/help/*` contains vendored `lunr.js` copies that inflate line counts [model].

## Hotspots
Nothing measured here yet. Packet context: ~1.5 s of scripts and ~500 KB per open happen before the document loads [human]. Likely contributors: `sdk-all-min` download/parse, ~30 eager controllers and their views/templates, locale and less/CSS [model].

## Available oracle
`.theseus/oracle/documenteditor-open.sh` (PKT-0048) drives headless Chromium against the native Document Server example: new docx → `#toolbar` visible → load mask gone → type a marker → close → wait for the save callback (status 2: the example rewrites the file) → marker present in `word/document.xml`. PASS 3/3 on 2026-11-02, ~11.3 s each (toolbar ~1.2 s, loaded ~1.2–2.9 s, saved ~11.2 s; most of the save time is the server's close-to-callback delay) [tool]. It fails if the server is down (checked with an unreachable URL, exit 1) [tool]. Needs the native stack running (`.theseus/adapter/environment.md`); it tests the deployed build in `/var/www`, not the `external/web-apps` checkout, so a refactor must be built and deployed before the check sees it [tool].

Limits: one docx, one user; it does not assert the controller order (sdk first, `asc_LoadDocument` after `onEditorPermissions`), plugins, or dialogs — it only proves the open/edit/save path still works end to end [model].

`external/web-apps/test/documenteditor/main` is a manual viewer harness (embed-style `ApplicationController`, dev `sdkjs/develop` scripts, `less.js`), with no assertions; it is not a test suite and was not adopted as an oracle [tool]. `test/unit-tests` was not inspected [model].

## Open questions
- Exact sizes, languages, fan-in/out: need `graph.json`.
- Split of the 1.5 s / 500 KB between sdk bundle, app bundle (`app_pack.js` build output), fonts and locale.
- Can controllers/views be loaded lazily without breaking `Main.onLaunch` order?
- What do `test/documenteditor/main` tests cover, and do they run headless?

## Lessons
Nothing known yet.
