# DATA_SCHEMAS — RES-BD 1.0.0 machine-readable records

Every file here is report-only and derived. None is official Stage B search evidence. Dollars are the unrounded engine
values unless a field says "cents". C0 = $100,000. Non-finite numbers in JSON use the store's encoding: `"__Inf"`,
`"__-Inf"`, `"__NaN"`. CSV booleans are `1` / `0`. Files written by `tools/vg-l0-risk-envelope-stage-b-diagnostics/`.

## `results/census/census-<cut>.json` (analyze.ts)

**Replay evidence**

| Key | Meaning |
|---|---|
| `archive` | `original` / `copy` paths, `sha256` (= the committed baseline), `rows` (archived evaluation keys) |
| `replay` | `lanes`, `identicalToSealed`, the replayed and sealed `requestedByArm`, `capturedRequests` (screen / centre / neighbours by arm), `extensionRounds` |
| `zeroEvaluations` | `fresh` (= 0), `refusingPoolCalls` (= 0), `refusedTasks`, `laneArchiveHits` (= requested), `neighbourhoodReads`, `rowsAtOpen` = `rowsAtClose` |
| `originalSha256AtEnd` | the original archive re-hashed after the replay |
| `requests` | the sealed requested totals and the captured counts |

**The centre population**

| Key | Meaning |
|---|---|
| `centres` | `unique` centres (by `cfgId`), `byOrigin` (requested by CTRL lanes only / EXP30 only / both), `reasons` (error, a family unfunded, net ≤ 0, no envelope, scope), `scope` (= profitable ∧ both families funded ∧ envelope), `scopeByOrigin`, `scopeByHighestStage` |
| `centrePlausibility` | P0 / P3 overlap `{n, both, p0Only, p3Only, neither}`: for `all`, `byOrigin`, `byHighestStage`, `screenProposals` (identical in both arms) and `postScreenByArm` (centres a lane of that arm requested after its screen) |

**Limits and the band**

| Key | Meaning |
|---|---|
| `limits` | counts over the scope of DD > $35k / > $40k, PL (liq.) > $25k and BD (liq.) > $30k; `p3FailCombos` (failing metric sets); `p3Binding` (the failing metric with the largest normalized excess) |
| `ddBand35to40` | centres with DD in ($35k, $40k]: `admittedByP3`, `offsetByPlOrBd` (P3 rejects them through PL or BD), by origin and by screen or post-screen |
| `p0PassP3Fail` | centres P0 admits and P3 rejects, and why |

**Distributions and bounds**

| Key | Meaning |
|---|---|
| `netDistribution`, `ddDistribution` | n, mean, min, p10, p25, median, p75, p90, p99, max, top-10 mean, worst-10 % mean |
| `givebackLowerBoundShare` | the distribution of max(0, DD − BD_marked) ÷ DD, a lower bound on U ÷ DD; `provablyGivebackDominated` counts (bound ≥ ½ DD) |

**Rungs and finalists**

| Key | Meaning |
|---|---|
| `rungFits[]` | per rung (r1 = 16, refine = 16, r2 = 64, r3 = 128 draws): measured fits, the fitting arms, feasibility under both / CTRL only / EXP30 only / neither (frozen `violationArm`), the failing violation parts |
| `finalists` | Stage B's sealed union-qualification verdicts: both / P0 only / P3 only / neither, by shortlisting arm, and the best qualified centre net per policy |

## `results/census/centres-<cut>.csv.gz`

One row per unique centre:

| Column | Meaning |
|---|---|
| `id`, `cell` | the configuration's canonical identity and its cell |
| `origin` | `CTRL` / `EXP30` / `both` |
| `postScreenBy` | the arm(s) that requested it after the screen; `none` = screen only |
| `screen` | whether it was a screen proposal |
| `highest` | the highest stage reached |
| `reason`, `ok` | the scope test |
| `net`, `dd` | centre values |
| `plLiq`, `bdLiq`, `bdMarked` | envelope values |
| `givebackLowerBound` | max(0, DD − BD_marked) |
| `p0`, `p3` | centre plausibility under each policy |
| `failP3`, `bindingP3` | the failing and binding P3 metrics |
| `ddBand` | DD in ($35k, $40k] |
| `lots`, `occupancy` | funded lots and occupancy |

## `results/census/rungs-<cut>.csv.gz`

One row per measured (centre, rung) neighbourhood:

