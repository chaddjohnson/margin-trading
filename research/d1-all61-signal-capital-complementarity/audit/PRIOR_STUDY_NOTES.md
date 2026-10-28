# Stage 0 working notes — prior studies (pre-protocol; source facts only, no Study 2 outcome)

Working notes collected during the Stage 0 audit (2026-10-28 UTC). They are the raw material for
`SOURCE_AND_CONFLICTS_AUDIT.md`; every figure is quoted from the named file and must be rechecked there before
being cited in a report.

## A. research/complementary-etf-d1 (seven-ETF screen) — commit cef1534 (2026-10-24)

- Screen is a **daily proxy** (`PROTOCOL.md` §3 verbatim: "Everything is a **daily proxy**: it knows neither D1's
  minute execution nor the parameters Stage B will choose"). Code `src/complementary-etf-d1/screen.ts`.
- ETFs GDX, XOP, EWZ, TLT (high), XLE, XLU, GLD (lower). Training partition, screening window 2017-06-15 → 2023-12-29
  (1,647 sessions).
- Proxy p15: arm when session low ≥ 15% below 74-session reference high; buy at close of first session closing ≥ 2%
  above lowest close; sell at first close ≥ 10% below entry close or the 20th session; $100k, 11%, 0/5 bps.
- Baseline: All-lowDd shadow fixed $100k on `--dataset training` (key `F-all-lowDd-shadow@training`): **71 funded
  lots, net $249,174, 66 refused virtual trades**; lots VGT 11, XBI 17, XRT 5, KRE 38.
- Occupancy: pool holds a lot at the close in **843 of 1,647** eligible sessions (51%).
- Definitions: occupied = funded lot from decision minute to exit minute (refused virtual trades not occupancy);
  idle at entry = no funded lot at the proxy entry-session close; blocks = a funded lot's decision in (entry close,
  exit close]; clean = idle at entry and blocks nothing.
- p15 at 5 bps: GDX 38 proxies / 15 idle / 8 clean, clean net +$6,578 (−$758 w/o best); XOP 47/14/10, −$5,104;
  EWZ 35/15/10, −$19,257; TLT 10/4/0; XLE 27/7/5, −$12,798; XLU 9/1/1, +$1,126; GLD 1/0/0. All seven fail economics.
- Post-hoc minute-level D1 diagnostic (0 bps, first-order only): GDX −$9,094, XOP −$117,211, EWZ −$94,876,
  TLT −$18,064, XLE −$77,279, XLU −$50,895, GLD $0.
- **No incremental allocator replay was run** (`INCREMENTAL_ALLOCATOR_RESULTS.md`: "No additive scenario exists").
  Holdout/final untouched. Recommendation: keep All-lowDd unchanged.
- Caveat: diagnostic ignores "path effects of a full allocator run".

## B. research/b4-b5-robustness-audit, vgt-standalone-vs-pooled-robustness, prospective-b4-b5-shadow

- Both audits ran only continuous `all` (2016-01-04 → 2026-10-13); no training-window B4/B5 figure in their docs.
- `all`, fixed $100k, 5 bps, 11% (`BASELINE_RECONCILIATION.md`:45-60): B4 net $284,244.74, 76 lots (47/29), minute DD
  $28,659.34, daily DD $25,267.95, worst lot −$10,094.04, time in market 45.5%; B5 $486,207.77, 94 (61/33),
  $26,509.97, $23,788.61, −$8,258.43, 51.2%.
- Fold figures (outside those audits): `research/d1-diverse-pool-discovery/CHRONOLOGICAL_METHOD_COMPARISON.md`:105,109
  B4/B5 fold-a +$62,144 / +$46,508, fold-b +$112,774 / +$170,945; minute DD $17,702 / $16,557 (a), $22,327 / $17,269
  (b); lots 12/20 (a), 49/42 (b). Study 1 `CHRONOLOGICAL_FOLD_COMPARISON.md`:178-181: fold A +$62,161 / +$46,506,
  fold B +$112,826 / +$170,997 ("chosen with 2016–2026 known; they are not a test"). Differences are conventions
  (to be reconciled in Stage 2: incremental mark definition, liquidation vs engine mark).
- **The brief's "~+$171,000 B5 increment" = B5's own fold-B windowed net** (2022–2023), not B5 − B4 (that is
  ≈ +$58k). `YEAR_AND_REGIME_ANALYSIS.md`:46-47: 2022 $84,884 + 2023 $86,060.
