---
id: sdkjs-word-serialize
title: sdkjs word serialize — Editor.bin reader and writer
kind: module
parent: sdkjs-word
paths: [external/sdkjs/word/Editor/Serialize2.js]
languages: null                   # tool
size: null                        # tool (by wc: ~17.8k lines)

base_commit: 76633f92a84cd985ff17fc0b79c111188ce431cd
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool
metrics: null                     # tool

oracle:
  level: partial
  sources: [external/sdkjs/tests/word (QUnit, copypaste)]

verdict: null
---

## Responsibility
Reads the Editor.bin binary (produced by x2t from DOCX) into a `CDocument`, and writes the model back to binary for save and copy/paste [model]. It does NOT lay out the document; it only builds the model [model].

## Entry points
- `BinaryFileWriter(doc, …)` — `Serialize2.js:1865`; `Write`, `WriteMainTableContent`, `CopyStart/CopyParagraph/CopyEnd` for clipboard [model].
- `BinaryFileReader(doc, openParams)` — `:7884`; `Read(data)` (`:7954`) base64-decodes then `ReadFromStream` (`:7946`) [model].
- `ReadMainTable` (`:7973`), `PostLoadPrepare` (`:8239`), `ReadFromString` (`:8615`, paste) [model].
- Table readers: `Binary_pPrReader` (`:9344`), `Binary_rPrReader` (`:10205`), `Binary_NumberingTableReader` (`:11040`), `Binary_DocumentTableReader` (`:11427`), `Binary_SettingsTableReader` (`:16499`) [model].

## Main flow
1. `asc_docs_api.OpenDocumentFromBin` (`word/api.js`) creates the reader [model].
2. `getbase64DecodedData` decodes the input (string or bytes) [model].
3. `PreLoadPrepare` resets default styles [model].
4. `ReadMainTable` dispatches each table (styles, numbering, settings, document, comments, …) to its reader [model].
5. `PostLoadPrepare` fixes numbering links, style remapping and compatibility defaults [model].
6. Control returns to the API, which calls `CDocument.On_EndLoad` and triggers recalculation [model].

## Invariants
Nothing verified yet.

## Pitfalls
- The same reader serves open, version history reopen (`bClearPptxLoader`) and paste (`bCopyPaste`) [model].
- Drawings go through the shared `pptx_content_loader` (sdkjs common) [model].

## Hotspots
Nothing measured. Base64 decode plus per-run property readers are candidates on large files [model].

## Available oracle
`tests/word/copypaste` exercises write→read round trips (not run here) [model].

## Open questions
- Share of open time spent here vs. recalculation (see [sdkjs-word-model-core](sdkjs-word-model-core.md)).

## Lessons
- [PKT-0034] Fits the size limit as a single file.
