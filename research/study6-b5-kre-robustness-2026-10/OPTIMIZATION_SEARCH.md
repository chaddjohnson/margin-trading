# Bounded improvement search (Part B): design, budgets, flow, results, overfitting checks

**Sources:**
- `results/partB/trackK/trackK-{main,wf20,wf19}.json` (+ `main/*.csv`), `walk-forward-test.json`;
- `results/partB/trackJ/trackJ.json`, `trackO/o-pa.json`, `trackO/o-me.json`;
- `results/partB/shortlist.json`, `validation.json`, `FROZEN_SELECTION.json`.

Everything below was fixed in PROTOCOL.md §10–§11 before Part A produced any result. No post-diagnostic amendment was
made. Searches read the **search door only** (sessions ≤ 2021-12-31; the `training` partition with
`access: 'optimization'`).

## 1. What could change

- Only the eight registered D1 parameters, on their grid, inside the eight-ETF box.
- Track K changed KRE only. Track J changed KRE plus VGT, by the mechanical book rule. Track O changed KRE only.
- All five ETFs, the shadow allocator, the single $100,000 slot, ties, fills, interest (11%) and costs (5 bps) stayed
  frozen. Every candidate is a complete five-book configuration.

## 2. Search flow and budgets (as preregistered; counts actual)

```
Track K (KRE; 4 books frozen)                Track J (KRE + VGT; triggered)         Track O (original methods)
  Sobol 2,048 K-local + 2,048 K-wide            Sobol 4,096 J-local (16-D)            O-ME: multi-etf-d1 code, DEV adapter
  → filters (DEV DD, lots, occupancy,           → same filters                        O-PA: B5 optimizer (Track S / P)
    KRE lot, net > 0, largest lot ≤ 25%)        → rungs 1–3 (no refinement)
  → behavioural dedupe                          → shortlist ≤ 4 (distinct regions)
  → rung 1: top 256, 16-pt joint N1 (k=1) → 64
  → rung 2: 64-pt (k=2) → 16
  → rung 3: 128-pt (k=3) → 8
  → refinement: 4 starts × ≤ 2 passes of ±1/±2-step coordinate moves (64-pt, gain ≥ $2,000)
  → shortlist ≤ 6 (distinct regions, by R(k=3))
                              ↓ shortlist sealed (no data read) ↓
             validation door (run to 2023-12-29): V1–V3 joint N1, per-book N1, stresses → Q1–Q8, E1, E2
                              ↓ FROZEN_SELECTION.json ↓
             final door (once): full history, confirmation sets C1–C3, N2, sensitivities → F1–F4
```

**Robust score** (DEV, unique neighbours of the joint 40-parameter search neighbourhood; common random numbers across
candidates):

R = ½·median(net) + ½·p10(net) − 4·max(0, p90 DD − $30,000)

R is then multiplied by (1 − 0.05 per searched parameter on a box bound).

| Stage | Budget (protocol) | Actual |
|---|---|---|
| Track K main | 4,096 + 256×16 + 64×64 + 16×128 + ≤ 4×2×32×64 + ≤ 12×128 | 26,366 pool runs, 220 s |
| Track K WF20 (search ≤ 2020-12-31) | same | 26,323 runs |
| Track K WF19 (search ≤ 2019-12-31) | same | 4,305 runs (screen only; nothing passed the filters) |
| Track J | 4,096 + rungs | 14,545 runs |
| Track O-PA | the original Stage A/B budgets | 12,228 replays |
| Track O-ME | the original budgets | 15,059 frictionless standalone runs |
| Validation | 15 configurations × (centre + 4 stresses + 3×128 + 5×64) + 64 PBO | 10,586 runs |

## 3. Track K (KRE only) — the robustness-first search

**Frozen B5 on the development window (C5):** DEV net $217,544, DD $26,510, 40 lots. Its search neighbourhood scores:

| Rung | R | Share < $35k | p90 |
|---|---:|---:|---:|
| k=1 | $71,233 | 43.8% | $41,109 |
| k=2 | $74,153 | 59.4% | $39,071 |
| k=3 | **$66,233** | **58.6%** | **$39,724** |

C5 itself fails the DEV-side gate.

**Screen.**
- 4,096 unique vectors (seeds in the record); 735 passed the filters (695 local, 40 wide).
- The main rejections: centre DD ≥ $35,000 (2,540), lots below 75% of frozen B5 (2,268), largest lot above 25% of net
  (1,869), net ≤ 0 (22), no funded KRE lot (1). Reasons overlap.
- 79 behavioural duplicates were removed.

**Rungs:** 256 → 64 (best R $107,917) → 16 ($96,591) → 8 ($83,913).

**Refinement.** Six moves were accepted from four starts:
- Y +0.1 (d1-3e21e9d20e → d1-908846265d);
- X −0.5 then W +20 (d1-2d61a1f22a → d1-26bddd7f88);
- Y +0.1 then L +10 (d1-6a7f7303c2 → d1-b766d58b67);
- P −0.5 (d1-0d760a3480).

