# Family F — Intraday execution feasibility (diagnostic study)

Experiment `intraday_feasibility`, run 2026-10-12 on the frozen Phase 2 infrastructure (`common/`
framework/runner/analysis/registry and the frozen `baseline/engine.py`; nothing shared was modified).
Diagnostic-first per the family brief: daily-OHLC classification of every intraday touch of a required
level, single-episode counterfactuals for the known missed entries, one clearly-labeled
EXECUTION-MODEL-CHANGE variant with a 0.1%-penetration sensitivity, and a minute-data availability
assessment. **No multiyear intraday (minute-bar) backtest was run; §8 justifies why it would not
materially change the conclusions.**

## Summary

**Intraday execution is, on net, a mirage — with one narrow, real exception.** Of the nine
config-episodes named as known misses (VGT 2020-03/04 ×{5%, 8%}, VGT 2023-01 ×{3%, 5%, 8%},
VGT 2026-03 ×8%, QQQ 2003 ×{3%, 5%, 8%}), **seven never traded at their required level at all — the
intraday low missed the frozen level by 0.56%–5.5%**. No execution model recovers a price that never
printed. The two that did print (VGT 2020 5%, QQQ 2003 5%) filled a resting limit, but the resulting
trades earned **+$1,029 and −$286** — neither trade itself captures a rebound. The VGT 2020 5% fill
still matters enormously through a second-order path: its hair-thin profitable stop-out at the exact
2020-03-23 bottom **clears the restriction**, and the follow-on normal entry earns +$48.5k
(window delta +$49.6k vs the anchor) — a genuine rescue balanced on a knife edge (§5.1).

The aggregate test is damning: a full-sequence resting-limit variant **lowers net profit on 10 of the
12 dataset × threshold pairs** (worst: QQQ 1999–2015 −5%, −$99.0k vs anchor), because limit fills
destroy the close-confirmation property of cascade re-entries — the engine's close-based entries fill
several percent *through* the level on momentum days, while a resting limit always pays exactly the
level (or buys every bear-rally touch that then fails). The same-close approximation has been
*subsidizing* the strategy, not taxing it. The two improving pairs (VGT 2005–2015 −8% +$47.4k,
VGT 2016–2026 −5% +$36.2k) are driven by three or four gap/limit fills at V-bottoms (2009-03-09,
2006-07-18, 2025-04-21) — the same regime-dependent knife edge as the threshold choice itself.

Reliable free minute history for QQQ 1999–2026 / VGT 2005–2026 **does not exist** (§7); the cheapest
credible source is ≈$100/yr (FirstRateData, QQQ from 2000-01-03 only). 105 of the 114 daily-bar
occurrences are already unambiguous without minute data; what minute bars could still sharpen is
bounded at a few thousand dollars per dataset (§8).

---

## 1. Hypotheses as registered (`registry.jsonl`)

- `REF_lower3`, `lower5`, `lower8` — anchors only (framework defaults / `fixed_discount(0.05)` /
  `fixed_discount(0.08)`; trigger = net loss, reset = frozen-high 95%). Registered to provide the
  states/events the diagnostic reads.
- `F_limit_{REF_lower3,lower5,lower8}` and `F_limit_s999_*` — the execution-model variants (§3),
  registered before first run with the hypothesis: *"the historically missed V-bottom entries were
  execution artifacts of the same-close approximation: a resting limit would have filled intraday at
  the required level and captured the rebound."* **This hypothesis is substantially rejected** (§5, §6).

## 2. Anchor runs

`runner.run_family('intraday_feasibility', …)` on all four datasets; the calibration gate passed
(A_baseline and REF_lower3 equal the frozen research results trade for trade), and all three anchors
reproduce `lower-price-reentry` B/C/D exactly — net / max DD:

| Config | VGT 2005–2015 | QQQ 1999–2015 | VGT 2016–2026 | QQQ 2016–2026 |
|---|---:|---:|---:|---:|
| REF_lower3 | 26,384 / 54,279 | 40,258 / 91,469 | 182,094 / 28,687 | 132,242 / 23,564 |
| lower5 | 16,088 / 53,321 | 87,845 / 57,795 | 55,944 / 24,347 | 137,609 / 23,564 |
| lower8 | 6,557 / 49,103 | 22,008 / 49,587 | 22,062 / 24,347 | 151,945 / 23,564 |

Full metrics, matched controls, matching, recovery and near-miss diagnostics: `results/summary.json`
and the per-config CSVs under `results/`. No indicator is used by any config (`indicator_fallbacks` = 0
everywhere).

