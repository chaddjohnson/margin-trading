# Report — growth140-vgt-s8m: Growth 1.4.0 on VGT, Study 8–style search, #4 as a fixed control

Study period: 2026-11-07 (UTC). Protocol `PROTOCOL.md` (sha256 `ae3bfa41…7bac6`), frozen at 11:47:25Z and committed
before parity and search (`b461dec`). Selection `FROZEN_SELECTION.json` (sha256 `0064deba…9bce`), frozen at
13:01:40Z and committed before the validation door opened (`8d4de89`). No amendments. All figures are on the
standalone $100,000 fixed notional: no compounding, 11% simple interest, 5 bps per side, $0 commission.

## 1. Outcome

- **Development (2016-01-04 → 2024-12-31).** The search found stable-looking challengers.
  - All six shortlist members passed every frozen in-sample gate (one marginal). Roles: profit (`ec124684`), robust
    (`1308a733`), balanced (`6f63defc`) and one extra (`37d37e1e`). The **primary candidate**, fixed before
    validation, is **`ec124684b6466d77`** (profit, rank 1).
  - On development data each earned more than #4 ($94k–$137k against $92.6k) and captured more distinct winning
    trades (13–22 against #4's 8), with broad neighbourhoods: 92–100% of ≈ 384 distinct neighbours stayed below $35k
    drawdown.
  - Every one of them had a **higher** maximum minute drawdown than #4 ($17.8k–$24.7k against $14.6k). None reached
    the "strong" tier, which required a confirmation p90 drawdown at or below #4's $23,620.
- **Validation (2025-01-02 → 2026-10-30, opened once).** **No frozen member passed the predeclared battery, and none
  beat #4 on the same dates.**
  - #4 earned **$52,892.75** with a **$9,916.01** validation drawdown.
  - The primary candidate lost **−$28,619.47**, with a $34,405.71 validation drawdown and a whole-run drawdown of
    $35,200.55, above the $35k ceiling.
  - The best member on validation earned $19,348.96, with a $38,962.16 drawdown.
  - **Within this declared search, no challenger qualified on the forward-period test.** This is the finding.
- **#4 browser parity: exact.** On 2016-01-04 → 2026-10-30 the replay gives:
  - $145,468.46 total marked and realized net;
  - $14,578.10 (14.58%) maximum minute drawdown;
  - 10 wins, 3 losses, 0 breakeven, 13 closed trades;
  - 37.0% exposure (sessions invested), flat at the end.

  Its development-window run (11 trades, $92,575.71) is #4's comparator below.
- **What the search actually optimized.** All six frozen members share one rule family: the **trend-breakout entry**
  with the **maximum losing hold switched OFF**. Four exit through an ATR initial risk stop and the trailing stop; two
  use trend retention instead. They were invested 67–71% of development sessions, against #4's 37%.
  - VGT's 2016–2024 uptrend rewarded that exposure.
  - In 2025–2026 the stop-protected breakouts were whipsawed by initial stops: January–February 2025,
    December 2025 – March 2026, June 2026 and October 2026.
  - The retention variants held a February 2025 entry through the April 2025 drop.
  - #4 sat out and took two large winners: 2025-05-02 → 11-07 (+$27,209.07) and 2026-04-10 → 06-05 (+$25,683.68).

## 2. #4 and the frozen members, side by side

Development and validation come from **one continuous run** (2016 → 2026-10-30). The development columns equal the
development-door run, checked to the cent for every member. Validation net = marked equity at 2026-10-30 minus that at
the 2024-12-31 close. The validation drawdown starts its peak at the boundary equity. W/L/B counts closed trades;
validation counts the trades closed after the boundary, a carried-in trade included. Δ = minus #4. Rows are in
development rank order (role holders by rank, then the other members).

| Configuration | Role | Dev net | Dev max minute DD | Dev W/L/B | Dev exposure | Dev Δ net | Dev Δ DD | Val net | Val max minute DD | Val W/L/B | Val exposure | Val Δ net | Val Δ DD | Validation status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| #4 (control) | fixed control | $92,575.71 | $14,578.10 (14.58%) | 8/3/0 | 36.9% | — | — | $52,892.75 | $9,916.01 (9.92%) | 2/0/0 | 37.5% | — | — | fail (T5, T6) |
| C1 ec124684 | profit (rank 1, **primary**) | $133,078.09 | $17,772.79 (17.77%) | 16/3/0 | 69.8% | +$40,502.38 | +$3,194.69 | −$28,619.47 | $34,405.71 (34.41%) | 4/3/0 | 64.3% | −$81,512.22 | +$24,489.70 | fail (T1, T2, T3, T4, T5) |
| C2 6f63defc | balanced (rank 2) | $94,254.88 | $23,130.27 (23.13%) | 13/2/0 | 67.2% | +$1,679.17 | +$8,552.17 | −$1,115.71 | $22,274.17 (22.27%) | 3/2/0 | 74.7% | −$54,008.46 | +$12,358.16 | fail (T3, T4) |
| C3 37d37e1e | extra1 (rank 3) | $100,862.16 | $20,505.33 (20.51%) | 13/0/0 | 68.1% | +$8,286.45 | +$5,927.23 | $19,348.96 | $38,962.16 (38.96%) | 4/0/0 | 95.6% | −$33,543.79 | +$29,046.15 | fail (T1, T2, T4, T6) |
| C4 1308a733 | robust (rank 4) | $122,372.48 | $20,114.11 (20.11%) | 22/5/0 | 67.3% | +$29,796.77 | +$5,536.01 | −$25,297.85 | $29,735.61 (29.74%) | 4/5/0 | 58.0% | −$78,190.60 | +$19,819.60 | fail (T2, T3, T4) |
| C5 c3c10f60 | shortlist (centre pick), no role | $136,518.25 | $24,679.71 (24.68%) | 22/5/0 | 71.4% | +$43,942.55 | +$10,101.61 | $3,579.77 | $19,387.19 (19.39%) | 4/4/0 | 58.2% | −$49,312.98 | +$9,471.18 | fail (T3) |
| C6 a1115757 | shortlist (Pareto pick), no role | $101,589.00 | $20,614.72 (20.61%) | 13/0/0 | 69.4% | +$9,013.30 | +$6,036.62 | $19,348.96 | $38,962.16 (38.96%) | 4/0/0 | 95.6% | −$33,543.79 | +$29,046.15 | fail (T1, T2, T4, T6) |

- **The detailed ledgers.** Realized and open P&L, drawdown peak, trough and recovery dates, carried-in splits and
  every trade (development and validation) are in `results/tables/side-by-side-and-ledgers.md`.
- **Examples** (dates are New York sessions):
  - #4: development drawdown 2021-08-30 → 2023-10-03, recovered 2023-12-15. Validation drawdown 2025-10-29 →
    2026-04-13, recovered 2026-04-21.
  - C1: development realized $125,725.18 + open $7,352.91. A position entered 2024-09-12 was carried across the
    boundary; its $3,572.12 net split as +$7,352.91 before and −$3,780.79 after. The validation drawdown ran
    2025-01-06 → 2026-10-30 and was not recovered. Open at the end: −$5,334.12.
- **#4's own status.** As a candidate, #4 would have failed T5 (one trade is 46% of its net) and T6 (2 new validation
  trades). Its development figures fail Q5, Q6, Q8 and E1, so it would not have qualified under these rules either.
  It is a control, not a candidate.

