# Report — growth140-vgt-stable: Growth 1.4.0 VGT follow-up (archive audit, #4 sensitivity, stable search, chronology)

Study period 2026-11-07 (UTC). Protocol `PROTOCOL.md` (sha256 `cf850484…1a203`) frozen 14:40:30Z and committed
(`a836cd5`) before the audit re-evaluation, the sensitivity study and every search. Amendment log head: **O1** (an
operational incident, no protocol or code change). All figures are on the standalone $100,000 fixed notional: no
compounding, 11% simple interest by calendar day on 365 days, 5 bps per side, $0 commission. "Drawdown" is the maximum
minute drawdown of the marked net in dollars; its percentage is the dollar figure ÷ $100,000; the ceiling is
**$35,000 (35%)**.

## 1. Outcome

- **Did any candidate earn more than #4 within the $35,000 ceiling, and was it stable?**
  - **On development (2016–2024), yes.** All 10 frozen finalists earned $104,613.63–$184,212.29 against #4's
    $92,575.71, with development drawdowns $19,344.80–$31,404.29 (all ≤ $35,000). All met the stability criteria on
    independent confirmation draws: p90 drawdown ≤ $35,000 ($24,256.20–$34,621.32) and p10 net > 0
    ($52,707.91–$117,515.90).
  - **On 2025–2026, no.** #4 earned **$52,892.75** (validation drawdown $9,916.01). The best finalist earned
    $45,464.93; seven of the ten earned less than $20,000 or lost money (five lost); three broke the ceiling on
    2025–2026 and four over the whole run.
  - **Over the full history (2016 → 2026-10-30), four finalists out-earned #4's $145,468.46 within the ceiling**, all
    through development profit. Only **`08500a60ec56cfae`** (rank 9, low-drawdown role, global Rise) passed every frozen
    final gate: $160,974.09 net (+$15,505.63) with a $19,344.80 drawdown (+$4,766.70; 19.34% of the $100,000
    notional). On 2025–2026 it earned $45,464.93 with a $17,240.60 drawdown.
  - **No candidate improved profit with equal or lower drawdown than #4**, on any window. The higher-profit ones
    accepted $4,766.70–$16,822.20 of extra full-history drawdown (§6.3).
- **The primary failed, and the procedure was chronologically unsupported before it was opened.**
  - The frozen primary `6aeb2e0f3918e574` was rank 1 on development: $128,798.47, confirmation median $130,081.60,
    p10 $117,018.04.
  - On 2025–2026 it earned $14,488.09 with a **$37,172.62** validation drawdown. Its whole-run drawdown was $43,660.50.
    It failed V1, V2, V4 and V5.
  - The chronological test had already shown the independent procedure breaching the ceiling in 2020–2024. Every
    independent sequential policy exceeded $35,000 ($57,011.94–$61,437.15), so by the frozen rule the primary was
    labelled "chronologically unsupported" before the final window opened.
- **What the evidence supports.**
  - Development-window stability, however broad, did not transfer. Configurations with 384-draw p90 drawdowns at or
    below $35,000 at every cutoff routinely broke the ceiling in the next slice.
  - The search consistently favoured high-exposure trend retention (69–94% invested), which won 2016–2021 and lost in
    2020, 2022 and 2025.
  - #4 (37% exposure) stayed within $15,000 everywhere: development, every fold slice and 2025–2026. It was chosen in
    the browser with all of 2016–2026 in view, so it is a control, not an independent result.
- **The audit (§2).** The completed study never explored Rise or any gate-ON structure beyond rung 1:
  - Rise had 1,962 rung-1 centres against breakout's 21,078. None was feasible under the old median and concentration
    floors, so none reached rung 2.
  - Under this study's rules six of the eight structural cells hold configurations that qualify on 384 independent
    draws; they were "poorly represented at promotion", not weak.
- **#4's sensitivity (§3).**
  - The 45% retracement and the 2.9% buffer are **not** knife-edges: the buffer has no effect on 2016–2024, and 44.9
    or 45.1 changes net by under $400.
  - The low neighbourhood median ($44,348.68) comes from several interacting rules — the trailing stop, the Rise
    trigger (X × N) and the trend filter (threshold × lookback). Their changes drop #4's 2020-06-26 winner or the
    2016-06-29 winner, which is 46% of its development net.
  - A nearby region (`da3fab87`) raises robust net from $25,514 to $44,215 at more drawdown.
