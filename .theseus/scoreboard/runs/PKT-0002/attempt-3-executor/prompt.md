You are the Executor in a Theseus project. Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0002 (Characterize Common/sources/utils.js with unit tests), described in .theseus/queue/in-progress/PKT-0002-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not edit anything under .theseus/queue/ and do not run `theseus claim` or `theseus move`: the factory manages the packet state.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Previous attempts were rejected. Fix these problems:
- acceptance failed: `.theseus/oracle/unit.sh`
- acceptance failed: `.theseus/oracle/unit.sh`
