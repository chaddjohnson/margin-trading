# Report — growth140-vgt-stable: Growth 1.4.0 VGT follow-up (archive audit, #4 sensitivity, stable search, chronology)

Study period 2026-11-07 (UTC). Protocol `PROTOCOL.md` (sha256 `cf850484…1a203`) frozen 14:40:30Z and committed
(`a836cd5`) before the audit re-evaluation, the sensitivity study and every search. Amendment log head: **O1** (an
operational incident, no protocol or code change). All figures are on the standalone $100,000 fixed notional: no
compounding, 11% simple interest by calendar day on 365 days, 5 bps per side, $0 commission. "Drawdown" is the maximum
minute drawdown of the marked net in dollars; its percentage is the dollar figure ÷ $100,000; the ceiling is
**$35,000 (35%)**.

<!-- LEAD -->

## 2. The archive audit (the completed study, development only)

Tables: `results/tables/audit.md` (sealed record `results/audit/audit.json`, `reeval.json`).

### 2.1 What the archive holds

- The manifest and all ten shard and SQLite hashes verified; the shards were streamed (≈ 350 MB RSS, 10 s).
- **427,894** evaluated configurations, of which **23,235** were centres (fitted with a neighbourhood): 23,040 at
  rung 1 (16 draws, the old grid-step instrument), 192 at rung 2 (64), 213 refinement probes (64), 48 at rung 3 (128)
  and 8 re-scored on 256. The other **404,659** were neighbour-only points. Island offspring proposed again: 6,369
  duplicates, not re-evaluated.
- **Reuse is valid.** 241 archived points recomputed on this study's D24 door matched their archived records exactly
  (net, realized, drawdown and its times, counts, exposure, ledger signature): same engine, data, accounting and
  effective parameters (P0, §9.2).

### 2.2 The funnel, and why Rise vanished

| Stage | Rise | Breakout |
|---|---:|---:|
| Screen (distinct configurations) | 8,192 | 8,192 |
| Plausible: DD < $35k | 5,932 | 3,996 |
| … and net > 0 | 2,253 | 2,721 |
| … and ≥ 7 trades (activity) | 927 | 2,215 |
| Promoted to rung 1 | 903 | 1,657 |
| Rung-1 centres (screen + islands) | **1,962** | **21,078** |
| Rung-1 feasible, old rules | **0** | 5,362 |
| Rung-1 feasible, new rules (16 draws) | 336 | 15,559 |
| Selected for rung 2 | 0 | 192 |
| Rung 3 / shortlist / frozen | 0 / 0 / 0 | 48 / 6 / 6 |

- **Overlapping reasons at rung 1 (old rules).** Rise: the $10,000/yr neighbourhood-median floor failed 1,950 of 1,962
  centres, the 25% concentration rule 1,935, stability 1,649, capital efficiency 1,337, activity 1,214, drawdown 357.
  Every Rise centre failed at least two reason groups; only 2 failed the median floor alone. Breakout: median floor
  14,731 of 21,078 (4,150 as the only reason), concentration 9,824, stability 6,066, capital efficiency 5,763.
- **Sequential (first-failure) attribution**, in the order drawdown → stability → activity → neighbourhood profit →
  capital efficiency → concentration: Rise 357 / 1,296 / 213 / 96 / 0 / 0; breakout 1,845 / 4,291 / 1,473 / 7,715 /
  0 / 392.
- **Rescued by the new rules:** 336 Rise and 10,197 breakout centres are feasible now but were not then (mostly the
  median floor and concentration). None of the 336 Rise centres reached rung 2.
- **Mechanism.** With zero feasible Rise centres, constrained domination ranked every Rise centre below every feasible
  breakout centre, so the islands bred breakouts: 21,078 of 23,040 rung-1 centres were breakouts. The rung-2 cap (192)
  then filled with breakout / hold OFF / gate OFF (127) and breakout / hold ON / gate OFF (65); rung 3 had 47 and 1;
  the shortlist was six breakout / hold-OFF / gate-OFF members. No Rise and no gate-ON structure ever reached rung 2.

### 2.3 Frontiers and breakdowns (development, the completed study's fidelities)