- Execution: stops fill at the stop; gap exits at the opening trade; engine has `stopSlippageBps` (stops only) and
  `stopFill: 'stop' | 'next-open'`; pools schema forces stopFill 'stop'. Overshoot stress (B4/B5 fixed `all`): s10
  $279,065/$479,502, s25 $271,295/$469,444, s50 $239,148/$440,192, s100 $215,201/$407,740, nxo $284,959/$487,267.
- Portfolio overlay `all` (DYNAMIC_PORTFOLIO_RISK.md:36-38): max daily / minute % DD — C0 33.89/35.76, B4 34.65/37.01,
  B5 29.67/31.09, S 32.78/35.21. "The core alone breaches both lines … A 60/40 VOOG/VGT core cannot meet a 30%
  maximum-drawdown objective on this history, with or without an overlay."
- ETF ablation of B5 (`ETF_ABLATION.md`:25-46): −GDX = B4 exactly ($284,245; GDX increment +$201,963); −KRE $389,427;
  −XBI $418,508; −VGT $439,596; −XRT $471,514. "The advantage is mostly GDX's own trades"; top 5 GDX lots 71.7% of
  B5 − B4.
- Regimes (`YEAR_AND_REGIME_ANALYSIS.md`:124-133): 2018Q4 B4/B5 −$3,636/−$3,636; 2020 crash −$25,268/+$32,609; 2020
  rebound +$45,194/+$85,327; 2022 bear +$53,008/+$59,578; 2023 +$55,757/+$86,060.
- VGT primary (docs/vgt-d1-primary-discrepancy.md): `all` $178,574.30 at 0 bps after the VGT split fix; S at 5 bps
  $176,260.47; development row (2017-06-15 → 2023-12-29) $137,222.97, minute DD $19,330.69.
- **Prospective freeze** (`research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`, frozen 2026-10-26): binds
  PROTOCOL.md, config/pools/B4.json/B5.json + five phenotype hashes, 134 code files (transitive imports of src/app.ts,
  src/app/pools.ts, src/pools/cli.ts, src/pools/forward/cli.ts), data/{VOOG,VGT,XBI,XRT,KRE,GDX}/data.csv, splits,
  distributions + manifest, partitions, the `pools` npm script line, package.json "imports" map, package-lock.json.
  ⇒ Study 2 must NOT touch src/app.ts or anything it imports; its CLI is a separate `main.ts` and one new npm script
  line (as Study 1 did).
- Robustness verdict: "B4: Conditional (material fragility)… B5: Conditional (material fragility). On the evidence,
  B5 is the stronger of the two."

## C. research/portfolio-aware-d1-optimization (opportunity map, B5's GDX book) — commit 96d7535 (2026-10-25)

- Opportunity map (`OPPORTUNITY_MAP.md`; code `src/portfolio-aware-d1/opportunity.ts`): training only, 5 bps, fixed
  $100k, 2017-06-15 → 2023-12-29; S0 = All-lowDd shadow (VGT primary, XBI/XRT/KRE lowDd). **S0: 71 lots of 137
  virtual trades, 66 refused, $242,196 net (5 bps); lot held at close in 843 of 1,647 sessions (51.2%).** First idle
  gap 2017-06-15 → 2018-12-21 (554 days). Classification at the decision minute: busy (S0 holds or reserves),
  idle-clean (idle and no S0 funded decision inside the trade's holding interval), idle-displacing (idle but blocks
  ≥ 1 S0 lot); "funded" from the full chronological replay.
- **First-order warning** (OPPORTUNITY_MAP.md L74-78, verbatim): "Unchanged D1 on XOP has 49 of 78 trades arriving
  while S0 holds the pool and displaces 19 S0 lots worth $125,958 — the complementary-ETF study's first-order
  bookkeeping called that −$117k — but the complete chronological replay gives **Δ = +$48,199**".
  Earlier first-order (0 bps) vs full replay (5 bps): GDX unchanged −$9,094 vs +$3,992; XOP −$117,211 vs +$48,199;
  XLE −$77,279 vs −$42,190; XLE eight-ETF primary +$21,525 vs +$21,604.
- Decomposition (training, 5 bps; own − displaced, gained, Δ): P-add-GDX $149,556 − $52,933, +$49,670, **+$146,293**;
  P-add-XOP $62,173 − $49,545, +$68,639, +$81,268; XLE-P $10,657 − $19,377, +$75,842, +$67,122.
  "XOP: partly genuine, partly path reshuffle … shifts XRT's funding onto a large winning XRT trade"; "XLE: mostly
  path reshuffle … an optimizer given the full chronological pool can find a phenotype whose main effect is to change
  *which* existing trades get funded … no reason to persist".
