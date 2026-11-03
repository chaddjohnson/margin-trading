# Final comparison and recommendation (Study 2 of 3)

**Verdict (frozen rubric, PROTOCOL v2.1 §9.3; `results/analysis/ANALYSIS-2.json`): no demonstrated economically useful
complementarity.** 0 of 18 predeclared fold replays met the complementarity test C (16 met the risk test R). The three
material full-path gains all come from one timing-only control (XOP) changing which trades the slot funds — two are
formal `pool-path gain (reshuffle)` and the third fails the complement and the thin tests — not complementary use of
idle capital. **Evidence level:** retrospective, period-correct replays on inspected
history with hindsight-advantaged incumbents; no holdout, no forward observation. Nothing is promoted, registered or
changed; B4 and B5 stay exactly as configured. ° = designer-seen (T, B4); ᵗ = F7 thin.

## Answers to the eight questions

**1. Which ETFs have asynchronous D1 entry episodes — relative to each other and to B4/B5's occupied time? Which look
independent by return correlation but collide at entry?** Very few, relative to each other: two thirds of the uniform
rule's 816 training-era decisions fall in 21 market-wide families (COVID crash, Q4 2018, the 2022 bear market); the 19
solo families belong to XOP° (12), XBI (3), EWZ° (2), XME and GDX° (1 each), netting +$4,718 in all (XOP +$21,084, the
others negative). EDV (long Treasuries) is the only clearly separate timing source against equities (±5-session match
shares 0.04–0.13), and its signals cluster in the 2022 rate sell-off and lose (idle-clean −$1,026, standalone +$3,541 on
23 trades). Relative to the pools' occupancy, IGV, IBB, EWZ° and SMH (and GDX°'s uniform-rule vector, though GDX is
already a B5 symbol) have ≥ 50% of their decisions arriving while B5 is idle; for IGV, IBB and SMH "idle at entry" is
mostly idle-displacing (clean / displacing 3/11, 1/6, 1/12 against B5 — they block a later incumbent trade), while EWZ°
(13/8, idle-clean −$15,575) and GDX°'s vector (11/9) have more clean ones. **88 ordered pairs with return correlation
≤ 0.3 collide at entry** (±5-session match share ≥ 0.5), e.g. EEM→GDX, EWY→GDX, INDA→GDX, DBC→SMH, EDV→XBI; correlation
and entry overlap are only loosely related (Spearman 0.445 with the alphabetically first ETF's share; 0.46–0.59 for
other orientations, `results/tables/pair-statistics.md`).
(`PAIRWISE_SIGNAL_TIMING_AND_OVERLAP.md`, `INDEPENDENT_EVENT_FAMILIES_AND_REGIMES.md`)

**2. Price paths (View U) versus parameter fitting (View P)?** In the 2020–21 rebound the fitted phenotypes' pairwise
coincidence is unrelated to the uniform rule's (Spearman −0.01 over 272 pairs) — but the uniform rule is sparse there
(97 decisions, 9 ETFs with ≥ 4), so this says only that the fitted vectors' coincidences are not the uniform rule's. In the 2022–23 decline it is substantially price-driven (0.40 over 930 pairs; 82% of
P-B decisions in market-wide families). In both views the idle-clean economics are negative (P-A −$18.7k, P-B −$32.7k
against B5), so the absence of complementarity is not an artefact of applying VGT's vector to other ETFs, and fitting
per-ETF vectors did not uncover hidden idle-time opportunity (H3 not supported). (`PAIRWISE…` §6,
`BASELINE_OCCUPANCY…` §3)

**3. Do the asynchronous windows hold enough profitable, financeable opportunity after interest and costs, across
separate regimes?** No. Against B5 over the training era the 56 non-member ETFs' idle-clean trades number 59 and lose
−$52,477 in total (against B4: 73, −$65,058); only ILFᵗ has a positive idle-clean total (+$13,020, one event). The same
ETFs' trades that arrive **while the pool is busy** sum to +$1.33M across 56 separate (non-member) slots: the lucrative deep-dip
signals coincide with the shocks the incumbents already hold. Idle-clean decisions sit mostly in quiet regimes (2018,
2019, 2021), where few of them pay (8 profitable off-shock ones against B5). No ETF has a positive idle-clean total with
winning idle-clean trades in two independent events. (`BASELINE_OCCUPANCY…` §2)

