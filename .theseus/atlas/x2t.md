---
id: x2t
title: x2t document converter (dispatcher over the core format libraries)
kind: module
parent: null
paths: [external/core/X2tConverter/]
languages: null                   # tool — no graph.json yet
size: null                        # tool — no graph.json yet (see Open questions)

base_commit: e32956dd2c9cb3ffeb276c9bd5793ee04d0fce31
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool — .theseus/atlas/graph.json does not exist
metrics: null                     # tool — not computed yet

oracle:
  level: none
  sources: [manual test harnesses in test/ (not wired to CI)]

verdict: null
---

## Responsibility
x2t is the command-line (and optional shared-library) front end that decides a conversion direction and chains the format libraries of `external/core` (OOXML, binary Office, ODF, PDF, HTML, CSV, crypto, DocBuilder/V8) to turn one file into another [model]. It does NOT parse or render formats itself: almost all real work happens in sibling libraries (PdfFile, DocxRenderer, DesktopEditor graphics, OdfFile, etc.), so this module is a thin orchestration layer whose cost shows up in its callees [model].

## Entry points
- `src/main.cpp` `main`/`wmain` — CLI: `x2t params.xml` (server path), `x2t in out [fontdir] [password]`, plus `-detectmacro`, `-create-js-cache`, `-create-js-snapshots`, `-create-allfonts`.
- `src/ASCConverters.cpp` `NExtractTools::fromInputParams(InputParams&)` — the single dispatcher (~line 1673); `FromFile`, `FromXml` wrap it.
- `src/cextracttools.h` `InputParams::FromXml` / `FromXmlFile` — parse the `TaskQueueDataConvert` XML written by FileConverter.
- `src/cextracttools.cpp` `getConversionDirection*`, `getReturnErrorCode`, `InputParams::checkInputLimits`.
- `src/lib/*.h` — per-family conversion helpers (docx, xlsx, pptx, odf, pdf_image, html, csv, crypt, …) included into the translation unit.
- `src/dylib/x2t.{h,cpp}` — library build (`BUILD_X2T_AS_LIBRARY_DYLIB`), used by desktop/mobile; `build/Android` JNI wrapper.
- Caller in this repo: `FileConverter/sources/converter.js` `spawnProcess` serializes `params.xml` into the task temp dir and spawns `FileConverter.converter.x2tPath`.

## Main flow
1. Apply the memory limit from the environment (`NSSystemUtils::gc_EnvMemoryLimit`, default applied) in release builds.
2. If arg1 ends in `.xml`, load `InputParams` from it (optional arg2 XML overrides); otherwise build params from positional args.
3. `fromInputParams` computes a `TConversionDirection` (`TCD_*`) from formats/extensions.
4. Create a temp dir next to the output file unless `m_sTempDir` is given; set it as the global temp path.
5. `checkInputLimits` rejects archives whose compressed/uncompressed size exceed configured limits → `AVS_FILEUTILS_ERROR_CONVERT_LIMITS`.
6. `CDocBuilder::Initialize()` (V8) in the executable build.
7. A ~100-case `switch` routes to `fromDocument`/`fromSpreadsheet`/`fromPresentation`/`fromDraw`/`fromT`, PDF, crypto, mail-merge, etc.; these often go via an intermediate "T" binary (`doct`/`xlst`/`pptt`) or an unzipped OOXML dir [model].
8. Delete own temp dir, restore temp path, `CDocBuilder::Dispose()`, map the result through `getReturnErrorCode` to the process exit code.

## Invariants
- The exit code is `0` or `error - AVS_ERROR_FIRST - AVS_FILEUTILS_ERROR_FIRST`; FileConverter interprets these numbers, so the error constants and mapping must not change [model].
- A temp dir passed in by the caller (`m_sTempDir`) is never deleted by x2t; one it created itself is always deleted at the end of `fromInputParams` [model].
- A successful conversion with `m_bOutputConvertCorrupted` set is reported as `AVS_FILEUTILS_ERROR_CONVERT_CORRUPTED`, not success [model].
- The `params.xml` schema (element names read in `InputParams::FromXml`) is a contract shared with `FileConverter` [model].

## Pitfalls
- Global state: `NSFile::CFileBinary::SetTempPath` is process-wide; the library build must not run two conversions concurrently [model].
- `checkInputLimits` dereferences `m_sFileFrom` and `m_nFormatFrom` without null checks; it relies on direction detection having filled them [model].
- `compound2` and `FromFile` recurse into `fromInputParams`, re-initializing temp dirs and the DocBuilder [model].
- TXT/CSV input with no encoding yields `CONVERT_NEED_PARAMS`, not a generic error — the server uses it to ask the user for options [model].
- Behaviour differs per build macro (`BUILD_X2T_AS_LIBRARY_DYLIB`, `_DEBUG`, `__ANDROID__`, `_IOS`): memory limit and V8 init are skipped in some builds [model].

## Hotspots
Nothing measured yet. Per the packet context, x2t accounts for 70–90% of PDF conversion and document open time [human]; the cost lies in the callees (PdfFile, DocxRenderer, DesktopEditor graphics, V8 DocBuilder init/dispose per process) rather than in this dispatcher [model].

## Available oracle
None automated. `test/qmake` (with `prepare.py`), `test/TestOOOXml2Odf` and `test/win32Test` are manual harnesses [model]. Practical oracle: run the installed `x2t` binary (see `.theseus/adapter/environment.md`) over a document corpus and compare outputs/exit codes before and after.

## Open questions
- Line counts, language split, fan-in/out: need `graph.json`; this module (~10.8k lines in `src/` by `wc`) is small, but its effective scope is the whole of `external/core`.
- Which `TCD_*` directions does the Document Server actually use in production? (frequency per direction)
- How is per-process V8 init/dispose cost split vs. actual conversion on PDF export?
- Are the `test/` harnesses still buildable?

## Lessons
Nothing known yet.
