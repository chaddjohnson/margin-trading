# PROPOSAL (for the user's review) — optimization-process changes after the bounded process audit

**Status: PROPOSAL ONLY. Nothing here is adopted.** The optimization standard (`docs/research/OPTIMIZATION_STANDARD.md`,
version 2.0.0, registered sha256 `2005a88c…0105`) is unchanged; its registry is unchanged; no ordinary study's rules
change. Any adoption needs the user's agreement and, for the standard, a new version, a change-log entry and the new
sha256 in the registry (standard §7.4). The evidence comes from heavily examined history (`REPORT.md`), so every item
below is a retrospective inference to be judged, not a demonstrated improvement.

## What the evidence supports

| # | Proposal | Kind | Evidence (REPORT.md) | Cost |
|---|---|---|---|---|
| 1 | **Keep the selection rules.** Do not adopt the tail-severity, subperiod or episode formulas (P1–P3) or any other re-ranking of qualified candidates on this history. | no change | All three: "no demonstrated improvement"; none kept the 2020–2024 sequential DD within $35,000 in either subject; no training feature had a consistent sign across six subject-cutoffs (§2, §6, §7). | none |
| 2 | **Report episode reproduction beside every neighbourhood statistic** (report-only, standard §5.8-style): for the primary and role holders, the share of selection neighbours whose leading winning episode overlaps the centre's and the median share of their net inside the centre's leading-episode window; label stability with overlap ≥ 0.8 as "single-episode stability". | reporting (minor version if adopted) | Overlap 0.78–1.00 from C21 on; 64%–104% of 4A neighbours' net inside one window (§2 Q3). | ≈ 128 detailed training reruns per reported member |
| 3 | **Add a post-fold hindsight cohort to future chronological tests** (report-only, after each fold selection is sealed): a frozen, development-only stratified sample of the cutoff archive evaluated on the slice, so a failed fold can be classified as a selection failure (acceptable alternatives existed but ranked low) or a discovery/regime failure (almost none existed). | reporting / procedure (minor version if adopted) | 3B 2020–2021: 85 of 96 breached → discovery/regime; 4A 2020–2021: 27 acceptable mostly outside the shortlist → selection and promotion (§7). | ≤ 96 slice runs per fold |
| 4 | **Disclose clipping** in every neighbourhood report: draws with a clipped coordinate and which inputs sit at a box bound. | reporting | 236–251 of 256 selection draws of 3B's primaries clipped (§2 Q3); effect unmeasured. | negligible |
| 5 | **Stronger standing limitation wording** in reports of 2016–2024 searches: "selected on a window dominated by N episodes; local stability measured on the same episodes; chronologically unsupported in K of K tested procedures". | wording | Every independent procedure tested so far (Priorities 2, 3, 3B, 4A, growth140) failed chronologically (`results/inventory/CONTEXT_STUDIES.md`). | none |
| 6 | **Reduce further broad optimization on 2016–2024** for these families; prefer prospective shadow observation of fixed candidates as the source of genuinely new evidence. | research direction | 3B's 4.6× larger search produced a similarly fragile archive (§4, §7). | — |
| 7 | **Documentation correction (not a behaviour change):** `docs/strategy-lab/GROWTH_ENTRY_GATES.md` §3.1 and §8 say eligibility without a trend filter changes nothing; that holds only when the minimum strength a ≤ the Rise trigger X. With a > X, §3.2 (and the engine's test) invalidate the crossing at once. | documentation | §4 (4A eligibility). | wording only |

## What the evidence does not support

- A new hard risk threshold, a tail-severity gate, an activity floor, a concentration veto or an automatic
  liquidation rule.
- A funding, allocation, reservation or preemption study (no specific mechanism: 4A has no allocation and failed the
  same way; 3B's breaches were shared by nearly all candidates). Broader funding research stays deferred.
- Treating any hindsight-best cohort member as a candidate: it is an oracle description, not a selection.

## Hypotheses for later, separately authorized review (not tested)

- **D1 crash losses:** 3B's 2020–2021 breach came from one D1·GDX lot (−$42,553.87, 2020-03-05 → 03-16). A narrow
  study of per-lot loss or gap-exit behaviour of the D1 books (an exit-rule question) might matter more than selection.
- **Dormancy by specification:** books pairing minimum-strength eligibility a > X without a trend filter trade only on
  violent days; whether that is desirable is a design question for the user, not a selection rule.

## Sequencing recorded from the audit brief (2026-11-10)

This process audit ran now; **Priority 4B is deferred**; **broader funding research is deferred** until a specific
evidence-backed hypothesis exists; **Priority 6 (other ETFs) remains pending**. None is cancelled; none starts
automatically. Recommendation: pause new broad optimization; if research continues, a bounded 4B comparison of 4A's
frozen export set by complete pooled reruns (no search) is the lowest-risk step.