**Shortlist** (KRE vector = X/Y/stop/hold/L/buffer/P/W in grid units; the other four books frozen):

| Key | KRE vector | Origin | DEV net | DEV DD | R(k=3) | k=3 share / p90 | DEV gate |
|---|---|---|---:|---:|---:|---|---|
| K1 | 295/27/35/**5**/228/36/82/90 | refined (local) | $198,977 | $33,065 | $86,077 | 71.1% / $37,210 | fail |
| K2 | 289/27/31/**5**/228/35/89/58 | refined (local) | $203,266 | $33,065 | $85,610 | 60.9% / $37,627 | fail |
| K3 | 235/40/32/**3**/188/37/157/31 | refined (**wide**) | $197,187 | $30,584 | $84,353 | **82.0%** / $36,503 | fail |
| K4 | 283/24/36/**5**/237/30/90/91 | local | $201,491 | $33,085 | $77,845 | 55.5% / $39,368 | fail |
| K5 | 289/24/31/**5**/229/31/75/56 | local | $185,495 | $33,085 | $76,371 | 58.6% / $39,002 | fail |
| K6 | 282/27/33/**6**/218/10/78/49 | local | $172,192 | $33,065 | $70,500 | 70.3% / $39,701 | fail |

What Track K found on DEV:
- It moves KRE's hold **off 4**: five of six candidates use 5 or 6, and K3 uses 3 with a much shallower X (23.5%).
- That raises the DEV joint share from 58.6% to at most 82%, while lowering the centre's DEV net (−7% to −21%) and
  raising its DD ($30.6k–$33.1k against $26.5k).
- **No KRE-only vector reached the DEV-side gate (90%).** The other books' perturbations (VGT, GDX) breach on their
  own.

## 4. Track J (KRE + VGT) — triggered by the predeclared DEV rule

- **Trigger:** no Track K shortlist member passed the DEV-side hard gates with R(k=3) ≥ frozen B5's $66,233.
- **Books:** by A4's WDEV importance — VGT 29.8%, GDX 4.6% (< ½ × 29.8%), XBI 1.5%, XRT 0.4%. Track J searched KRE +
  VGT; GDX's 2022 fragility was invisible before 2022.
- **Screen:** 4,096 vectors in the 16-D J-local box; 1,127 passed the filters.

| Key | KRE vector | VGT vector | DEV net | DEV DD | R(k=3) | k=3 share / p90 | DEV gate |
|---|---|---|---:|---:|---:|---|---|
| J1 | 297/30/35/4/213/5/81/45 | 201/6/54/**4**/90/38/70/74 | $216,046 | $19,463 | $127,271 | **94.5%** / $33,246 | **pass** |
| J2 | 288/30/32/5/239/36/106/49 | 202/5/80/**4**/54/15/108/80 | $206,088 | $21,684 | $124,803 | 91.4% / $33,346 | pass |
| J3 | 292/25/45/5/241/11/88/89 | 200/4/68/**5**/92/29/80/43 | $203,592 | $23,281 | $124,454 | 95.3% / $33,088 | pass |
| J4 | 298/25/36/5/231/6/96/47 | 196/2/89/**4**/92/47/110/95 | $203,362 | $22,361 | $120,615 | **97.7%** / $33,629 | pass |

On development data alone, a joint KRE + VGT change looked like a genuine robustness improvement:
- every candidate passes the DEV gate;
- centre DD is $19.5k–$23.3k;
- DEV net retains 94–99% of frozen B5's;
- VGT moves to a shallower X (≈ 20%) and a 4–5 day hold.

## 5. Track O (the original method; comparator)

| Configuration | KRE vector | Origin | Original method's own verdict |
|---|---|---|---|
| O-ME-lowDd | 290/26/31/4/225/27/90/96 | multi-etf-d1 `lowDd` role on DEV | nominated by its own rule (DEV standalone $100,790, DD $22,201) |
| O-ME-primary | 243/32/104/4/21/14/165/36 | multi-etf-d1 `primary` on DEV | nominated by its own rule (8 trades) |
| O-PA-S | 279/34/52/4/236/53/50/64 | B5 optimizer, Track S | **comparator**: fails T1–T3 (Δ +$2,937) |
| (O-PA-P) | — | B5 optimizer, Track P | **none**: 0 of 40 robust (R5, R2) |

See `ORIGINAL_B5_METHOD_REPRODUCTION.md`.

## 6. Validation (2022–2023 opened once, for the sealed shortlist) — every candidate fails Q2

**V1 seeds, run to 2023-12-29.** "DEV k=3" is the search neighbourhood (different seeds, run to 2021-12-31):

