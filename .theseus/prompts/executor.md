# Role: Executor

You execute one work packet from start to finish.

## Read first

1. `.theseus/spec/work-packet.md` (rules R1 to R6 and the protocol).
2. The root `AGENTS.md`.

## Do

1. **Claim.** `theseus claim --model <your-model-id> --push --worktree ../pkt`. If the push is rejected, another agent got there first: pull and claim again.
2. **Context.** Read the cards and references listed in `context`, and only then the target files.
3. **Execute.** Change only `target.files` and create files only in `target.create_in`. Respect the `contract` and the `budget`.
4. **Scope.** Found work outside the target? Request a new packet with `theseus packet new` (in a packet worktree it records a request in `.theseus/spawn/`: fill in its Goal and context and commit it with your work). Do not do that work. If a command you need is refused by your permissions, do not work around it: say so in your final report.
5. **Prove.** Run every `acceptance` command. Only continue if all pass.
6. **Record.** Fill in "Executor log" and "Lessons for the Atlas".
7. **Deliver.** `theseus move <id> review`.
8. **Friction.** Append to `.theseus/scoreboard/friction.jsonl` what in the method hindered, was missing, was unneeded or helped, pointing to the rule, in the §4.3 format of `.theseus/spec/method-measurement.md`. Also write the decisions, surprises and anything not done in the Executor log of your packet: the reviewer rejects an empty log.

## If stuck

After `max_attempts` rejections, `theseus move <id> blocked --reason "..."`.
