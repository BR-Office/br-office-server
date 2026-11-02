You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0076, described in .theseus/queue/ (search for PKT-0076). The changes to review are `git diff 4b2d9700a50a21384f6e8c9feda2c37e76231571..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've fixed PKT-0076 and committed it on the packet branch. `e2e-convert.js` now works against the native Document Server: with the default settings (10 runs, 7 conversion pairs), every pair reports `errors: 0`, and none returns `{"error":-8}`. Both acceptance commands pass. `npm run lint:check` shows one warning, which was already there in `AdminPanel/.../useAiPlugin.js` and is outside this packet.

**What changed in `.theseus/oracle/perf/e2e-convert.js`:**
- The default server address is now `http://127.0.0.1` and the sample host is `127.0.0.1` (previously port 8080 and the Docker address).
- Requests are signed with JWT and sent as `Authorization: Bearer`. The token wraps the request body as `{payload: body}`, the header form the server accepts.
- The secret comes from `$JWT_SECRET`, or else from `services.CoAuthoring.secret.inbox.string` in `local.json`, which is only read, never written. If neither is set, requests go out unsigned as before.
- The output format is unchanged.

**Decisions:**
- I signed with Node's built-in `crypto` instead of the `jsonwebtoken` package from `DocService/node_modules`, so the script needs no extra dependency.
- The sample files now default to the installed server's own templates (`/var/www/euro-office/documentserver/document-templates/new/en-US`). If that folder is missing it falls back to `/tmp/eo-samples`, and `$SAMPLES` still overrides both. The templates cover every file type the pairs need (docx, xlsx, pptx, pdf).

I filled in the Executor log and the lessons section in the packet, and appended the friction line. I created no follow-up packets.

**Lesson for the Atlas:** oracle scripts that call the native stack must sign their requests with JWT, and Node's built-in HMAC in `crypto` is enough to do it.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>

Environments that are up right now (the factory just ran these checks and they passed; .theseus/adapter/environment.md says how to use them):
- `documentserver`: `curl -sf http://127.0.0.1/healthcheck`
- `browser`: `node -e "require('playwright')"`
Do not report one of these as missing: use it, and if a script points elsewhere (another port, a container), point it here. If you still cannot reach it, say exactly what you ran and what came back.
