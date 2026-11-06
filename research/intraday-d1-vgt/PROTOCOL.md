# Intraday D1 (VGT, 1-minute) — Study 8–style robust optimization: protocol

Status: **frozen before the search** (chain phase `protocol`, `results/protocol_freeze.json`, and the git commit that
adds this file). Authority: the user's brief `brief/BRIEF.md` (sha256 `1ef65015…b147b639`). Audit inputs:
`audit/D1_AUDIT.md`, `audit/STUDY8_AUDIT.md`, `audit/PRIOR_INTRADAY_AND_INFRA_AUDIT.md`,
`audit/METHODOLOGY_TRANSFER_MAP.md`, `audit/RULE_PARITY_DESIGN.md`. Any change after the freeze is an amendment
(`AMENDMENTS.md`), dated and justified, and never uses validation-period information.

## 1. Question and scope

Can a new, independent strategy with **canonical D1's rules and state machine**, run on VGT 1-minute bars with
**intraday-scaled parameters**, be selected on **2016–2024** by **Study 8's verified robustness methodology** and show
robust net profitability, and how does it then behave on **2025-01-01 → 2026-10-30** (the last complete session in
the data)? Out of scope: multi-ETF pools, shared margin, combination with daily D1 or Growth, portfolio simulations,
changes to daily D1, walk-forward or anchored re-optimization (Study 8's expanding folds F19–F23 are therefore not
run), and any trade-frequency or win-rate target.

2025–2026 is **validation for this experiment**: VGT's 2024–2026 bars were inspected by earlier research (daily D1,
Study 8, earlier intraday programs), so it is not a universally untouched holdout. No 2025–2026 result of any new
candidate is seen before the selection freeze is committed.

## 2. Strategy: `intradayD1` (`src/intraday-d1/engine.ts`)

Canonical D1 = `src/app/allIn-trailingBuy-postExitContinuation.ts` (sha256 `de0935c3…`), unchanged. The new engine is
D1 statement for statement with **the session replaced by a period** of B regular-session minutes (clock-aligned from
09:30 ET; the session's last period runs to the scheduled close and holds the closing print; a block without a bar is
not a period). Mapping, deviations and tests: `audit/RULE_PARITY_DESIGN.md`. In summary:

- Unchanged mechanisms: deep arming (`1 − close/refHigh ≥ X` on completed minutes), continuation arming (a net-
  profitable exit opens a window; `close ≤ contHigh·(1−P)`), trailing buy (arming close starts the trailing low; low
  then close test against low·(1+Y); no expiry), fill at the next observed trade (closing print only before the
  close), carry to the next period, entries only in periods that start flat and exits only in periods that start
  long, trailing stop from the post-entry high raised once per period and never lowered, profit-conditioned
  activation decided before each period (not latched), gap exit at the period's opening trade, maximum losing hold at
  the period open (sale at the next trade after the first minute), buffered loss after the hold with D1's stop
  precedence and carry, marks at every minute close and the official close, end-of-run mark at the last close. No
  material-loss rule, lower-price re-entry restriction or recovery reset (canonical D1 has none).
- Time units: L and W are durations in regular-session trading minutes converted to `max(1, round(minutes/B))`
  previous periods (D1 counts previous sessions); the hold H is measured in **scheduled regular-session trading
  minutes** between period starts (deviation: D1 uses calendar days; see the design note); interest keeps D1's
  calendar days between session dates (0 for a same-day round trip).
- No end-of-day flattening; overnight and weekend holding is allowed exactly as in D1; one position at a time.

Parity requirements (all must hold before the search; `results/parity/parity.json`): P1 — session clock, costs 0, no
arming date, equals the canonical D1 file run on the development prefix trade for trade and in both drawdowns, in
`stop` and `next-open` modes; P3 — session clock with Study 8's costs/stresses equals Study 8's `traceBook`; P2 — 60
Sobol intraday vectors (interest 0) equal `traceBook` on period-structured data. Tolerance: none (`Object.is`).

## 3. Data, doors and chronology

- Data: `data/VGT/data.csv` (Alpaca SIP 1-minute OHLCV, raw prices, extended hours present), sessions by
  `groupMarketSessions` (regular session, early closes from `src/lib/calendar.ts`, the closing print). 1-minute bars
  are **not** tick data: intraminute order is unknown; minutes without trades have no bar and are never fabricated.
- **Development door:** the byte prefix of the file through 2024-12-31 (42,469,694 bytes, 743,918 rows, sha256
  `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb`, last row 2024-12-31T21:11Z; 2,264 sessions);
  read with a byte limit and verified before parsing. Search, qualification and selection read only this door.
- **Validation door:** the whole file (sha256 `2ee06310…412e`, 935,608 rows, last complete session 2026-10-30), the
  recorded 8-for-1 split of 2026-04-21 forward-adjusted (`config/market-events/splits.json`), opened once, after the
  selection freeze is committed.
