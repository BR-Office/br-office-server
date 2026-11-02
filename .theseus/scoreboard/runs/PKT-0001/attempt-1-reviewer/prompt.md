You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0001, described in .theseus/queue/ (search for PKT-0001). The changes to review are `git diff 59fa3ad3aa5d08eee23db1fc70497b2809836a4d..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the Atlas card for the `common` module, added its row to the index, and committed (`a0cb8df`). The acceptance check `test -s .theseus/atlas/common.md` passes.

**What's in the card** (`.theseus/atlas/common.md`, based on commit 59fa3ad): all the standard sections. It covers:
- **What the module is:** the shared library behind configuration, per-request context, tenants and licences, storage (local disk, S3, Azure), message queues (RabbitMQ/ActiveMQ), logging, and the data types services pass to each other.
- **How it works:** a seven-step flow.
- **Rules that must not break:** tenant-prefixed storage keys, the fields of `Context.toJSON()` used between services, and restoring `NODE_CONFIG` after the runtime config loads.
- **Traps:** modules that require each other in a loop, settings read once at load time that ignore tenant overrides, and a per-tenant config cache shared by the whole process.
- **Unanswered questions.**

Every interpretive claim is tagged `[model]`.

**Decisions:**
- **Fields that should come from tools are left empty.** `.theseus/atlas/graph.json` doesn't exist, so size, languages, dependencies and metrics are `null`, and the index shows Lines and Hotspot as `n/a`. I didn't fill them in from my own reading, because the rules say that data must come from tools.
- **One card covers all of Common.** The `sources/` code is about 6.8k lines, well under the 20k split threshold. `utils.js` is listed as a possible candidate for its own card.
- **I added the index row by hand.** `INDEX.md` says it is generated and shouldn't be edited manually, but the packet's goal asks for the row and no generator exists yet.

**Not done:** I didn't write the friction line in `.theseus/scoreboard/friction.jsonl`, which `AGENTS.md` requires at the end of every packet. That path is outside the packet's `target.create_in`, so this run's rules didn't allow it. The factory or reviewer will need to add it.

**Lessons for the Atlas:**
- The adapter should produce `graph.json` before any more cartography packets run, or every card will have the same empty fields.
- The unit tests cover `utils`, `runtimeConfigManager`, request and SSRF filtering, and the Sentry reporter. Storage, queues, `tenantManager` and `operationContext` only have integration tests that need live services.
- The packet's target should include the scoreboard, so the required friction line can be written.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
