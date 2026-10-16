# Conclusions and next steps

**Overall verdict, under the predeclared categories: _argues against further optimization_** of intraday entry timing, of depth-conditional entry, and of a minute-updated stop for the incumbent's close entry.

- **No mechanism family** produced a variant that beats the incumbent `CLOSE_1M` + daily stop, under any fill or cost.
- **The few favourable results** are concentrated in one market event (February–April 2020), or are improvements relative to already-inferior intraday-entry variants.

Context for every figure below:

- **Window:** the warm-start continuous run, 2016-10-07 → 2025-10-13.
- **Accounting:** 5 bp/side, `stop` fill unless stated, per $100,000 borrowed.
- **Incumbent:** $186,172 net, $25,914 minute DD.
- **Out-of-sample status:** none of it is out-of-sample. These years were used in earlier studies, and the incumbent's parameters were fitted on them.

## Answers to the required questions

**1. How many opportunities did waiting for the final minute miss, and how much net P&L did earlier entries add?**

- **Missed opportunities.** There are 57 sessions in which the strategy was flat and a completed minute between 09:35 and the decision closed ≥ 2.5% below the reference high, but the final decision no longer qualified. All 57 were shallow (2.5–5%) at the first qualifying minute. They are spread over 2016–2025, at 1–10 per year.
- **What earlier entries did with them.** The earlier-entry rules captured 13–34 of these as trades, worth +$3.9k to +$30.3k at trade level.
- **What earlier entries added in total:** **−$53,420 to −$101,208** (daily stop). The breakdown:

| Episode type | Range across policies |
|---|---|
| Reversal-capture episodes (full path) | −$18.4k to +$1.1k |
| Same-day earlier entries at higher prices | −$14k to −$81k (9 of 10 rules) |
| Same-day earlier entries at lower prices | −$0.3k to −$63k |
| Close-time entries forfeited by confirmation rules | up to −$45k |

**2. How often did earlier entries worsen losses during sustained selloffs, and by how much?**

- **Trade level.** Each unconditional rule made 36–44 entries that paid more than that day's close-rule fill and then lost money. They lost **$93k–$151k** in total per rule.
- **Full path.** The `BOTH_ENTER_EARLIER_HIGHER` episodes (15–23 per rule) cost up to **−$80.5k** (`FIRST_1000`).
- **By regime:**
  - **2022:** −$6k to −$39k against the incumbent;
  - **Q4 2018:** −$2.7k to −$15.3k;
  - **spring 2025:** up to −$26.4k.
- **The exception** is the February–April 2020 crash, where 9 of 10 rules gained +$10.6k to +$19.8k.

**3. Did 15/30-minute persistence, no-new-low stabilization or 0.3%/0.5% rebound confirmation improve results consistently?** No. Under the daily stop:

| Rule | Δ vs incumbent |
|---|---:|
| `STABLE_15` | −$53,420 |
| `REBOUND_05` | −$56,392 |
| `REBOUND_03` | −$71,729 |
| `PERSIST_15` | −$79,314 |
| `STABLE_30` | −$83,677 |
| `PERSIST_30` | −$101,208 |

- None is positive in more than 4 of 10 years.
- Their ensemble medians are −$27k to −$59k, with 0–4 of 29 starts positive.
- Their gains come almost entirely from **one known episode** (March 2020). Removing it leaves −$74k to −$123k.
- Confirmation reduces *how often* the rules buy too early, but costs about as much by skipping close-time trades that work.

**4. How much do causal, minute-updated trailing stops change outcomes, and did they preserve rebounds or add churn?**

- **For the incumbent's close entry: −$2,243** (−$2,847 `next-open`). Minute DD is +$1.8k worse, 2 of 29 starts are positive, and the two largest episodes (both in 2020) nearly cancel.
- **For intraday entries: from −$5.4k to +$25.7k.** It improved 8 of 10 under `stop` and 6 of 10 under `next-open`. The gains are concentrated in 2020 and 2025.
- **It mostly preserves rebounds.** Among trades with the same entry under both models, the changed exits are better more often than worse (16/9 to 26/7).
- **Churn is modest:** 3–14 extra trades, $0.3k–$1.4k in fees and 0–7 same-session exits.
- **But it never lifts an intraday entry above the incumbent.** The best case is `REBOUND_05` + minute stop at $135,753, against $186,172.
- **Predeclared family category: argues against** (6 of 11 entry policies "argue against"). Three of those six are "against" because of the $30k gate, which the entry rule breaches under either stop.

