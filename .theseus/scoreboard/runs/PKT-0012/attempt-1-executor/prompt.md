You are the Executor in a Theseus project. Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0012 (Characterize wopiUtils: WOPI URL precedence, headers and proof), described in .theseus/queue/in-progress/PKT-0012-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not edit anything under .theseus/queue/ and do not run `theseus claim` or `theseus move`: the factory manages the packet state.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `.theseus/oracle/unit.sh`
- `npx eslint tests/unit/wopiUtils.tests.js`
