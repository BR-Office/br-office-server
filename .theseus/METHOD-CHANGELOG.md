# Method changelog

Each version lists the Theseus Enhancement Proposals (TEPs) it incorporated and each one's hypothesis. See `.theseus/spec/method-measurement.md`.

## 0.4.0

Approved by Rafael on 2026-11-03 from AUD-4 (Theseus 0.20.0).

- TEP-0009: lint every placeholder form and spawn requests; block when the acceptance fails twice with the same output. Hypothesis: "Blocked records whose reason is a placeholder or a repeated identical acceptance failure fall from 4 of 20 (AUD-4) to at most 1 of the next 20, and R6 rejections of spawn requests from 5 to at most 1, with no drop in done packets."
- TEP-0010: preserve every attempt's work, including fork checkouts, across retries and restarts. Hypothesis: "Friction lines reporting lost attempt work fall from 5 packets (AUD-4) to at most 1 in the next 20 records, and median duration of multi-attempt done packets falls by 30%, with no increase in R2 rejections."

## 0.3.0

Approved by Rafael on 2026-11-03 from AUD-3 (Theseus 0.19.0 and 0.19.1). TEP-0005 rejected as superseded.

- TEP-0006: version the method when a TEP enters testing, and record the planner's estimate. Hypothesis: 100% of records carry a method_version that maps to a changelog entry, ≥80% have a planner estimate, median |actual/estimated − 1| below 1.0, planning cost per packet +10% at most.
- TEP-0007: refuse malformed packets before any agent runs (placeholders, no acceptance, a target that edits another packet; warn on Goal paths outside the target). Hypothesis: blocked + discarded records from these causes fall from 11 of 27 to at most 3 of the next 27, without fewer done packets.
- TEP-0008: acceptance runs the deliverable; validate checks delivered files survive integration. Hypothesis: first-review approval back from 81% to ≥92%; friction lines on acceptance or integration loss from 7 to ≤2 per 27 records; median done duration ≤10 minutes.

## 0.2.0

Approved by Rafael on 2026-11-02 from AUD-1 and AUD-2 (Theseus 0.13 to 0.15). Recorded here in 0.3.0: until TEP-0006 the version was not bumped, so records of this period carry 0.1.0.

- TEP-0001: block on the first rejection that names an external blocker. Hypothesis: cost of blocked records per blocked packet −50%, first-review approval and escapes unchanged.
- TEP-0002: environment preflight for packets that need external resources. Hypothesis: first-review approval of packets with `requires` ≥50%, cost per done packet that needs the environment −30%.
- TEP-0003: acceptance commands check the Goal's content. Hypothesis: review rejections citing an unmet Goal clause −40%.
- TEP-0004: fill the indicator fields and require an agent friction line. Hypothesis: all 7 indicator rows computable, ≥90% of done packets with an agent friction line, claim-to-review time +5% at most.

## 0.1.0

- Initial method version, no TEPs.
