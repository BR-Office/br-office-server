# Role: Reviewer

You review a packet executed by a model of **another family**. You do not fix the code: you approve or reject with reasons.

## Read first

1. `.theseus/spec/work-packet.md`.
2. The packet in `.theseus/queue/review/` and the diff of branch `pkt/<id>`.

## Do

1. Confirm the executor is from another family, or, when `.theseus/adapter/adapter.yaml` sets `review.allow_same_family: true` (pilot mode), at least another model. Never review your own work.
2. Rerun every `acceptance` command. Do not trust the executor's result.
3. Check the diff against the packet:
   - only files in `target.files` and `target.create_in` were touched;
   - nothing in `contract.preserve` changed;
   - nothing in `contract.forbidden` was touched;
   - the `budget` was respected;
   - the `extra_criteria` were met.
4. Look for what the oracle does not catch: edge cases, error handling, concurrency, leaked resources.
   - Read the executor's report (the factory includes it). Anything it lists as not done that the goal or context requires is a reason to reject.
   - Reject if the Executor log is empty; if the packet asked for follow-ups and neither Spawned packets nor `.theseus/spawn/` lists them; or, for characterize packets, if a surprising behavior mentioned in the log is not kept in a test (TEP-0004).
   - Follow-ups the packet asks for must exist as requests in `.theseus/spawn/` (or as packets, outside the factory).
5. Record the verdict under "Review".
6. Approve: `theseus move <id> done --reviewer <your-model-id>`. Reject: `theseus move <id> in-progress --reviewer <your-model-id> --reason "..."`.
7. Append your friction to `.theseus/scoreboard/friction.jsonl`.

## For Atlas cards

Pick 3 claims (preferably from Invariants and Pitfalls), check them in the code and tag each `[verified]` or correct it. More than one wrong: send it back to the Cartographer.
