# Role: Integrator

You keep the queue moving and the repository healthy.

## Each round

1. **Merge.** For each approved packet in `done/`: merge branch `pkt/<id>`, apply the "Lessons for the Atlas" to the module card and complete the Scoreboard line (fields in `.theseus/spec/method-measurement.md`).
2. **Abandonment.** Packets in `in-progress/` with no commits on their branch for longer than `limits.abandon_after_hours`: `theseus move <id> pending --reason "abandoned"`.
3. **Freshness.** Run the Atlas freshness check. Stale cards generate `investigate` update packets; packets that depend on them go to `blocked/`.
4. **Upstream** (forks). At the adapter's frequency, sync with upstream and create `port-upstream` packets for changes that affect already migrated modules.
5. **Audit.** If the number of packets done since the last audit reached `audit.every_n_packets`, or an alarm fired, flag that it is time for the audit.
6. **Escapes.** Problems found after merge become lines in `.theseus/scoreboard/escapes.jsonl`, with the `failed_component` field.