- **Exposure and integrity.**
  - Both windows are previously examined history.
  - Every selection was frozen and committed before its following slice, and before 2025–2026.
  - #4's browser parity is exact, and the study reports the best results observed within the tested search.
  - A historical drawdown ceiling does not bound a future drawdown.


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

## 4. The search (four cells per cutoff, matched budgets)

| Cutoff | Fresh evaluations (distinct configurations) | Failed | Runtime | Peak job memory | Global Rise / breakout islands (saturation) | Qualified / shortlisted |
|---|---:|---:|---:|---:|---|---:|
| C19 (D19) | 364,211 | 0 | 34 min | 6.24 GiB | 3 (extended) / 2 (saturated) | 18 / 18 |
| C21 (D21) | 360,304 | 0 | 44 min | 7.63 GiB | 3 (extended) / 2 (saturated) | 20 / 20 |
| C23 (D23) | 369,005 | 0 | 62 min | 9.05 GiB | 3 (extended) / 2 (saturated) | 20 / 20 |
| C24 (D24) | 322,475 | 0 | 58 min | 9.71 GiB | 2 (saturated) / 2 (saturated) | 17 / 18 |

- **Sources and families.** Each cutoff ran global/rise and global/breakout (independent: fresh seeds, the completed
  study's schema-derived boxes, no #4 or archive information) and informed/rise and informed/breakout (seeded by #4,
  its best regional neighbour `da3fab87` and the qualified audit configurations, `results/seeds/SEEDS.json`). Every
  cell produced a shortlist at every cutoff; no family was empty. Unique ledgers on the screens: 2,312–2,908 of 4,096
  (Rise) and 3,842–4,041 (breakout). Every evaluation (fresh, archive hit or failed) is in the job archives
  (`results/archive/MANIFEST.json`).
- **Options covered.** Every switch was searched in both states, every trend method, eligibility policy and continuation
  method (breakout without eligibility). The structural shortlist slots kept the other maximum-hold setting and the other
  gate setting in every family where a feasible centre existed: **maximum-hold-ON breakouts** reached the shortlist at
  C19, C23 and C24 (C24: `22d35c82` and `4813738e`, both hold 22 days, ranks 2 and 4). Growth 1.4.0 has no trade-spacing
  input, so none was searched (§6.2 of the protocol).
