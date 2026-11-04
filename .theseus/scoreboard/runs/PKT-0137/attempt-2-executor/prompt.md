You are the Executor in a Theseus project (model id `claude-opus-5-5`). Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0137 (Do not wait savetimeoutdelay (5 s) before saving an explicitly closed document), described in .theseus/queue/in-progress/PKT-0137-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not move packets and do not run `theseus claim` or `theseus move`: the factory manages the packet state. You may write notes in the Executor log section of your own packet.
- Work outside the target, or a follow-up the packet asks for, is requested with `theseus packet new --title ... --type ... --module ...` run here: in this worktree it records a request in .theseus/spawn/ (edit its Goal and context), and the factory turns it into a packet after approval. Commit the request with your work.
- If a command you need is refused by your permissions, do not work around it: say so in your final report.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Before finishing, append your friction line for this packet to .theseus/scoreboard/friction.jsonl (spec method-measurement §4.3: packet, role, model, date and {ref, text} answers); it is checked.
- A follow-up that needs an environment (a running service, a tool) declares it with `requires: [<name>]`, using the names of `environment.checks` in the adapter.
- Before finishing, run `theseus scope-check`: it reports any file you changed outside the target (rule R2), in this repository or in a fork checkout, as the factory will.
- Before finishing, write in the Executor log section of your packet the decisions you took, the surprises you found and anything you could not do; the reviewer rejects an empty log.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

If .theseus/adapter/environment.md exists, read it first: it describes what is installed and running for this project (services, images, tools) and how to use it.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `.theseus/oracle/unit.sh`
- `bash .theseus/oracle/journeys/save.sh`

Previous attempts were rejected. Fix these problems:
- acceptance failed: `.theseus/oracle/unit.sh`. Output:
```
FAIL ../tests/unit/request.tests.js
  ● Console
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
  ● HTTP Request Unit Tests › specific timeout behaviors › connectionAndInactivity does not trigger when longer than server delay
    AxiosError: timeout of 300ms exceeded
      383 |   };
      384 |   try {
    > 385 |     const response = await axios(axiosConfig);
          |                      ^
      386 |     const {status, headers} = response;
      387 |     if (![200, 206].includes(status)) {
      388 |       const error = new Error(`Error response: statusCode:${status}; headers:${JSON.stringify(headers)};`);
      at RedirectableRequest.handleRequestTimeout (../Common/node_modules/axios/lib/adapters/http.js:657:16)
      at Timeout.<anonymous> (../Common/node_modules/follow-redirects/index.js:221:12)
      at Axios.request (../Common/node_modules/axios/lib/core/Axios.js:45:41)
      at Object.downloadUrlPromise (../Common/sources/utils.js:385:22)
      at unit/request.tests.js:322:22
  ● HTTP Request Unit Tests › specific timeout behaviors › connectionAndInactivity does not trigger when longer than inactivity periods
    aborted
PASS ../tests/unit/docsCoServerCrashPaths.tests.js
  ● Console
      [2026-11-04T00:34:06.192] [INFO] [localhost] [crashdoc1] [userId] nodeJS - io.use start
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-04T00:34:06.264] [INFO] [localhost] [crashdoc1] [userId] nodeJS - io.use end
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-04T00:34:06.265] [INFO] [localhost] [crashdoc2] [userId] nodeJS - io.use start
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-04T00:34:06.266] [INFO] [localhost] [crashdoc2] [userId] nodeJS - io.use end
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-04T00:34:06.283] [INFO] [localhost] [crashdoc4] [userId] nodeJS - _checkLicense start
  ● Console
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
          at Sharp._createInputDescriptor (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/DocService/node_modules/sharp/lib/input.js:51:13)
          at new Sharp (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/DocService/node_modules/sharp/lib/constructor.js:351:29)
          at Sharp (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/DocService/node_modules/sharp/lib/constructor.js:173:12)
          at Object.sharp [as processImageOptimal] (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/DocService/sources/utilsDocService.js:163:24)
  ● Console
      [2026-11-04T00:34:09.024] [INFO] [localhost] [docId] [userId] nodeJS - convertRequest start
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
          at convertByCmd.next (<anonymous>)
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
          at convertByCmd.next (<anonymous>)
      [2026-11-04T00:34:09.031] [INFO] [localhost] [doc1] [userId] nodeJS - convertRequest end
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-04T00:34:09.038] [INFO] [localhost] [docId] [userId] nodeJS - convertRequest start
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-04T00:34:09.132] [ERROR] [localhost] [doc1] [userId] nodeJS - convertRequest error: Error: db down
          at Object.<anonymous> (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/tests/unit/converterService.tests.js:231:41)
          at Promise.then.completed (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/utils.js:298:28)
          at new Promise (<anonymous>)
          at callAsyncCircusFn (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/utils.js:231:10)
          at _callCircusTest (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/run.js:316:40)
          at _runTest (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/run.js:252:3)
          at _runTestsForDescribeBlock (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/run.js:126:9)
          at _runTestsForDescribeBlock (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/run.js:121:9)
          at run (/home/claude/euro-office-server.theseus-worktrees/PKT-0137/node_modules/jest-circus/build/run.js:71:3)
          at runAndTransformResultsToJestFormat (/home/claude/eu
```

Environments that are up right now (the factory just ran these checks and they passed; .theseus/adapter/environment.md says how to use them):
- `documentserver`: `curl -sf http://127.0.0.1/healthcheck`
- `browser`: `node -e "require('playwright')"`
Do not report one of these as missing: use it, and if a script points elsewhere (another port, a container), point it here. If you still cannot reach it, say exactly what you ran and what came back.
