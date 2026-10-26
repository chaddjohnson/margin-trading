# Diversity-preserving D1 pool discovery and chronological robustness (study "diverse-d1", 2026-10-26)

**Status: complete (M0–M4).** **Verdict: no advancement — B5 remains the leading candidate
and B4 the default.** Nothing from this study is a forward-test candidate. No configuration of this study was evaluated
on 2024-01-02 → 2026-10-13.

## What the study asked, and the answer

A new, preregistered study (not a continuation of `research/d1-robust-pool-discovery/`, the October 25 study). It asked
two questions:

1. **Can a search that is structurally prevented from collapsing find D1 shared-pool configurations, in the 61-symbol
   universe, that are robust and different from B5?** The search guarantees per-symbol coverage, forms families per
   arm without chaining, and prunes harmful members before assessment.
2. **Does a time-aware score T** (the neighbourhood score with each configuration's best year replaced by its median
   year) **select configurations that persist better than the neighbourhood score J?** Both ran on identical
   machinery, with a bounded peak-score control Q.

| Question | Answer (evidence label) |
|---|---|
| Did the repaired search machinery work? | **Yes.** Every coverage contract was met in all 10 arms of all rounds, every symbol was searched ≥ 1,026 times per final arm, families formed without chaining, every arm kept its own shortlist, and pruning removed harmful members before assessment (E1). |
| Does J or T selection persist across time (walk-forward GP)? | **No.** J failed GP on its fold-b validation drawdown ($48,269 > $45,000) despite 70th/84th-percentile P&L; T was below the control median in both folds. The folds do not distinguish T from J (E2; the fold windows were inspected by earlier studies). |
| Is there a training-window configuration better than B5? | **In the $100k pool, at the median, yes; in the 20% portfolio, no.** Every unseeded finalist fails G7: per borrowing dollar it ends below B5. The only finalists passing every gate are seeded B5 descendants (GDX KRE XBI XRT; B5 re-tuned) (E1). |
| Anything to forward-test? | **No.** GP failed, so no procedure may nominate; and no unseeded (primary-eligible) finalist passed the gates in any case. |

## Old versus new search design (the brief's required comparison)

| | October 25 study | This study |
|---|---|---|
| Coverage floor achieved? | **No.** Final arms: 29 (unseeded) and 25 (seeded) of 61 symbols under the floor; minimum 191 configurations per symbol (folds: 116) | **Yes, in every arm.** Minimum 1,026 per symbol in the final arms against a floor of 600 (folds: 733 J/T, 534 Q); 0 contract failures |
| Families at the final round | **1** (single linkage chained 295 of 295 pooled candidates) | J-u 5,276 · T-u 4,979 · J-s 4,151 · T-s 4,353; the largest family holds 2.5–11.2% of its arm's credible set |
| Distinct assessed families / finalists (final) | 1 finalist | 30 finalists from 30 distinct families (8 / 7 / 8 / 7 per arm) |
| Proportion from each arm | 100% seeded (the pooled top 300 held 0 unseeded candidates) | unseeded 15 (J-u 8, T-u 7), seeded 15 (J-s 8, T-s 7) |
| Genuinely different memberships among finalists | 1 | 18 distinct symbol sets (10 among unseeded finalists); per arm 4–5, with near-duplicates (same symbols, different parameters) in every arm |
| Fold-a picks: validation V (control percentile) | J EDV GDX KRE +$4,189 (0.40); Q −$30,323 (0.03) | J GDX IBB SMH XHB +$13,759 (0.70); T GDX SMH −$12,043 (0.10); Q −$8,496 (0.13) |
| Fold-b picks | **J: no pick** (only finalist failed G3); Q −$39,158 (0.00) | J GDX SMH XHB +$5,462 (0.84) but DD $48,269; T IGV VOOG −$7,089 (0.46); Q −$4,001 (0.58) |
| Procedure gate | G-WF failed | GP(J) failed (clause iii), GP(T) failed (clauses i and ii) |
| Final finalists passing every gate | 1 — seeded B5 descendant (GDX KRE XBI XLE) | 6 — all seeded B5 descendants (GDX KRE XBI XRT ×5; GDX KRE VGT XBI XRT); **0 unseeded** |
| Nominated / evaluated after 2023 | none / none | none / none |

The new design fixed the structural failures it was built to fix: coverage, arm suppression, chaining, the
refinement-versus-gate contradiction and the tie window. It produced many genuinely different candidates. **None of
them generalised in time, and none beat B5 in the portfolio on training.** Adding configurations did not change the
conclusion. The search machinery behaved as designed. The two folds did not distinguish T from J, and on the
strategy question the result is negative.

## Reports

