# Execution sensitivity and path diagnostics of frozen B5 (Part A, PROTOCOL.md §6.8)

**Source:** `results/partA/A8-execution.json` (sealed). Each setting changes one assumption, with everything else at
the base (5 bps per side, 11% simple interest, stops at the stop, no extra slippage). The engine implements every
setting below, verified by parity P1 for 8%/14%, next-open stops and 25 bps slippage. The same points are used in
every setting:
- frozen B5;
- KRE N1 clip rep 1 (64);
- joint N1 clip rep 1 (128);
- the five A7 representatives.

None of these is an independent holdout, and none is mixed into a ranking.

## 1. Costs, interest, fills (full history W29; W23 gives the same drawdowns and shares)

| Setting | Centre net | Centre DD | KRE N1 share / p90 | Joint N1 share / p90 | Representatives' DD (5) |
|---|---:|---:|---|---|---|
| **base (5 bps, 11%)** | $484,637 | $26,510 | 56.2% / $35,266 | 21.9% / $55,573 | 35,251; 43,829; 47,537; 45,531; 36,158 |
| 0 bps | $494,225 | $26,310 | **95.3% / $34,963** | 21.9% / $54,217 | 34,963; 42,715; 44,660; 44,768; 35,097 |
| 2 bps | $490,632 | $26,390 | 56.2% / $35,093 | 21.9% / $56,732 | 35,079; 43,224; 45,811; 45,073; 35,391 |
| 10 bps | $474,654 | $26,710 | 56.2% / $35,560 | 18.8% / $59,305 | 35,539; 45,102; 37,340; 46,293; 37,436 |
| 20 bps | $427,170 | $27,232 | 53.1% / $36,460 | 18.0% / $63,948 | 36,114; 47,538; 55,388; 50,751; 39,986 |
| 8% interest | $498,920 | $26,387 | 56.2% / $35,094 | 19.5% / $56,163 | 35,079; 43,331; 45,285; 44,684; 34,983 |
| 14% interest | $470,171 | $26,633 | 56.2% / $35,439 | 22.7% / $59,749 | 35,424; 44,486; 28,344; 46,393; 37,334 |
| next-open stop fills | $485,696 | $26,162 | **92.2% / $34,925** | 21.9% / $55,693 | 34,904; 43,599; 46,118; 45,730; 36,461 |
| +10 bps stop slippage | $477,932 | $26,736 | 56.2% / $35,492 | 21.1% / $56,403 | 35,478; 44,249; 48,787; 45,680; 36,573 |
| +25 bps stop slippage | $467,873 | $27,076 | 56.2% / $35,832 | 18.8% / $57,120 | 35,817; 44,879; 50,661; 46,928; 37,195 |

Reading the table (H7):
- **The centre is cost-robust.** Net falls from $494k (0 bps) to $427k (20 bps). DD moves only within
  $26.2k–$27.2k: the March-2020 episode in every setting.
- **The joint verdict does not depend on execution.** 18.0–22.7% of joint neighbours stay below $35,000 in every
  setting, and p90 is $54k–$64k. Costs worsen it slightly. **H7 is confirmed for the joint set.**
- **The KRE-only verdict does depend on execution. H7 is rejected for the KRE set.** The dominant KRE breach is one
  path (hold 3) whose drawdown sits $251 above the ceiling at 5 bps. Removing the friction (0 bps) or filling stops at
  the next open lowers it to $34,963 or $34,925, and the KRE set then passes with 95.3% or 92.2%.
  - The KRE fragility is real in sign (hold 3 and hold ≥ 6 materially worsen drawdowns).
  - Its classification as a $35k breach is knife-edge.
  - This concerns only the KRE set's classification. The frozen centre's DD is $26.2k–$27.2k in every setting.
- One representative (episode 3) falls to $28,344 under 14% interest: another sign of path dependence. A different
  interest charge changes D1's net-profit stop eligibility, and with it the trade path.

## 2. Years, leave-one-year-out, blackouts (W29)

| Year | Net (chained) | Minute DD inside the year | Daily DD | Lots entered | Net without the year (attribution) | **Funding blackout** of the year: net / DD |
|---|---:|---:|---:|---:|---:|---|
| 2017 | $0 | $0 | $0 | 0 | $484,637 | $484,637 / $26,510 |
| 2018 | $3,642 | $4,592 | $3,636 | 1 | $480,995 | $472,071 / $26,510 |
| 2019 | $32,319 | $10,440 | $9,103 | 1 | $452,318 | $467,048 / $26,026 |
| **2020** | **$165,888** | **$26,510** | $23,789 | 32 | $318,749 | **$331,476 / $25,774** (worst becomes the 2026 GDX episode) |
| 2021 | $15,696 | $16,557 | $14,848 | 6 | $468,941 | $460,070 / $26,510 |
| 2022 | $84,884 | $15,755 | $13,874 | 21 | $399,753 | $407,267 / $26,510 |
| 2023 | $86,060 | $17,269 | $12,295 | 21 | $398,577 | $398,577 / $26,510 |
| 2024 | $24,162 | $9,803 | $4,919 | 2 | $460,475 | $460,475 / $26,510 |
| 2025 | $45,679 | $18,209 | $17,163 | 4 | $438,958 | $442,170 / $26,510 |
| 2026 (to 10-29) | $26,307 | **$25,774** | $22,563 | 7 | $458,330 | $455,119 / $26,510 |

- **The blackout counterfactual** refuses every decision dated in the year, then replays later years from the same
  unchanged traces, so path dependence is preserved. It is a diagnostic, not a strategy.
- **2020** is 34.2% of net; the next largest years are 2023 (17.8%) and 2022 (17.5%). Without 2020 funding, net is
  still $331k.
- **Concentration:** the top lot is 9.1% of net, the top 3 are 23.4% and the top 5 are 34.2%.

## 3. Is the robust-looking centre far from an exposed failure?

**No:**
1. **Arming-date shifts** (2017-12-15, 2018-06-15) change nothing: net $484,637 and DD $26,510. No lot is entered
   before mid-2018.
2. **Isolated flat starts** on 2020-01-02, 2022-01-03 and 2024-01-02 all have DD **$25,774**, the 2026 GDX decline,
   which the full run absorbs below its 2020 peak. Their nets are $444,503, $259,578 and $71,986.
3. **Nearest breach along each one-parameter line** (in grid steps from the centre):

   | Line | Nearest breach |
   |---|---|
   | KRE hold | **−1** (3 days) and +4 (8 days); 5–7 days sit at $33.1k–$33.7k |
   | KRE Y | −3 steps (2.4%) |
   | Every other line of every book within ±r (±2r for KRE) | none |

   The centre is one hold-step away from a breach, and its neighbourhood has a median DD of $38,946.

4. **The worst-episode structure.** The centre's March-2020 drawdown ends because a GDX lot is funded on 2020-03-16 at
   exactly the right moment (+$37,416). Any change that occupies the slot on 2020-03-12 to 03-16 removes that lot
   (`DRAWDOWN_EVENT_LEDGER.md` episode 1).

So the centre's sub-$35k drawdown is a narrow sample path, not a robust property of the parameter region.
