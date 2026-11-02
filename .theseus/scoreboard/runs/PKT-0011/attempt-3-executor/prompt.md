You are the Executor in a Theseus project. Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0011 (Characterize formatchecker and documentFormats), described in .theseus/queue/in-progress/PKT-0011-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not edit anything under .theseus/queue/ and do not run `theseus claim` or `theseus move`: the factory manages the packet state.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `.theseus/oracle/unit.sh`
- `npx eslint tests/unit/formatchecker.tests.js`

Previous attempts were rejected. Fix these problems:
- Record the surprising behaviours in the packet's Executor log (xlsx-only ZIP detection in the last 8KB, the TypeError on null in getOfficeZipFormatBySignature, no %PDF detection, pdfa written back as pdf, getAllFormats('') without a context throwing a TypeError); the test file is acceptable as is.
- Record in the packet's Executor log the surprising behaviors the tests pin (xlsx-only zip detection with its last-8KB window, the TypeError on null in getOfficeZipFormatBySignature, no %PDF detection, pdfa written back as pdf, the getAllFormats throw without a context, the leading-dot/whitespace, vsdt one-way and the other one-way mappings); the test file can stay as it is