- **What the search found at C24.** Development profit $104,613.63–$184,212.29 within the ceiling for the finalists
  (#4 $92,575.71), with confirmation p90 drawdowns $24,256–$34,621 (#4 $22,282). The winners share one shape: eight
  of ten use trend retention (sell 20–71% at the trailing stop, keep the rest until a close below a 117–200-session SMA;
  the two informed breakouts use a 3.3–3.9 × ATR initial stop instead), seven of ten have the maximum hold OFF (the
  others 12–22 days), trailing stops 6.6–13%, exposure 69–88% (#4 37%). For seven of the ten the largest winning
  episode is one multi-year hold ending in January 2022 (2018-12 or 2020-03/04 → 2022-01; 32–96% of the full-history
  net).
- **Refinement and saturation.** The fine refinement (schema steps) accepted a move from 23 of the 24 global starts and
  from 10 of the 16 informed starts across the four cutoffs. The global/rise cell needed its third island at C19–C23 and
  saturated after two at C24; global/breakout saturated after two everywhere. Within this budget, more islands
  improved neither the best feasible rung-1 robust net nor the frontier hypervolume by more than 5%.



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



## 6. Final selection (frozen before 2025–2026) and the final comparison

### 6.1 The frozen selection

`FROZEN_SELECTION.json` (sha256 `a2a99883…f56c6e`, read-only, committed `ebf3d74` at 18:27Z before the FULL door
opened): the 17 C24-qualified members in banded rank order, capped 3 / 3 / 2 / 2 per cell, gave **10 finalists**. The
chosen procedure was none (§5.2), so the primary is the rank-1 finalist **`6aeb2e0f3918e574`, flagged
"chronologically unsupported"**. Roles: primary `6aeb2e0f` (also the best Rise); best breakout `22d35c82`; best
informed `fe457021`; low drawdown `08500a60`. Exact effective settings of every finalist are in §6.4 and the frozen
file.

### 6.2 Results (one continuous run per configuration, 2016-01-04 → 2026-10-30, FULL door opened once)

- **#4 full-history parity: exact.** $145,468.46 total marked and realized net, $14,578.10 (14.58%) maximum minute
  drawdown, 10 wins / 3 losses / 0 breakeven, 13 closed, 37.0% exposure, flat at the end. No discrepancy.
- **Continuity.** The FULL door's 2016–2024 sessions have D24's digest (2,264 sessions; validation 459 sessions,
  yVal 1.82), and every finalist's equity at the 2024 close equals its frozen C24 development net to the cent.
- **Coverage.** No missing session in either window; all 18 + 3 early closes match the NYSE calendar. Five sessions
  have no closing print (2016-04-06, 2016-11-25, 2019-08-12, 2025-08-29, 2025-09-05). 1,620 development and 171
  validation sessions have bars in fewer than 90% of their scheduled minutes — minute bars exist only for traded
  minutes — and every run treats them identically, so comparability is unaffected.
- **Configurations evaluated on the final window:** 4,381 (17 centres, their 10 and 20 bps runs and 2 × 128 test
  neighbourhoods each), 0 failed.

Development rank order; validation net from the marked equity at the 2024 close; validation drawdown with its peak at
that close; W/L counts new validation trades (a carried-in position is split at the boundary); dollar losses are the
closed losing trades of the window; "open" = unrealized P&L at 2026-10-30.

| Rank / role | Configuration | Dev net | Dev DD (peak → trough) | Dev confirm median / p10 / p90 | Val net | Val DD (peak → trough) | Val W/L (losses) | Full net | Full DD | Full W/L | Exposure | Open | Largest episode share (full) | V-gates |
|---|---|---:|---|---|---:|---|---|---:|---:|---|---:|---:|---:|---|
| control | **#4** `420cd989e4fa7749` | $92,575.71 | $14,578.10 (2021-08-30 → 2023-10-03) | $41,155.66 / $12,228.96 / $22,282.47 | **$52,892.75** | $9,916.01 (2025-10-29 → 2026-04-13) | 2/0 ($0.00) | **$145,468.46** | **$14,578.10** | 10/3/0 | 37.0% | $0.00 | 29% | pass |
| 1 primary | `6aeb2e0f3918e574` global Rise | $128,798.47 | $25,300.39 (2020-02-19 → 2020-04-03) | $130,081.60 / $117,018.04 / $31,796.14 | $14,488.09 | **$37,172.62** (2025-01-06 → 2025-04-07) | 0/0 ($0.00) | $143,286.56 | **$43,660.50** | 5/1/0 | 72.3% | $6,793.13 | 50% | fail V1 V2 V4 V5 |
| 2 best breakout | `22d35c826fc0dc86` global breakout | $142,906.51 | $30,562.03 (2020-02-19 → 2020-03-23) | $135,938.73 / $117,515.90 / $33,583.37 | −$34,324.09 | **$40,110.34** (2025-01-06 → 2026-10-30) | 1/8 (−$20,805.74) | $108,582.42 | **$50,675.61** | 6/15/0 | 74.7% | −$5,334.12 | 96% | fail V1–V5 |
| 3 best informed | `fe457021bef9164d` informed breakout | $170,866.20 | $23,458.02 (2020-02-19 → 2020-03-23) | $136,383.95 / $97,944.48 / $31,231.69 | −$22,875.71 | $28,913.82 (2025-10-29 → 2026-10-30) | 3/3 (−$31,413.82) | $147,990.49 | $29,495.50 | 19/4/0 | 75.5% | −$5,334.12 | 32% | fail V3 V4 V5 |
| 4 | `4813738e2478d47c` global breakout | $146,608.92 | $30,590.32 (2020-02-19 → 2020-03-23) | $128,378.08 / $116,724.43 / $34,020.53 | −$13,232.75 | $20,876.79 (2025-10-29 → 2026-08-24) | 1/6 (−$13,597.30) | $133,376.18 | **$36,377.44** | 6/11/0 | 69.8% | $0.00 | 78% | fail V2 V3 V4 V5 |
| 5 | `c7f676b4957cc4c5` informed breakout | $184,212.29 | $22,822.33 (2020-02-19 → 2020-03-23) | $128,308.88 / $92,252.13 / $31,768.26 | −$26,129.00 | $30,604.15 (2025-01-06 → 2026-10-30) | 3/5 (−$41,140.00) | $158,083.28 | $31,400.30 | 19/6/0 | 76.2% | $0.00 | 31% | fail V3 V4 V5 |
| 6 | `d7306d1d4a485195` global breakout | $136,521.03 | $29,558.80 (2020-02-19 → 2020-03-23) | $122,230.00 / $101,584.73 / $31,032.91 | $23,553.72 | $24,055.60 (2025-01-06 → 2025-04-07) | 1/0 ($0.00) | $160,074.75 | $29,558.80 | 9/0/0 | 88.1% | −$451.39 | 51% | fail V5 |
| 7 | `bab232860ac1b135` global Rise | $118,977.95 | $29,770.11 (2021-12-27 → 2023-05-04) | $105,696.38 / $83,479.27 / $34,304.08 | $25,204.48 | $18,738.49 (2025-10-29 → 2026-02-05) | 1/0 ($0.00) | $144,182.43 | $29,770.11 | 7/4/0 | 76.6% | $7,191.26 | 36% | fail V5 |
| 8 | `c4bfe70698b3b3f3` informed Rise | $113,170.35 | $31,404.29 (2021-12-27 → 2022-10-13) | $103,438.07 / $90,687.83 / $34,621.32 | $17,232.80 | **$37,926.03** (2025-01-06 → 2025-04-07) | 0/0 ($0.00) | $130,403.15 | **$47,519.10** | 5/0/0 | 81.6% | $3,038.05 | 39% | fail V1 V2 V4 V5 |
| 9 low drawdown | **`08500a60ec56cfae`** global Rise | $115,509.15 | $19,344.80 (2021-12-27 → 2023-10-26) | $100,548.82 / $62,761.86 / $24,256.20 | $45,464.93 | $17,240.60 (2025-10-29 → 2026-02-04) | 1/0 ($0.00) | **$160,974.09** | **$19,344.80** | 5/3/0 | 68.8% | $9,376.22 | 32% | **pass** |
| 10 | `b61eea2a663caac5` informed Rise | $104,613.63 | $20,314.54 (2020-02-19 → 2020-05-14) | $83,303.60 / $52,707.91 / $27,866.06 | −$5,971.06 | $23,833.37 (2025-10-29 → 2026-07-29) | 1/0 ($0.00) | $98,642.58 | $23,833.37 | 8/0/0 | 71.5% | −$6,980.12 | 41% | fail V3 V4 V5 |

Bold drawdowns exceed $35,000. Validation neighbourhoods (2 × 128 on FULL): the passing `08500a60` had median
validation net $44,711.82, p10 $38,259.72 and p90 whole-run drawdown $24,816.64; #4 $50,332.49 / $39,224.80 /
$22,863.03. At 10 bps, `08500a60` kept $45,239.61 on validation (#4 $52,632.61). Full table:
`results/tables/final.md`.

### 6.3 Against #4 and the completed study's frozen members (same dates and accounting)

- **No finalist earned more than #4 on 2025–2026** (Δ validation net −$7,427.82 for `08500a60` to −$87,216.84), and none
  had a lower validation drawdown (Δ +$7,324.59 to +$30,194.33).
- **Full history (2016 → 2026-10-30)**, within the ceiling, four finalists exceed #4's $145,468.46 — all on development
  profit:

  | Configuration | Full net | Δ vs #4 | Full DD | Extra DD accepted | $ of extra net per $ of extra DD | Final gates |
  |---|---:|---:|---:|---:|---:|---|
  | `08500a60ec56cfae` | $160,974.09 | +$15,505.63 | $19,344.80 | +$4,766.70 | 3.25 | pass |
  | `d7306d1d4a485195` | $160,074.75 | +$14,606.29 | $29,558.80 | +$14,980.70 | 0.97 | fail V5 |
  | `c7f676b4957cc4c5` | $158,083.28 | +$12,614.82 | $31,400.30 | +$16,822.20 | 0.75 | fail V3 V4 V5 |
  | `fe457021bef9164d` | $147,990.49 | +$2,522.03 | $29,495.50 | +$14,917.40 | 0.17 | fail V3 V4 V5 |

  **No candidate improved profit with equal or lower drawdown than #4** — on development, on 2025–2026 or over the full
  history.
- **#4's winning episodes.** #4 has ten winners (2016-06-29 +$42,826.37; 2019-02-01 +$8,688.95; 2020-04-21 +$4,073.47;
  2020-06-01 +$395.69; 2020-06-26 +$14,064.09; 2021-05-14 +$8,070.34; 2023-11-03 +$14,514.22; 2024-05-07 +$8,326.27;
  2025-05-02 +$27,209.07; 2026-04-10 +$25,683.68). Over the whole run (the predeclared matching rule):
  - `08500a60`: 0 retained, 5 retimed, 5 lost (2020-04-21, 2020-06-01, 2020-06-26, 2024-05-07, **2026-04-10
    +$25,683.68**); no genuinely new winning move — its edge is holding through 2020-04 → 2022-01 (+$50,974.41) instead
    of #4's shorter 2020–2021 trades; 3 losses (−$8,744.93) against #4's 3 (−$8,383.69).
  - `fe457021` and `c7f676b4`: 2 retained, 6 retimed, 2 lost (the small 2020 re-entries), **10 new winning moves**, but
    4–6 losses of −$38,910.24 to −$47,707.50 against #4's −$8,383.69.
  - The others lost 4–6 of #4's winners: the 2026-04-10 move (`6aeb2e0f`, `d7306d1d`, `bab23286`, `c4bfe706`,
    `b61eea2a`, and `08500a60` above) or the 2025-05-02 move (`22d35c82`, `4813738e`), plus #4's short 2020 trades.
    Counting only entries after the 2024 close, `6aeb2e0f` and `c4bfe706` lost both of #4's validation winners (they
    were still in positions entered in August 2024 in May 2025). Validation-window matching is sparse (#4 has two validation
    winners) and is reported as inconclusive.