| File | Content |
|---|---|
| [RECOMMENDATION.md](RECOMMENDATION.md) | the decision: retain B5 / B4; what would change it |
| [CHRONOLOGICAL_METHOD_COMPARISON.md](CHRONOLOGICAL_METHOD_COMPARISON.md) | J vs T vs Q on two walk-forward folds, GP clause by clause, annual attribution, $100k vs portfolio |
| [COVERAGE_AND_DIVERSITY.md](COVERAGE_AND_DIVERSITY.md) | required vs actual coverage per symbol and arm, budget split, families and memberships |
| [FAMILY_SELECTION.md](FAMILY_SELECTION.md) | family rule, every promoted family, refinement and pruning history |
| [NEIGHBORHOOD_AND_RISK.md](NEIGHBORHOOD_AND_RISK.md) | E0 vs E1, drawdown neighbourhoods, the 2u amplitude, confirm-A vs confirm-B |
| [FINAL_CANDIDATES_AND_GATES.md](FINAL_CANDIDATES_AND_GATES.md) | every final finalist's gates, the rejection ledger, hypothetical (non-)nominations |
| [HISTORICAL_CONFIRMATION.md](HISTORICAL_CONFIRMATION.md) | the no-advancement statement: no candidate data after 2023 was read |
| [BASELINE_AND_PARITY.md](BASELINE_AND_PARITY.md) | benchmark reproduction to the cent, P0–P5 parity, data doors, isolation |
| [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) | hashes, reviews, budgets and actuals, tests, code changes, disclosures, limitations |
| [PROTOCOL.md](PROTOCOL.md) / [PROTOCOL_FREEZE.json](PROTOCOL_FREEZE.json) | the frozen protocol and the index of its sealed freeze (`results/protocol_freeze.json`) |
| [FROZEN_SELECTION.json](FROZEN_SELECTION.json) | the write-once selection record (no advancement) |
| [DESIGN_DECISIONS_AND_PRIOR_EVIDENCE.md](DESIGN_DECISIONS_AND_PRIOR_EVIDENCE.md) / [DESIGN_DIFF.md](DESIGN_DIFF.md) | why each rule; the old failures and the tests that make them impossible |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | the on-disk recovery checkpoint (task state) |
| `reviews/` | the three independent reviews and the independent final audit, verbatim, with the briefs of the last two |
| `brief/` | the assignment as received |

**Report names versus the protocol's §21 list.** The protocol was frozen before the full brief arrived, and the brief's
§14 names were adopted:

| Protocol §21 name | Report |
|---|---|
| DATA_AND_UNIVERSE_AUDIT, CONTROLS_PARITY_AND_CALIBRATION | `BASELINE_AND_PARITY.md` (+ `results/tables/calibration.md`) |
| SEARCH_COVERAGE | `COVERAGE_AND_DIVERSITY.md` |
| FAMILIES_AND_PROMOTION, REFINEMENT_AND_PRUNING | `FAMILY_SELECTION.md` |
| WALK_FORWARD_RESULTS | `CHRONOLOGICAL_METHOD_COMPARISON.md` |
| FINAL_ROUND | `FINAL_CANDIDATES_AND_GATES.md` + `NEIGHBORHOOD_AND_RISK.md` |
| HISTORICAL_CHECK | `HISTORICAL_CONFIRMATION.md` |
| rejection ledger | `FINAL_CANDIDATES_AND_GATES.md` §5 (fold rounds: `results/tables/round-fold-*.md`) |

## Evidence grades

- **E0:** one centre on training.
- **E1:** an independent neighbourhood on training.
- **E2:** reused historical diagnostics, i.e. walk-forward folds on years inspected by earlier studies.
- **E3:** "historically consistent" on the inspected 2024–2026 window; not reached.
- **E4:** forward evidence; not reached.

**New/old boundary.**
- This study reused the October 25 study's audited universe, neighbourhood instrument, engines and benchmark records,
  imported unchanged.
- It never reran, rehashed or edited any of that study's stages or records. Its integrity was checked at commit
  `348f100b` from git objects.

## Runbook (Node v24.21.0; `npm run diverse-d1 -- <command>`; every outcome stage is write-once)

```bash
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
# M0  design commitment (once) and reviewed pre-freeze changes
npm run diverse-d1 -- commit-design
npm run diverse-d1 -- change --change "…" --reason "…" --review "…" --outputs <paths>
# M1  outcome-free checks, then the freeze
npm run diverse-d1 -- legacy-check        # the October 25 study intact at 348f100b (any time)
npm run diverse-d1 -- audit               # universe re-audit
npm run diverse-d1 -- benchmark           # unit costs, no P&L -> tier
npm run diverse-d1 -- reproduce           # B1/B4/B5/C0 to the cent
npm run diverse-d1 -- parity              # P0-P5
npm run diverse-d1 -- freeze-protocol
# M2  controls, walk-forward folds, the procedure gate
npm run diverse-d1 -- controls --window fold-a      # likewise fold-b, final
npm run diverse-d1 -- search --window fold-a && npm run diverse-d1 -- select --window fold-a
npm run diverse-d1 -- validate --fold fold-a        # only after the sealed PICKS.json
npm run diverse-d1 -- determinism                   # after the fold-a search
#   ... fold-b likewise ...
npm run diverse-d1 -- procedure-gate
# M3  final round (training only), selection freeze, independent confirmation draws
npm run diverse-d1 -- search --window final && npm run diverse-d1 -- select --window final
npm run diverse-d1 -- freeze-selection
npm run diverse-d1 -- confirm-b
# M4  only with nominees; otherwise the no-advancement record
npm run diverse-d1 -- evaluate
# after the freeze: amendments (final.ts/cli.ts/stages.ts only once a fold validation is sealed); tables
npm run diverse-d1 -- amend --stage <stage> --change "…" --reason "…" --review "…" --outputs <paths>
npm run diverse-d1 -- tables
# supplementary, descriptive (outside the code manifest)
node --experimental-transform-types research/d1-diverse-pool-discovery/scripts/protocol-freeze-index.ts
node --max-old-space-size=8192 --experimental-transform-types research/d1-diverse-pool-discovery/scripts/ledgers.ts folds|final
python3 -I research/d1-diverse-pool-discovery/scripts/coverage_summary.py > research/d1-diverse-pool-discovery/results/tables/coverage-summary.json
```
