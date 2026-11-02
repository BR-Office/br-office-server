You are the Executor in a Theseus project. Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0009 (TypeScript 7 toolchain and the first migrated leaf (utilsDocService)), described in .theseus/queue/in-progress/PKT-0009-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not edit anything under .theseus/queue/ and do not run `theseus claim` or `theseus move`: the factory manages the packet state.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `npx tsc -p tsconfig.json --noEmit`
- `.theseus/oracle/unit.sh`
- `npm run lint:check`

Previous attempts were rejected. Fix these problems:
- Add typescript@^7.0.2 and @types/node to root package.json devDependencies and update npm-shrinkwrap.json (tsc currently only works via a global install); run `git rm --cached DocService/sources/utilsDocService.js` so the old hand-written .js is no longer tracked and the .gitignore rule takes effect.