- **The completed study's frozen members** (re-run here on the same dates): validation −$28,619.47 to +$19,348.96, all
  below #4; `c3c10f60` alone passed V1–V4 (validation +$3,579.77) and failed V5. Their previous figures reproduce to
  the cent (e.g. `ec124684`: −$28,619.47, validation DD $34,405.71, whole run $35,200.55).

### 6.4 Exact settings (Growth 1.4.0 keys; VGT, 1d, 5 bps; every input not listed is inactive)

- `6aeb2e0f3918e574` (C24/global/rise top): entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=17, recentLowLookbackBars=120, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=115, trendSlopeMinimumPercent=-3.5, eligibilityEnabled=true, eligibilityPolicy=deterioration, eligibilityMaxAgeSessions=23, eligibilityDeteriorationDropPercent=6.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=9, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=20, retentionSmaSessions=160, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=150, breakoutBufferPercent=3.5, breakoutFormationBars=2
- `22d35c826fc0dc86` (C24/global/breakout top): entryMethod=trend_breakout, breakoutSmaSessions=100, breakoutSlopeComparisonSessions=40, breakoutPriorHighSessions=5, trendFilterEnabled=false, drawdownRecoveryGateEnabled=false, trailingStopPercent=12.5, maximumHoldEnabled=true, maximumHoldDays=22, intradayLossBufferEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=60, retentionSmaSessions=180, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=classic_d1, continuationWindowSessions=190, classicPullbackPercent=17, classicReboundPercent=2.6
- `fe457021bef9164d` (C24/informed/breakout top): entryMethod=trend_breakout, breakoutSmaSessions=90, breakoutSlopeComparisonSessions=33, breakoutPriorHighSessions=5, trendFilterEnabled=false, drawdownRecoveryGateEnabled=false, trailingStopPercent=7.4, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=32, initialStopAtrMultiple=3.9, retentionEnabled=false, continuationEnabled=true, continuationMethod=classic_d1, continuationWindowSessions=180, classicPullbackPercent=17.3, classicReboundPercent=3.06
- `4813738e2478d47c` (C24/global/breakout profit): entryMethod=trend_breakout, breakoutSmaSessions=80, breakoutSlopeComparisonSessions=50, breakoutPriorHighSessions=30, trendFilterEnabled=false, drawdownRecoveryGateEnabled=false, trailingStopPercent=13, maximumHoldEnabled=true, maximumHoldDays=22, intradayLossBufferEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=60, retentionSmaSessions=180, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=classic_d1, continuationWindowSessions=150, classicPullbackPercent=17, classicReboundPercent=2.6
- `c7f676b4957cc4c5` (C24/informed/breakout profit): entryMethod=trend_breakout, breakoutSmaSessions=97, breakoutSlopeComparisonSessions=26, breakoutPriorHighSessions=5, trendFilterEnabled=false, drawdownRecoveryGateEnabled=false, trailingStopPercent=7.4, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=27, initialStopAtrMultiple=3.3, retentionEnabled=false, continuationEnabled=true, continuationMethod=classic_d1, continuationWindowSessions=161, classicPullbackPercent=17.2, classicReboundPercent=2.34
- `d7306d1d4a485195` (C24/global/breakout hold-alternative): entryMethod=trend_breakout, breakoutSmaSessions=100, breakoutSlopeComparisonSessions=40, breakoutPriorHighSessions=20, trendFilterEnabled=false, drawdownRecoveryGateEnabled=false, trailingStopPercent=7.5, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=62, retentionSmaSessions=200, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=classic_d1, continuationWindowSessions=110, classicPullbackPercent=11.1, classicReboundPercent=4.2
- `bab232860ac1b135` (C24/global/rise hold-alternative): entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=8, recentLowLookbackBars=60, trendFilterEnabled=false, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=22, drawdownRecoveryGateEnabled=true, dipLookbackSessions=40, dipThresholdPercent=6.5, recoveryRetracementPercent=30, recoveryConfirmationSessions=10, trailingStopPercent=8, maximumHoldEnabled=true, maximumHoldDays=12, intradayLossBufferEnabled=false, initialStopEnabled=true, initialStopAtrSessions=25, initialStopAtrMultiple=1.5, retentionEnabled=true, retentionSellPercent=28, retentionSmaSessions=190, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=ma_cross, continuationWindowSessions=190, crossSmaBars=20, crossRisingBars=19, crossMinimumSlopePercent=0.2, crossMarginPercent=1.5
- `c4bfe70698b3b3f3` (C24/informed/rise top): entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=19.9, recentLowLookbackBars=154, trendFilterEnabled=false, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=14, drawdownRecoveryGateEnabled=false, trailingStopPercent=10.9, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=71, retentionSmaSessions=179, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=shallow_pullback, continuationWindowSessions=141, uptrendSmaBars=147, uptrendSlopeBars=20, uptrendMinimumRisePercent=2.7, pullbackMinimumPercent=2.3, pullbackMaximumPercent=6.5, recoveryPercent=1.66
- `08500a60ec56cfae` (C24/global/rise gate-alternative): entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=1, recentLowLookbackBars=80, trendFilterEnabled=true, trendMethod=price_change, trendChangeLookbackSessions=10, trendChangeMinimumReturnPercent=-5, eligibilityEnabled=true, eligibilityPolicy=reset_renew, eligibilityMaxAgeSessions=24, eligibilityResetDropPercent=5.5, eligibilityRenewalReboundPercent=5, drawdownRecoveryGateEnabled=true, dipLookbackSessions=90, dipThresholdPercent=2, recoveryRetracementPercent=30, recoveryConfirmationSessions=4, trailingStopPercent=9, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=55, initialStopAtrMultiple=1, retentionEnabled=true, retentionSellPercent=50, retentionSmaSessions=160, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=ma_cross, continuationWindowSessions=50, crossSmaBars=110, crossRisingBars=19, crossMinimumSlopePercent=0.4, crossMarginPercent=2.75
- `b61eea2a663caac5` (C24/informed/rise profit): entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=7.6, recentLowLookbackBars=17, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=105, trendSmaComparisonSessions=18, eligibilityEnabled=true, eligibilityPolicy=maximum_extension, eligibilityMaxAgeSessions=13, eligibilityMaximumExtensionPercent=5.2, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.6, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=49, retentionSmaSessions=117, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=shallow_pullback, continuationWindowSessions=138, uptrendSmaBars=105, uptrendSlopeBars=15, uptrendMinimumRisePercent=2.6, pullbackMinimumPercent=1.9, pullbackMaximumPercent=10.1, recoveryPercent=1.09
- `420cd989e4fa7749` (#4): the brief's settings (PROTOCOL.md; `src/growth140-vgt-s8m/space.ts` `control4`).

## 7. Interpretation

- **Profit against drawdown.**
  - On development the finalists span a frontier from #4 ($92,575.71 / $14,578.10) through the prior primary
    `ec124684` ($133,078.09 / $17,772.79) to `c7f676b4` ($184,212.29 / $22,822.33). Buying profit with exposure looked
    cheap in-sample.
  - Over the full history, the frontier among everything tested is #4 ($145,468.46 / $14,578.10) and `08500a60`
    ($160,974.09 / $19,344.80); everything else is dominated.
  - On 2025–2026 alone, #4 dominates every finalist.
- **Why the selected configurations failed forward.** Wide trailing stops plus trend retention (a long-SMA exit for
  the retained part) and no losing-hold limit keep a position through deep pullbacks. That paid in 2016–2021 (one
  2018/2020 → 2022 hold is 32–96% of most finalists' full-history net) and cost in 2020 (C19 slice), 2022 (C21 slice)
  and 2025 (the January–April 2025 drawdowns of `6aeb2e0f`, `c4bfe706` and `d7306d1d`). #4's gate, its 20-session
  eligibility window, its −2% trend floor and its 21-day losing hold keep it out of exactly those periods (37% exposure).
- **Stability evidence was in-sample.** Every fold qualified every shortlist member (G1–G5 at 384 draws), and the
  slices then broke the ceiling for 4 of 5 global Rise and 4 of 5 global breakout members in 2022–23. Neighbourhood
  robustness on a training window measured sensitivity to parameters, not to the next regime.
- **The audit's "rescued" regions did not change the outcome.** Rise and gate-ON structures reached every shortlist
  this time (structural slots, family cells), and the C24 Rise members out-earned #4 on development; they shared the
  breakouts' forward behaviour except `08500a60` (gate ON, dip threshold 2%, a 1 × ATR initial stop, retention 50% /
  SMA 160), the finalist with the lowest 2025–2026 drawdown ($17,240.60).
- **Further work offers little evidence of benefit within this design.** More islands did not move the frontier by >5%
  (saturation), the fold evidence already failed the procedure, and the one passing finalist was not the primary.
  A different question — for example an explicit exposure cap, or a losing-hold limit made mandatory — would need a new
  study with genuinely new data for its test (after 2026-10-30). Selection for this study is closed.

## 8. Limitations and disclosures

- **Prior knowledge.** Both windows were examined by earlier work; #4 was selected in the browser on 2016–2026; the
  completed study's outcomes (including its 2025–2026 failure) were known when this design was written. The informed
  branch inherits that information (its seeds were chosen on 2016–2024 and 2016–2026) and was therefore a diagnostic in
  the folds and was never eligible to be the chosen procedure.
- **Design informed by history.** The space, the instrument, the families and the fold boundaries were chosen with
  earlier VGT studies in view; fresh seeds are not fresh data. The fold slices (2020–2024) were inside every earlier
  development window.
- **Arithmetic diagnostics.** "Net without the largest winning episode" and the 50% haircut are arithmetic, not engine
  replays (removing a trade changes later decisions).
- **Sequential policies.** Switch charges approximate liquidating/adopting a position at 5 bps of the $100,000
  notional per side; boundary-crossing positions are attributed by the incoming configuration's own marks.
- **Operational incident O1** (AMENDMENTS.md): P0 failed on a pilot job-name collision; the archive-only audit and two
  development jobs started before P0 had passed and were stopped within a minute; P0 was then rerun and passed in full
  before any result was used. No protocol or code change.
- **Pre-freeze openings.** The door build, the smoke check and the engineering pilot (including a pilot run of the P0
  checks on D19–D24 and of the sensitivity code on D19) ran before the freeze; only engineering booleans, timings and
  counts were read.
- **Engine scope.** The engine exposes no slippage or stop-fill inputs; costs were stressed at 10 and 20 bps. Nothing
  was deployed, traded or recommended for live use.

## 9. Memory, containment and commands

- **Containment.** Every evaluating stage ran in a transient systemd user service inside `growth140-stable.slice`
  (`MemoryHigh=44G`, `MemoryMax=48G`, `MemorySwapMax=0` on the slice — bounding all study processes together — and on
  each unit; `KillMode=mixed`, `Restart=no`), in its own cgroup separate from the tmux/Claude scope (verified in
  `/proc/<pid>/cgroup`). Host checks (MemAvailable ≥ 16 GiB, memory PSI avg60 ≤ 10) preceded every launch; the host
  had 53–56 GB available throughout.
- **Measured** (`results/memory-summary-study.json`, every 10-second sample in `results/memory/`):

  | Job | Workers | Runtime | Fresh evaluations | Peak job memory | Worker RSS median / max | Worker ArrayBuffers max |
  |---|---:|---:|---:|---:|---|---:|
  | search C19 / C21 / C23 / C24 | 14 | 34 / 44 / 62 / 58 min | 364,211 / 360,304 / 369,005 / 322,475 | 6.24 / 7.63 / 9.05 / **9.71 GiB** | 415–656 / 455–717 MiB | 110–254 MiB |
  | qualify C19–C24 | 14 | 2–4 min | ≈ 18,050 each | 5.53–8.41 GiB | ≤ 714 MiB | ≤ 254 MiB |
  | audit re-evaluation / sensitivity | 14 | 9 / 10 min (incl. O1) | 26,840 / 6,317 | 8.49 / 7.99 GiB | ≤ 721 MiB | 226 MiB |
  | fold evaluations | 14 | ≤ 1 min | 2,600 each | 6.20–7.84 GiB | ≤ 711 MiB | ≤ 201 MiB |
  | final | 14 | 1.5 min | 4,386 | 9.45 GiB | ≤ 788 MiB | 104 MiB |

  No `memory.high`, `memory.max` or OOM event, no swap, no failed evaluation, no restart. The 16 GiB stop threshold
  was never approached (peak 9.71 GiB = 22% of MemoryHigh). Queues stayed ≤ 4,068 keys, in-flight ≤ 28, the LRU at its
  50,000 cap.
- **Commands:** `RUN_COMMANDS.md`. Every stage resumes by rerunning its command (verified in the pilot: stop-after,
  SIGKILL and eviction runs reproduced the uninterrupted search exactly; the fold evaluation's stop/resume likewise).
- **Trial archive:** `results/archive/` (MANIFEST.json with sha256 per shard and per SQLite file). Committed: every
  job's points and configurations except the four searches' (their fits — every centre with its neighbourhood
  summary — are committed; their 65–81 MB point shards and ≈ 19 MB configuration shards are kept on disk and
  git-ignored, hashes in the manifest).

## 10. Verification

- **P0 parity** (sealed `results/parity/parity.json`): the worker path against the browser runner on 2016–2024 for 12
  configurations — 0 differences in net, realized, minute drawdown and its times, counts, exposure, and every trade's
  times, fills and net; door causality 36/36 (D19/D21/D23 runs equal the D24 equity at their last close); archive reuse
  241/241 identical.
- **#4:** development reproduction exact ($92,575.71 / $14,578.10); full-history browser parity exact.
- **Continuity:** the FULL door's 2016–2024 span equals D24's session digest; every finalist's 2024-close equity equals
  its frozen development net.
- **Tests:** `src/growth140-vgt-stable/tests/study.test.ts` (8 tests, synthetic) pass; `tsc --noEmit` and eslint clean.
  The full `npm test` ran after the final comparison in a capped unit (`results/runlogs/npm-test.log`): 1,230 tests,
  1,219 pass, 7 fail, 4 skipped — exactly the repository's known pre-existing failures (six open the lowercase
  `src/app/allin-original.ts`; the Study 7 runner's reconciliation is pinned to a 2026-10-29 data end). This study added
  8 passing tests and no failure.
- **Integrity:** the protocol, code closure and door pins verified at every stage; seals and door openings logged
  (`results/seals.jsonl`, `results/doors.jsonl`); the FULL door was opened once.

