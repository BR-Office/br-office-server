You are the Executor in a Theseus project. Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0021 (Characterize the remaining pure helpers of utils.js), described in .theseus/queue/in-progress/PKT-0021-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not edit anything under .theseus/queue/ and do not run `theseus claim` or `theseus move`: the factory manages the packet state.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `.theseus/oracle/unit.sh`
- `npx eslint tests/unit/utils.tests.js`

Previous attempts were rejected. Fix these problems:
- Fill in the packet's Executor log with the surprising behaviours the tests record (empty-string getJwtHsKey key, string/Buffer cache-key collision, NaN users_expire, ignored user agent, preserved protocol case, empty string secret → undefined), as contract.preserve requires, and spawn or record a hardening packet for the empty JWT secret.