- **Rise, centre net vs drawdown (DD ≤ $35k).** The frontier tops out at $109,754.02 (DD $30,466.78, 16 draws, p10
  $6,797, p90 $55,760 — fragile); the most stable high point is `06baffd6897b6fe0`: $97,522.28 net, DD $27,434.69,
  16-draw median $98,286 / p10 $94,191 / p90 $33,919, 8 trades (5 wins, 2 losses), 78% exposure.
- **Breakout.** Up to $155,374.87 (DD $24,679.71); the completed study's primary `ec124684` sits on the frontier
  ($133,078.09 / $17,772.79).
- **By switch** (best robust net, new-feasible, best available fidelity): breakout / hold OFF / gate OFF up to
  $105,975 (classic_d1 continuation); breakout / hold ON / gate OFF up to $95,629; breakout gate ON up to $86,100;
  Rise / hold OFF / gate OFF / shallow-pullback continuation $96,238; other Rise structures $27k–$74k. The full table
  (family × maximum hold × gate × continuation, 40 rows) and the 25 best rejected Rise configurations with exact
  settings, metrics, fidelity and reasons are in `results/tables/audit.md`.

### 2.4 Re-evaluation under common independent draws (24 audit candidates, #4, the six prior frozen members)

Selection 2 × 128 and confirmation 3 × 128 on labels `audit` (common draws for all 31): 26 qualify (G1–G5), 5 fail G3
(confirmation p90 > $35,000: the prior C4 `c3c10f60` at $36,779.66, and four audit candidates).

| Rank | Configuration | Centre net | Centre DD | Selection robust | Confirm median | Confirm p10 | Confirm p90 DD | Breaches (worst) |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | `a7f0a450285e7a50` breakout / hold OFF / gate OFF | $133,891.10 | $28,175.05 | $100,606.46 | $113,175.90 | $86,693.98 | $30,480.49 | 4.7% ($51,568.97) |
| 2 | `3bd5a40777b5a75d` breakout / hold OFF / gate OFF | $147,496.54 | $25,573.97 | $101,603.46 | $115,602.09 | $87,890.78 | $34,478.18 | 9.4% ($43,319.94) |
| 3 | `ec124684b6466d77` prior primary | $133,078.09 | $17,772.79 | $91,594.90 | $106,960.01 | $75,582.79 | $29,782.99 | 2.3% ($41,800.41) |
| 6 | `d9eec8eb6a0682f0` breakout / hold OFF / gate ON | $91,723.57 | $22,868.10 | $90,280.38 | $93,903.84 | $85,741.45 | $25,540.28 | 0.3% ($54,350.64) |
| 7 | `06baffd6897b6fe0` **Rise** / hold OFF / gate OFF | $97,522.28 | $27,434.69 | $89,680.47 | $95,986.66 | $85,737.10 | $32,374.16 | 0.3% ($35,520.15) |
| 17 | `43d5f822e9d08011` Rise / hold ON / gate OFF | $91,910.46 | $21,645.91 | $73,329.30 | $82,876.15 | $62,590.97 | $32,302.62 | 1.6% ($38,157.22) |
| 26 | `420cd989e4fa7749` **#4** | $92,575.71 | $14,578.10 | $26,504.85 | $42,782.80 | $9,605.88 | $22,760.06 | 0.0% ($30,656.86) |

- The 16-draw estimates were roughly right for the stable candidates (06baffd6: median $98.3k → $96.0k at 384 draws)
  and optimistic for others (a4ff75f5: p90 $34.7k at 16 → $39.7k at 384, fails).