## 3. Exact settings (frozen; all at 1d, VGT, 5 bps; parameters as Strategy Lab Growth 1.4.0 keys)

| ID | Settings |
|---|---|
| **ec124684b6466d77** (profit, primary) | trend_breakout: SMA 100, slope comparison 45, prior high 5; trend filter OFF; gate OFF; trailing stop 6.5%; maximum hold OFF; initial risk stop ON (ATR 50, × 4); retention OFF; continuation classic_d1 (window 180, pullback 12%, rebound 2%) |
| 6f63defcd07ffd44 (balanced) | trend_breakout: SMA 160, slope 25, prior high 5; trend filter rising_sma (SMA 100, comparison 1); gate OFF; trailing stop 7%; hold OFF; initial stop ON (ATR 60, × 5); retention OFF; continuation breakout (window 80, buffer 0.25%, formation 5) |
| 37d37e1e6a1519d5 (extra1) | trend_breakout: SMA 200, slope 25, prior high 5; trend filter rising_sma (SMA 80, comparison 2); gate OFF; trailing stop 6.5%; hold OFF; initial stop OFF; retention ON (sell 90%, SMA 70, 3 closes); continuation breakout (window 10, buffer 1.25%, formation 3) |
| 1308a73375be7b29 (robust) | trend_breakout: SMA 90, slope 55, prior high 5; trend filter OFF; gate OFF; trailing stop 5.5%; hold OFF; initial stop ON (ATR 50, × 3.5); retention OFF; continuation classic_d1 (window 190, pullback 11.5%, rebound 2%) |
| c3c10f604c253c66 | trend_breakout: SMA 100, slope 5, prior high 5; trend filter OFF; gate OFF; trailing stop 5.5%; hold OFF; initial stop ON (ATR 60, × 3.5); retention OFF; continuation classic_d1 (window 140, pullback 12%, rebound 1.8%) |
| a1115757a431aad0 | as 37d37e1e but SMA 180 and continuation window 20, buffer 0.5% (its validation trades are identical) |

