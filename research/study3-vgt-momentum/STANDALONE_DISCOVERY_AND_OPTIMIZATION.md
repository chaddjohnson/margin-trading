# Standalone discovery and optimisation (M1–M3)

Records: `results/records/develop-{A,B,C,D,H}.json` (sealed; payloads `panel`, `gates`, `selection`, `shortlists`,
`championTrades`, and the full search archive `archive.jsonl.gz`); tables `results/tables/gates-and-search.md`,
`selections.md`, `diagnostics.md`. Protocol: `PROTOCOL.md` §7–§8 (frozen before any result).

## 1. Mechanisms investigated (the denominator)

Twenty mechanisms were written down before any test (`FIRST_PRINCIPLES_AND_HYPOTHESES.md` 5A). Twelve panel entries
(E01–E12: ten distinct rules in seven groups) and the descriptive prototype X-CS were run. M16 (intraday drift) and M17
(volume) were excluded with reasons; M12–M14, M18–M20 were run as exit, sizing and modifier variants
(`EXIT_MECHANISM_STUDY.md`, `REENTRY_AND_CAMPAIGN_ANALYSIS.md`, and §7 below for sizing and modifiers). Every family's result, good or bad, is reported below
and in the tables.

## 2. M1 prototypes at untuned defaults (full history 2017-01-03 → 2023-12-29, in-sample, descriptive)

Net after interest and friction, fixed $100,000 slot, minute drawdown in parentheses (`develop-H` panel; the per-fold
panels are in `gates-and-search.md`).

| Entry | TPL (own OUT + hard 8% + trail 10% + R3F) | OX (own OUT + catastrophic 15%) | CX1 (hard 8% + trail 10%) | CX2 (20-session low close + catastrophic) |
|---|---:|---:|---:|---:|
| E01 peak proximity | +$28,123 | +$39,481 | +$28,123 ($41,585) | +$23,800 ($21,611) |
| E02 financing-hurdle drift | +$31,017 | +$85,240 | +$31,017 ($45,153) | +$26,737 ($25,457) |
| E03 directional efficiency | +$26,730 | +$24,179 | +$41,075 ($34,268) | +$32,357 ($36,178) |
| E04 CUSUM | +$4,286 | +$5,528 | +$10,247 ($50,379) | −$4,809 ($45,730) |
| E05 rising floor | +$34,548 | +$75,192 | +$25,062 ($32,166) | +$34,136 ($24,164) |
| E06 calm advance | +$25,451 | +$20,656 | +$31,309 ($30,365) | +$55,249 ($20,466) |
| E07 breakout acceptance | +$10,067 | +$9,709 | +$18,690 ($38,743) | +$9,709 ($38,925) |
| E08 compression → expansion | +$7,994 | +$56,300 | +$7,994 ($38,473) | +$8,571 ($25,571) |
| E09 upward trailing buy (minute) | +$31,104 | +$37,328 | +$58,942 ($55,128) | +$37,328 ($71,630) |
| E10 breakout trailing buy (minute) | +$7,343 | +$6,989 | +$16,295 ($42,715) | +$6,989 ($22,568) |
| E11 durable permission | +$22,558 | +$52,698 | +$22,558 ($34,980) | +$33,999 ($26,055) |
| E12 pullback continuation | +$17,352 | +$35,022 | +$25,609 ($25,191) | +$19,347 ($30,412) |
| X-CS closing strength (descriptive) | +$26,676 | +$16,152 | +$26,525 ($31,595) | +$28,175 ($33,614) |
| C-SMA / C-DON / C-TSM (own rules) | — | +$78,764 / +$25,207 / +$56,972 | — | — |
| C-ALR / C-AL / C-IDLE | — | +$78,296 / +$217,504 / $0 | — | — |

