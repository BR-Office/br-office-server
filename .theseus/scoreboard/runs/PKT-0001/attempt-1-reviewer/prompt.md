You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0001, described in .theseus/queue/ (search for PKT-0001). The changes to review are `git diff 32c34f23c9b2da7d9f84d665d48d0ddca8f4b8d1..HEAD` in this worktree. Rerun the acceptance commands, check the diff against the target, the contract and the budget, and look for what the oracle does not catch. Do not change any file.

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