- Chronology: accounting from 2016-01-04; **common arming date 2016-02-01** for every candidate (Study 8 used one
  common date; this one leaves ≥ 10 sessions, the grid's longest lookback). Development window = through 2024-12-31;
  y = sessions from arming to the end ÷ 252 (8.909 on the development door).
- **Boundary 2024/2025.** Validation is one continuous causal run from 2016 to 2026-10-30, as Study 8's test runs:
  state and an open trade carry across 2024-12-31 (no reset, no flattening). Development figures come from the
  development door only (an open position marked at the 2024-12-31 close, net of interest). Validation-window P&L is
  the mark difference across the window (mark at the last 2026-10-30 close minus mark at the 2024-12-31 close), so a
  straddling trade's pre-2025 part is development and its remainder validation, never both. The warm-up for 2025 is
  the strategy's own causal history (nothing is re-initialized). Straddling trades are flagged in the ledger.

## 4. Search box (derived from 2016–2024 data and microstructure only)

Genome = one integer index per key; values from these tables only (`src/intraday-d1/context.ts`).

| Key | Values | Points | Radius r | Basis |
|---|---|---:|---:|---|
| B period length | {5, 10, 15, 30, 65, 130} minutes | 6 | 1 level | ≥ 5 so a period nearly always has several traded minutes; ≤ 130 keeps ≥ 3 periods a day |
| X dip from reference high | 0.10% × 1.06^k → 0.10%–4.96% | 68 | 3 (±19%) | 2016–24 median 30-min drawdown 0.07–0.25%, median session range 0.7–2.3% |
| Y rebound from trailing low | 0.02% × 1.06^k → 0.02%–0.99% | 68 | 3 | median 1-minute range 1–3 bp (bid-ask scale) |
| S trailing stop | 0.05% × 1.06^k → 0.05%–2.48% | 68 | 3 | ≈ 2 minute ranges up to D1's own lower box |
| H maximum (losing) hold | 5 × 1.1^k trading minutes → 5–3,949 | 71 | 2 (±21%) | one period to ≈ 10 sessions |
| L lookback | 10 × 1.1^k trading minutes → 10–4,053 | 64 | 2 | sub-hour to ≈ 10 sessions |
| U buffered loss | k bp → 0–1.50% of the investment | 151 | 5 | D1's box is 0–6%; 0 is in the rule's domain |
| P continuation pullback | 0.05% × 1.06^k → 0.05%–2.48% | 68 | 3 | as S |
| W continuation window | 10 × 1.1^k trading minutes → 10–4,053 | 64 | 2 | as L |

Radii are constant *relative* perturbations (Study 8's absolute radii are 4–17% of their ranges; these are 2–17% of
the index ranges, ±19–21% in value). Refinement probes ±⌈r/2⌉, ±r. Distance: normalized L∞ over indexes.

## 5. Execution, costs and financing (Study 8's convention, imported from its context)

$100,000 notional per entry (returns are on that borrowed notional, never compounded), fractional shares, one
position; 11% simple interest, 365-day year, calendar days between session dates (the broker end-of-day-debit
convention: zero for an intraday round trip, one day per night, three over a weekend); **5 bps per side** (entry price
× 1.0005 — so shares and every D1 net test see it; exit price × 0.9995); stops fill at the stop level, or at the
opening trade of a minute or period that opens through it. Gating stresses (Q7 on development, T4 on validation):
10 bps per side; 14% interest; next-open stop fills; +25 bps stop slippage. Report-only: 0/1/2/3/20 bps, 8% interest,
+10 bps slippage, a "trigger-minute low" worst-case stop fill, pro-rata (exposure-time) interest, break-even cost per
side (the cost at which development net = 0, by bisection with full re-simulation). No commissions (Alpaca
equities); SEC/FINRA sell fees (< 0.3 bp) are inside the 5 bps.

## 6. Point metrics and the two adaptations

Study 8's record and summary (`S8/evaluate.ts`, `S8/stats.ts`) and its fitness functions (`centreView`, `nbView`,
`violationOf`, `objectivesOf`, `floorsOf`, `summarize`) are imported **unchanged**. Adapted: (a) **episodes** = distinct
calendar quarters with an entry (Study 8's 10-session-gap count would rule a continuously active strategy infeasible;
reported as `episodesS8`); (b) no allocator (C4 inert for one book, decisions = lots). Thresholds unchanged: C1/C2 DD <
$35,000 (minute, strict), share ≥ 0.90, p90 DD < $35k; C3 lots ≥ ⌈1.5y⌉, episodes ≥ ⌈0.5y⌉, lot-years ≥ 3; C5 median
≥ $10,000/yr and p10 > 0; C6 ≥ $11,000 per capital-year (Σ wall-clock fill-to-exit days); C7 top lot ≤ 25%, best
calendar year ≤ 75%, net ex-best-year ≥ $5,000/yr.