Over the same seven years, the monthly re-sized always-long slot C-ALR made +$78,296 (minute drawdown $52,628). Only
one untuned momentum prototype beat it on net — E02 with its own exit (OX, +$85,240, also above C-SMA's +$78,764). Several had lower drawdowns, e.g. E06/CX2 +$55,249 with $20,466, at roughly
half the exposure.

## 3. M1 gates (per history; at the TPL default)

| History | Passing | Failing (gate) |
|---|---:|---|
| A (2017–2019) | 6 | E01, E02, E05, E08, E11 (g1: < 6 closed trades or < 3 campaigns), E12 (g1, g2) |
| B (2017–2020) | 12 | — |
| C (2017–2021) | 12 | — |
| D (2017–2022) | 10 | E04 (g4: no default exit profitable), E09 (g3: default minute DD > $50,000) |
| H (2017–2023) | 11 | E09 (g3) |

## 4. M3 search

- **Design (frozen).** Per passing family and history: 1,024 Sobol points (Joe–Kuo, Gray code, seeded digital shift,
  seed = first 8 hex of sha256(`study3|<family>|<history>|global`)), 4 × 32 local points, a 16-point trade-path-distinct
  shortlist, 2d one-at-a-time neighbours each, and a 10 bps rerun of each shortlisted centre. Box: catalog parameters +
  h ∈ [3%, 15%], t ∈ [4%, 30%]; percentages quantised to 0.1 pp. Feasibility: minute DD ≤ $35,000, ≥ 6 closed trades,
  ≥ 3 campaigns, held in ≥ 3 calendar years, net > 0. Champion: highest neighbourhood median with ≥ 75% neighbourhood
  feasibility and 10 bps net > 0.
- **Compute.** 66,366 evaluations (A 7,765; B 15,614; C 15,614; D 13,024; H 14,349), all within the caps
  (16,000/history, 80,000 total); 26–96 seconds per history on one core (`results/logs/develop-*.txt`). Every point is
  archived with its parameters, Sobol index, stage, net, price gain, interest, friction, trades, campaigns, years held,
  minute and daily drawdown, exposure, dollar-days, worst/best lot, MAE/MFE, holds, entry/exit mixes and trade-path
  hash.
- **Feasible counts** (of ~1,300 per family): from 52 (E10, fold A) to 814 (E09, fold A); most families had 100–700
  feasible points per history, so selection was among many candidates, not a lucky few.
- **What the search found.** About half of the 51 champions (26) chose trailing stops of 14% or more, and all four fold
  picks chose 19–25%, together with slow own exits (E04 h_out 7.8–7.9 in B and C; the E06 fold picks' v_out 51–56%): it learned that
  staying invested through a bull market pays. The others (E10, E11 and several E01/E04/E05/E07/E08/E12 champions; E09 in fold A) chose tight
  trails of 4–13%. A few
  champions sat on a box boundary (listed in `selections.md`, e.g. E04 h_in = 1.0 in folds A and B, E03 e_in = 0.05 in
  fold A, E07 N = 10 in B and C, E11 D = 30% in H) — the box did not bind the result in a consistent direction.
- **Selection outcome.** P\* (highest neighbourhood median across families) was E06, E04, E04, E06 for folds A–D and E06
  for H; P0 (best untuned default) E09, E09, E09, E05 and E05 (H).

## 5. Search value and Study 1's warning

On matched windows, searched champions beat their untuned defaults in 8 of 12 families, and the searched procedure P\*
(+$253) beat the no-search P0 (−$11,890) by +$12,142. But both fail the rubric, and P\* was worse than most untuned
defaults summed over the same windows (e.g. E02 +$26,516, E05 +$24,526) and than every conventional control. As in
Study 1, more choice raised the development score (the picks' development nets were +$49,978, +$111,411, +$154,164 and
+$90,833) far more than the next window's result. Part of what these comparisons measure is the shared template, not
the family: under TPL/R3F a live campaign re-enters on price alone, so different signals can produce identical lots
(e.g. 2021: E02 default, E08 default, C-SMA/TPL and C-TSM/TPL all +$7,059; 2022: E02, E08 and C-TSM/TPL all −$10,718).
The secondary P\*-R rule (neighbourhood median ÷ drawdown) would have picked E04 instead of E06 in fold A and the same
picks otherwise (Σ +$20,553; descriptive, `results/tables/pstar-r-and-pareto.md`, amendment A2). Development nets are in-sample maxima over thousands of trials and are not expected returns.

## 6. Failed families and why (descriptive, full history)

- **E04 CUSUM:** good development scores in A–C, but the most aggressively exposed champion; it failed M1 in D after
  2022. Its fast up-detection bought into the COVID crash five sessions before the closing low (good) and the 2022
  rallies (bad).
- **E09 upward trailing buy:** near-continuous exposure (≈ 0.96 at CX1); the largest drawdowns (≥ $55k by default);
  failed g3 in D and H.
- **E10 breakout trailing buy, E08 compression, E12 pullback:** few events and small edges; E12 lost in 2023.
- **E02 financing hurdle:** its champions lost (−$22,694 over 2021–2023) while its default earned (+$6,751 over the same
  windows) — an instance of the search fitting noise.
- **X-CS closing strength** (descriptive only): middling (+$26,676 TPL) with drawdowns $31–55k; not searched, as frozen.

## 7. Sizing (brief H) and modifiers (full history, E02 defaults; descriptive; `sizing.md`, `diagnostics.md`)

| Variant | Net | Borrowed $-days | Z0 scaled to the same $-days | Minute DD |
|---|---:|---:|---:|---:|
| Z0 full $100,000 at entry | +$31,017 | 151.7M | +$31,017 | $45,153 |
| Z1 progressive thirds (+3%, +6%) | +$21,776 | 122.3M | +$24,999 | $33,237 |
| Z2 volatility target ($25k tranches) | +$27,864 | 140.3M | +$28,691 | $43,043 |

At matched capital, progressive commitment earned less than full sizing (−$3,223) and volatility targeting slightly less
(−$827); both lowered the drawdown mainly by holding less. Modifiers on E02/TPL: the exhaustion filter A1 +$35,387 and
the weekly clock A2 +$29,376 against +$31,017 without them; the single-threshold ablation A3 churned (−$7,711,
`REENTRY_AND_CAMPAIGN_ANALYSIS.md` §4).