**4. What changes when the whole pool is replayed? The GDX/XOP/XLE contradictions.** Everything the first-order
bookkeeping hides: (a) every candidate the ex-ante screen preferred **lost** in its evaluation window (S1: GDX° −$10.5k
and −$47.7k against B4 under View U; GDX° −$16.2k, IGV −$18.6k, FXI −$20.8k, SMH −$36.8k under View P), mostly through
incumbent lots lost **directly** (−$138.3k over the six S1 replays, against −$24.6k lost by cascade; cascade dominates
only for IGV); (b) the material gains came from a **negative control**: XOP° (ex-ante uneconomic, many
idle-clean decisions) added +$22.9k / +$38.6k (fold A, B4 / B5) and +$44.9k (fold B, B4) with its own idle-clean lots
contributing −$348 to +$1,503 — the rest is XOP lots that were busy against the unchanged baseline yet funded on the
shifted path, plus its idle-displacing lots (fold B: +$29.8k and +$30.7k), net of displaced incumbents; (c) first-order and full path disagree in sign in 2 of 18 fold replays and differ widely in size in most others.
Reconciliation: the seven-ETF screen's XOP −$117k (first-order, 0 bps) and the opportunity map's +$48,199 (full path)
are both right about different objects — Study 2 reproduces +$48,198.60 and a first-order −$118,582, and shows the gain
is a reshuffle that is negative against B5 (−$19,932 over the training era) and carries an $88,442 minute drawdown. GDX:
the unchanged vector's +$3,992 (training) became −$10.5k / −$47.7k in the fold windows (period-correct selection,
not an independent out-of-sample test — both windows lie inside the training era); B5's own fitted GDX book (B4 → B5) was
−$15.7k in fold A and +$58.2k in fold B (+$146.3k in-sample). XLE never passed all of a screen's gates: under View U it had
one idle-clean decision before either cutoff; its fold-b A0 had none before 2022 (2 idle-displacing ones against B5,
idle net +$7,673) — its signals coincide with the pools' holdings. (`EXACT_SHARED_POOL_COUNTERFACTUALS.md` §3–4,
`SOURCE_AND_CONFLICTS_AUDIT.md`)

**5. Does any research-only addition consistently improve the pooled path without crossing the risk references?** No.
None met C; the XOP control's gains are reshuffles that fail the complement test, depend on the baseline (negative
against B5 in-sample) and on cost (fold B +$45k at 5 bps, +$26k at 10 bps), and rest on the 2020 recovery (G8) and the
2022 decline (G10). XME's fold-a A0 (+$3.8k against B4, entirely from its own idle-clean lots; +$4.4k against B5,
of which +$3.8k idle-clean) is one episode below the $5,000 floor. R failed for B5 + EWZ° and B4 + FXI (fold B minute drawdowns $38k–$40k). Nothing is promoted.

