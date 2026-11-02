You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0049, described in .theseus/queue/ (search for PKT-0049). The changes to review are `git diff 2c35b5985cbbc9a512d6139da37bf5a9df9495a1..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed PKT-0049: the integration check passes again after a two-line change to `eslint.config.js`. I ran the acceptance command (`.theseus/oracle/unit.sh && npm run lint:check`) myself. All 10 test suites pass and lint reports 0 errors, plus 1 warning in AdminPanel `useAiPlugin.js` that was already there.

**What broke it.** Commit 3c3f8c2 (Theseus 0.16) added the lint to the integration check. The lint then failed on two separate things:
- **Browser scripts:** the measurement scripts in `.theseus/oracle/perf/` run in the browser, so names like `window`, `editor` and `Asc` fail the "not defined" rule. They were added by PKT-0018 and changed later by PKT-0021, PKT-0023 and PKT-0026. They were fine when committed and only failed once the check was widened.
- **Out of memory:** in a packet worktree, eslint ran out of memory and was killed. It was walking `external/`, the 1.5 GB of read-only upstream clones the factory puts there, which `.gitignore` doesn't list.

**Fix.** I added `.theseus/**` and `external/**` to the eslint ignore list. No product code changed, so behavior is unchanged.

**Decisions.**
- For the perf scripts, I ignored `.theseus/` as a whole rather than declaring browser globals. It is all method tooling, not product code, so this is smaller and also covers future scripts there.
- For `external/`, I put the ignore in the eslint config rather than `.gitignore`, so git behavior stays as it is.

**Commits and records.** The fix is in f500ee1, which also carries the friction line in `.theseus/scoreboard/friction.jsonl`. The Executor log and Lessons sections of the packet are in 5dfab69; I first wrote them to a wrong filename, so they missed the first commit.

**Refused by permissions.** Only the exact acceptance command was allowed. Variants like `npx eslint -f unix` and `npm run lint:check` on its own were refused, so I couldn't list the errors per file before fixing. I didn't try to work around this.

**Lessons for the Atlas.**
- `eslint .` lints the whole working tree, so the lint config has to ignore `.theseus/` and `external/`.
- `environment.md` should note that `external/` is not ignored by git or eslint.
- When the integration check is widened, the same commit should run the new check on main.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
