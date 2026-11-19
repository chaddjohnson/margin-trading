# REPORT — Risk metrics and optimization methodology (pre-optimization assignment)

Research only. Nothing was optimized, adopted, deployed or merged into `main`; New L0 stays the official baseline;
N/original is not promoted; no broker was touched; no standard, NL0 or optimizer default was changed. Every proposed rule
is **experimental and not adopted**. All of 2016-01-04 → 2026-10-30 is **previously examined history**: every finding is
retrospective. Figures come from the sealed records in `results/` (25 records, `results/seals.jsonl`); machine-readable
tables in `results/tables/` (no visuals).

## 1. Bottom line

1. **New L0's historical drawdowns are mostly loss below trade principal, not protected giveback — but no single trade
   came close to the $25k–$35k principal scenarios.** Its conventional MDD decomposes exactly: development $19,459.83 =
   **$9,124.10 giveback + $10,335.73 principal loss**; full history $20,385.99 = **$6,906.10 + $13,479.90**. Its worst
   trade fell **$11,113.57** below its $100,000 principal; its banked-capital drawdown was $13,479.90; it never fell more
   than $1,208.11 below starting capital. The 2020 and 2025 episodes were pure giveback of trades that still closed
   profitable.
2. **N/original is essentially New L0 under the new metrics.** Identical MDD decompositions, worst trade principal loss,
   banked and realized drawdowns; +$3,095.55 over the full history, explained lot by lot (a late-2022 GDX decline-gate
   sequence +$4,931; one 2025 D1·VGT entry −$2,156); slightly less 2022 principal loss and a lower local neighbourhood
   tail. The difference is inside search noise, and N/original has no independent chronological test. **No preference
   follows.**
3. **The $35k marked-DD gate acts at every discovery stage, so it shapes the populations long before any selector.** It
   removed 96% of the screens' profitable, funded proposals at C23/C24 and, from C21 on, the most profitable unconstrained
   proposals. Giveback-dominated exclusions exist (C21: $196k–$249k nets, ≥ 94% giveback, ≤ $6.1k trade principal loss),
   but **no excluded configuration in the archives out-earned the members that were kept**, and in the later cutoffs the
   excluded drawdowns were mostly clustered principal losses.
4. **A capital-and-stop-aware selector (P2) did not help on the same populations.** Frozen before its results, it was
   worse than RA1 in all three populations ("profit sacrifice without clear benefit") and better than the original rule
   only in F. Its principal gates never bound — they cannot under a binding marked-DD gate (trade principal loss ≤ DD
   exactly; banked DD ≤ DD). Its stop-aware valuation is what hurt: the open winners RA1 screened out at C19 *were*
   protected by their stops, but the configurations carrying them failed in the 2020 crash through new-lot losses.
5. **Go/no-go: no-go** for authorizing another multi-million-evaluation successor search on 2016–2026 now. The user's
   policy decisions (§4) come first; if they adopt an envelope (trade-loss and banked-capital limits with a marked-DD cap),
   a **bounded envelope pilot** (≈ 0.3–0.5 M simulations) is the proportionate next step; prospective monitoring of New
   L0 and N/original is what would add genuinely new evidence.

## 2. What was done (and verified)

- **Stage 0:** New L0 reproduced exactly (FULL $479,605.18 / $20,385.99 / 46 lots; development $382,721.46; ledger
  signature `7b17578108747911`) and N/original ($482,700.73 / $20,385.99; 2025–2026 $94,669.70 vs $96,883.72); all 51
  audited candidates match their sealed FULL figures to the cent (`BASELINE_AND_PROVENANCE.md`).
- **Stage 1:** pure, tested metrics (23 tests, including the brief's $250k → $210k and $100k → $60k cases and real-data
  regression); every replay's rebuilt ledger equals the engine's minute marks; the stop-state reconstruction re-derived
  **36,821 historical stop exits with 0 failures** (`METRIC_SPECIFICATION.md`, `IMPLEMENTATION_AND_TESTS.md`).
