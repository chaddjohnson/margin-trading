# Neighbourhoods and chronology (brief §8–§10, PROTOCOL §8–§10)

Sources: `results/records/robustness.json` and its payloads; `results/tables/robustness.md`, `paths-full.md`,
`verdict.md`. Parameter draws are not independent market observations; four annual windows are four dependent regimes.

## 1. Folds: training-fitted neighbourhoods versus the next window (post-selection)

J128 = 128 joint draws within ±10% of each declared range (re-entry, sizing and discrete dimensions fixed); OAT = ±1 and
±2 steps of 5% of each range, discrete dimensions flipped. Development rows are the training-fitted center; "next
window" rows are a post-selection sensitivity of the same neighbours over the following year (window increment, minute
DD), never used to move the center.

| Fold pick | Data | Center | J128 P10 / median / P90 | Net > 0 | DD ≤ $35k | Both | Retention | OAT min / median / max |
|---|---|---:|---|---:|---:|---:|---:|---|
| A E06 × XV + Z1 | ≤2019 | +$49,492 | +$35,910 / +$46,103 / +$52,001 | 100% | 100% | 100% | 0.93 | +$29,979 / +$49,296 / +$53,319 |
| | 2020 | +$19,385 | +$14,206 / +$23,055 / +$30,414 | 100% | 100% | 100% | 1.19 | +$12,580 / +$19,385 / +$27,854 |
| B E03 × XV + RC10 + Z2 | ≤2020 | +$95,889 | +$76,678 / +$90,812 / +$104,019 | 100% | 100% | 100% | 0.95 | +$62,662 / +$94,992 / +$100,488 |
| | 2021 | +$15,742 | +$13,021 / +$17,604 / +$22,790 | 100% | 100% | 100% | 1.12 | +$13,213 / +$16,264 / +$33,481 |
| **C E03 × XT + Z1** | ≤2021 | +$112,354 | +$94,006 / +$110,015 / +$123,007 | 100% | 100% | 100% | 0.98 | +$21,018 / +$112,354 / +$121,284 |
| | **2022** | **−$28,223** | **−$43,215 / −$34,216 / −$27,075** | **0%** | 20% | **0%** | 1.21 | −$44,174 / −$30,593 / −$8,863 |
| D E06 × XV + RC10 + Z1 | ≤2022 | +$115,782 | +$65,181 / +$87,092 / +$110,012 | 100% | 99% | 99% | 0.75 | +$77,685 / +$115,782 / +$116,304 |
| | 2023 | +$16,446 | +$17,335 / +$23,764 / +$29,194 | 100% | 100% | 100% | 1.44 | +$11,788 / +$16,446 / +$26,748 |

Every training-fitted center sits in a robust neighbourhood (≥ 99% of draws net-positive and within $35k; 0% of
neighbours path-identical, so the robustness is not an artefact of inert dimensions). **None of that predicted 2022:**
every one of the fold-C pick's 128 neighbours lost money in 2022, and only 20% stayed within $35k. The failure is a
regime failure of the mechanism, not a parameter spike. (Continuous runs from 2017 carry positions across boundaries;
the executable Π1 window increments differ — §2.)

P\*-NET's fold picks have similar development robustness (91–100% both; `robustness.md`).

## 2. The executable path, by regime

| Window | Π1 W | Window minute DD | Π1 policy | C-ALR | Regime |
|---|---:|---:|---|---:|---|
| 2020 | +$14,432 | $13,094 | E06 × XV + Z1 | +$31,177 | crash and rebound: out before the crash bottom, back 2020-05-27 |
| 2021 | +$18,059 | $8,509 | E03 × XV + RC10 + Z2 | +$21,507 | advance: repeated volatility-trail stops, 68% invested |
| 2022 | −$30,966 | $33,488 | E03 × XT + Z1 | −$37,608 | bear market: three fresh entries into rallies lost $13.8k, $12.1k, $5.6k |
| 2023 | +$11,049 | $13,350 | E06 × XV + RC10 + Z1 | +$39,427 | recovery: stopped out repeatedly, captured 44–51% of the legs |
| Chained | +$12,573 | **$42,882** | | +$54,502 | |