- **B5's GDX book d1-51ea8d4bd6** (X 27.4%, Y 0.4%, stop 7.1%, hold 18, L 100, buffer 3.6%, P 19.1%, W 81) was
  selected by NSGA-II with the **portfolio-aware objective (−Δ@5 from the complete chronological replay of S0 + book,
  pool minute DD)** on training through 2023-12-29 (no later bar). So B5 embeds training-era pool-path fitting.
- Fixed 5 bps S0 vs P-add-GDX: training $242,196 vs $388,489 (Δ +$146,293); holdout +$24,581 (1 GDX lot); final
  +$31,089. "without them the post-training Δ is −$557. The holdout verdict 'persists' rests on one trade".
- Cache vs full engine: cached trace + causal replay (fixed mode) = full engine, 1,208 comparisons, 0 differences.
- NB: S0 training here 71 lots, $242,196 (5 bps) vs complementary-etf-d1 baseline-fixed-training 71 lots, $249,174 —
  to reconcile (likely 0 bps vs 5 bps).

## D. The 61-ETF universe and the fold representatives (A0)

- Universe: `research/d1-ranked-preemption/results/audit/universe.json` (re-audit of d1-robust's; `identical: true`);
  61 eligible, all 2016-01-04 → 2026-10-13, 2,710 sessions, 0 missing. Not in 61: GDXJ, OIH (late), XLRE (excluded).
- Thin-coverage/liquidity flag F7 (standalone audit `context.ts`:190-191: coverage < 0.75 or median $ volume < $50M):
  DBC, EDV, ILF, IYT, KIE, VOOG, VPU. Also low: IGV P10 $12M, QUAL P10 $9M, VGT coverage 0.85.
- Splits inside training: XOP 0.25 (2020-03-30), EWJ 0.25 (2016-11-07), IJR 2 (2017-01-19), KIE 3 (2017-11-30), IBB 3
  (2017-12-01), IAU 0.5 (2021-05-24), SMH 2 (2023-05-05). XLE/XLU/XLY/XLB/XLK 2025-12-05 and VGT/VOOG 2026 are after
  the cap. XLF unexplained ×0.819 on 2016-09-19 (XLRE carve-out distribution; checked harmless).
- Only VGT/VOOG have distribution ledgers; every other ETF price-only.
- Status by window (standalone/<w>/<SYM>.json): fold-a 49 survivors (22 uncertain), screened-down EEM EWZ INDA IWN KIE
  SPLV XLE XOP, rejected AGG IEF SHY TIP (no representative IEF, SHY); fold-b 54 (11), screened-down HYG IEMG SPLV,
  rejected AGG IEF SHY TIP (no rep SHY); final 53 (5), screened-down AGG DBC IEF SPLV VGK XOP, rejected SHY TIP.
- Representatives: `research/d1-ranked-preemption/standalone/{fold-a,fold-b,final}/<SYM>.json` (grid in 8 grid
  units: X‰, Y‰, stop‰, hold, L, buffer‰, P‰, W).
- Study 1 A0: `research/d1-wide-library-chronological-selection/results/libraries/{A,B}/SELECTION.json` →
  `selections.ARCH.<SYM>.a0 {status, representative, library, nominee, score}`. **No nominee: fold A 12 (AGG EEM EWZ
  IEF INDA IWN KIE SHY SPLV TIP XLE XOP); fold B 7 (AGG HYG IEF IEMG SHY SPLV TIP)** → 49 / 54 nominees. All 61
  representatives match ranked-preemption's in both folds. Final window: census only, never evaluated by Study 1.
- Cutoffs: ranked-preemption fold-a vectors through 2021-12-31, fold-b through 2023-12-29, never past 2023-12-29
  (`src/d1-ranked-preemption/data.ts` assertChronology/allowedEndOf); standalone audit candidateCutoff 2023-12-29.
- Standalone audit fold runs `results/runs/fold.jsonl`: 238 runs over 119 fold vectors (59 fold-a, 60 fold-b) —
  source anchors for View P parity.
- Event catalog (standalone audit): price-only per-ETF zigzag (10% reversal), depth bands, families (troughs within
  126 sessions of first), 13 ETFs only. Fixed regimes G1–G13 (`src/d1-ranked-preemption/context.ts`:104-117).
- Headlines: ranked-preemption "every procedure failed the two-fold gate"; standalone audit "No ETF has a stronger
  historical case than VGT `primary` … exactly one ETF at standing (i), EWW … not a demonstrated edge"; "GDX is one
  flag away from 'stronger'"; Study 1 "no demonstrated improvement; validation-based selection was worse".
- Commits: ranked-preemption 9400593 (+40da6dd), standalone audit 4da90d9 (+6489a63), Study 1 1891d32 (+3f951eb,
  a37feae test-name fix by the user).