**5. Does early-entry performance vary across the frozen bands, measured at decision time? Are there enough observations?**

- **It varies in size but not in sign** once March 2020 is set aside.
  - **SHALLOW** carries most of the damage: −$34k to −$71k per unconditional rule.
  - **MODERATE and DEEP** are mixed to negative.
  - **EXTREME** has one large positive episode (2020: +$1.5k to +$28.5k under the daily stop, up to +$35k under the minute stop). Its other episodes are negative: 2018, 2022 and 2025, −$4k to −$44k, with none positive outside 2020 for 8 of 10 rules.
- **Sample size:**
  - **By trades:** ≥ 23 entries in every band under the daily stop.
  - **By independent market events:** the DEEP/EXTREME bands rest on about four episodes, one of which dominates. That is far too few to support a band-specific rule.

**6. Do the three prespecified depth-conditional policies reduce harmful early exposure without sacrificing the baseline's rebounds? Is any advantage robust?**

- **They reduce early exposure** compared with the unconditional rules, by $8k–$70k against their constituents. They do that by keeping SHALLOW dips at the close.
- **None beats the incumbent:**

| Policy | Daily stop | Minute stop | Ensemble |
|---|---:|---:|---|
| `BAND_STABILIZE` | −$45,441 | −$24,343 | median −$31.7k |
| `BAND_PERSIST` | −$55,341 | −$30,658 | median −$43.5k |
| `BAND_LATE_DEEP` | −$8,517 | −$18,147 | 12 of 29 starts positive |

- `BAND_LATE_DEEP` is essentially the incumbent plus stabilised MODERATE intraday buys. It is indistinguishable from the incumbent; its gap is mostly one episode (2020-09-04, −$10.8k).
- Results are stable across fills and costs. None has an advantage to be robust.

**7. Is there enough repeatable improvement in after-interest profit and minute DD to justify a separate optimization study?** No.

- **Profit.** Every intraday-entry and depth-conditional variant is behind the incumbent.
- **Repeatability.** The variants are not repeatable across years or start dates.
- **Single events.** Their best episodes are single events that an optimizer would be tempted to fit.
- **Risk.** All 10 unconditional early-entry variants (daily stop) have a higher minute DD than the incumbent, and all 10 breach $30k in some scenario.

## Mechanism-family shortlist for a future, separate study

**None is shortlisted for optimization.**

| Family | Best member (Δ vs incumbent, same stop) | Category | Reason not shortlisted |
|---|---|---|---|
| FIRST (clock-gated first touch) | `FIRST_1000` −$55.9k (minute) | argues against | Buys first touches that keep falling; 2022 and 2018 losses |
| PERSIST | `PERSIST_15` −$70.5k (minute) | argues against | Worst family; forfeits close-time trades |
| STABLE | `STABLE_15` −$48.4k (minute) | argues against | Gains only in 2020 |
| REBOUND | `REBOUND_05` −$48.2k (minute) | argues against | Gains only in 2020 |
| Depth-conditional (BAND) | `BAND_LATE_DEEP` −$8.5k (daily) | argues against | ≈ incumbent; no band with repeatable early-entry benefit; adds degrees of freedom |
| Minute-updated stop | +$25.7k only relative to `STABLE_30`'s daily stop; −$2.2k on the incumbent | argues against (family rule) | Helps only already-inferior intraday entries; small negative for the incumbent |

These categories are statements about these frozen mechanisms on this history. None of these variants is optimal, validated, or suitable for live trading, and nothing here changes the incumbent.

## What would be worth doing instead (not optimization)

1. **Collect minute data after 2025-10-13 and evaluate the unchanged incumbent on it.** That is the first genuinely fresh evidence available to any of these studies. This study does not use or claim any data beyond 2025-10-13.
2. **Treat the close-time entry as load-bearing.** The study suggests the incumbent's "decide one minute before the close" rule acts as a filter: a 2.5% dip that survives the session is usually bought more cheaply at the close than at its first touch. Any change to entry timing (for example, a market-on-close order, studied earlier in `research/risk-management/vgt-minute-execution/`) should be judged on that basis, with execution realism rather than more signal rules.
3. **If intraday entry is ever revisited despite this evidence:**
   - **Pair it with a minute-updated stop.** The interaction is +$21k to +$28k for `STABLE_30`, `BAND_STABILIZE` and `BAND_PERSIST`.
   - **Judge it on episode-level, ensemble and post-2025 evidence.** Totals on this one path are not enough: single-path totals here move by tens of thousands with one episode.