## 7. Search (Study 8 V track, one fold = development door)

Seeds `deriveSeed('intraday-d1-vgt', …labels, 'V', 'DEV')`, sfc32. Screen 8,192 scrambled Sobol; plausible = centre
DD < $35k, net > 0, lots ≥ ⌈C3/2⌉; promote ≤ 1,024; rung 1 n = 16; NSGA-II 4 islands (≤ 8 under T1) × 64 × 2,048 new,
≤ 40 generations, stagnation 10/1e-3 on the 2-D hypervolume; rung 2 top 192 @ 0.02 → n 64; T3; rung 3 top 48 @ 0.03
→ n 128; refinement 6 starts @ 0.05, ≤ 2 passes, n 64, gain ≥ $1,000/yr; T2 (2,000 resamples) → r3+r3b; shortlist ≤ 6
@ 0.10 (profit, robust, balanced, centre, front, infeasible fillers) after ledger de-duplication; selection families
select1, select2 (128 each). Single job, evaluated in parallel worker threads (results are order-independent).

## 8. Qualification, roles, ranking and freeze

On the development door: confirm 1–3 (3 × 128 pooled) decisive; Q1 centre DD < $35k; Q2 share ≥ 0.90 and p90 <
$35k; Q2b in-box pair if any coordinate is within r of a bound; Q4 net > 0, best year ≤ 75%, ex-best ≥ $5k/yr; Q5
C3; Q6 top lot ≤ 25%; Q7 the four stresses each net > 0 and DD < $35k; Q8 neighbourhood median of the development
attribution ≥ 0.60 × the centre's (> 0); E1 median ≥ $10k/yr and p10 > 0; E2 ≥ $11k per capital-year. E3 (pool) is
dropped. "Infeasible on training" members never qualify. Marginal if pooled share ≤ 0.93 or a replicate fails.
Roles in selection-family order, each to the first qualified candidate at L∞ ≥ 0.10 from those taken: profit
(robust/yr), robust (share, among median ≥ ½ the profit holder's), balanced (robust/yr ÷ p90 DD), ≤ 2 extras (ledger
Jaccard < 0.5). Ranking: tier "strong" if confirmation robust/yr ≥ B1's (VGT D1 `primary`, session clock, same
economics, Study 8's own daily box and radii), then robust/yr, p90 DD, ID. **Preferred = rank 1.** PBO (CSCV over
the 64 best rung-2 configurations, half-years 2018H1–2024H2) and the selection→confirmation decay are report-only.
The freeze writes `FROZEN_SELECTION.json` (protocol, code digest, data hashes, rulebook, record hashes, roles,
ranking, validation plan) and is **committed to git before the validation door opens**.

## 9. Validation (once)

All role holders (and B1, and — report-only, labelled — every shortlist member) on the validation door: one
continuous run to 2026-10-30; test families 1–3 (3 × 128) + in-box pair + half/wide, labels `test/V/VAL/rep`; Study
8's T1–T7 (single book; T6 episodes = quarters; yTest = validation sessions ÷ 252): T1 whole-run DD < $35k; T2 pooled
test share ≥ 0.90 and p90 < $35k; T2b in-box; T3 validation net ≥ $10k·yTest and pooled validation median > 0 and ≥
$5k·yTest; T4 stresses' validation net > 0 and DD < $35k; T5 whole-run concentration; T6 whole-run floors plus ≥
⌈1.5·yTest⌉ new lots and ≥ ⌈0.5·yTest⌉ new quarters; T7 ≥ $11k per capital-year. Status pass / ambiguous (pass but
pooled share ≤ 0.93, a failing replicate, or centre DD ≥ $33k) / fail. Gates veto only; results never reorder,
replace or rescue. If validation is disappointing nothing is retuned.

**Pre-registered recommendation.** No qualified holder → "no robust edge" (validation still reported for the frozen
shortlist, diagnostic). Preferred holder: pass → "viable candidate" (subject to the stated execution limits);
ambiguous → "promising but unproven"; fail → "no robust edge demonstrated" (development-qualified, failed validation).

## 10. Reporting (report-only, never selects)

Per-trade ledger (CSV/JSON) for every frozen candidate and B1, development and validation; per-year 2016–2026 tables
(development vs validation, 2026 partial); neighbourhood distributions and nearby alternatives; temporal consistency
by year, half-year, volatility tercile and bull/bear years of the development period; trading frequency per
day/week/month and time-of-day; concentration (top trades/days), consecutive losses, exposure, MAE/MFE, tail events;
cost sensitivity and break-even cost; validation degradation; representative causal trade timelines.

## 11. Integrity

Local hash chain `results/chain.jsonl` (protocol → parity → search → qualify → selection → validation), door log
`results/doors.jsonl`, write-once sealed records. Do not rerun a sealed stage; the search refuses once the selection
is frozen; validation refuses unless the frozen selection is committed and the decision-relevant code is unchanged.
