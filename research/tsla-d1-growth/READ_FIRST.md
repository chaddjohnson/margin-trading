# READ FIRST — Priority 6: TSLA D1 + Growth, comprehensive GPU research (P6-TSLA 1.0.0)

**Status: COMPLETE.**
- Branch `research/tsla-d1-growth`. The exact commit and the package identity are in `IDENTITY.txt` (handoff ZIP) and
  `RESEARCH_RECOVERY.md`.
- Research only: nothing was adopted, deployed, traded or merged into `main`, and no broker was contacted. TSLA was not
  combined with MSFT, VGT, GDX or any portfolio. **The MSFT study was not started.**

## The result

**NO QUALIFYING TSLA CANDIDATE.**

Five architectures were optimized on the accepted GPU evaluator with the same data, engine, instrument and selection
rule: D1 alone (D), Growth alone (G), a fixed pair (C), fully joint (J) and D1-first sequential (S). Each ran in one
exclusive $100,000 TSLA slot, at 11 % interest and 5 bps per side.

- **Folds: the binding test.** The full search-and-selection procedure of every arm was re-run at three earlier
  cutoffs, and each selection was replayed on the next period without retuning. **Every arm failed:** the chained
  2020–2024 nets were positive ($25,172–$99,581), but every drawdown exceeded the $35,000 limit:

  | Arm | Sequential drawdown |
  |---|---:|
  | G | $36,079 (over by $1,079) |
  | D | $40,170 |
  | C | $61,092 |
  | J | $67,635 |
  | S | $82,547 |

  In D, C, J and S the drawdowns came mostly from realized single-lot losses of $18,500–$31,800, far beyond the
  training lots' worst excursions (−$7,500 to −$14,000). Out of sample the primaries earned 10–35 % of their in-sample
  rate.
- **The C24 finalists** (trained on 2016–2024) were validated once on 2025-01-02 → 2026-10-30, retrospective:

  | Arm | Validation P&L | V1–V3 |
  |---|---:|---|
  | G | **+$10,703** | pass |
  | C | **+$71** | pass |
  | S | −$2,412 | V1 fails |
  | D | −$8,979 | V1 fails |
  | J | −$10,751 | V1 fails |

  G's and C's primaries are therefore *development-qualified without chronological support: not deployment-qualified
  without an explicit user decision*. The study recommends no action (`DECISION_REGISTER.md` U5).
- **The combined architectures' in-sample advantage did not carry over.** In development, C, J and S were "material
  improvements" over G (+$94,638 to +$199,729 at C24). Out of sample they had the deepest drawdowns on the folds, and
  made less than G in the validation. Their in-sample gain comes from filling the slot's idle time and from the
  allocator's chronology, not from better D1 or Growth parameters (`ROBUSTNESS_AND_RISK.md` §7).
- **Disclosure D1.** The sealed `results/outcome.json` lists no development-only primaries because of a join defect in
  `outcome.ts` found after the outcome. The candidate list is unaffected. G and C are listed by finalist id in
  `reports/tables/outcome-join.json`. No seal was rewritten.

## The rest of the brief, in one line each

- **Priority 5 archives (§0A):** 29/29 compressed losslessly (196.0 GB → 16.1 GB), hash- and restore-verified;
  **179.8 GB recovered**. The other 22.6 GB of caches were audited and nothing else was deleted (`STORAGE_PRESERVATION_REPORT.md`).
  This study's own 82 job archives: 184.8 GB → 12.3 GB, 82/82 verified (`storage/TSLA_JOB_POST_VERIFY.json`).
- **TSLA data:** Alpaca SIP minute bars from the existing account (no purchase), 2016-01-04 → 2026-10-30: 2,723 of 2,723
  sessions, 1,975,254 rows, sha256 `8ed7f7d0…`. 0.07 % of development regular minutes have no bar. The 5:1 (2020) and
  3:1 (2022) splits are verified against 8-K filings and an independent daily series (`TSLA_DATA_AUDIT.md`).
- **GPU:** 82 official jobs, all attested (1,312 checks, 0 failed); parity mini-sets 1,476/1,476 identical;
  44,161,845 evaluations, 0 CPU-scored. Gates E1–E9 pass. The evaluator, the GPU backend and Strategy Lab are unchanged
  (`GPU_PARITY_AND_ACCEPTANCE.md`).
- **Search:** 2,560 lanes and 41.9 M requested evaluations (34.9 % of the ceiling). No lane was budget-bound, and every
  arm "converged by the frozen rules". Seed dependence is material, 10–66 % (`SEARCH_AND_CONVERGENCE_REPORT.md`).

## Evidence labels

- *Development* (2016–2024): every choice.
- *Independently chronological:* the three folds.
- *Retrospective:* everything after 2019, including the validation, which is previously examined history, never a
  pristine holdout.
- *Report-only:* sub-populations, roles, controls and diagnostics.

**There is no prospective unseen period.** The $35,000 ceiling is a research criterion on historical paths, never an
enforceable loss limit.

## Reading order

1. `READ_FIRST.md` (this file), then `REPORT.md`: the full evidence and conclusions, §1–§15.
2. `COMPARISON.md`: the one transparent comparison of D, G, C, J, S and the controls, by evidence period.
3. `CHRONOLOGICAL_VALIDATION.md`: order of events, folds, verdicts, the validation and its interpretation.
4. `FINAL_CANDIDATES.md`: the C24 finalists, the determination and the primaries' parameter vectors.
5. `ROBUSTNESS_AND_RISK.md`: give-back versus principal loss, neighbourhoods, costs, gaps, margin and displacement.
6. The arm reports: `STANDALONE_D1_REPORT.md`, `STANDALONE_GROWTH_REPORT.md`, `FIXED_COMBINATION_REPORT.md`,
   `JOINT_REPORT.md`, `SEQUENTIAL_REPORT.md`.
7. `SEARCH_AND_CONVERGENCE_REPORT.md`, then `GPU_PARITY_AND_ACCEPTANCE.md`.
8. `DECISION_REGISTER.md`: precommitted choices, adaptations, post-freeze changes and **your outstanding decisions
   (§U)**.
9. `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`, `PROTOCOL_FREEZE.json`, `FROZEN_SELECTION.json`, and the
   door log `study/results/doors.jsonl`.
10. `TSLA_DATA_AUDIT.md` / `.json`, `FUNCTIONALITY_AUDIT.md` and `STORAGE_PRESERVATION_REPORT.md`.
11. `RESEARCH_RECOVERY.md` and `RUN_COMMANDS.md`: the exact reproduction, hashes and restore requirements.
12. `OMITTED_ARTIFACTS.md`, `IDENTITY.txt` and `SHA256SUMS.txt` (in the ZIP).

Machine-readable results are under `study/results/` (sealed), `study/reports/tables/` and `study/reports/diagnostics/`.