## 3. Exact mechanism definitions

### 3.1 Daily-OHLC occurrence diagnostic (`diagnostic.py`)

From the anchors' `results/states/` logs plus raw OHLC: **every restricted, flat session where
session low ≤ required level < close**. The restriction exists only while flat, so every
`RESTRICTED` session is flat; the arming exit session (position held part of the day, level created
intra-session) is enumerated separately and classed (d). Classes, with precedence
arming-(d) > reset-conflict-(d) > (c) > (a) > (b):

- **(a) legitimately executable resting limit** — level frozen before the session (armed at an earlier
  close, no reset through the prior close) AND `level ≤ 0.90 × max(high[i−90…i−1])` (the engine's
  prev-90-session rolling high, known at the open). **The engine's actual 10% signal is CLOSE-based and
  is NOT knowable intraday**; class (a) therefore demands the dip condition hold *at the limit price
  itself*, which is decidable before the open — a *stricter* condition at the fill price.
- **(b) executable only under a close-dependent condition** — level > 0.90 × prev-90 high, so a fill at
  the level could not know the close-based signal would hold.
- **(c) gap-through** — open < level: a resting limit fills at the OPEN, not the level.
- **(d) ambiguous intraday ordering** — the close also satisfies the reset (fill vs reset-priority
  ordering unknowable from daily bars), or the occurrence is on the arming exit session itself.

`marginal_touch` flags `low > level × 0.999` (a bare touch; fill not assured by 0.1% penetration).

### 3.2 EXECUTION-MODEL CHANGE variant (`variant_sim.py`) — not a signal change

While restricted and flat, with the restriction and level frozen **as of the prior close**, a resting
limit sits at the frozen level L during session i, **only when L ≤ 0.90 × prev-90 high** (the class-(a)
gate). Fills: at the open when open < L (gap-through); else at L when low ≤ L × sens (sens = 1.0 base,
0.999 sensitivity). No order rests on the arming exit session. **No fills at session lows; no
same-session close information places any order.** A fill opens the $100k position intraday
(stop = 0.92 × fill; the entry session's own high is excluded from the trailing reference — the
engine's convention for close entries, and the conservative resolution of an ordering ambiguity daily
bars cannot decide). A fill clears the restriction; the close-based entry path, reset, exits, interest
and all other rules are the frozen engine's, unchanged.

Because the frozen engine structurally cannot express intraday fills (entries occur only at the close
of signal sessions, at the close price), the variant is the "careful post-hoc trade simulation from
the daily bars" the brief allows, implemented standalone in this directory. **Verification: with the
limit model off it reproduces all 12 anchor runs trade for trade** (dates, prices, interest, profit to
1e-6; `variant_sim.py --verify` prints `12/12`).

### 3.3 Episode counterfactuals (`episode_sim.py`)

For each named missed episode, holding the **anchor's** frozen episode exactly as it occurred:
(i) would the §3.2 limit have filled, when, at what price (`results/diagnostic/known_episodes.csv`);
(ii) the filled trade simulated forward in isolation under the engine's exact exit rules; and
(iii) a **mid-stream chain replay**: `variant_sim.simulate` seeded with the anchor's episode state at
the arming exit, run to the window horizon with and without the limit model. The limit-off replay is
asserted to equal the anchor's own trades over the window, so the limit-on chain differs **only**
through the execution model — no earlier-path divergence (the full-sequence runs of §6 do diverge
earlier, which is why both views are reported).

## 4. Diagnostic results — occurrence counts

114 occurrences across 4 datasets × 3 thresholds (`results/diagnostic/occurrences.csv`, summary in
`results/diagnostic/summary.csv`):

| Dataset | Config | (a) executable | (b) close-dep. | (c) gap-through | (d) ambiguous | total | marginal |
|---|---|---:|---:|---:|---:|---:|---:|
| QQQ 1999–2015 | REF_lower3 | 9 | 0 | 8 | 4 | 21 | 4 |
| | lower5 | 15 | 0 | 2 | 0 | 17 | 0 |
| | lower8 | 12 | 0 | 4 | 2 | 18 | 1 |
| QQQ 2016–2026 | REF_lower3 | 1 | 0 | 0 | 1 | 2 | 0 |
| | lower5 | 5 | 0 | 1 | 0 | 6 | 1 |
| | lower8 | 2 | 0 | 0 | 0 | 2 | 0 |
| VGT 2005–2015 | REF_lower3 | 6 | 0 | 2 | 1 | 9 | 1 |
| | lower5 | 4 | 0 | 1 | 1 | 6 | 0 |
| | lower8 | 7 | 0 | 1 | 0 | 8 | 0 |
| VGT 2016–2026 | REF_lower3 | 5 | 0 | 3 | 2 | 10 | 0 |
| | lower5 | 6 | 0 | 3 | 0 | 9 | 1 |
| | lower8 | 4 | 0 | 2 | 0 | 6 | 1 |
| **Totals** | | **76** | **0** | **27** | **11** | **114** | **9** |

