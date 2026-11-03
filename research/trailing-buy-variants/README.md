# VGT trailing-buy strategy variants

A pre-registered research and implementation program (2026-10-20) on the four intraday trailing-buy
strategies and six new mechanisms, with runnable TypeScript for each. Pre-registration: [PROTOCOL.md](PROTOCOL.md)
(written before any result; Amendment 1 added two combinations after the walk-forward results). Tables:
[STRATEGY_COMPARISON.md](STRATEGY_COMPARISON.md) (architectures, windows, Trades2 reconciliation, development,
walk-forward, credit rule, reused window, full-history frontier, sweeps), [TRADE_ATTRIBUTION.md](TRADE_ATTRIBUTION.md)
(every finalist against Trades2 trade by trade), [PROVENANCE.md](PROVENANCE.md) (domains, seeds, budget actually
run), `phenotypes/<family>.md` (ten phenotypes per family with every parameter, metrics and how to set them in the
source), [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md) (files, checks, caveats). Machine-readable: `results/shortlist.json`,
`results/shortlist.csv`, `results/verdicts.json`, `results/holdout/holdout.json`, `results/sweeps.json`.

Everything is an idealized historical simulation on raw one-minute VGT bars (2016-01-04 → 2025-10-13):
$100,000 borrowed per entry at 11% simple annual interest by calendar day, intraday stops filled at the stop
price (the bars only show that the level traded), no spread, commission, slippage or dividends. Drawdowns are of
the strategy's cumulative mark-to-market P&L on a $100,000 allocation, minute-sampled unless stated. **The
2024-01-02 → 2025-10-13 window is previously inspected / reused** (the previous program evaluated its picks,
including Trades2, on it); it is not an independent holdout, and nothing here says anything about live safety.

## Verdict

1. **No new mechanism, and no combination, earned credit.** Under the pre-declared rule (win 3 of 4
   out-of-sample windows on both the median-of-10 and the balanced #1 policy, higher total, worst drawdown not
   more than 25% above the base), every one of the twelve single-mechanism families and both combinations failed
   against its base. The optimized picks of **every** family, the four originals included, lost money over the
   three walk-forward windows (2020–21, 2022, 2023): medians from −$47k to +$1k, against $94.8k for the
   unoptimized `allIn.ts` and $88–94k for the Trades2 phenotype (which is in-sample on those years, having been
   selected on development data by the previous program). 2022 was the decisive window: every optimized policy
   lost there. This repeats the previous program's finding with wider bounds, a drawdown ceiling and six more
   mechanisms.