The chained drawdown runs from the account's peak of +$35,202 on 2021-11-22 to −$7,679 on 2023-03-15 (16 months).

## 3. Perturbed executable paths (rubric f)

128 S1 paths, path j replacing every fold pick by its j-th J128 draw: Σ W min −$9,409, P10 +$3,812, median +$20,969, P90
+$38,557, max +$48,447; chained minute DD P10 $32,548, median $39,384, P90 $55,939. **34%** of the paths have Σ W > 0
and DD ≤ $35,000 (threshold 75%). The Π1 center is below the perturbed median, so the result is not a bad draw of the
center; the procedure's paths are broadly risk-incompatible.

## 4. Costs, financing and execution stresses (no reselection)

| Stress | Π1 Σ W | Π1 chained DD | P\*_H net 2017–23 (in-sample) | P\*_H minute DD |
|---|---:|---:|---:|---:|
| baseline (5 bps, 11%) | +$12,573 | $42,882 | +$112,782 | $15,031 |
| 0 / 2 / 10 bps | +$14,963 / +$14,007 / +$10,187 | $42,045 / $42,380 / $43,718 | +$114,195 / +$113,630 / +$111,370 | $14,925–15,137 |
| 8% / 14% interest | +$18,081 / +$7,066 | $41,827 / $43,937 | +$118,380 / +$107,184 | $14,778 / $15,284 |
| stop slippage 10 / 25 / 50 bps | +$11,209 / +$9,163 / +$5,753 | $43,123–44,087 | +$112,263 / +$111,485 / +$110,184 | ≈$15,040 |
| entry slippage 10 / 25 bps | +$10,184 / +$6,610 | $43,722 / $44,978 | +$111,390 / +$109,305 | $15,134 / $15,287 |
| **opening-fill slippage 50 bps** | **−$6,458** | **$51,405** | +$100,644 | $16,081 |
| delay +1 / +5 minutes | +$12,929 / +$14,758 | $41,768 / $41,484 | +$111,927 / +$112,274 | ≈$14,800 |
| missing bars 1% / 5% | +$12,573 / +$12,573 | $42,882 / $42,868 | +$112,782 | $15,031 |

Π1 is fragile to opening-fill costs (it trades at the open often: transitions, close-decided exits, entries); every
stress leaves its drawdown above $35k. The in-sample H pick is insensitive to all of them — in-sample robustness again.

## 5. H finalists (in-sample 2017–2023; hindsight descriptions, not candidates)

| H policy | Center | J128 median | Both ≤ $35k and > 0 | Retention |
|---|---:|---:|---:|---:|
| P\*_H E06 × XT + Z1 | +$112,782 | +$100,984 | 100% | 0.90 |
| E06 × XF-T + RC10 + Z1 (P03) | +$137,611 | +$101,888 | 100% | 0.74 |
| E06 × XS (P01) | +$140,229 | +$105,415 | 97% | 0.75 |
| E06 × XV + RP50 + Z1 (P02) | +$105,674 | +$97,089 | 99% | 0.92 |
| E02 × XE + REF (P10, P\*-NET_H) | +$133,825 | +$125,282 | 85% | 0.94 |
| E04 × XF (P04) | +$115,106 | +$68,955 | 74% | 0.60 |
| E09 × XF (P08) | +$88,396 | +$69,005 | 65% | 0.78 |

Stage 1's references (E06 +$120,096, joint median +$74,079, 89% both) are of the same kind: in-sample optima of a known
history. Their strength did not survive the chronological replay in either stage.

## 6. Data doors and multiplicity

No computation read a bar after 2023-12-29 (door records in every stage; refusals of 2024-01-02, 2025-12-31, 2026-01-02
recorded; prefix and poisoned-future guards at every boundary, 0 differences). 794,623 development evaluations over 5
histories (per history: 13 entries × 20 exits screened, 44 exit cells, 12 pairings, then 10 re-entry rules and 10
sizings on the champions) — counted, not treated as independent evidence.
