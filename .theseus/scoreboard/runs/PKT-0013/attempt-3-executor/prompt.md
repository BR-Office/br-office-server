You are the Executor in a Theseus project. Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0013 (Characterize the in-memory editor data backend (editorDataMemory)), described in .theseus/queue/in-progress/PKT-0013-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not edit anything under .theseus/queue/ and do not run `theseus claim` or `theseus move`: the factory manages the packet state.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `.theseus/oracle/unit.sh`
- `npx eslint tests/unit/editorDataMemory.tests.js`

Previous attempts were rejected. Fix these problems:
- Record the surprising behaviors (connection-sample pruning compares an object to a number so nothing is ever pruned; lockNotification's NaN token makes it non-re-entrant; getdelSaved returns undefined then null) in the packet's Executor log and Lessons for the Atlas, as contract.preserve requires; the tests themselves are fine.
- changed .theseus/queue/in-progress/PKT-0013-characterize-the-in-memory-editor-data-backend-e.md, outside the target (rule R2)
