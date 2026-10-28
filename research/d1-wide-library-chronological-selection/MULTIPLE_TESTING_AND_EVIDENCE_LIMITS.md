# Multiple testing, selection degrees of freedom and evidence limits

## 1. How many things were tried

| Layer | Count |
|---|---|
| Training candidates evaluated | 137,486 + 138,915 + 140,137 archived rows re-evaluated (census; the final window never evaluated); 413,280 new-search vectors (6 folds × 61 ETFs × ≤ 1,152) |
| Neighbourhood draws for libraries and selection | 1.77 M distinct (training only) |
| Behavioural families considered per ETF | median 7 (S18) to 76 (fold B ALL) |
| Primary comparisons with the baseline | 3 broad arms × 4 K × 4 verdict pools × 2 folds = **96** |
| Verdict cells | 12 (arm × pool) within-ETF + 12 across-ETF |
| Nested comparisons | T1 2 pools × 4 K × 2 comparators = 16; T2 4 × 4 × 2 = 32 |
| Rolling-track comparisons | 5 years × 3 arms = 15 |
| Descriptive ablations | A1 vs A1n, ARCH-S vs NEW-S, cross-pool vs A0, ETF subsets (2 sizes × 50), discarded groups |
| Cost settings per nominee | 4 (0/2/5/10 bps), each re-simulated |
| Evaluation-window runs | fast path ≈ 20–22k library vectors per primary phase; full engine for every nominee at 4 costs + portfolio; 1,376–13,200 capture draws per engine phase |

The decision rules were frozen before any window outcome (PROTOCOL §9; `PROTOCOL_FREEZE.json` body `d45fc411…`, 2026-10-27T23:48:53Z)
and required consistency over both folds, three of four library sizes and two costs, with sign counts at the ETF and
cluster level. **No arm met them on any pool**; the across-ETF "improves" for A3 on NEW-S is one of 12 across-ETF cells
and coexists with a "worse" within-ETF verdict for the same procedure.

## 2. Winner's curse, measured rather than assumed

- **Training → next window:** across library members, the rank correlation between the arm's own training score and
  window V is −0.14 to +0.25 (ARCH and NEW, K = 16 and 64; most |ρ| < 0.12). The source audit found 0.22–0.23 between
  the 61 representatives' training nets and their fold V; inside an ETF's library it is weaker still.
- **Selection → later window (nested):** A4's picks averaged +$25k each in the selection window and −$5.5k in the
  later one (T1/NEW); median per-ETF ρ(selection V, later V) −0.13.
- **A wider choice set gave a better-looking training winner, not a better later result:** the nominees did about as
  well as a random member of their own library (e.g. fold A ARCH A2 $5,827 vs a random member's $5,352 mean per ETF;
  fold B −$6,615 vs −$4,306; nominee means over all 61 slots with idle slots at 0, random-member means over the 57 ETFs
  with a library — over the same 57 the nominee means are $6,236 and −$7,079), while the hindsight oracle (best member
  per ETF) sits at $13–36k per ETF — the libraries hold later winners, and nothing in the training data points to them.
- **Across ETFs:** choosing the top 5 of 61 by training score adds a further layer; on ARCH the median Δ vs A0 over 50
  seeded 15- and 30-ETF subsets is negative for every arm in both folds.

## 3. What the evidence is and is not

- **Inspected history.** 2016–2023 (and 2024–2026) were inspected by earlier studies. Each procedure here used only
  data through its cutoff, but the study designer had read A0's published fold outcomes before writing the protocol;
  archived (ARCH) fold outcomes were derivable by subtracting published archive nets; the thresholds (75%/75%, $10k,
  $35k, $20k) came from studies that saw 2016–2023; the family diameter (d ≤ 0.5) was chosen after the pre-freeze
  fold-a census (training data only), and a training-only S18 dry run preceded the freeze (PROTOCOL §0, §6.2). The
  procedures' design was informed by the inspected history; only their execution was blind to each window. ARCH
  results are graded at the lowest evidence level.
- **Survivorship.** The 61 ETFs exist today with complete 2016-onward minute data; closures are absent.
- **Few independent events.** Fold A holds 74 window families (24 major), fold B 156 (78 major); correlated ETFs share
  the same market episodes (2020's rebound, 2022's bear market), so the 61 ETFs are far from 61 independent trials, and
  the two primary folds are effectively two market regimes.
- **Overlap.** The rolling one-year track overlaps the primary folds and each other; T2 overlaps T1's later window;
  neither is a replication.
- **No p-values.** No bootstrap, PBO, deflated Sharpe or probability of future success is computed: the trials are
  neither independent nor exhaustive, and no statistical model of the dependence is justified here.
- **Base rate of the rules.** "Favourable" needs five conditions in both folds at K = 8, 16 and 32 or 64; with 12 verdict
  cells, "mixed / inconclusive" at the study level would have been likely even with no effect. The observed outcome is
  stronger than that: **no** arm is favourable in both folds at K = 16 on **any** pool, and 6 of 12 cells are "worse" (ARCH A3; NEW A2; NEW-S A2, A3; ALL A2, A3).
- **A drawdown gate is not a cap.** Every procedure breached $35,000 of windowed minute drawdown for 8–17 nominees in
  2022–2023 although every nominee passed the gate in training.
- **No forward evidence.** Nothing after 2023-12-29 was read for any candidate; the forward observation count is 0.

## 4. Open issues (disclosed)

1. The descriptive selection flag "training signature equals an archived vector" also fired for archive-provenance
   members of the ALL pool (505 self-matches); restricted to new provenance it is 0 (no effect on any rule).
2. The pre-freeze S18 dry run (training only, through 2018-12-31), the choice of the family diameter after the
   pre-freeze fold-a census (PROTOCOL §6.2), and the designer's prior knowledge of A0's fold outcomes (PROTOCOL §0).
3. The source universe's structural hindsight and the source procedure's October 2026 design (box, credible rule,
   neighbourhood instrument) cannot be removed by a retrospective replay.
4. Windowed minute drawdown exists only on the fast path (the full engine reports whole-run minute drawdown); the
   engine checks V, windowed daily drawdown and lots per window to the cent.
5. PROTOCOL §9.4(3) says "some arm is 'improves' on a pool other than ARCH" — the same token as the across-ETF label.
   The analysis applies §9.4 to the within-ETF verdicts (the matrix's rule of that name; §9.4's other clauses use
   within-ETF labels). Read literally as including the across-ETF layer, NEW-S A3's across-ETF "improves" would change
   the study label from "no demonstrated improvement" to "mixed / inconclusive" — never to an improvement.
6. The trade ledgers and window lot metrics cover lots entered in the window; V also contains the carried-in lot's
   window share (reconciled in `results/tables/ledger-reconciliation.csv`). S21 and T2-later have no event
   attribution (`DIP_EVENT_CAPTURE_AND_TAIL_RISK.md` §1).
