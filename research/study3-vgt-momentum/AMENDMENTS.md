# Amendments (append-only)

The protocol was frozen 2026-10-28T17:31:30Z (`PROTOCOL_FREEZE.json` bodyHash
`a707eb105b506b0eaf87435faf88fb5dd47e6495891cdee12f1ad1c3866ac13f`) and the code 17:32:02Z (`results/code_freeze.json`
manifest `1822bc10bf9145d482c0a0555a25c1e7d64534a0c4161816b9bc7b9ac5cd53cd`). No code was changed after the freeze, no
stage was rerun, and no decision, selection, label or verdict was affected by anything below.

## A1 — descriptive figures computed by the read-only report script (written 17:41Z, after the results)

- **What.** P §2 promised a distribution diagnostic for finalists, C-AL and C-ALR, and P §10 lists some M5 outputs
  (largest win/loss by lot and by campaign, consecutive losses, time underwater, holding quartiles, and Z1 against Z0
  scaled to Z1's exposure). The frozen stages seal the trade rows and daily marks these need, but do not compute the
  figures themselves; I noticed this when writing the reports.
- **How.** `scripts/report_tables.py` (outside the code freeze, read-only, verifying every payload hash) computes them
  from the sealed robustness and diagnostics payloads and `config/market-events/distributions.csv`
  (`results/tables/risk-extras.md`, `results/tables/sizing.md`).
- **Status.** Descriptive only; outside the decision rule. Labelled as such wherever it is quoted.

## A2 — further descriptive figures and one post-seal parity check (written 18:18Z, after the final review)

- **What.** The final code/evidence review (`reviews/FINAL_CODE_AND_EVIDENCE_REVIEW.md`, finding 1) found that two
  outputs the protocol promised were not produced by the frozen stages: P\*-R with a Pareto report (P §8), and the
  per-fold accounting of P\* (P §9: realised/unrealised split, price gain, interest, friction, profit factor, holds,
  MAE/MFE). Finding 13 noted that the verdict-bearing fold picks had never been compared with the reference on their
  evaluation data.
- **How.** `scripts/report_tables.py` computes the two tables read-only from the sealed develop and evaluate payloads
  (`results/tables/pstar-accounting.md`, `results/tables/pstar-r-and-pareto.md`). `scripts/fold_pick_parity.ts` runs
  the frozen engine and the independent reference for each fold's sealed P\* on data through its window end and
  writes `audit/fold-pick-parity.json`: **0 differences for all four picks** (largest |Δ| 1.5 × 10⁻¹¹).
- **Status.** Descriptive only, outside the decision rule. No sealed record, payload, freeze or frozen code changed.
  P\*-R would have picked E04 in fold A (Σ +$20,553 over the four windows, still failing T(iii)–T(v)) — reported,
  not used.