- **Stage 2:** an illustrative account-margin model with Vanguard's published terms cited (35% house minimum for most
  marginable securities; ≥ 50% for concentrated positions; can be raised without notice; may sell without contact) and
  FINRA's 25%; scenario grid, joint shocks and a historical overlay.
- **Stage 3:** 51 candidates on identical windows; ten regenerated selection neighbourhoods (`CANDIDATE_RISK_AUDIT.md`).
- **Stage 4:** the code trace of every stage and 512 lanes' screens regenerated from Assignment 3's archives
  (`SELECTION_PIPELINE_AUDIT.md`).
- **Stage 5:** P0/P1 re-derived exactly; P2, P2b and ablations on the same 2,520 members; fold paths chained with the
  frozen rule (`SELECTOR_COMPARISON.md`).
- **Stage 6:** NL0-R 0.1.0, an unadopted method proposal with a standard patch proposal (`PROPOSED_METHOD.md`).
- Bounded compute: ≈ 6,184 fresh simulations (cap 6,200; amendment A2), no search. Four amendments, all disclosed: A1
  (a gate's rounding convention), A2 (budget accounting), A3 (a per-trade window defect fixed and re-sealed), A4 (an
  erratum).

## 3. Answers to the brief's final questions

**How much of New L0's and N/original's conventional MDD came from giveback versus principal loss? Is an exact
decomposition possible?** Yes, exactly, on the actual marked path (one slot, one cash line, no flows: M = Σ lot P&L).
New L0: development 47% giveback / 53% principal; full history 34% / 66%; 2020 crash 100% giveback; 2022 bear 45% / 55%;
2025 100% giveback. N/original: identical except 2022 (60% / 40%).

**Their maximum trade principal losses, realized-equity drawdowns, open-profit givebacks and conditional protected
gains?** Worst trade principal loss $11,113.57 (both; liquidation basis; the engine's canonical MAE −$11,068.95);
realized-equity drawdown $11,524.88 (both); banked-capital drawdown $13,479.90; largest open-profit giveback $17,280.74
(one 2020 D1·GDX lot that still closed +$10,921). Conditional protection at the cutoffs was thin: New L0's armed trailing
stops sat 5–6% below the close and just above break-even, so a 10% gap below them would have produced small losses
(−$3.7k to −$7.1k); at the data end New L0's open D1·GDX lot (−$5,565) has **no** executable price protection (only its
13-day maximum hold), N/original's the same lot with a protective stop (−$16.3k at the level, −$24.7k under a 10% gap).

**Does N/original still appear preferable?** Not materially. The new metrics do not separate the two; the margin
scenarios do not either; its edge is a $2–5k effect of an incumbent-informed search without an independent test.

**Were strong candidates screened out primarily by profitable marked-equity giveback? Which, where, at what account
risk?** Yes, demonstrably at C21: a family of `GD0.VC0`/`GD0.VA0` configurations (training nets $230,713–$248,887) and
`GD1.VB1` (realized $195,969) whose drawdowns of $35,086–$36,634 were 94–98% giveback of open profit, with trade principal
loss ≤ $6.1k and banked drawdown ≤ $7k — rejected at plausibility/feasibility (rung-1 centres), $86–$1,634 over the
ceiling. Their account-level cost: a ≈ $33–36k collateral swing (≈ $23k of excess at a 35% rate). None out-earned the kept
members, and most later exclusions were principal-loss clusters; some ($61k–$84k drawdowns, $44–50k below principal)
show what a relaxed gate without principal limits would admit.

**Does P2 select materially different candidates on the same populations? Robust advantages?** Yes, different at most
cutoffs (C19 F, C21 L/B/F, C23 L/B, C24 L/F); no robust advantage: worse than RA1 in L, B and F; P2b identical to P2 (the
archives hold nothing else it could admit).