- **#4**, the exact brief settings (`420cd989e4fa7749`):
  - entry: Rise (X 5%, N 90);
  - trend filter: price_change, 30 sessions, minimum −2%;
  - eligibility: time_limited, 20 sessions;
  - Drawdown Recovery Gate: 60 / 10% / 45% / 2;
  - exits: trailing stop 6%, maximum hold 21 days, buffer 2.9%, initial stop ATR 20 × 1.5, retention OFF;
  - continuation: shallow_pullback (window 60, SMA 50, slope 10, rise 0%, pullback 1.5–8%, recovery 1%).
- **Capability check.** Growth 1.4.0 expresses every #4 setting: the browser validator accepts it, and P1 and full
  parity hold. Nothing was missing.
- **The freeze manifest.** `FROZEN_SELECTION.json` holds each member's full effective parameter set, the canonical
  hashes, gates, roles, ranking and pins.

## 4. The search (development door only)

### 4.1 The space

- **Genes.** 8 structural genes (entry method; trend filter method; eligibility policy; gate; maximum hold and
  buffer; initial stop; retention; continuation method) and 50 conditional numeric genes. That gives 5,040 distinct
  rule structures.
- **Fixed.** VGT, daily signal bars, sizing, costs and execution.
- **Dependencies and duplicates.** Dependencies are respected (eligibility applies only to the Rise entry; the buffer
  requires the hold). Equivalent genomes are deduplicated by the browser's own effective-parameter identity.

### 4.2 The schedule and the rungs

| Stage | Configurations | Distinct effective configurations / ledgers |
|---|---:|---|
| Sobol screen (Latin supercube of 4 scrambled blocks) | 16,384 | 16,384 configurations; 13,941 distinct ledgers; 3,142 plausible; 2,560 promoted |
| Rung 1 (16 draws) | 23,040 centres (2,560 screen + 4 islands × 5,120) | 15–16 distinct neighbours per centre (368,593 neighbour configurations in all); distinct ledgers median 16 (min 1) |
| NSGA-II islands | 4 (T1 did not fire), each 32 generations × 160, stop at the budget | 1,645 / 1,382 / 865 / 1,470 rung-1 feasible; union 5,362 feasible of 23,040 |
| Rung 2 (64 draws) | 192 | 64 / 64 / 64 configurations; 63–64 ledgers; 112 feasible (T3 not fired) |
| Rung 3 (128 draws) | 48 | 128 configurations; 123–128 ledgers; 47 feasible |
| Refinement (64 draws) | 6 starts, 213 probe centres | 60–64 configurations; no move accepted |
| T2 | fired (gap $243/yr < SE $312/yr) | the top 8 re-scored on 256 draws (234–256 ledgers) |
| Shortlist | 6 at L∞ ≥ 0.10 | — |

- **Evaluations.** 427,894 fresh in the search (69 min, 12 workers), 9,830 in qualification, 2,694 in validation and
  14 in P1 parity.
- **Development neighbourhoods** (confirmation 3 × 128, ≈ 384 distinct configurations each):

  | Member | ledgers | share < $35k | p90 DD | median net | p10 net | robust $/yr (total) |
  |---|---:|---:|---:|---:|---:|---|
  | C1 | 380 | 96.6% | $28,520.67 | $109,993.24 | $84,727.67 | $10,836.94 ($97,360.46) |
  | C2 | 347 | 99.2% | $25,068.44 | $93,676.58 | $77,975.64 | $9,553.08 ($85,826.11) |
  | C3 | 372 | 98.2% | $32,862.34 | $93,148.26 | $76,453.38 | $9,438.96 ($84,800.82) |
  | C4 | 383 | 99.7% | $26,206.55 | $98,609.22 | $54,737.19 | $8,534.30 ($76,673.20) |
  | C5 | 374 | 92.2% | $33,819.92 | $95,129.52 | $57,396.14 | $8,488.62 ($76,262.83) |
  | C6 | 374 | 97.1% | $33,125.68 | $92,644.20 | $77,085.87 | $9,446.11 ($84,865.04) |
  | #4 | 384 | 100.0% | $23,620.44 | $44,531.83 | $11,982.96 | $3,145.26 ($28,257.40) |

