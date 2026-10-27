# BTCUSDT spot D1 study — protocol

Version `btcusdt-d1-protocol-v1`. This file is frozen by `PROTOCOL_FREEZE.json` (its sha256 and those of
BTC_CLOCK_AND_EXECUTION.md and DATA_AUDIT.md, the procedure object in `src/btcusdt-d1/protocol.ts`, the snapshot, the
chronology, the study's code manifest and the npm environment). After the freeze nothing here and no outcome-critical
code changes; there is no amendment path — a change of rules, gates, bounds, budgets, windows, costs or engine needs a
new study. The independent pre-freeze review and its dispositions: `reviews/PRE_FREEZE_REVIEW.md`,
`reviews/PRE_FREEZE_DISPOSITIONS.md`.

## 1. Question and scope

Can D1 — the existing long-only trailing-buy architecture of `src/app/allIn-trailingBuy-postExitContinuation.ts`
(deep-decline arming, trailing-low rebound buy, daily trailing stop active only above net breakeven, maximum-hold loss
exit, buffered intraday loss exit, post-exit continuation) — adapted to the BTC clock and spot cash accounting,
produce positive net trading profit on BTCUSDT with a minute-sampled peak-to-trough drawdown of at most 35% of the
cash account, robustly across parameters, costs and later chronology?

The comparisons are within D1 only: the unchanged ETF D1 vector as a non-optimised engine diagnostic; BTC-searched
D1 phenotypes; training versus later windows; cost and fill sensitivity. **No BTC buy-and-hold benchmark is computed
or reported.** Out of scope: futures, perpetuals, funding, leverage, borrowing, shorting, any ETF or portfolio
interaction, ranking/preemption allocators, live orders, credentials, network data. "No viable phenotype" is a valid
result.

## 2. Data and snapshot (DATA_AUDIT.md)

- Source: `data/BTCUSDT/BTCUSDT-2017-2026.csv` (git-ignored, read only), sha256 `dd91a2b3…8de83` at the snapshot,
  10 `|`-separated fields, UNIX-second minute open times. Venue and product type: **unverified** (no local
  metadata; consistent with Binance spot).
- Snapshot end: 2026-08-25T00:00:00Z (the end of the file's last complete UTC day); the snapshot's raw lines are the
  file's first 451,271,344 bytes, sha256 `ed0d359a…e7b76`.
- History start: 2018-02-11T00:00:00Z, the first UTC day after the last row whose open time is not on a minute
  boundary (two irregular segments, 2017-12-04 → 2017-12-18 at +20 s and 2018-02-09 → 2018-02-10 at +14 s, the
  second right after a 33.5-hour outage). Rule, not judgement: no row is repaired or re-timed.
- Canonical series: the rows in [history start, snapshot end) with at least one trade (329 zero-trade rows dropped:
  each is flat at the previous close with zero volume, so it carries no trade price); 4,482,236 bars; sha256
  `cb7c9cdc…283f8`. Missing minutes stay missing.

## 3. Clock and execution (BTC_CLOCK_AND_EXECUTION.md)

D1's rules unchanged except for these preregistered adaptations:

1. **Days are UTC calendar days** (00:00:00 UTC boundaries). L (`tickWindowSize`), the maximum hold and W
   (`continuationWindow`) count UTC calendar days; no business-day calendar exists anywhere in the BTC code. The
   reference high is the highest high of the L completed UTC days before the current one.
2. **Spot cash account:** 100,000 USDT initial equity; each entry buys a quote notional of min(100,000, cash / (1 +
   fee)); one position at a time; no borrowing, no interest (reported as 0 / not applicable), cash earns nothing;
   USDT is the unit of account (1 USDT = 1 unit, not a USD claim).
3. **Costs:** a fee on each side's quote notional and an incremental impact moving each fill against the order.
   D1's profit tests (stop active only if a sale at the stop is net-profitable; maximum hold due only if a sale at the
   day's opening trade loses; the buffered-loss threshold; a "profitable exit" for continuation) are evaluated
   **net of both sides' fees and impact** — the BTC analogue of D1's "net of interest".
4. **Stops (principal convention "adverse"):** a minute opening at or below an active stop sells at that open; a
   minute trading through it sells at min(stop, the next traded minute's open), recorded at that next minute — the
   next day's first trade when the trigger is the day's last minute. Sensitivities: "stop" (the ETF engines' fill at
   the stop level, in the trigger minute) and "low", the worst case: min(stop, the trigger minute's low, the next
   traded minute's open), never above "adverse". Known limit: after a V-shaped trigger minute that recovers above the
   stop, "adverse" fills at the stop itself (plus impact) — the price a stop-market order meets when it triggers — so
   G5 and the fold gate also require profit under "low".
5. **Fills** happen at the open of the next traded minute after a decision (decisions are made when a minute
   completes); a decision on a day's last minute fills at the next day's first trade. Gaps never create fills.

Unchanged D1 semantics (each tested in `src/btcusdt-d1/tests/`): entries only on days that start flat; exits only on
days that start long (no exit on the entry day, no entry on an exit day); the arming minute never buys; the trailing
low starts at the arming close; the stop is set once per day from the post-entry high through the previous day;
maximum hold is decided at the day's opening trade and sells at the next minute's open; the buffered loss acts from
the hold day and its precedence against the stop is D1's; continuation windows open on a profitable exit and close on
any arming or after W days.

## 4. Chronology (outcome-blind rule on the first and last days only)

N = 3,117 history days (2018-02-11 → 2026-08-24).

| Window | Rule | Dates (UTC, end exclusive) | Days |
|---|---|---|---|
| Arming eligibility | history start + 365 (the largest searchable L) | from 2019-02-11 | |
| Holdout (sealed) | from the month start containing day ⌊0.75 N⌋ | 2024-07-01 → 2026-08-25 | 785 (25.2%) |
| Development | before the holdout | 2019-02-11 → 2024-07-01 | 1,967 |
| Fold A selection / validation | month start containing history start + ⌊0.6 × D⌋ | 2019-02-11 → 2021-12-01 / 2021-12-01 → 2023-03-01 | 1,024 / 455 |
| Fold B selection / validation | month start containing history start + ⌊0.8 × D⌋ | 2019-02-11 → 2023-03-01 / 2023-03-01 → 2024-07-01 | 1,479 / 488 |
| Final selection | all development | 2019-02-11 → 2024-07-01 | 1,967 |

D = holdout start − history start = 2,332 days (the warm-up year included), as `src/btcusdt-d1/calendar.ts`
computes it; that file is byte-identical to its version written before any outcome (sha256 `35e5b26e…`, recorded
in RESEARCH_RECOVERY.md §4), so these are the outcome-blind dates. (An earlier draft of this table said "60% / 80% of
development", which, read as the 1,967 arming days, would give other dates; the rule above is the one the code
applies.)

Every run sees only the bars before its window's end (the series is sliced). The warm-up (2018-02-11 → 2019-02-10)
is read only for reference highs. A selection uses only bars before its validation (or the holdout) begins.

## 5. Parameter space (fixed before any outcome; `src/btcusdt-d1/params.ts`)

Percentages on a 0.1-point grid, days whole UTC days. The box widens the ETF D1 box (X 8–30%, Y 0.1–5%, stop 3–15%,
hold 3–30, L 20–250 sessions, buffer 0–6%, P 3–20%, W 10–200 sessions) for a market whose daily moves are a few
times an equity ETF's, restating sessions as calendar days:

| Parameter | Meaning | Min | Max | Neighbourhood step |
|---|---|---:|---:|---:|
| X `targetPercentChange` | close below the L-day reference high that arms | 8.0% | 60.0% | 2.6 pts |
| Y `trailingBuyPercentage` | rebound above the trailing low that buys | 0.2% | 12.0% | 0.6 pts |
| stop `trailingStopPercentage` | below the post-entry high | 3.0% | 35.0% | 1.6 pts |
| hold `maximumHoldDays` | UTC days before the loss exits apply | 2 | 60 | 3 |
| L `tickWindowSize` | UTC days of the reference high | 14 | 365 | 18 |
| buffer `intradayLossBuffer` | net loss / notional that sells from the hold day | 0.0% | 15.0% | 0.8 pts |
| P `pullback` | below the post-exit high that arms (continuation) | 3.0% | 50.0% | 2.4 pts |
| W `continuationWindow` | UTC days after a profitable exit | 10 | 300 | 15 |

Steps are about 5% of each range. The ETF's successful 10–20% X values are not assumed: X spans 8–60%.

## 6. Costs and fills (assumptions, not an account tier)

- Principal: fee 10 bps + impact 5 bps per side, adverse stops. Conservative: 20 + 10. Stress: 30 + 20.
- Reported grid: fee {5, 10, 20, 30} × impact {0, 5, 10, 20} bps per side; stops "stop" and "low" at the principal
  costs.
- Orders below 10 USDT are refused (an accounting floor for exhausted cash, not venue metadata). Lot size, minimum
  notional and order-book depth are not modelled (no local metadata); each fill's notional as a share of its
  minute's quote volume is reported as a capacity warning.

## 7. Selection procedure (identical for fold A, fold B and the final selection)

Budgets (`procedure.budgets`, fixed after the outcome-blind benchmark of §11 and before any selection):

1. **Sobol:** the first 65,536 distinct grid vectors of one scrambled Sobol stream (`deriveSeed("btcusdt-d1-v1",
   "sobol")`), the same design in every window; evaluated at the principal costs on the selection window.
2. **Feasibility.** G1: minute peak-to-trough ≤ 35% of the account's running peak **and** ≤ 35,000 USDT (the
   user's 35,000-per-100,000 reference; with a non-compounding 100,000 USDT cap a percentage alone loosens as
   profits raise the peak), entries ≥ ⌈3 × window years⌉ (fold A 9, fold B 13, final 17), net > 0. G2: net minus the
   two largest **positive** trade nets > 0. G6: net > 0 in at least 2 of the window's 3 consecutive equal (whole-day)
   subperiods. "Feasible" = G1 + G2 + G6.
3. **Refinement:** up to 8 seeds taken from the feasible (G1+G2+G6) vectors in rank order (net desc, then key), each only if its
   exposure-day Jaccard distance from every earlier seed is ≥ 0.5; each seed gets exactly 24 generations × 16
   offspring (mutation of 1–3 parameters by up to 2 steps, reflected into the box, RNG labelled by window, seed and
   generation); the parent is replaced by the best feasible offspring with a higher net. Equal budgets: no seed can
   monopolise the search.
4. **Pool:** all distinct evaluated vectors that are feasible, one per trade schedule (identical entry/exit bars →
   the best-ranked vector only), ranked by net. **Shortlist:** down that ranking, a vector is admitted only if its
   exposure-day distance from every admitted vector is ≥ 0.1 and fewer than 6 vectors of its refinement lineage
   (the seed it descends from; Sobol vectors have no quota) are admitted, until 60 are admitted. Hill-climbed
   variants of one seed therefore cannot fill the shortlist and starve the family slots.
5. **Robustness** for each shortlisted vector: 32 joint radius-1 neighbours (every parameter moved by a uniform
   integer offset within ±1 step), 16 radius-2 neighbours (reported only), the conservative costs and the
   worst-case "low" stop fill. G3: ≥ 50% of radius-1 neighbours pass G1 and their median net > 0. G4: net > 0 at the
   conservative costs. G5: net > 0 with "low" stop fills at the principal costs.

   **Report-only, by design:** daily drawdowns (the daily marks are a subset of the minute marks, so a daily
   drawdown never exceeds the gated minute one, in USDT or %); the trade distribution beyond G1/G2 (wins, losses,
   worst trade, exposure, the radius-2 neighbours); capacity (each fill's notional as a share of its minute's quote
   volume, flagged above 25%; there is no order-book model to gate on — the 10 and 20 bps impact scenarios are the
   sensitivity).
6. **Score** = median radius-1 neighbour net. **Families:** the G1–G6 vectors in score order (ties: net, key); a
   vector is promoted only if its exposure-day Jaccard distance from *every* earlier pick is ≥ 0.5; up to three
   slots, rank 1 first. Distance to every pick (not the nearest) rules out single-linkage chaining. The best eligible
   vector with a minute peak-to-trough ≤ 25% is reported as an exploratory low-drawdown class (never a pick).

Exposure-day Jaccard distance: 1 − |A ∩ B| / |A ∪ B| over the sets of UTC days on which each vector held BTC inside
the selection window.

## 8. Walk-forward validation and the procedure gate

For each fold, the picks are sealed (`PICKS.json`) before its validation window is read. Each pick is then run
continuously from 2019-02-11 through the validation end (state and any position carried across the boundary); the
validation result is the incremental change of marked equity and the drawdown inside the validation window.
Reported per pick: principal net and return on 100,000 USDT, minute and daily drawdowns (USDT and %), entries,
exits, costs, the cost grid, both other stop conventions, a flat-start diagnostic (arming from the validation start,
not used for any decision), calendar-year attribution (descriptive only) and 32 fresh radius-1 neighbours on the
validation window. The shortlist's highest-raw-net vector ("centre") and the diagnostic are reported descriptively.

**Fold gate** (rank-1 pick, on its validation window): every selection test that can be applied out of sample —
net > 0 at the principal costs; net > 0 at the conservative costs (fee 20 + impact 10); net > 0 with worst-case
"low" stop fills; net minus the larger of the largest positive entered-trade net and the in-window contribution of
a position carried in from before the window (net minus the entered trades' nets, since cash changes only through
trades) > 0 — no single trade carries the window; minute
peak-to-trough ≤ 35% of the running peak and ≤ 35,000 USDT; entries ≥ ⌈3 × window years⌉ (fold A 4, fold B 5). The
validation net is the change of marked equity, so a position carried into the window counts from its mark at the
boundary. A fold with no pick fails. **Procedure gate:** both folds pass; the gate stage also checks that each
VALIDATION record belongs to its sealed PICKS record and to the frozen code.

## 9. Final selection and the holdout

The final selection (§7 on 2019-02-11 → 2024-07-01) runs whatever the gate says; its picks are retrospective research
artifacts. **Only if the procedure gate passes** and the final selection has a pick, the sealed final picks are
evaluated once on the holdout (2024-07-01 → 2026-08-25) with the §8 evidence; the rank-1 pick's holdout gate is the
fold gate's rule on the holdout window. If the gate fails, the holdout is never read by any engine run, and every
phenotype's data door ends on 2024-06-30. The door is derived from the sealed records (gate, final picks, holdout),
never from an editable phenotype file.

## 10. Records and guards

Every stage writes sealed, write-once records (`bodyHash` = sha256 of the record's JSON body) and refuses to run
again. Outcome stages first check the freeze: the three documents' hashes, the procedure object's hash, the
snapshot's series hash, every **outcome-critical** file of the code manifest (`src/btcusdt-d1/**/*.ts` and the
imported `src/optimizer/{rng,sobol}.ts`, except the report-only CLI, report, tables and phenotype files and the
tests, which may change and are listed by `verify`), the `btc-d1` script, the imports map, `package-lock.json` and
Node v24.21.0. Every outcome record (SELECTION, PICKS, VALIDATION, PROCEDURE_GATE, HOLDOUT) states the freeze body
hash, outcome-code digest and procedure hash it ran under. The freeze itself is refused unless the latest parity
record tested exactly the engine code being frozen (`PARITY.json`, or a labelled rerun `PARITY-rN.json` after an
engine change) and clean (no difference, no ledger problem, no mutation violation, every cheat caught). The `fixed`
and `compare` commands refuse any date after a phenotype's sealed permitted day and print that day; the door is
computed in the outcome-critical `src/btcusdt-d1/door.ts`, and both commands run the freeze guard once the freeze
exists.

## 11. Benchmark (outcome-blind)

Before the freeze, 1,024 uniform random vectors were timed on the fold A and final selection windows; only timings
were recorded (the workers' metrics were discarded unread): 2.5 and 3.5 ms per evaluation with 9 workers
(`results/benchmark/BENCHMARK.json`, which lists the draft budgets of 16,384 Sobol / 16 generations / shortlist 40,
about 71 s per selection). The budgets were then raised once, from timings alone, to the values in §7 (about 72,000
evaluations and four minutes per selection, under 15 minutes for all three) and frozen. No budget changes after the
freeze, and no search continues because a result disappoints.

## 12. Independence limitations and disclosures

- BTC's 2018–2026 history is public and part of the researcher's (an AI model's) background knowledge; the holdout
  is untouched by this study's search and gates, not unknown to the world. Walk-forward results are reused
  historical windows, not prospective evidence.
- Before this protocol was written, the unchanged diagnostic vector was run once on the development span to prove the
  engines (brief §5.2): 105 trades, +89,223 USDT, 65.7% minute peak-to-trough. The box, the chronology rule and the
  cost scenarios had been written before that run (file hashes in RESEARCH_RECOVERY.md §4) and were not changed. The
  gates and the selection procedure were planned before that run but written to disk after it; their thresholds are
  the brief's own (35% ceiling, the suggested principal costs) or generic (≥ 3 trades a year, 50% neighbour
  feasibility, distance 0.5), and none was tuned to the diagnostic. The parity stage ran 41 vectors on the
  development span and recorded differences and trade counts only.
- Parameter neighbours are perturbations around one historical path, not independent samples of future markets.
- After the diagnostic run, `params.ts` was reformatted by Prettier (whitespace only) and `costs.ts`'s stop-fill
  description strings were rewritten after the review; no bound or cost value changed. The pre-diagnostic
  `params.ts` was reconstructed byte for byte (`coordinator/pre-diagnostic/params.ts.txt`, sha256 `663bbbb9…`, equal
  to the hash recorded before the run) and differs from the frozen file only in whitespace.
- The independent pre-freeze review (no outcome existed) led to these pre-freeze changes: G1's USDT ceiling, G6, the
  out-of-sample fold gate, the shortlist diversity rule, the worst-case stop definition, carrying a last-minute stop
  sale to the next trade, data-layer hardening, the freeze/record/door rules. Its findings and each disposition are
  in `reviews/PRE_FREEZE_DISPOSITIONS.md`.