Negative findings worth stating plainly:

- **Class (b) is empty.** Every intraday touch of a frozen level happened while the level itself was
  ≥10% below the prev-90-session high — the close-based signal's intraday unknowability never actually
  binds for these thresholds (frozen levels sit ≈3–8% below a loss exit that already occurred well off
  the highs). The legitimacy gate never blocked a single resting order in the variant runs either
  (`limit_blocked_by_dip_gate` = 0 in all 24 runs).
- **All 11 class-(d) cases are arming-exit-session touches; zero reset conflicts** (no session anywhere
  has low ≤ level AND close ≥ reset level), so the engine's reset-priority rule never collides with an
  intraday fill historically.
- **The auxiliary category "close ≤ level but the 10% signal had lapsed" is empty** on all 12 runs:
  the engine never failed to re-enter for lack of a close signal while the close was below the level.

## 5. The known missed episodes (`results/diagnostic/known_episodes.csv`, `known_episodes_chain.csv`)

Episode-by-episode verdict under the §3.2 model (fills never at session lows; s999 = survives the
low ≤ level × 0.999 sensitivity):

| Episode | Level | Episode min low (date) | Low vs level | Fill? | Resulting trade |
|---|---:|---:|---:|---|---|
| VGT 2020 −5% (close-miss 1.0%) | 22.0067 | 21.9364 (03-18) | −0.32% | **limit 2020-03-18 @ 22.0067** (a; s999 ✓) | exit 03-23 stop @ 22.2662, **+$1,029**; see §5.1 |
| VGT 2020 −8% (close-miss 4.1%) | 21.3117 | 21.5088 (03-23) | **+0.92%** | **NO FILL** — never printed | — |
| VGT 2023-01 −3% (close-miss 1.6%) | 36.9151 | 37.1224 (2022-11-04) | **+0.56%** | **NO FILL** | — |
| VGT 2023-01 −5% (close-miss 1.6%) | 37.5434 | 38.0039 (2023-01-06) | **+1.23%** | **NO FILL** | — |
| VGT 2023-01 −8% | 35.1844 | 37.1224 | **+5.51%** | **NO FILL** | — |
| VGT 2026-03 −8% (close-miss 1.5%) | 82.3245 | 83.0903 (03-30) | **+0.93%** | **NO FILL** | — |
| QQQ 2003 −3% (armed 2002-10-08) | 16.6743 | 16.8207 (2002-10-09) | **+0.88%** | **NO FILL** | — |
| QQQ 2003 −5% (engine re-entered 02-07) | 20.2809 | 20.1942 (2003-02-04) | −0.43% | **limit 2003-02-04 @ 20.2809** (a; s999 ✓) | max-hold 03-07, **−$286** (anchor's own close entry lost −$1,187) |
| QQQ 2003 −8% | 19.6404 | 19.7664 (2003-02-13) | **+0.64%** | **NO FILL** | — |

**Seven of nine named config-episodes are not execution misses at all** — the market never traded at
the required price. The lower-price-reentry report's §10 note ("three of the four decisive misses had
intraday lows through the trigger level") does not hold for this episode list; only VGT 2020 −5%
pierced its level intraday.

### 5.1 VGT 2020 −5%: the one real rescue, and how thin it is

Chain replay from the anchor's 2020-03-16 episode (limit-off replay = anchor, asserted):

- **Limit model:** fill 2020-03-18 @ 22.0067 → the 03-19/20 rally arms the 8% stop just above
  break-even → stopped out 2020-03-23 @ 22.2662 for **+$1,029** — *at the exact bottom session*. The
  profit is what matters: a profitable exit **clears the restriction** (and the correction), so the
  2020-03-24 close (24.5422, 10% signal live) takes a **normal** entry → trailing-stop exit 2020-09-04
  @ 37.6673, **+$48,537**. Window (to 2020-12-31) net +$63,008 vs the anchor's +$13,442:
  **delta +$49,566.**
- The margin: the stop-out beat break-even by ~1.2% of price. Had 03-23 printed ~1% lower before the
  stop ratchet, the exit would have been a *loss*, re-arming a fresh restriction 5% below ≈22.27 —
  and the rebound would have been missed again. The rescue is real but is not a robustness property.
- **Full-sequence caveat (§6):** in the complete variant run the rescue *does not happen* — an earlier
  episode's gap-fill (2020-03-12 @ 24.3705, −$1,862 max-hold on 04-02) consumes the restriction first
  and re-arms through the rebound. The rescue exists only on the path where no earlier limit fill
  intervened.
- Context: for −3% (which never missed 2020), the limit merely moves the entry 2 sessions earlier at a
  *higher* price (22.4700 vs 22.4319); window delta **−$243**. For −5% on VGT 2026 (also not missed),
  the limit fills 1 session earlier at 85.0090 vs the anchor's better 83.5875 close entry: **−$2,409.**

### 5.2 QQQ 2003 −5%

Fill 2003-02-04 @ 20.2809 (3 sessions before the anchor's own close entry @ 20.1863, 0.5% higher);
max-hold loss −$286 vs the anchor's −$1,187 — delta +$901, noise. Both paths re-arm and take no
further 2003 trade; **the baseline's +$18.3k QQQ-2003 window remains unrecovered under either
execution model.** The 2003 basing failure is a *signal* problem (prices based 40% below the frozen
reference highs, never 3–8% below the loss exits), not an execution problem.

### 5.3 Related known failures surfaced by the full runs (not in the assigned list)

- **VGT 2005–2015 −8%:** the limit variant fills **2009-03-09 @ 3.18 (+$33,800)** — the −8% config's
  missed March-2009 VGT entry WAS printable intraday — and 2006-07-18 @ 4.66 (+$19,490), the 2006-08
  missed rebound. This is most of that pair's +$47.4k improvement.
- **QQQ 1999–2015 −8% (March 2009, the +$57.8k baseline trade):** still missed. The variant's own
  Nov-2008 limit fill (26.04, −$7,671) re-arms at 22.225, which never prints (Nov-2008 bottom close
  22.33); restricted until the 2009-12-24 reset, exactly like the anchor. **No execution model
  recovers QQQ 2009 for −8%.**
- **VGT 2025-04 −5%:** in the full variant a gap-through fill 2025-04-21 @ 61.88 rides to
  **+$42,584** — but only because an earlier gap fill (2025-03-31, −$1,969) had restructured the
  episode; path-dependent, not a per-episode property of the anchor's history.

## 6. Full-sequence variant results (EXECUTION-MODEL CHANGE, `results/variant/summary.csv`)

Net vs anchor (base model; s999 differences noted below):

| Dataset | −3% | −5% | −8% |
|---|---:|---:|---:|
| VGT 2005–2015 | −31,767 | −37,041 | **+47,418** |
| QQQ 1999–2015 | −64,860 | **−98,993** | −2,494 |
| VGT 2016–2026 | −36,711 | **+36,204** | −11,745 |
| QQQ 2016–2026 | −30,204 | −26,488 | −1,605 |

Max drawdown moves the same way (e.g. QQQ 1999–2015 −5%: +$40.1k worse; VGT 2005–2015 −8%: −$13.0k
better). Mechanism, by entry path (QQQ 1999–2015 −5%): limit fills 21 trades, **−$58,994**; gap fills
7, +$14,657; the anchor's close-confirmed re-entries over the same cascades were strongly profitable.
Three distinct costs:

1. **Paying the level instead of the punched-through close.** 3–19 fills per run occur on sessions
   where the engine would have entered at the close anyway (`fills_engine_would_enter`) — at a close
   below L. The anchor's cascade re-entries averaged several percent through the level; the limit
   always pays L.
2. **Buying every bear-rally touch.** Touches whose closes bounced back above L (the diagnostic's 114)
   are exactly the entries the close rule filtered out; in 2000–02 and 2022 most of them max-hold out
   at losses and re-arm restrictions at unfortunate frozen levels.
3. **Path contamination.** A fill in one episode reshapes every later episode (§5.1, §5.3).

Sensitivity (`low ≤ level × 0.999`): identical on 9 of 12 pairs; QQQ 1999–2015 −3% +$670 and −5% +$65;
QQQ 2016–2026 −3% **−$9,085** (one marginal-touch fill on a variant-path episode fails the penetration
test). Direction of conclusions unchanged everywhere.

## 7. Minute-data availability (honest assessment; nothing downloaded)

**Local holdings (verified):** `margin-trading/data/` holds only daily pipe-delimited OHLCV per symbol
(QQQ 1999–2015 / 2016–2026, VGT 2004–2015 / 2016–2026, QLD, SOXX, VOOG). The trading repo's
`/Users/chad/development/personal/trading/data/` holds daily per-symbol CSVs (NVDA/AMD/DELL/BTCUSDT)
and `d_us_txt.zip` (539 MB) — the **Stooq DAILY US archive** (internal paths `data/daily/us/...`;
confirmed by listing, not extraction). **No minute data exists in either repo.**

**Market reality (web-checked 2026-10-12; sources at the end):**

- **No free source covers the required spans.** QQQ needs 1999-03→2026 and VGT 2005→2026.
  - [FirstRateData](https://firstratedata.com/i/etf/QQQ): QQQ 1-min from **2000-01-03** (misses
    1999, i.e. part of the dot-com run-up window), ≈$99.95/yr bundle; the
    [free tier](https://firstratedata.com/free-intraday-data) is ~1 recent year only.
  - [Polygon.io free tier](https://www.quantt.co.uk/resources/polygon-api-tutorial): ~2 years of
    minute history; 20+ years needs the paid Advanced tier (historically sourced from the same vendors).
  - [Alpaca](https://forum.alpaca.markets/t/alpaca-data-api-does-not-have-data-earlier-than-2016/2332):
    IEX-feed bars from ~2015/2016 only (and IEX-only, not consolidated tape).
  - [Databento](https://databento.com/equities): tick/minute from **2018** (Nasdaq TotalView), paid.
  - Stooq's free intraday archives extend only a few years back and are not survivorship/consistency
    audited for this purpose.
- **VGT-specific caveat:** even paid minute bars for 2005–2010 VGT describe a thinly traded ETF
  (daily volumes in the file are routinely < 100k shares early on); exact-level resting-limit fills in
  that liquidity regime are optimistic regardless of bar resolution.
- **Cost to do it properly:** ≈$100–300 one-time/annual (FirstRateData or equivalent) for QQQ
  2000–2026 + VGT 2005–2026 minute bars, plus a validation pass against the daily files (splits,
  dividends-unadjusted consistency — the research files are adjusted, so the two must be reconciled
  before any level comparison; this reconciliation is itself a meaningful error source).

**What minute bars could resolve:** (i) whether the 9 marginal touches penetrated enough to fill;
(ii) the 11 arming-session (d) cases — did the low print after the exit?; (iii) tighter fill-vs-open
sequencing for the 27 gap-throughs (cosmetic; the open fill is already known). **What they cannot
resolve (per the shared spec):** within-minute ordering — a minute bar whose low equals the level
still does not establish queue position or trade-through, so touch-fills remain assumptions at any bar
resolution; and they cannot change the seven episodes where the level never printed at all.

## 8. Is a full intraday backtest warranted? No.

1. The decisive misses are **price** misses, not execution misses: 7 of 9 named config-episodes never
   printed the level intraday (margins +0.56% to +5.5% at the session LOW). Minute data cannot create
   prints that do not exist in the daily low/high envelope.
2. Where prints exist, daily bars already bound the answer tightly: 105 of 114 occurrences penetrate
   > 0.1% below the level with the level frozen pre-open and no reset conflict — a resting-limit fill
   there is not in serious doubt. The residual (9 marginal touches + 11 arming-day cases) moves
   results by ≤ $9.1k on one dataset pair and ≤ $0.7k elsewhere (s999 runs) — an order of magnitude
   smaller than the −$99k/+$47k swings the execution model itself produces.
3. The aggregate sign of the lever is **negative** under the cleanest legitimate order model; buying
   more fidelity on fill mechanics cannot flip a mechanism whose dominant cost (paying the level
   instead of the punched-through close; buying filtered-out touches) is visible at daily resolution.

## 9. Failure cases, named

- QQQ 2000–02 cascades under `F_limit_lower5`: 21 limit fills net −$58,994 (vs the anchor's profitable
  close-confirmed re-entries over the same episodes) — the single largest effect in the study.
- VGT 2026-03 −5%: limit fills 2026-03-27 @ 85.0090; the anchor's 2026-03-30 close entry @ 83.5875 was
  1.7% better (−$2,409 on the trade).
- VGT 2020 −3%: fill two sessions earlier than the anchor at a higher price, same stop-out — −$243.
- Full-sequence VGT 2020 −5%: the §5.1 rescue is destroyed by an earlier episode's own gap fill.
- QQQ 2016–2026 −3% s999: one marginal touch = −$9,085 — fill-assumption risk in miniature.

## 10. Dependence on few trades

Every aggregate number above is a handful of episodes: the VGT-old −8% improvement is two fills
(2009-03-09 +$33.8k, 2006-07-18 +$19.5k); the VGT-new −5% improvement is one gap fill
(2025-04-21 +$42.6k) plus 2026; the QQQ-old damage is spread over ~20 cascade fills but
sign-determined by the regime. Single-fill knife edges (±1% of price) flip window outcomes of
$40–60k, exactly as in the lower-price-reentry study.

## 11. Classification

- **Resting-limit execution as a general mechanism (F_limit_*): Unpromising.** Historical observation:
  degrades 10/12 pairs, catastrophically in cascades. Inference: the close filter is load-bearing;
  intraday fills remove it.
- **Intraday execution as a rescue for the named missed episodes: Unpromising**, as historical
  observation: 7/9 unprintable; the 2 printable fills earn ≈$0 directly.
- **The VGT 2020 −5% second-order rescue (profitable micro-stop-out clears the restriction):
  Inconclusive.** Real (+$49.6k in the clean replay), fragile (±1% price), and destroyed by the model's
  own earlier fills in the full sequence.
- **Gap-through-only execution (fills only when the open gaps below the frozen level): Inconclusive —
  flagged, not run.** The 27 (c)-occurrences and the variants' gap-fill decomposition (+$14.7k QQQ-old
  −5%; +$39.2k VGT-new −5%; −$9.6k QQQ-old −3%) suggest open-gap fills lack the systematic
  pay-the-level cost, but the subset is small and was not evaluated as a registered standalone config
  (grid discipline).

## 12. Flags for the validation stage

1. Gap-through-only execution (§11) as a registered config, if any execution-model work continues at all.
2. The restriction-clearing side effect of micro-profitable exits (§5.1) interacts with Family A's
   trigger question (a +$1,029 exit clears what a −$143 loss would re-arm): the trigger families should
   note that execution-model and trigger changes are entangled at exactly these episodes.
3. If minute data is ever purchased: validate against the 9 marginal touches and 11 arming-day cases
   first (bounded list in `results/diagnostic/occurrences.csv`); do not fund it for anything else.

## 13. Verification performed

- Runner calibration gate passed on all four datasets (baseline + REF_lower3 trade-for-trade).
- `variant_sim.py` limit-off reproduces all 12 anchor runs trade for trade (asserted, 1e-6).
- Chain replays' limit-off legs equal the anchors' trades over each window (asserted).
- Spot-checks of occurrences against raw OHLC rows (4, covering classes a and c and two episodes):
  - VGT 2020-03-18 (−5%, a): raw `22.6878|23.7322|21.9364|23.3378`; level 23.1649×0.95 = 22.0067
    (exit = 2020-03-16 open 23.1649, max-hold); low 21.9364 ≤ 22.0067 < close 23.3378 ✓.
  - QQQ 2002-06-03 (−3%, a): raw `25.4363|25.649|24.4097|24.5739`; level 25.3297×0.97 = 24.5698
    (exit = 2002-05-13 open); low ≤ level < close (close missed the level by 0.02%) ✓.
  - QQQ 2003-02-04 (−5%, a): raw `20.5006|20.6023|20.1942|20.5105`; level 21.3483×0.95 = 20.2809
    (exit = 2002-12-27 open) ✓.
  - VGT 2022-09-16 (−3%, c): raw `40.4795|40.6528|40.0356|40.5918`; level 41.8422×0.97 = 40.5869;
    open 40.4795 < level → open fill ✓.
- Episode/counter consistency: occurrence enumeration cross-checked against events CSVs (episode
  frozen values equal states-log values by assertion in `diagnostic.py`; the three §5 chain episodes'
  resolutions/dates match `results/events/`).

## 14. Reproducing

```
PY=<frozen research venv python>
cd research/risk-management/adaptive-reentry/execution-feasibility
$PY run_anchors.py      # registers + runs the three anchors through the frozen runner
$PY diagnostic.py       # results/diagnostic/{occurrences,summary,below_level_no_signal}.csv
$PY variant_sim.py      # 12/12 verification, then the 6 registered execution-model variants
$PY episode_sim.py      # known_episodes.csv + chain replays (known_episodes_chain.csv)
```
