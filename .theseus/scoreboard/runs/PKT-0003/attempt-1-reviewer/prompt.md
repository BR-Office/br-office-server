You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0003, described in .theseus/queue/ (search for PKT-0003). The changes to review are `git diff 86d11c477a8c14c96399adc77e29a1dcfafc850c..HEAD` in this worktree. Rerun the acceptance commands, check the diff against the target, the contract and the budget, and look for what the oracle does not catch. Do not change any file.

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
