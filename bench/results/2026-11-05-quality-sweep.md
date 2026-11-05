# 2026-11-05 · quality sweep: every sample document through its editor, and every export through the server

After the open and editing journeys, a sweep for what the user sees go wrong. Scripts: `../sweep.cjs` (open each
file in its editor through the example, type/bold/undo in text documents, report modal windows, uncaught errors,
console errors and failed requests) and `../roundtrip.cjs` (ask the editor to export the open document in each
format, which the server converts with x2t, fetch the result and check status, size and file signature).

## Found and fixed

Opening a PDF in the document editor (DocsAPI routes a `pdf` with `document.isForm` set there, as the example
does) showed the modal **"An error occurred during the work with the document. Use the 'Download as' option to
save the file backup copy"** over a document that had loaded, and reported `changesError` to the server. Cause:
`Backbone.Controller.getView` read a view cache that a controller without views never creates, and the Toolbar
asks the FormsTab controller for its view on every PDF (`isPDFForm`), while the Forms tab exists only in the
fill-forms mode. Fixed in web-apps (BR-Office/br-office-web-apps#3, merged), with a unit test that fails on the old
code. `../pdf-dialog.cjs` is the reproduction: modal present before, none after.

## Open sweep (shell rebuilt with the fix), 9 files

| file | editor | result |
|---|---|---|
| sample.docx, new.docx, aluno-moderno.docx | documenteditor | open, type, bold, undo: no modal, no console error, no failed request |
| sample.pdf, new.pdf | documenteditor (isForm) | same; before the fix: the error modal above |
| sample.xlsx, new.xlsx | spreadsheeteditor | open: clean |
| sample.pptx, new.pptx | presentationeditor | open: clean |

## Export sweep, 13 conversions

| file | exports (status, signature, size, time) |
|---|---|
| sample.docx | pdf 493 KB 443 ms · docx 385 KB 678 ms · odt 346 KB 533 ms |
| sample.xlsx | pdf 632 KB 994 ms · xlsx 78 KB 201 ms · ods 18 KB 189 ms |
| sample.pptx | pdf 242 KB 216 ms · pptx 88 KB 196 ms · odp 47 KB 271 ms |
| sample.pdf | pdf 1745 KB 3382 ms · docx 93 KB 288 ms |
| aluno-moderno.docx | pdf 990 KB 352 ms · docx 1083 KB 255 ms |

All 200 with the right signature (PDF or ZIP container) and no editor error. The PDF re-export of a PDF opened in
the document editor is the slow one (3.4 s for 7 pages): a candidate if that path matters.