2. **At the reference phenotype, no mechanism improves the loss-versus-winner trade-off.** The
   Trades2-anchored sweeps (every lattice value of each mechanism's parameters with the rest fixed) found
   nothing that beat the base by more than about $1,000 on any validation window; most settings cost money. On
   the full history (Trades2 $154,213 / $27,408):
   - *failed-recovery invalidation* (2%): the March-2020 loss shrinks from −$9,460 to −$6,721, but ten new
     whipsaw trades lose $25.8k and one winner turns into a loss: $122,416 / $33,701;
   - *episode loss budget* (8%): blocks the April-2020 re-entry after the March loss and misses +$50k and
     +$8.6k: $95,662 / $28,340;
   - *depth-adjusted rebound* (10% slope): the same trades a few cents later: $154,430 / $27,403;
   - *progressive deployment* (50% + add at 2%): the winners are diminished by the half-size first leg:
     $137,265 / $28,233, with a mean deployed fraction of 0.96;
   - *progress-based hold* (3%, +10 days): longer losing holds and interest: $125,832 / $30,669;
   - *persistence* (3 minutes): the same trades, $150,289 / $27,170.
   The avoidable losses the brief asked about (false rebounds, repeated attempts in 2022) are small (−$0.1k to
   −$4.4k each, eight in total); every mechanism that trims them also trims or skips a large winner, and the
   large winners are what the $154k is made of (three trades and the open 2025 position contribute $142k).
3. **What the search did find is a family of lower-drawdown neighbours of Trades2**, all with deep arming
   (X 20–24%), tiny rebounds (Y 0.1–1.0%), a 7.3–7.8% stop and an 8–11-day hold. They hold the same three or
   four recovery trades, skip some of the smaller 2022 attempts and the 2022-12 winner, and make $135–151k at
   $16.6–21.4k minute drawdown (Trades2: $154k at $27.4k). They were selected on development data (in-sample),
   and their reused-window results ($43–51k) are of the same kind as Trades2's ($42k); they are not evidence of
   skill beyond Trades2, only alternative risk profiles of the same behaviour.
4. **`allIn.ts` (immediate entry) still makes the most money** on the combined run: $167,624 at $32,084 with 33
   entries, and $48,432 on the reused window against Trades2's $42,164. Among 180 frozen picks, 4 beat it on
   the reused window and none in walk-forward.

## Shortlist (ranked trade-offs, not one winner)

All figures are measured on the combined continuous run 2016-09-20 → 2025-10-13 (`stop` fills, 11%), with the
development (in-sample) and reused-window parts shown separately. Every entry is within the $35,000 minute
drawdown ceiling. "Dev" = 2016-09-20 → 2023-12-29 (in-sample for the picks); "Reused" = 2024-01-02 →
2025-10-13. Walk-forward figures exist only for fold picks, never for these final-fit phenotypes; the family's
stitched walk-forward policies are in STRATEGY_COMPARISON.md and were negative for every family.

| Rank | Architecture (runnable source) | ID | Parameters | Net | Minute DD | Net/DD | Trades | Dev net | Reused net | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Trades2: file 4 `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` (checked-in constants) | `4-d6aa287598` | X 20.0% Y 0.5% stop 7.8% hold 11 L 104 buffer 0.2% | $154,213 | $27,408 | 5.6 | 18 | $112,050 | $42,164 | reference; previous program's pick, in-sample through 2023 |
| 2 | file 4, low-drawdown neighbour | `4-798cb70c6d` | X 21.6% Y 0.3% stop 7.3% hold 8 L 74 buffer 2.9% | $150,630 | $21,183 | 7.1 | 14 | $104,758 | $45,760 | same behaviour on file 3 as `3-1c65f25d09` (L 75, no buffer): $150.6k / $21.2k; keeps 7 of Trades2's 10 winners, misses the 2022-12 one (−$29.7k), avoids 4 losses |
| 3 | file 2 `src/app/allIn-trailingBuy-bufferedLoss.ts` (restricted re-entry) | `2-3615fa7ab5` | X 23.8% Y 0.8% stop 7.3% hold 8 L 70 mat 1.2% lower 5.9% reset 25.5% buffer 0.6% | $139,457 | $16,565 | 8.4 | 11 | $89,014 | $50,474 | best net/DD; one of four picks above `allIn.ts` on the reused window; misses 4 winners (−$39.3k) |
| 4 | file 1 `src/app/allIn-trailingBuy.ts` (restricted re-entry) | `1-7e39b4db21` | X 21.6% Y 1.0% stop 7.4% hold 33 L 78 mat 0.6% lower 5.3% reset 31.7% | $135,001 | $17,249 | 7.8 | 12 | $91,725 | $43,276 | 33-day hold; 6 winners preserved |
| 5 | file 2, highest net within the ceiling | `2-5a28fd24e1` | X 11.4% Y 0.1% stop 7.3% hold 10 L 166 mat 0.9% lower 5.9% reset 47.3% buffer 2.6% | $175,870 | $26,919 | 6.5 | 37 | $144,460 | $31,410 | **in-sample driven**: shallow X / Y 0.1% picks of this kind lost in every 2022 walk-forward; 21 new trades add $32k, the two biggest Trades2 winners are diminished |
| 6 | persistence `src/app/allIn-trailingBuy-persistence.ts` | `15-a7ad5dfc13` | X 20.4% Y 0.6% stop 7.8% hold 11 L 100 buffer 0.0% confirm 4 | $158,085 | $27,430 | 5.8 | 19 | $114,784 | $43,301 | a Trades2 clone (8 winners preserved, +$4k): the mechanism adds nothing material |
| 7 | persistence, tight stop | `15-7b758f836d` | X 21.5% Y 0.1% stop 4.9% hold 19 L 74 buffer 1.1% confirm 7 | $117,333 | $14,720 | 8.0 | 18 | $84,547 | $32,894 | the 4.9% stop halves two large winners; lowest drawdown with net above $100k |
| 8 | staged `src/app/allIn-trailingBuy-staged.ts` | `11-57b8e4b98f` | X 24.0% Y 0.1% stop 7.3% hold 8 L 81 buffer 1.5% first 50% add 7.5% | $119,073 | $15,564 | 7.7 | 11 | $77,621 | $41,505 | mean deployed fraction 0.94, net per $100k-year of capital $77.8k; **loses to its risk-matched control**: the all-in file 4 at the same core parameters makes $150,135 / $21,417, or $140.9k / $20.1k scaled to 0.94 |
| 9 | depthRebound `src/app/allIn-trailingBuy-depthRebound.ts` | `9-0ffecbb27f` | X 20.4% Y 0.3% stop 7.8% hold 11 L 104 buffer 0.1% slope 11.8% | $157,420 | $26,874 | 5.9 | 19 | $115,239 | $42,181 | Trades2 clone (10 winners preserved) |

The remaining phenotypes (ten per family, 18 families) are in `phenotypes/`. The unbuffered mechanism families
and the two combinations have no dedicated runnable file and are reported for diagnosis only (none is credited).

## How to run a phenotype

Every runnable architecture is one file under `src/app/`; the parameters are the option defaults and the named
constants near the top of its `runAllIn` function. Edit them, then run:

```
npm run app -- allIn-trailingBuy-bufferedLoss-noReentry VGT          # file 4 (Trades2 architecture)
npm run app -- allIn-trailingBuy-invalidation VGT                     # or episodeBudget, depthRebound, staged, progressHold, persistence
npm run app -- allIn-trailingBuy-staged VGT 2016-01-04 2025-10-13 - out/staged stop 0.001 0.015
```

Arguments after the symbol: `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`; `-` leaves one at
its default. With an output directory the run writes `trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`,
`setups.csv` and `summary.json`. Where each value goes, for example rank 2 in file 4:

```
const targetPercentChange = targetPercentChangeOption ?? 0.216;   // X
const trailingBuyPercentage = trailingBuyPercentageOption ?? 0.003; // Y
const intradayLossBuffer = intradayLossBufferOption ?? 0.029;       // buffer
const tickWindowSize = 74;                                          // L
const trailingStopPercentage = 0.073;                               // stop
const maximumHoldDays = 8;                                          // hold
```

The mechanism files add their own constants right after the buffer line (`invalidationBuffer`,
`episodeLossBudget` + `episodeResetRetrace`, `reboundDepthSlope`, `initialFraction` + `addTrigger`,
`progressThreshold` + `holdExtensionDays`, `confirmMinutes`). Each `phenotypes/<family>.md` lists the exact
lines for every phenotype. No preset or configuration files exist; the files run as checked in (file 4 at
Trades2, the mechanism files at Trades2 plus the mechanism's default).

## Reproducing the program

```
npm run trailing-buy-variants -- parity --vectors 40     # six mechanism files + file 4 against the engine (research view)
npm run trailing-buy-variants -- search                  # 18 families x 4 fits (combinations from results/combinations.json)
npm run trailing-buy-variants -- validate                # walk-forward folds 1-3
npm run trailing-buy-variants -- sweeps                  # Trades2-anchored mechanism sweeps
npm run trailing-buy-variants -- development             # development traces, next-open and 8%/14% sensitivities
npm run trailing-buy-variants -- freeze                  # records picks, hashes, seeds (refuses to overwrite)
npm run trailing-buy-variants -- holdout                 # the reused window, once (refuses a rerun without --rerun-reason)
npm run trailing-buy-variants -- parity --full           # the files at their defaults on the whole file
npm run trailing-buy-variants -- report                  # regenerates the tables from results/
npm test                                                 # includes src/trailing-buy-variants/tests (16 tests)
```

Use Node 24 (`~/.local/share/fnm/node-versions/v24.21.0/installation/bin`). Seeds are derived from
`'trailing-buy-variants'`, the fit and the family; every stage has a gzipped JSONL checkpoint that replays it.

## Trades2 reconciliation

Running file 4 at its checked-in constants on `data/VGT/VGT-2016-2025-1-minute.csv` reproduced `trades2.txt`
exactly: 17 closed + 1 open trades, realized $111,329, unrealized $42,885 after $5,395 accrued interest, total
$154,213, interest $29,142, daily drawdown $23,010 (2019-04-24 → 2020-03-16), minute drawdown $27,408
(2019-05-01 11:44 → 2020-03-18 14:27). The total correctly includes the open position marked at the
2025-10-13 close net of accrued interest. The engine gives the same figures (parity). Trades2 is the previous
program's frozen pick `4-81aca36069`: $112,050 development + $42,164 reused window.

## Data and execution limits

- 809,490 raw Alpaca minute rows, 2,459 sessions, no split; about 20% of regular-session minutes have no bar
  (most in 2016–2017); five sessions have no closing print. Nothing was repaired.
- A stop filled at the stop level is an assumption. `next-open` fills changed every finalist's net by less than
  $1,500 on the full run (`results/holdout/holdout.json`). Interest at 8% / 14% moves levels, not rankings.
- Trade counts are small (9–37 trades in nine years for the shortlist; 2–11 per window), so single trades
  decide windows; the reused window is one 21-month period with one April-2025 event.
- 18 families × 4 fits × ~19,000 evaluations plus 55,000 neighbourhood probes and 3,700 sweep points were
  searched (PROVENANCE.md): any out-of-sample figure is the descendant of several hundred thousand candidates.

## Workstreams, briefly

- **A (four originals):** re-optimized with wider bounds (X 5–30%, Y 0.1–8%, stop 3–15%, hold 3–40, L 45–180)
  and the ceiling. Same outcome as the previous program: in-sample nets of $137–148k at the ceiling, negative
  walk-forward medians, reused-window medians of −$1k (file 1), $26.5k (2), $32.8k (3), $42.1k (4).
- **B (mechanisms):** six mechanisms on bases 3 and 4, each with the full budget on all four fits, plus two
  combinations (Amendment 1). None credited; see the verdict.
- **C (validation and attribution):** STRATEGY_COMPARISON.md, TRADE_ATTRIBUTION.md, `phenotypes/*.md`
  (neighbourhood robustness per pick), `results/holdout/holdout.json` (flat start, `next-open`, 8% / 14%,
  per year, April 2025).
- **D (code):** six parity-verified strategy files, the engine module, 16 tests; see COMPLETION_AUDIT.md.
