# Source and conflicts audit (Stage 0, before the protocol freeze)

What each earlier study measured, where the claims seem to conflict and why, and which facts the designer had already
seen. Nothing in a prior study was edited, re-hashed or rerun to reconcile it; every figure below is quoted from the
named record (working notes: `audit/PRIOR_STUDY_NOTES.md`). Study 2 re-measured some of them as fail-closed parity
anchors (`SIGNAL_GENERATION_AND_ENGINE_PARITY.md`).

## 1. Sources and commits

| Source | Commit(s) | What it measured | Unit |
|---|---|---|---|
| Seven-ETF complementary screen, `research/complementary-etf-d1/` | `cef1534` (2026-10-24) | GDX XOP EWZ TLT XLE XLU GLD against All-lowDd (= B4's books) on the training partition with a **daily proxy** (arm when a session low is ≥ 15% below the 74-session high; buy on a 2% close rebound; sell on a 10% close drop or after 20 sessions); a post-hoc minute D1 diagnostic at 0 bps, first-order only | daily proxy; first-order bookkeeping |
| Portfolio-aware D1 opportunity map and optimization, `research/portfolio-aware-d1-optimization/` | `96d7535` (2026-10-25) | real D1 minute signals of the same seven ETFs (the unchanged vector = VGT `primary`, and searched vectors) classified at the decision minute against S0 (= B4) on training at 5 bps; **full chronological replays** of S0 + one book; B5's GDX book selected by NSGA-II on the replayed pool Δ | minute D1; full path |
| Ranked preemption, `research/d1-ranked-preemption/` | `9400593`, `40da6dd` | the audited 61-ETF universe; per-fold standalone searches and sealed representatives (fold-a, fold-b, final); R1/R2 rankings; preemption policies; walk-forward gates | standalone + pooled |
| Standalone opportunity audit, `research/d1-standalone-etf-opportunity-audit/` | `4da90d9`, `6489a63` | all 61 existing standalone phenotypes against VGT `primary`; price-only event catalog (zigzag 10%); fold runs of every representative (`results/runs/fold.jsonl`) | standalone |
| Study 1, `research/d1-wide-library-chronological-selection/` | `1891d32`, `3f951eb` (+ user `a37feae`) | wider libraries and chronological selection over 61 ETFs, folds A and B, each ETF in its own $100,000 slot | 61 separate slots |
| B4/B5 robustness, standalone-vs-pooled, prospective freeze | `3c0ee0f`, `91c3b2e`, `9b0ab94` | B4/B5 full-history (2016-01-04 → 2026-10-13) fixed and portfolio figures, cost and stop stresses, ablations, regimes; the prospective B4-vs-B5 freeze | pooled, full history |

## 2. What each one found (quoted)

- **Seven-ETF screen.** All-lowDd training baseline: 71 funded lots, 66 refused, a lot held at the close in 843 of
  1,647 sessions (51%). "Everything is a **daily proxy**"; all seven fail the economics gate; the minute diagnostic's
  first-order increments at 0 bps were GDX −$9,094, XOP −$117,211, EWZ −$94,876, TLT −$18,064, XLE −$77,279, XLU
  −$50,895, GLD $0. **No incremental allocator replay was run** ("No additive scenario exists"); its own caveat: the
  diagnostic ignores "path effects of a full allocator run".
- **Opportunity map.** S0 on training at 5 bps: 71 lots of 137 virtual trades, $242,196. The unchanged vector (= VGT
  `primary`, Study 2's View U) against S0, full replay at 5 bps: GDX +$3,992, XOP **+$48,199**, XLE −$42,190, EWZ
  −$107,571, TLT −$16,748, XLU −$31,591, GLD $0. Verbatim: "Unchanged D1 on XOP has 49 of 78 trades arriving while S0
  holds the pool and displaces 19 S0 lots worth $125,958 — the complementary-ETF study's first-order bookkeeping called
  that −$117k — but the complete chronological replay gives **Δ = +$48,199**". Decompositions: P-add-GDX +$146,293,
  P-add-XOP +$81,268, XLE-P +$67,122, explained as "partly genuine, partly path reshuffle" (XOP) and "mostly path
  reshuffle … no reason to persist" (XLE).
- **Ranked preemption.** "every procedure failed the two-fold gate"; R2 (net per occupied day) markedly more persistent
  across windows than R1 (Spearman 0.72 vs 0.41).
- **Standalone audit.** "No ETF has a stronger historical case than VGT `primary`"; "exactly one ETF at standing (i),
  EWW … not a demonstrated edge"; "GDX is one flag away".
- **Study 1.** "no demonstrated improvement; validation-based selection was worse"; in fold B 63–87 catalog episodes
  per arm had money-losing decline-phase entries, summed **across 61 separate slots**; the worst nominee lot about
  −$20,000; a $35,000 training drawdown gate did not bound fold-B drawdowns.
- **B4/B5.** Fixed `all` (5 bps): B4 $284,244.74, 76 lots, minute DD $28,659.34; B5 $486,207.77, 94 lots, $26,509.97.
  Fold windows (source VALIDATION, liquidation convention): B4 +$62,161 (A) / +$112,826 (B); B5 +$46,506 / **+$170,997**
  (the brief's "~+$171,000" is B5's own fold-B windowed net, not an increment over B4, which was ≈ +$58k). Portfolio
  `all`: C0 33.89% / 35.76% daily / minute DD — the core alone breaches 30%.

## 3. Apparent conflicts and why they are not contradictions

| Claim A | Claim B | Why they differ |
|---|---|---|
| Seven-ETF screen: little clean idle-time opportunity; XOP first-order −$117k | Opportunity map: XOP added to S0 gives **+$48,199** | **First-order vs full path.** The first-order count prices every "displaced" S0 lot as lost and ignores that, once a candidate lot holds the slot, *later* S0 and candidate signals are granted at different times. Also **daily proxy vs real minute D1**, and 0 bps vs 5 bps. Study 2 reproduces the map's +$48,198.60 and shows its own first-order figure is negative (sign flip) — `EXACT_SHARED_POOL_COUNTERFACTUALS.md`. |
| The "19 S0 lots displaced worth $125,958" | Study 2's first-order displaced set (14 lots, $133,382) | Different objects: the map's 19 are the S0 lots **absent from the full replay** (direct + cascade); the first-order set is the S0 lots the candidate's own holding intervals would block. 14 direct ($133,382) + 5 cascade (−$7,424) = 19 ($125,958). |
| GDX: first-order −$9,094 (screen) | GDX unchanged full path +$3,992 (map); B5's GDX book +$146,293 on training | Different vectors (unchanged vs a book fitted by a full-pool-replay objective), different costs and first-order vs full path. B5's training advantage is partly fit to the training pool path (the study says so). |
| XLE: optimized standalone vector, 1 of 23 trades fundable (+$21,525 first-order) | XLE-P +$67,122 full path, "mostly path reshuffle" | The full-path gain came from *which incumbent trades* got funded, not from XLE's own idle trades — higher pool profit is not complementarity. |
| Study 1: many falling-knife losses in 2022–23 | B5 fold B +$170,997 | Study 1 summed 61 **separate** slots; B5 funds one slot. Study 2 answers the risk question on B4/B5's own funded paths (`RISK_AND_FALLING_KNIFE_CONTEXT.md`). |
| B4/B5 fold figures +$62,161 / +$46,506 (Study 1, ranked-preemption) | +$62,144 / +$46,508 (diverse-pool study) | Mark convention: the liquidation-equivalent increment (exit friction on an open lot) vs the engine mark; the minute drawdowns agree. Study 2 uses the liquidation convention and reproduces the former to the cent. |
| "51% occupied" (screen) | B5's occupancy | The 51% (843 of 1,647 sessions) is All-lowDd = B4; B5 adds GDX (published `all` time in market 51.2% vs B4 45.5%). Study 2 measures both on the training era in session-minutes and at closes. |

## 4. What had been seen before Study 2's protocol

Disclosed in `PROTOCOL.md` §0: every figure in §2 above; the seven published View-U-against-B4 training rows
(GDX, XOP, XLE, EWZ, TLT, XLU, GLD — marked `designer-seen (T, B4)` in every Study 2 table); B5's GDX book's fitted
provenance; the B4/B5 fold and full-history anchors; the portfolio-aware holdout/final figures. Not seen: any View U
result for the other 54 ETFs, any View P timing/occupancy, B5's training occupancy timeline, any 61×61 matrix.

## 5. Consequences for Study 2's design

- Real minute D1 ledgers from the frozen engine, never a daily proxy (View U, View P, View I).
- First-order classification is reported only as bookkeeping; every economic claim needs a **full chronological
  replay** (Level C), with the path attribution split into the candidate's own idle-clean lots, its other lots,
  incumbent lots gained, and incumbent lots lost directly or by cascade.
- A positive full-path Δ that comes mostly from reshuffling incumbent trades is labelled `pool-path gain (reshuffle)`,
  not complementarity.
- B5 is treated as a hindsight-advantaged incumbent; every fold replay is "retrospective with an incumbent-hindsight
  comparator".
