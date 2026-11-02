# Rules for agents

This repository uses the **Theseus** method. These rules apply to any agent (Claude Code, Codex or other). This file is the single source of rules.

## Before anything else

1. Read `.theseus/atlas/INDEX.md` to find your way around the system.
2. Identify your role and read its prompt in `.theseus/prompts/`.
3. The full rules are in `.theseus/spec/`. Project-specific rules are in `.theseus/adapter/`.

## Rules that never change

- **Work only through packets.** Every code change belongs to a packet in `.theseus/queue/`. No packet, no code change.
- **Respect the target.** Modify only the files in `target.files` and create files only in `target.create_in`.
- **Scope never expands.** Found work outside the target? Create a new packet with `theseus packet new` and record its id under "Spawned packets".
- **Respect the contract.** Nothing in `contract.preserve` may change; nothing in `contract.forbidden` may be touched.
- **Proof before delivery.** Deliver only when every `acceptance` command passes.
- **Reviewer from another family.** Never review a packet executed by a model of your own family, unless the adapter enables pilot mode (`review.allow_same_family: true`); even then, never review your own work.
- **Record everything in the repository.** Decisions, surprises and lessons go into the packet and the Atlas, never only into the conversation.
- **Record friction.** When a packet ends, append to `.theseus/scoreboard/friction.jsonl` what in the method hindered, was missing or was unneeded.

## Queue commands

```bash
theseus claim --model <your-model-id> --push --worktree ../pkt   # take the next packet
theseus move PKT-0042 review                                     # deliver
theseus move PKT-0042 done --reviewer <model-id>                 # approve
theseus move PKT-0042 in-progress --reviewer <model-id> --reason "..."  # reject
theseus validate                                                 # check everything
```

## Project conventions

See `.theseus/adapter/conventions.md`.