| Column | Meaning |
|---|---|
| `id`, `rung`, `n`, `unique`, `failed` | the centre, the rung, its draws, the unique draws and the failed draws |
| `fittedBy` | the arm(s) whose lane fitted the centre at this rung |
| `feasible*`, `violation*` | per arm (frozen `violationArm`, NL0's 1e-6 rounding) |
| `p90DdCents` | Priority 3's cent-rounded p90 DD (the CTRL instrument) |
| `p90DdUnrounded`, `p90PlLiq`, `p90BdLiq` | the EXP-30 instrument |
| `breach*` | draws above $35k / $40k DD, $25k PL, $30k BD |
| `givebackLowerBoundMedian` | the median of max(0, DD − BD_marked) over the draws |

## `results/qualification/draws-<cut>.json`

Zero evaluations: the qualification replay plus the representatives' sealed confirmation draws.

| Key | Meaning |
|---|---|
| `reproduction` | the replayed evidence = sealed (`evidenceIdentical`, `pooledStatisticsIdentical`, requested) |
| `zeroEvaluations` | `fresh`, `refusingPoolCalls`, `archiveHits`, rows |
| `perArm.<arm>` | over the 32 representatives' unique confirmation draws: `draws`, `failedDraws`, `ddOver35` (+ Wilson 95 %), `ddOver40`; for draws above $35k, the giveback bound (dollars and share), `over35ProvablyGivebackDominated`, BD marked / liq., PL liq., net; `bdOver30`, `plOver25`; `perRepresentative[]` (p90 DD, p90 of the bound, p90 BD marked, draws > $35k) |

## `results/giveback/giveback-<cut>.json` (giveback.ts)

| Key | Meaning |
|---|---|
| `cpuEqualsGpu` | `toTheCent`, `bitForBit`, `subjects` |
| `pairs`, `lanes`, `pooledPrimaries` | Stage B's sealed values, quoted |
| `subjects[]` | see below |

**`subjects[]`: the fields of Stage B's `giveback.ts` row.** `net`, `dd`, `ddLiquidation`, `unbankedGiveback` (U),
`bankedErosion` (E), `capitalLoss` (F), `unbankedGivebackShare` (U ÷ DD), `givebackDominated` (U ≥ ½ DD),
`lotProfitGiveback`, `maxTradeGivebackAboveBreakeven`, `maxTradePeakProfit`, `worstTradeNet`, `lots`, `occupancy`.

**`subjects[]`: the extension.**

| Field | Meaning |
|---|---|
| `kind`, `roles` | subject or benchmark, and its roles in the sealed selection |
| `passesP0`, `passesP3` | the centre envelope only, not qualification |
| `envelope`, `bankedDd*`, `principalLoss*` | the four CPU envelope values (= GPU) |
| `givebackLowerBound`, `erosionPlusCapitalLoss` | the bound and E + F |
| `liquidation` | U / E / F on the liquidation basis |
| `window` | the dates of the conventional maximum-DD window |
| `lotPrincipalLoss` | the lot lens |
| `window*` | sums over the window's lots: giveback of lots that closed profitable, closed at a loss or were open at the door end; the principal loss of lots that closed at a loss; gross giveback; gross principal loss; offsets |
| `tradesWithGiveback`, `tradesGivebackEndedProfitable`, `tradesGivebackEndedLoss`, `tradesLosing`, `sumTradeGiveback*` | the trade-level counts and sums |
| `maxTradePrincipalLossLiq` | the deepest trade principal loss |
| `bankedEpisode` | the high and trough dates of the banked-capital DD, both bases |
| `tradedNotional`, `principalDays`, `byBook` | exposure |

## `results/giveback/parity-<cut>.json`

Per subject: the fields compared to the cent with their mismatches (none), the bit-for-bit difference paths (none), and
the path reconciliation (engine DD = ledger path DD = D3 DD, with D3 residual < 1e-6).

## `results/giveback/paired-<cut>.json` (analyze.ts)

| Key | Meaning |
|---|---|
| `paired.<metric>` | Stage B's frozen `summarize` on the 32 (cell, replicate) pairs, EXP-30 rep − CTRL rep: `mean`, `bound` (q 0.1), `ci80`, `perCell`, `signs`, `sensitivity`; plus each arm's distribution and mean |
| `identity` | mean ΔDD = mean ΔU + mean ΔE + mean ΔF, with the residual |
| `arm.<arm>` | giveback-dominated count (+ Wilson 95 %); F > 0 count; U / E / F shares of the summed DD; P0 / P3 centre passes; the bound check |
| `p0RejectedExp30`, `otherPairs` | the same split for the EXP-30 representatives Stage B's sealed verdicts say P0 would reject, and for the remaining pairs |
| `illustrations` | each arm's own maximum-DD window for the pooled P0 primaries and for the pair with the largest ΔDD: dates, M at the peak and trough, banked high H, U / E / F, and the four lots that contributed most |
| `benchmarks` | New L0 and N/original (descriptive) |
| `winnersVsLosers` | per arm, sums over the representatives of the window giveback by lot outcome and of the trade-level counts |

## `results/giveback/subjects-<cut>.csv`, `pairs-<cut>.csv`

- `subjects-<cut>.csv`: the subject rows flattened.
- `pairs-<cut>.csv`: one row per pair, with `ctrl.<metric>` / `exp30.<metric>` and `exp30RejectedByP0`.

## `results/verification/`

| File | Contents |
|---|---|
| `archives-before.sha256` / `archives-after.sha256` | the 12 Stage B job archives |
| `archive-actions.jsonl` | every copy (sha256, bytes, integrity), removal (the files removed) and `verify-all` |
| `seals-*.txt` | Stage B's 22 sealed records verified |
| `tests.txt` | the tool tests |

The full git-ignored intermediates, named with their sha256 in `VERIFICATION.md`, are on Apollo under
`.cache/vg-l0-risk-envelope-stage-b-diagnostics/`. They are not in the ZIP:
- `population-<cut>.json.gz`: every centre's record summary and every measured neighbourhood;
- `qualification-<cut>.json.gz`: every member's draws and GPU centre record;
- `giveback-<cut>.json.gz`: full rows with every window lot and every trade.