| Key | DEV k=3 share / p90 | **V1 share / p90** (V2, V3 share) | Centre DEV+VAL net (÷ C5) | Centre DD | VAL net | Failing gates |
|---|---|---|---:|---:|---:|---|
| C5 (frozen B5) | 58.6% / $39,724 | 30.5% / $57,088 (29.7, 25.0) | $388,489 (100%) | $26,510 | $170,945 | Q2 |
| C5−KRE (diagnostic) | — | 65.6% / $46,619 | $291,290 (75%) | $19,534 | $124,933 | Q2, Q5, E1, E2 |
| K1 | 71.1% / $37,210 | 33.6% / $58,212 | $347,821 (90%) | $33,065 | $148,843 | Q2 |
| K2 | 60.9% / $37,627 | 25.8% / $61,797 | $363,331 (94%) | $33,065 | $160,065 | Q2 |
| K3 | 82.0% / $36,503 | 34.4% / $54,459 | $321,465 (83%) | $30,584 | $124,278 | Q2, E1 |
| K4 | 55.5% / $39,368 | 18.8% / $67,466 | $337,709 (87%) | $33,085 | $136,218 | Q2, E1 |
| K5 | 58.6% / $39,002 | 24.2% / $67,817 | $330,834 (85%) | $33,085 | $145,339 | Q2, E1 |
| K6 | 70.3% / $39,701 | 31.3% / $63,166 | $321,142 (83%) | $33,065 | $148,950 | Q2, E1 |
| J1 | **94.5%** / $33,246 | **30.5%** / $62,907 | $311,968 (80%) | $22,606 | $95,922 | Q2, Q4 |
| J2 | 91.4% / $33,346 | 28.1% / $68,420 | $302,618 (78%) | $25,489 | $96,530 | Q2, Q4, E1 |
| J3 | 95.3% / $33,088 | 23.4% / $73,961 | $291,738 (75%) | $34,224 | $88,146 | Q2, Q4, E1 |
| J4 | **97.7%** / $33,629 | 27.3% / $68,988 | $311,764 (80%) | $22,361 | $108,402 | Q2, Q4, E1 |
| O-PA-S | — | **39.8%** / **$51,700** | $326,491 (84%) | $32,201 | $157,197 | Q2 |
| O-ME-primary | — | 30.5% / $51,659 | $356,632 (92%) | $26,653 | $124,933 | Q2, Q4, Q5, E1 |
| O-ME-lowDd | — | 21.9% / $60,340 | $369,464 (95%) | $26,510 | $154,071 | Q2 |

- **No candidate qualified** (Q1–Q8, E1, E2). Q2, the 90% joint gate, fails everywhere.
- J1–J4 fail Q4 as well: 2020 alone is 50.5–55.3% of their DEV+VAL net (frozen B5: 42.7%).
- E1 fails where robust profit falls below 90% of frozen B5's S_V ($17,640 per year).
- No role was assigned, so **nothing can be nominated**. `FROZEN_SELECTION.json` records `qualified: []` and
  `roles: []`.

## 7. Overfitting and selection-risk checks

- **Development → validation collapse.** Track J's DEV neighbourhood shares (91–98%) fell to 23–31% once 2022–2023
  entered the run. Track K's fell from 56–82% to 19–34%. Frozen B5 fell from 59% to 30%. The 2022 bear (GDX, XBI) and
  the 2023 bank stress (KRE) are absent from DEV, so a DEV-only search cannot see them, and it did not.
- **PBO (CSCV, 8 half-year blocks of DEV+VAL, the 64 rung-2 KRE vectors): 0.50**, from 70 splits. The in-sample best
  KRE vector ranks below the out-of-sample median half the time: no evidence that the DEV ranking carries information.
- **DEV → VAL per-year net** (centre): the Track K shortlist median is $43,557 per DEV-year and $73,986 per VAL-year;
  frozen B5 is $47,837 and $85,984. 2022–2023 was a richer period for every configuration. The shortlist's shortfall
  against frozen B5 is −9% on DEV and −14% on VAL.
- **Walk-forward replications (procedure evidence):**
  - WF19 (search ≤ 2019) produced **no candidate**. Frozen B5 funds only two lots in 2017–2019, so the predeclared
    "largest lot ≤ 25% of net" filter is unattainable; the rule was not changed.
  - WF20 (search ≤ 2020) produced six candidates. Each earns **$9,668** in its 2021 test year against frozen B5's
    **$15,696** (−$6,028), and its regions overlap the main fold's: K3's d1-b766d58b67 is WF20's first pick.
- **Multiplicity.**
  - Effective dimensions: Track K 8, Track J 16.
  - Search volume (§2): ≈ 26k + 26k + 4k + 15k pool runs, plus 27k original-method runs.
  - Under that volume the DEV maxima are expected to be inflated, and the validation collapse quantifies it.
- **Not done:** a bootstrap or resampled history at the selection stage. The pool is path-dependent at minute
  resolution, and validation holds one or two independent stress episodes (2022, 2023). The final stage reports a
  paired stationary block bootstrap of daily mark differences as descriptive context only.