- **Cell classification (PROTOCOL.md §11).** *Viable*: breakout / hold OFF / gate OFF and breakout / hold ON / gate OFF.
  *Poorly represented at promotion* (a candidate qualifies at 384 draws, yet none of the cell's centres reached rung 2):
  all four Rise cells (best robust $89,680, $55,969, $73,329, $37,442) and both breakout gate-ON cells ($90,280,
  $81,564). No cell was *never explored adequately* (all ≥ 248 centres), though Rise had 1,962 centres against
  breakout's 21,078. No cell was *genuinely weak*.

## 3. #4's sensitivity (development, D24)

Tables: `results/tables/sensitivity.md` (sealed `results/sensitivity/sensitivity.json`, 6,317 fresh evaluations).

- **Reproduction: exact.** $92,575.71 net, $14,578.10 maximum minute drawdown, 11 trades (8 / 3 / 0), 36.9% exposure,
  dollar losses −$8,383.68. No discrepancy to explain.
- **Concentration.** The first trade (2016-06-29 → 2018-02-05, +$42,826.37) is 46.3% of the development net; net without
  it is $49,749.34 (arithmetic).

### 3.1 Individual effects (fine scan: centre ± R at the schema step; units per input)

| Input (unit, #4 value) | Share of fine points moving net > $10k | Mean \|Δnet\| | Nearest break below / above |
|---|---:|---:|---|
| trailing stop (%, 6) | 54% | $21,529.88 | 5.9 / 6.4 |
| recent-low lookback N (bars, 90) | 46% | $25,136.88 | — / 93 |
| trend minimum return (%, −2) | 43% | $10,572.52 | — / −1.7 |
| initial stop ATR multiple (× ATR, 1.5) | 38% | $8,268.03 | 1.3 / — |
| advance X (%, 5) | 32% | $13,591.18 | 4.2 / — |
| trend lookback (sessions, 30) | 27% | $10,836.93 | — / 31 |
| eligibility age (sessions, 20) | 20% | $5,982.12 | 17 / — |
| dip threshold (%, 10) | 19% | $4,455.47 | — / 10.9 |
| **recovery retracement (%, 45)** | **0%** | $1,243.43 | none (38.0–52.0: $83,985.30 … $95,737.95) |
| **loss buffer (%, 2.9)** | **0%** | $0.00 | none (2.3–3.5: the identical ledger) |
| confirmation count (sessions, 2) | 0% | $888.82 | none |

- **Exactly 45% and 2.9% are not knife-edges.** Retracement 44.9 gives $92,223.43 and 45.1 $92,643.50 (the same
  ledger timing; 40 → $95,704.96, 50 → $91,152.27). The 2.9% buffer has **no effect at all** on 2016–2024: every value
  2.3–3.5, and switching the buffer OFF, reproduces #4's ledger to the cent.
- **Switches OFF:** eligibility −$31,255.11 (5 trades); the gate −$16,504.37 with DD +$8,748.91 (21 trades, 11
  losses); continuation −$11,459.52; initial stop −$4,856.23 with DD +$6,954.24; maximum hold −$2,319.71; trend
  filter +$3,611.52 with DD +$2,668.31.

### 3.2 Interactions and joint perturbations

- The strongest pairs: N × X (mean |interaction| $14,868.49, 45% of cells beyond $10k) and trend minimum return ×
  trend lookback ($12,403.36, 45%); trailing stop × N ($7,999.04). The Rise trigger (X with N) and the trend filter
  (threshold with lookback) are each one interacting unit.
- **Joint (256 draws each, every active input):** scale 0.25 R → median $68,226.85, p10 $41,533.71; 0.5 R →
  $59,191.39 / $22,722.29; 1 R → $44,348.68 / $10,993.24 (the completed study's $44,531.83 / $11,982.96 reproduced on
  this study's instrument); 1.5 R → $33,391.34 / $1,991.11. Not one of the 1,024 joint neighbours has #4's ledger.
- **Subsets at 1 R:** the brief's seven named inputs jointly → median $67,770.97; the other fourteen → $57,878.52; the
  six most sensitive (trailing stop, N, trend threshold, ATR multiple, X, trend lookback) → $43,976.52, which alone
  reproduce the whole-vector figure.
- **Verdict.** The low neighbourhood median comes from **several interacting rules** — the Rise trigger, the trailing
  stop and the trend filter — not from a single narrow discontinuity, and not from the retracement or the buffer.
  Even a quarter-radius joint perturbation costs ≈ $24k of median.

### 3.3 What the decisive changes do to the ledger

- Most single-input breaks (trailing stop 6.4, ATR 1.3, eligibility 17, trend lookback 31, trend threshold −1.7) **drop
  #4's 2020-06-26 → 2020-09-03 winner (+$14,064.09)**, usually adding a loss (4–5 losses against 3; losses up to
  −$14,100.97 against −$8,383.69). Eligibility 17 drops four winners. X 4.2 and N 93 **retime the 2016 entry from
  2016-06-29 to 2016-12-06**, shrinking that winner from $42,826.37 to $27,950.00, and add a loss.
- **The worst joint points lose the 2016-06-29 winner (+$42,826.37)**, and with it 46% of the centre's profit. Six of
  the eight lowest joint points make **no entry before October 2018** (four none before March 2022, one none before
  April 2020): the changed decision events
  cluster at 2016-06-28 (#4's fill), 2016-12-05/07 and 2018-10/11 (filled → vetoed or deferred decisions), so the
  rules that remain sit out the 2016–2021 advance. No decisive point extended a losing hold.

### 3.4 A nearby stable region?

Regional scan (64-draw neighbourhoods, common draws): #4 robust $25,514.36 (median $40,669 / p10 $10,360 / p90
$20,836). The best feasible nearby centre is **`da3fab879d969011`** (a joint 0.5 R point): centre $97,622.36, DD
$16,525.82, robust **$44,214.59** (median $63,991 / p10 $24,439), p90 $26,402.63. Shifting the trailing stop +1 R
(7.2%) gives robust $38,023.99 at a centre of $87,622.06; N −1 R (66 bars) $37,440.61. A nearby region improves the
neighbourhood by up to ≈ $19k of robust net, at more drawdown, but nothing near #4 reaches the ≈ $90k robust of the
best Rise (`06baffd6`) or breakout candidates.

<!-- SEARCH -->

## 5. Chronological test of the whole procedure (2016–2024 only)

Each cutoff re-ran the complete search (four cells, the frozen matched budgets, fresh seed labels) and the complete
qualification on its own training door, sealed and committed its fold selection, and only then opened the following
slice: C19 `eb5d8c5d…` (commit `2ea8481`), C21 `65a19878…` (`a10e24f`), C23 `bcaa0904…` (`a634d5b`). Slices are
measured on one continuous run from 2016 (positions, orders, indicators and interest carried across the boundary),
from the marked equity at the boundary close, with the drawdown peak initialized there. Window lengths differ:
training 1,006 / 1,511 / 2,012 sessions; slices 505 / 501 / 252 sessions. Tables: `results/tables/folds.md`.

### 5.1 Every fold qualified everything, and the qualification did not transfer

All 18–20 shortlist members qualified at every cutoff (G1–G5 in-sample). Their slices:

| Cutoff → slice | Policy primary | Training net (DD) | Selection robust | Slice net | Slice DD |
|---|---|---:|---:|---:|---:|
| C19 → 2020–21 | global = global-breakout `e6bd6602562b2d6a` | $90,528.99 ($19,059) | $81,840 | $54,745.85 | **$43,551.78** |
| | global-rise `f9593d0302262402` | $92,547.52 ($27,951) | $85,045 | $104,111.79 | **$35,452.57** |
| | informed-breakout `a3b0e354f61dbd33` | $82,582.32 ($17,771) | $71,956 | $34,121.19 | $25,677.16 |
| | informed-rise `6b4b904d4cdb19dc` | $69,756.44 ($26,569) | $66,553 | $36,007.15 | **$35,975.81** |
| | #4 (control) | $48,515.05 ($11,198) | $15,792 | $26,603.59 | $9,500.74 |
| C21 → 2022–23 | global = global-breakout `24da107fc8b9ba04` | $189,485 ($28,998) | $181,514 | **−$26,583.57** | **$60,325.86** |
| | global-rise `8d5718573b5d0733` | $162,078 ($29,907) | $154,617 | **−$20,112.50** | **$54,848.92** |
| | informed-breakout `def6c323c5d0cb84` | $125,458 ($24,993) | $108,008 | $5,091.22 | $29,720.50 |
| | informed-rise `3bd8dba188107826` | $114,214 ($21,296) | $110,467 | −$6,831.06 | **$37,261** |
| | #4 (control) | $75,119 ($13,817) | $21,377 | $7,604.30 | $6,578 |
| C23 → 2024 | global = global-breakout `48c7c0e9cd500dfd` | $117,610 ($19,973) | $106,528 | $909.08 | $15,163 |
| | global-rise `da5a7527c44ef5b6` | $86,321 ($23,990) | $83,262 | $0.00 (no position) | $0.00 |
| | informed-breakout `9fb4b0da95f0f712` | $142,531 ($23,807) | $107,260 | $14,033.94 | $14,778 |
| | informed-rise `3886d486e9c64f98` | $112,762 ($29,149) | $108,303 | $2,372.99 | $26,329 |
| | #4 (control) | $82,723 ($14,578) | $28,440 | $9,852.77 | $10,047 |

(Rounded figures in the table are from `results/folds/*/evaluation.json`; bold = above the $35,000 ceiling.)

- **By family and source (all qualified members).** 2020–21: global Rise median slice $22,578 (3 of 5 above the
  ceiling), global breakout $26,458 (2 of 5), informed Rise $33,749 (3 of 4), informed breakout $36,700 (0 of 4).
  2022–23: global Rise −$16,251 (4 of 5 above the ceiling), global breakout −$16,221 (4 of 5), informed Rise −$6,523
  (2 of 4), informed breakout +$7,913 (1 of 4). 2024: medians $335 / $909 / $898 / $8,648, none above the ceiling.
- **Why.** At C19 and C21 nearly every member had the maximum hold OFF and **trend retention ON** — at the trailing
  stop (5–13.5%) it sells 10–70% and keeps the rest until closes below a 105–190-session SMA — and was invested
  80–94% of training sessions. C19 members carried positions bought in December 2018 into the 2020 crash; C21 members
  carried positions bought in March–April 2020 into the 2022 decline and mostly made **one or no new entry** in the
  slice. The training neighbourhoods (p90 ≤ $35,000 on 384 draws) described 2016–2019 and 2016–2021, not the next
  regime.

### 5.2 Sequential policies (predeclared; costs and switch charges included)

| Policy | 2020–21 | 2022–23 | 2024 | Net 2020–2024 | Sequential DD |
|---|---:|---:|---:|---:|---:|
| global (= global-breakout = all) | $54,745.85 | −$26,583.57 | $909.08 | $28,871.36 | **$61,437.15** |
| global-rise | $104,111.79 | −$20,112.50 | $0.00 | $83,849.29 | **$57,011.94** |
| informed | $34,121.19 | −$6,831.06 | $14,033.94 | $41,124.07 | **$38,007.71** |
| informed-rise | $36,007.15 | −$6,831.06 | $2,372.99 | $31,349.08 | **$37,992.90** |
| informed-breakout (diagnostic) | $34,121.19 | $5,091.22 | $14,033.94 | $53,046.35 | $29,720.50 |
| #4 (fixed; chosen with later data) | $26,603.59 | $7,604.30 | $9,852.77 | $44,060.66 | $14,578.09 |
| prior primary `ec124684` (fixed; chosen with later data) | $33,732.74 | $8,049.84 | $25,099.33 | $66,881.91 | $17,772.79 |

Each switching policy switched twice (charged $50 per implied side, $100–$200 in all).

- **The procedure decision (§7.5): no independent policy is eligible** — every global policy breached the $35,000
  ceiling chronologically. The final primary is therefore **"chronologically unsupported"** by rule. The only switching
  policy inside the ceiling is informed-breakout, whose seeds were chosen with 2016–2024 in view; it is a diagnostic,
  not evidence for the procedure.
- **Rank persistence.** Development rank did not predict the slice: the C21 rank-1 member (selection robust $181,514)
  lost $26,584, and the C23 global rank-1 earned $909. This repeats the completed study's procedural diagnostic
  (Spearman −0.15 to −0.50) with genuinely independent searches.
- **Adaptation.** The fold results were not used to redesign anything; the C24 search and selection ran with the
  frozen procedure.



<!-- FINAL -->
