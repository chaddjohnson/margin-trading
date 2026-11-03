## Findings

- **Stop fill.** `next-open` instead of `stop` changed each pick's net by −$746 to +$1,024 on development data and
  by −$313 to +$247 in the holdout. Family medians moved by less than $150. The idealized stop-level fill
  doesn't drive any result.
- **Margin rate.** On development data, 8% raised the picks' median net by $2.8k–$9.8k per family and 14%
  lowered it by $5.5k–$10.3k, with the most interest-heavy family 1 moving most. Rates change levels, not the
  ordering against the comparator: no pick beats `allIn.ts` in the holdout at 8% or 14%, as at 11%.
- **Parameter neighbourhoods.** All 40 frozen picks were stable or moderate on development data, by
  construction: fragile pool members were only usable as a last resort and none was needed. The robust net
  (25th percentile over 20–51 one-parameter probes) was a median 87% of the centre's net (interquartile
  83%–90%, range 70%–99%). **In-sample stability
  didn't translate into out-of-sample performance**: smooth in-sample ridges still collapsed in 2024–2025.
- **Per year** (continuous run; 2016-09-20 → 2017-12-29 had no entry for any contender):

  | Year | Status | Picks' median, families 1–4 | Defaults | `allIn.ts` |
  |---|---|---|---|---|
  | 2018 | in-sample | +$0.5k to +$2.6k | −$3.9k to −$15.8k | |
  | 2020 | in-sample | $20k–$41k | $37k–$46k | $55.9k |
  | 2022 | in-sample | $9.9k–$26.4k | −$16.0k to −$30.7k | −$4.3k |
  | 2024 | holdout | −$3.1k to $0.2k | $12k–$17k | $21.5k |
  | April 2025 | holdout | $5.0k–$7.4k | −$0.6k to $6.1k | $2.6k |

  The 2018 and 2022 advantages are what the picks were fitted to (in-sample for the final fit). Fold-specific
  picks lost money in 2022 in families 3 and 4 (WALK_FORWARD.md). In April 2025 the picks did better than the
  defaults, but that month is a single event, and in 2024 they lagged.
- **Concentration and trade profile.** Development best-trade shares are moderate: a median of 19%–38% per
  family and at most 55%. In the holdout, single trades dominate (HOLDOUT.md). On development data (in sample)
  the picks look better behaved than the defaults:
  - median longest losing streak of 2–3 trades, against the defaults' 4–11;
  - median 7–15.5 losing trades, against the defaults' 18–21;
  - median worst trade of −$5.0k to −$8.9k, against the defaults' −$13.5k to −$18.5k.

  That is what they were fitted to, and it did not carry over.