**Which dimensions should bind, which should be Pareto, which descriptive?** Binding: trade principal loss (L_t), banked-
capital drawdown (L_b) and a marked-DD **cap** (kept at $35k unless the user approves a margin-derived value), plus a
declared choice about open-ended exits; Pareto: net, robust net, a principal-loss tail and a marked-DD tail; descriptive:
giveback, stop-aware protected value, floor shortfall, realized clusters, open-lot exposure, margin scenarios. Rationale:
principal gates are only meaningful when they replace or relax the marked gate; marked DD still captures clustered
principal loss and collateral swings; stop credit failed as a selector here (`PROPOSED_METHOD.md` §2).

**What must change in the optimizer, not just the final ranking?** Plausibility, promotion, island feasibility and
objectives, extension, refinement acceptance, shortlist and qualification all apply the same $35k marked-DD rule today;
a new risk philosophy must be applied at every one of them (with a reserved promotion share for low-principal-loss,
high-giveback proposals), the search must compute the detailed centre (lot minima, banked path), and the fold verdicts
must be precommitted under both the conventional rule and the envelope (`SELECTION_PIPELINE_AUDIT.md` §5).

**What remains unknowable without future data, the actual account and broker terms?** Whether giveback-dominated
regions generalize; whether any selector's advantage is more than one history's two breaking regimes; how often stops
fill far beyond their levels in new regimes; the account's real collateral, debt, per-security house rates,
concentration triggers, intraday actions and the 30-day journaling of Vanguard ETF purchases; and therefore whether the
real account would have received a call in any of these paths.

**What user decisions are required before the next optimizer modification and search?** The eight decision points in
`PROPOSED_METHOD.md` §8: the marked-DD role and cap; L_t; L_b; open-ended exits; margin scenarios (and actual account
terms if wanted); whether any new selection arm joins P0 and RA1; whether to run a large search, a bounded pilot or
monitoring only; when anything may be merged.

## 4. Recommendation (go / no-go)

**No-go for a large successor search now.** Evidence for change: the gate demonstrably excluded giveback-dominated
regions at C21 and the most profitable unconstrained screen proposals from C21 on; open-ended Growth exits produced the
only principal losses near the $30k scale. Evidence against a large search: no excluded configuration beat the kept
ones; the excluded later-cutoff drawdowns were mostly principal-loss clusters; the capital-and-stop-aware selector did
worse than RA1; and more search on 2016–2026 cannot create independent evidence. **Proposed sequence:** (1) the user
decides the envelope and the open-ended-exit policy; (2) if an envelope is adopted, a bounded, pre-registered envelope
pilot on C21/C24 screens and rung 1 tests whether giveback-dominated regions develop into better feasible regions; (3) a
separately authorized prospective monitoring of New L0 and N/original (design in `PROPOSED_METHOD.md` §7) supplies new
market evidence. A full NL0-R search is justified only if (2) shows a materially better feasible region under rules fixed
before it runs.

## 5. Limitations

One previously examined history; three correlated fold slices and two breaking regimes; New L0 and N/original chosen with
later data; P2 designed after the outcomes; neighbourhoods measure parameter sensitivity, not the future; minute OHLCV
and the 5 bps cost model; a stop is not a guaranteed fill or a loss cap; the margin model is illustrative and not the
user's account; the $35,000 ceiling and every scenario threshold are research criteria, not proven-safe limits.

## 6. Repository status

| Item | State |
|---|---|
| Branch | `research/vg-l0-risk-metrics` from `67b4ae71` (Assignment 3's tip, containing `main` = `108c241b`) |
| New code (not merged into `main`) | `src/vg-l0-risk-metrics/`, `tools/vg-l0-risk-metrics/`; no existing file changed |
| Frozen work | Assignments 1–3, 5B, NL0 1.0.0, the standard 2.2.0 and every earlier study untouched; their seals verify (A3 47/47, A2 47/47, 5B 28/28) |
| Tests | this study 23/23; repository `tsc` clean; full `npm test` 1,677 tests: 1,666 pass, 4 skipped, only the 7 known pre-existing failures |
| Data | no data acquired or purchased; no broker access; nothing scheduled |