- **Selection and variant families.** The selection families (2 × 128) and the in-box, half and wide variants are in
  `results/tables/development-evidence.md`.

## 5. What generated the development profit (report-only)

- **Year by year.** Every member lost in 2022 (−$0.9k to −$14.4k) and earned most in 2017, 2019, 2020 and 2024. None
  depends on one trade: the largest win is 18–24% of net, against #4's 46%. The members held 5–16 episodes, of which
  5–13 were profitable.
- **Exposure and time underwater.** Exposure was 67–71% (#4 37%). The share of sessions below an earlier closing peak
  was 82–85% (#4 87%).
- **Costs.** At 10 and 20 bps per side every centre stays profitable, with drawdowns < $25.3k.
- **Ablations.**
  - The initial risk stop is what holds the breakout members' drawdowns down: switching it OFF raises DD to
    $52–54k.
  - Retention plays that role in the two members without a stop: switching it OFF gives $52.9k.
  - Continuation entries (classic_d1) add $27.7k–$33.7k in C1, C4 and C5, and nothing in C2, C3 and C6.
  - In #4, persistent eligibility is worth $31.3k of development net and the gate $16.5k. The gate, the initial stop
    and the trend filter each hold its drawdown down: switching each OFF gives $23.3k, $21.5k and $17.2k against
    $14.6k.
- **Expanding folds** (slices of the continuous development run).
  - The members' confirmation neighbourhoods were positive in 96–100% of draws in 2020–21 and 2024, and weaker in
    2021–22 (5–98%).
  - The **procedural fold diagnostic** over the search's 48 rung-3 configurations shows that development rank carried
    **no forward information** inside 2016–2024: the Spearman correlation of training-slice robust profit with the
    next slice's neighbourhood median was −0.25 (F19), −0.41 (F20), −0.50 (F21) and −0.15 (F23). In hindsight this
    was the warning that validation confirmed.
- **Winning trades against #4 (development window, the predeclared matching rule; evidence sufficient).**

  | Member | winners (#4: 8) | retained | retimed | new winning moves | extra entries (into #4 moves + new moves) | lost #4 winners | losses vs #4 |
  |---|---:|---:|---:|---:|---:|---|---|
  | C1 | 16 | 1 | 5 | 9 | 0 + 1 | 2: 2020-04-21 +$4,073.47, 2020-06-01 +$395.69 | 3 (−$20,639.93) vs 3 (−$8,383.69) |
  | C2 | 13 | 1 | 6 | 6 | 0 + 0 | 1: 2020-06-01 +$395.69 | 2 (−$18,985.29) vs 3 |
  | C3 / C6 | 13 | 0 | 6 | 4 | 0 + 3 | 2 (as C1) | 0 vs 3 |
  | C4 | 22 | 2 | 5 | 10 | 2 + 3 | 1: 2020-06-01 | 5 (−$29,359.41) vs 3 |
  | C5 | 22 | 1 | 6 | 10 | 1 + 4 | 1: 2020-06-01 | 5 (−$28,346.65) vs 3 |

  - The members captured most of #4's development moves, mostly retimed, plus 4–10 genuinely new winning moves. The
    #4 winners they lost were small (2020 recovery re-entries).
  - The stop-protected members' losses were 2–3.5× larger in dollars.

## 6. Validation (the battery, development rank order)

| Member | T1 run DD < $35k | T2 test share / p90 | T3 val net and median | T4 10 bps | T5 concentration | T6 activity | T7 | status |
|---|---|---|---|---|---|---|---|---|
| C1 ec124684 (primary) | FAIL $35,200.55 | FAIL 74.0% / $37,919.10 | FAIL −$28,619.47; median −$23,300.86 | FAIL | FAIL | pass | pass | **fail** |
| C2 6f63defc | pass | pass 98.4% / $29,570.91 | FAIL −$1,115.71 | FAIL | pass | pass | pass | fail |
| C3 37d37e1e | FAIL $39,758.31 | FAIL 22.5% | pass $19,348.96 | FAIL | pass | FAIL (1 new episode) | pass | fail |
| C4 1308a733 | pass | FAIL 88.5% / $35,675.76 | FAIL −$25,297.85 | FAIL | pass | pass | pass | fail |
| C5 c3c10f60 | pass | pass 93.8% / $34,057.02 | FAIL $3,579.77 < $18,200; median −$3,310.02 | pass | pass | pass | pass | fail |
| C6 a1115757 | FAIL | FAIL 22.1% | pass | FAIL | pass | FAIL | pass | fail |
| #4 | pass $14,578.10 | pass 99.7% / $23,361.84 | pass $52,892.75; median $49,725.08 | pass | FAIL (46% one trade) | FAIL (2 new trades) | pass | fail |

- **Comparisons with #4 (same dates, from the 2024 close).** No member earned higher validation net with equal or
  lower validation drawdown: Δ net −$33.5k to −$81.5k, Δ DD +$9.5k to +$29.0k.
  - Four members **increased losses** (2–5 against #4's 0 among new entries).
  - The validation winner matching is **sparse** (#4 entered only 2 new trades), so it is reported as inconclusive.
    The members retimed #4's two validation moves, entering earlier or later at a different stop. C2 retained one of
    them.
- **Integrity.**
  - The full door's development span has the same session digest as the development door.
  - Every member's continuous-run equity at the 2024 close equals its frozen development net to the cent.
  - The full door was opened once (door log).
  - Coverage: 2,264 + 459 sessions, none missing; all 21 early closes match the calendar. Five sessions have no
    closing print (2016-04-06, 2016-11-25, 2019-08-12, 2025-08-29, 2025-09-05), and no session has fewer than half
    its scheduled minute bars. Minute bars exist only for traded minutes, and every run treats them identically, so
    coverage does not affect comparability.
- **Departure from Study 8 (documented).** Validation drawdown is measured from the 2024 close. Study 8 used the
  whole-run drawdown for its gate, which T1 and T2 still apply.
- **Result files.** `results/tables/validation.md`; the record `results/validation/validation.json`.

## 7. Trade-offs and interpretation

- **Profit against drawdown.**
  - The search's Pareto front traded #4's low exposure (37%) and low drawdown for higher exposure (≈ 70%): more
    distinct winners and +$1.7k to +$43.9k more development net, at +$3.2k to +$10.1k more drawdown.
  - Under the frozen rules, no member matched #4's development p90 drawdown, so none reached the strong tier.
  - The profit holder had the lowest development drawdown of the six ($17.8k) and the most new winning moves. In
    validation it had the worst outcome.
- **Why validation failed.**
  - The breakout members enter after short-term highs (prior-high windows of 5 sessions) and rely on an initial
    ATR stop with no losing-hold limit. In 2025–2026's sharp reversals that pattern produced repeated stop-outs (for
    example, C1's initial-stop losses of −$7,915.56, −$12,112.32 and −$9,917.01).
  - #4's gate, its eligibility window and its −2% trend floor kept it out until the two strong recoveries.
  - The two retention members (no initial stop) held the position entered 2025-02-14 through the April 2025 drop:
    a $38,962.16 drawdown, recovered 2025-09-18.
- **Lost #4 winners.** In development the members lost only #4's two small 2020 re-entries. In validation they did
  not "lose" #4's winners outright: they were in the market on those moves, but their net over the window was
  consumed by the losses around them.
- **Stability evidence.** It was broad but in-sample: 92–100% of ≈ 384 distinct neighbours below $35k, with 347–383
  distinct ledgers. The rung-3 fold diagnostic and the validation both show that this neighbourhood robustness on
  2016–2024 did not transfer forward.
  - The two retention members are near-duplicates: different parameters, identical validation ledgers.
  - Six members were tested; with a sequential veto, a few survivors could have appeared by chance. None did.

## 8. Disclosures and limitations

- **#4's advantage.** #4 was chosen in the browser with 2025–2026 in view. Its validation lead is partly a selection
  advantage, and validation is a forward-period test of this frozen search on **previously examined** market history
  (Study 8 and the browser work had opened 2025–2026), not a holdout.
- **Scope of the claims.** The winners named here are the best found **within the declared search**: the 58-gene
  space, the budgets and the seeds of `PROTOCOL.md`. Fresh seeds are not fresh market history.
- **In-sample qualification.** Qualification and the expanding folds are in-sample. The folds are slices of one run,
  not independent searches.
- **Q7.** Q7 stressed costs only; the engine exposes no interest, stop-fill or slippage inputs.
- **The tier rule.** The "strong" tier rule (robust ≥ #4 **and** p90 ≤ #4) departs from Study 8, to encode the
  drawdown objective. It is a ranking label only, and it never changed who qualified.
- **Pre-freeze door openings.** The pilot opened the development door before the freeze (engineering figures only).
  Pilot F's first parity run differed only in the timestamp format (fixed before the freeze).
- **No deployment.** Nothing here was deployed or traded, and no configuration is recommended for live use.

## 9. Memory, containment and commands

- **Detail.** `MEMORY.md`: the incident, its mechanism, the safeguards and the measurements.
- **Peaks** (the job cgroup's `memory.peak`):

  | Job | Workers | Peak |
  |---|---:|---:|
  | search | 12 | 8.38 GiB |
  | qualify | 12 | 6.78 GiB |
  | validate | 12 | 8.30 GiB |
  | P1 parity | 4 | 2.15 GiB |

  - Per worker ≤ 710 MiB, with ArrayBuffers ≤ 254 MiB; the coordinator ≤ 682 MiB.
  - No `memory.high`, `memory.max` or OOM events, and no swap.
- **Containment.** Transient systemd user services in `app.slice`, separate from the tmux/Claude scope:
  - `MemoryHigh=44G`, `MemoryMax=48G` (the user's limits), `MemorySwapMax=0`;
  - `KillMode=mixed`, `TimeoutStopSec=120`, no restart;
  - Node `--max-old-space-size` 2048 (coordinator) and 1024 (workers);
  - a 16 GiB stop-and-checkpoint threshold.
- **Fresh start:**
  `npm run -s growth140-s8m -- launch --unit growth140-s8m-search -- search --job search --workers 12`.
- **Verified checkpoint resume.** `npm run -s growth140-s8m -- launch --unit growth140-s8m-search-r1 -- search --job
  search --workers 12 --resume`. Pilot D (a stop after 3,000 fresh evaluations) and E (SIGKILL of the whole unit)
  reproduced the uninterrupted run exactly, and so did the qualification and validation stop/resume tests.
- **Everything else.** `RUN_COMMANDS.md`.
- **The trial archive.** `results/archive/` (MANIFEST.json with sha256 per shard and per SQLite file).
  - Committed: the search's configurations (427,894) and fits (23,501, every centre with its neighbourhood summary),
    and the qualification, validation and parity point archives.
  - The search's per-evaluation points (81 MB gzip) are kept on disk and git-ignored, following the repository's
    convention for large regenerable archives.

## 10. Verification

- **Study tests.** `src/growth140-vgt-s8m/tests/study.test.ts` (8 tests, synthetic data) pass. `tsc --noEmit` and
  eslint are clean for the study code.
- **The full suite.** `npm test` ran after validation (embargo over), inside a capped unit (`results/runlogs/npm-test.log`):
  1,222 tests, 1,211 pass, 7 fail, 4 skipped. The 7 failures are the repository's known pre-existing ones: six open
  the lowercase `src/app/allin-original.ts`, and the Study 7 runner's reconciliation is pinned to a 2026-10-29 data
  end. The study added 8 passing tests and no failure.
- **Parity.**
  - P1 (development dates, 14 configurations including #4) against the browser runner itself: 0 differences in net,
    realized net, minute drawdown and its times, counts, exposure, and every trade's fills and net.
  - #4's full-window replay matches the browser reference exactly.
- **Determinism.** Reload, eviction, stop/resume and SIGKILL/resume each reproduced the uninterrupted pilot output
  (equal hashes), and so did stop/resume in qualification and validation.

## 11. Further research (selection for this study has ended)

- Add maximum-hold-ON breakout variants, or a minimum-gap rule between stop-outs, as an explicit hypothesis about
  2025–2026's whipsaws. Test them in a **new** study with 2025–2026 marked exposed.
- Constrain exposure (e.g. ≤ 50% of sessions), or add a drawdown-relative objective (p90 ≤ the control's) as a
  constraint rather than a tier label, so that the search cannot buy profit with exposure.
- Add a structure-diverse shortlist (one member per entry method) so that a single rule family cannot fill every role.
- Use the procedural fold diagnostic as a gate (rank persistence across F19–F23) before nominating anything.
- Evaluate on VGT data after 2026-10-30 as a genuinely prospective check of #4 and of any future nominee.
