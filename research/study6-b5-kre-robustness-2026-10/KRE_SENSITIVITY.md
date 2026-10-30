# KRE sensitivity in the full five-ETF pool (Part A, PROTOCOL.md §6.3–§6.4; diagnostics only, no tuning)

**Sources:**
- `results/partA/A3-W29.json`, plus the W23 and W13 records, which give identical shares (the KRE breaches all lie in
  2020);
- tables `results/partA/A3/W29/{book-clip,book-inbox,book-n2,kre-*,lines,probes}.csv`.

**Setup:**
- Every run is the continuous five-book pool: fixed $100,000, 11%, 5 bps.
- The other four books are frozen at B5. "Share" is the share of unique neighbours with minute DD < $35,000.
- Pooled = replicates 1–5 (5 × 64 = 320 points), with its binomial SE.
- The full-history centre (W29): net $484,636.97, minute DD $26,509.97, daily DD $23,788.61, interest $53,041,
  gross $547,398, friction $9,720, 95 lots (46 KRE), occupancy 54.8%, 173 decisions (95 funded, 78 refused, 31 of
  them KRE's).

## 1. One book at a time (same pool, window and engine)

| Book perturbed | Share < $35k | p10 / median / p90 / worst DD | Net median (p10–p90) | Net ≥ ¾ centre | Centre pct | Median interest / gross / friction | Median occupancy / lots / refused |
|---|---:|---|---|---:|---:|---|---|
| **KRE** | **57.5% ± 2.8** | $26,510 / $33,065 / $35,252 / $43,829 | $409,398 ($350,804–$450,320) | 68% | 100% | $53,900 / $471,400 / $8,598 | 55.3% / 84 / 80 |
| GDX | 89.4% ± 1.7 | $26,510 / $28,200 / $35,138 / $50,118 | $392,205 ($335,514–$437,530) | 69% | 100% | $51,911 / $451,854 / $8,439 | 53.3% / 82 / 86 |
| VGT | 97.8% ± 0.8 | $26,001 / $27,476 / $29,460 / $36,274 | $444,070 ($375,180–$489,229) | 92% | 87% | $44,301 / $497,300 / $9,616 | 46.4% / 94 / 77 |
| XBI | 98.8% ± 0.6 | $26,510 / $26,510 / $28,526 / $40,198 | $443,737 ($423,115–$464,606) | 100% | 100% | $53,011 / $506,565 / $9,599 | 54.7% / 94 / 73 |
| XRT | 100% | $26,510 throughout | $469,943 ($444,273–$492,742) | 100% | 83% | $50,600 / $529,903 / $9,611 | 52.3% / 94 / 74 |

- KRE is 31.9 points below the next book, GDX, which is the second weakest and just under 90%. H2 is confirmed, and
  the ordering is the same on W23.
- **Profit and risk plateaus differ:**
  - **Profit:** every KRE neighbour is profitable, but only 68% keep ¾ of the centre's net, and the centre is at the
    100th percentile (a peak).
  - **Risk:** 42.5% of KRE neighbours breach $35,000.
  - VGT and XRT sit on genuine plateaus in both respects.

## 2. Which KRE parameters drive the breaches (H3)

### 2.1 Paired "freeze one parameter" designs (same 320 points with one coordinate reset to frozen)

| Frozen KRE parameter | Share < $35k | p90 | Breaches removed |
|---|---:|---:|---:|
| none (KRE N1) | 57.5% | $35,252 | — |
| **hold** (`maximumHoldDays`) | **99.1%** | $31,632 | **≈ 98%** |
| X (`targetPercentChange`) | 57.5% | $35,252 | 0% |
| Y (`trailingBuyPercentage`) | 57.8% | $35,251 | 1% |
| stop (`trailingStopPercentage`) | 56.6% | $35,273 | −2% |
| L (`tickWindowSize`) | 57.5% | $35,252 | 0% |
| buffer (`intradayLossBuffer`) | 58.4% | $35,251 | 2% |
| P (`pullback`) | 57.5% | $35,252 | 0% |
| W (`continuationWindow`) | 57.5% | $35,252 | 0% |

### 2.2 Breach rate by the value drawn (pooled KRE N1 clip, 320 points)

**Hold.** Clipping turns −1 and −2 offsets into 3:

| hold | Points | Breaches |
|---:|---:|---:|
| **3** | 120 | **120 (100%)** |
| 4 | 80 | 0 |
| 5 | 80 | 0 |
| 6 | 40 | 16 (40%) |

**X.** 30.0% (the box ceiling) holds 150 of 320 points and breaches 43% of them; 28.9–29.9% breach 29–53% per value,
the same rate. X does not matter.

**Stop.** 3.0% (the box floor) holds 152 points and breaches 41%; other values breach 12–60%, with no trend.

### 2.3 One-parameter lines (every grid value, other KRE parameters frozen)

| Parameter (range) | Points | Values with DD ≥ $35k | DD range |
|---|---:|---|---|
| X 26.9–30.0% | 32 | none | **$26,510 flat** (net $482,489–$484,637) |
| **hold 3–8** | 6 | **3 ($35,251), 8 ($44,240)** | 4: $26,510; 5: $33,065; 6: $33,679; 7: $33,065 |
| Y 2.3–3.1% | 9 | 2.3%, 2.4% ($37,166) | $26,510–$37,166 |
| stop 3.0–5.1% | 22 | none | $26,510–$31,669 |
| L 210–250 | 41 | none | $26,510 flat |
| buffer 0.3–4.3% | 41 | none | $26,510 flat |
| P 7.4–11.4% | 41 | none | $26,510 flat |
| W 20–100 | 81 | none | $26,510 flat |

**Probes (±1/±2 steps, in-box):**

| Probe | Net | DD |
|---|---:|---:|
| hold 3 | $382,140 | **$35,251** (breach) |
| hold 5 | $473,789 | $33,065 |
| hold 6 | $418,743 | $33,679 |
| Y −0.2 pt | $461,804 | $31,632 |
| stop +1.0 pt | $424,694 | $30,901 |
| every other in-box probe | — | $26,510 |

Five probes are out of the box and were not run: X +0.5/+1.0, stop −0.5/−1.0, hold −2.

**Conclusion (H3):** the fragility is the **4-day maximum hold**. It is the only hold value whose drawdown stays far
from the ceiling. Hold 3 and 8 breach; 5–7 land at $33k–$34k. The X entry depth at 29.9%, one step below the ceiling,
is **not** a cliff: its line is flat for 3.1 points. The 3.1% stop does not matter either. Study 5's hypothesis that X
near its bound is the fragile element **does not survive** in the five-ETF pool. The hold does.

## 3. The upper X boundary and other sampling questions (H4)

- **Clipping mass.** Under the Study 5 clip design, 47% of KRE draws sit exactly on X = 30.0%, 48% on stop = 3.0% and
  37.5% on hold = 3, and no draw is a full-vector duplicate. 37 of the 320 are behavioural duplicates: the same funded
  ledger as another draw.
- **In-box design** (offsets mapped onto the in-box interval, no point mass):
  - 76.9% ± 2.4 (p90 $35,251), **+19.4 points** over clip: H4 confirmed;
  - the artefact runs through **hold's** 3-day floor, not X;
  - it still fails 90%.

| Alternate predeclared step design (in-box) | Share | p90 |
|---|---:|---:|
| X radius 0.5 pt (`kre-x5`) | 77.2% | $35,251 |
| X radius 2.0 pt (`kre-x20`) | 77.8% | $35,251 |
| Half radius on all parameters (`kre-half`, clip) | 75.0% | $35,251 |
| KRE N2 (twice the radius) | 41.1% | $40,560 |

  None of the X step sizes matters. Even half the radius leaves 25% breaching, because hold ±1 still reaches 3.
- **Replicates.** The five replicate seeds give 54.7–59.4%: the fragility is not a sampling accident. **But it is a
  knife-edge in money.**
  - 104 of the 136 KRE-only breaches have DD **$35,251.47** and 15 have $35,273. That is one path, $251–$273 above
    the ceiling.
  - At 0 bps the same 64 points (rep 1) score 95.3% (p90 $34,963); with next-open stop fills, 92.2% (p90 $34,925).
    See `EXECUTION_SENSITIVITY.md`.
  - The remaining 17 breaches (hold 6) are deeper: $38,666–$43,829.

## 4. The worst excursions (dates, positions; details in DRAWDOWN_EVENT_LEDGER.md)

| Episode (trough quarter) | KRE breaches | DD | Peak → trough (ET) | Held at peak → trough |
|---|---:|---:|---|---|
| 2020-Q1 (hold 3) | 119 | $35,251–$35,273 | 2020-02-19 12:49 → 2020-03-18 14:27 | VGT lot of 2019-08-05 → VGT lot of 2020-03-12 |
| 2020-Q3 (hold 6) | 17 | $38,666–$43,829 | 2020-06-08 → 2020-09-24 | XRT lot of 2020-05-15 → KRE lot of 2020-09-23 |

**KRE's price path in March 2020** (frozen B5's lot, entered 2020-03-09 09:53):
- with hold 4 it exits at the 2020-03-13 open (−$8,258);
- with hold 3 it exits a day earlier at the 2020-03-12 open, a worse price (−$15,717).

The DD difference comes mostly from what the slot does next, not from KRE's own price (§5).

## 5. Profit and risk plateau summary

| Design | Profit plateau: share of neighbours with net ≥ ¾ centre | Risk plateau: share < $35k |
|---|---:|---:|
| KRE N1 | 68% | 57.5% |
| KRE N1 with hold frozen | **100%** | **99.1%** |
| KRE in-box | 87% | 76.9% |
| GDX N1 | 69% | 89.4% |

KRE is both the sharpest risk cliff and a profit peak. Its neighbourhood would be a broad plateau if the hold were
not perturbed. That observation is from the full history, which is exposed. Part B searched hold together with the
other parameters on development data only, without using this observation (no post-diagnostic amendment).