**6. Are the many historical falling-knife labels a threat to the funded pool?** On the funded paths they are largely
contained: in 2022–23 B4 had **1** falling-knife episode (−$3,284) and B5 **0**, worst closed lot −$5,200 for both,
worst MAE −$9,822 / −$7,879, minute drawdown $22,327 / $17,269 (below $35,000), window net +$112,826 / +$170,997 —
against 87 episodes, 11 slots above $35,000 and a −$19,998 worst lot summed over Study 1's 54 separate slots (reproduced
exactly). Containment comes from the one-slot constraint (68–71% of the other ETFs' decisions arrive while B5 holds the slot; in fold B B5 itself refused
34 of its books' 76 decisions, B4 15 of 64) and the maximum-hold
and buffered-loss exits; the profit-conditional stop does not protect a loser (MAE ≈ 2× realized loss), the largest
pooled drawdowns are COVID 2020 ($28,659 B4, $26,510 B5), the 60/40 core alone breaches 30% (33.9%), and live slippage
and margin changes are unmodelled. Adding a book lets through exactly the decline-phase signals the slot normally
refuses (e.g. B5 + EWZ° fold B: 3 falling knives, $38,471 minute drawdown). (`RISK_AND_FALLING_KNIFE_CONTEXT.md`)

**7. True lack of distinct dips, or a busy slot? Where did the pool sit idle in prolonged advances?** Both, in different
regimes. The slot is held about half the training era (51–52% of session-minutes; 55–68% in the fold windows). About a
fifth of the idle training time has **no** ETF armed or holding at all — no deep dip anywhere. The rest has signals,
but they are the weak ones (minute-precise: non-member decisions not busy against the pool,
`results/tables/idle-stretch-decisions.md`): the longest idle stretch, **2017-06-15 → 2018-12-21 (384 sessions)**, held
39 such View U decisions netting −$54,011 against B5 (B4: 41, −$53,260); mid-2019 (59 sessions) 14, −$23,213; the two
2021 H2 stretches 16, −$2,907 (B4: 20, −$11,076). The one positive idle stretch is B5's late-2022 rebound gap
(2022-12-15 → 2023-01-03: 8 decisions, +$25,212). B5 ended the training era idle (2023-12-15 → 29) with no ETF
signalling. B5 funded 1 lot in 2018, 1 in 2019 and 6 in 2021; VGT
`primary` made no decision in 2017 or 2023. The idle capital belongs to calm uptrends, where a deep-dip mechanism by
design has nothing to buy. (`BASELINE_OCCUPANCY…` §1)

**8. Does this justify moving to Study 3 rather than more joint D1 optimizer iterations?** Yes. Adding ETFs to a
deep-dip D1 pool does not create distinct, fundable opportunity: the signals are synchronized in shocks, the idle-time
remainder is unprofitable, and full-path gains that do appear are path reshuffles. Findings that frame Study 3's
hypotheses — **without implementing it**: (i) the slot's idle capital sits in prolonged calm advances (2017–18, 2019,
2021, late 2023) when no deep-dip signal exists on any of 61 ETFs, which is the gap a separate momentum entry would
address; (ii) any new entry family must be judged by full chronological pool replay against the unchanged incumbents,
never by standalone or first-order arithmetic, and its attribution split into own idle-clean versus reshuffled lots;
(iii) the risk of an added book is the decline-phase entries the shared slot otherwise refuses, so a momentum entry's
drawdown has to be measured on the funded path; (iv) View P's fitted vectors did not beat the uniform rule's timing,
a caution against expecting per-asset fitting to find idle-time edges.

## Recommendation

- **Deployed strategy: no change.** B4 and B5 stay as configured; the prospective B4-vs-B5 comparison continues under
  its frozen protocol. No candidate is registered or recommended; no research-only addition is advanced.
- **Research agenda:** stop broad joint D1 optimization over more ETFs for complementarity (Studies 1 and 2 both
  negative); proceed to **Study 3** (independent momentum entries), designed around the idle calm-advance periods and
  evaluated by full-path shared-slot replay. Study 2 does not authorize or start Study 3.
- **Per ETF / cluster** (labels, `results/tables/labels.md`): under View U against B5 — `exploratory marginal
  complement (Level D only, thin)`: ILFᵗ only; `economically interesting but mostly competing (reshuffle)`: XOP°;
  `asynchronously timed but uneconomic`: EWZ°, XHB; `insufficient (single idle-clean event)`: EWW, IGV, XME;
  `coincident only`: INDA, KBE, KIEᵗ, VGK; `economically interesting but mostly competing`: 29 ETFs (e.g. SMH, XLE°,
  XLF, XLK, IWM, EEM, TLT°); `not evaluable / insufficient`: 21 (members, and ETFs that the 21.6% rule rarely or never
  arms: bonds, gold, broad low-volatility funds). Against B4 the picture is the same (GDX°, a B4 candidate, is `asynchronously timed
  but uneconomic`; FXI moves to `insufficient`). By cluster: rates-credit and real-assets (gold) rarely arm; sector-industry
  and non-US ETFs signal, but in the same shocks as the incumbents.

Study 1 completed; Study 2 completed; Study 3 not started.
