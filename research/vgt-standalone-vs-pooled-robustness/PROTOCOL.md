# Standalone VGT versus B4/B5 robustness audit — pre-registered protocol

Version 1, written 2026-10-27 after the inventory (`VGT_PHENOTYPE_INVENTORY.md`), the existing regression
(`npm run pools -- verify`, all checks passed) and the baseline parity (`npm run vgt-robustness -- baseline`, 47/47),
and **before any new standalone-VGT robustness experiment**: no perturbation, cost scenario, attribution or
concentration figure of the standalone had been computed. `PROTOCOL_FREEZE.json` fixes this file's sha256; any later
change is an amendment appended in §13 with its reason and time. No threshold or decision rule is changed after results
are seen.

## 1. Question and status of the evidence

**Question.** Is the existing, frozen standalone VGT D1 strategy a more dependable way to deploy opportunistic margin
than the frozen B4/B5 shared pools, even with lower historical absolute profit?

This is an **audit and controlled comparison, not an optimisation**:
- nothing is tuned, searched, screened or promoted;
- no pool membership, switching policy or new strategy is created;
- every perturbation is **diagnostic-only**, never written to `config/`, and never saved as a phenotype.

Defensible outcomes: B5 remains preferable, standalone VGT is preferable, both merit parallel observation, or the
evidence is insufficient.

The whole window **2016-01-04 → 2026-10-13** was inspected while D1, B4 and B5 were selected, including 2024–2026.
Every result here is **retrospective**; no part of it is fresh validation. Neighbourhood samples, years, regimes and
trades share one price history and are not independent trials. No bar after 2026-10-13 is read. The prospective B4/B5
freeze (`research/prospective-b4-b5-shadow/`) is not touched, and nothing is registered into it.

## 2. Tested configurations and frozen comparators

- **S = VGT-primary standalone** (the only registered VGT D1 phenotype; `VGT_PHENOTYPE_INVENTORY.md`). X 21.6%,
  Y 0.3%, stop 7.3%, hold 8, L 74, buffer 2.9%, P 9.0%, W 60; `d1-ebc9f639b3`. **No VGT lowDd exists**; none is made.
- **B4** (`config/pools/B4.json`), **B5** (`config/pools/B5.json`): frozen pools, unchanged. Their VGT book is the
  same vector as S.
- **C0**: the 60/40 VOOG/VGT core with no overlay (the frozen control).

## 3. Engine, data, conventions and baseline

- **Engine.** The frozen N-book allocator `src/portfolio-aware-d1/nbook/engine.ts`, called through the completed
  B4/B5 audit's pure runner (`src/b4-b5-robustness/run.ts`, read-only), configured exactly as `src/pools/run.ts`
  `runPoolOn`. S is a one-book pool `[VGT primary]`: shadow policy, so every VGT signal is funded (no other book can
  hold the slot). No engine code is copied or edited.
- **Data.** Canonical `data/<SYMBOL>/data.csv`, `all` partition, 2016-01-04 → 2026-10-13, 2,710 sessions, hashes
  pinned by `config/pools/B5.json` (the loader refuses other data); splits forward-adjusted; books arm from 2017-06-15.
  One continuous run; no isolated partition, splice or reset.
- **Fixed:** one $100,000 funded lot at a time, never compounded; 11% simple interest (365-day); 5 bps per side; stops
  fill at the stop. C0 has no fixed mode.
- **Portfolio (dynamic):** $300,000 at 60% VOOG / 40% VGT; each funded lot borrows 20% of marked equity at the
  decision; profits reinvested 60/40 and losses funded by core sales; frozen dividend convention (core and open VGT
  lots receive VGT/VOOG distributions; symmetric reported once as a sensitivity); Reg T and U35 at entry; maintenance
  ratios passive only — no calls, no forced sales. **S's overlay adds VGT exposure on top of the core's VGT**; §9
  quantifies that duplication.
- **Anchors** (reproduced before this protocol; `results/baseline/baseline.json`, 47/47):

  | | Fixed net | Fixed max minute DD | Lots | Portfolio end equity | Max daily % DD | Max minute % DD |
  |---|---:|---:|---:|---:|---:|---:|
  | B4 | $284,244.74 | $28,659.34 | 76 | $3,608,484.05 | 34.65% | 37.01% |
  | B5 | $486,207.77 | $26,509.97 | 94 | $5,410,976.72 | 29.67% | 31.09% |
  | C0 | — | — | — | $2,279,768.98 | 33.89% | 35.76% |

  B4/B5/C0 also equal the prior audit's stored base/control records field for field. S equals the frozen controls
  `all.B1.{fixed,portfolio}-{0,2,5,10}` in every summary field and the existing standalone CLI trade by trade. Under the
  shadow policy the VGT book's virtual trades inside B4 and B5 are exactly S's lots (B4 funds 14 of 21, B5 12 of 21).
  If any later run of a frozen configuration differs from its record, comparative conclusions stop (§10).

## 4. Reuse of the completed B4/B5 audit (read-only)

`research/b4-b5-robustness-audit/` (protocol `73913413…`) is read, never written, and its write commands are never
run. Reused records: `results/runs/{base,cost,oat,book,joint,ablation,dividends,control}.jsonl`, the base detail
ledgers, `analysis.json`, `MANIFEST.json`. Its 1,755 runs are not repeated.

**Pooled path re-executions** (family `p-path`). The prior records of OAT and per-book samples keep only a lot-set
hash, not the lots. To compare funded-lot paths, the prior audit's **own** VGT design points are re-executed in fixed
mode with each lot kept: per pool, the base, the 32 VGT OAT points and the 32 per-book VGT samples (130 runs).
Each must equal its stored prior record in every stored field other than labels and the lot list; any difference stops
the path comparison until reconciled.

## 5. Parameter stability (Workstream P)

Parameters, legal grid, distances (small/moderate), 0.1-pp quantization and constraint handling are the prior
protocol's §3, unchanged (`src/b4-b5-robustness/context.ts`). For VGT: X ±0.5/±1.0 pp; Y (0.3% < 2%) ±0.1/±0.2 pp;
stop, buffer, P ±0.5/±1.0 pp; hold ±1/±2; L ±7/±15; W ±6/±12. All 32 VGT OAT points are inside the grid.

1. **OAT (individual-parameter stress).** S at the prior audit's 32 VGT points (v − m, v − s, v + s, v + m for each of
   eight parameters), fixed and portfolio. Paired with the stored B4/B5 VGT-OAT records at the same points.
2. **Matched 8-D stress (primary comparison).** S at **exactly the prior audit's per-book VGT hypercube samples**:
   the 32 of B4 and the 32 of B5 (Latin hypercube, labels `'book', <pool>, 'VGT', 1`, regenerated by the prior
   function and checked equal to its `MANIFEST.json`) — 64 vectors, fixed and portfolio. Each S sample is **paired**
   with the stored pooled record of the same VGT vector (B4 design ↔ B4, B5 design ↔ B5). Same ranges, quantization,
   construction, seeds and counts; the only difference is the structure the vector runs in.
3. **Supplementary standalone joint 8-D neighbourhood** at the prior joint budget: two seeds of 64, the prior
   Latin-hypercube function over S's eight dimensions with labels `'vgt-standalone-joint', 'VGT-primary', <seed>`
   (seed derivation `deriveSeed('b4-b5-robustness-audit-v1', 'vgt-standalone-joint', 'VGT-primary', s)`), fixed and
   portfolio. It is distributionally the same box as the matched design, with fresh draws.
4. **System-level joint stress (distinct test).** The prior B4 (32-D) and B5 (40-D) joint neighbourhoods are reported
   as they are, labelled a test of **combined strategy complexity**. They are never compared with an 8-D
   distribution as evidence of intrinsic per-parameter stability, and a 47% joint median is never read as a forecast.
5. **Other books' 8-D designs** (prior XBI, XRT, KRE, GDX per-book designs) are shown for context: unpaired, other
   ranges.

**Metrics** (per run): the prior metric set (fixed net, gross, interest, friction, lots, wins/losses, worst lot,
profit factor, lot-days, exposure, fixed daily and minute DD in $ and % of $100k, net ÷ minute DD, net per $1M
borrowing dollar-days; portfolio end equity, incremental over C0, max daily and minute % DD by running peak and $ DD).
Added:
- **Retention** = run fixed net ÷ the configuration's own frozen fixed net (S ÷ S frozen; pool ÷ pool frozen) and
  **Δ$** = run − own frozen (all fixed runs share the $100k slot, so Δ$ is comparable).
- **Decomposition (pools):** Δ pool net = Δ VGT-book funded net + Δ other books' funded net (displacement).
- **Lot-path preservation** (fixed): the share of the configuration's own frozen funded lots present unchanged
  (same symbol, decision time, exit time and reason); lots added; lots removed; for pools, the same for the VGT book
  and for the other books separately.
- **Drawdown sequence:** the regime window (§7) containing the trough of each run's max portfolio daily % DD and of
  its fixed max minute DD; the share of runs sharing the frozen configuration's worst episode.

Per design: median, P10, P90, worst, share net > 0, share ≥ 50% of own frozen, share > own frozen, the frozen
percentile rank (ties half), median and P10/P90 portfolio daily and minute % DD, shares > 30% and > 35%, share with
incremental wealth over C0 > 0.

## 6. Execution paths (Workstream E)

- **Frozen paths.** For each of S's 21 lots: whether B4 and B5 funded it; if not, which book's lot held the slot,
  that lot's net, and the net of the blocked VGT trade (descriptive displacement accounting). Refused signals by
  holder (from the signals).
- **Predeclared traced examples** (S and both pools, fixed): the OAT points VGT X −m (20.6%), X +m (22.6%),
  hold −m (6) and P +m (10.0%) — the four largest VGT-OAT swings in B4 reported by the prior audit — listing the lots
  that appear, disappear or change exit in each structure.
- Holding periods, entry/exit dates, exit reasons and blocked opportunities are compared, not only terminal net.

## 7. Trades, years and regimes (Workstream T)

From S's base fixed ledger (the prior §7 definitions): counts, wins/losses, gross, interest, friction, net, win rate,
profit factor, median/mean net, holding periods, lot-days, exit reasons (profitable stop exits versus maximum-hold
losers), largest winner and loser, MAE/MFE from legally observable minute bars (the prior `excursionOf`: entry bar
through the bar before the exit bar, plus the exit price), and the engine's `worstMark`. Concentration: top 1/3/5/10
winning lots' share of total net; total excluding top N (descriptive only).

**Years:** marked-to-market attribution of the fixed `strategyMark` and the portfolio equity (last close of Y−1 to last
close of Y), interest, lots entered/exited, years with no lot entered; top-1/top-2 year shares, worst year,
leave-one-year-out (attribution only — no bar deleted, no path joined). Dependence on 2020, 2022, 2023, 2025 and the
partial 2026 (to 2026-10-13) is stated. 2016 cannot trade; 2017 is partial eligibility.

**Regimes:** the prior mechanical VOOG windows R1–R4 (stress + rebound), "2023 recovery", "2026 partial" and the ≥10%
corrections K1–K3, close to close — no hindsight-picked dates.

**Pool context:** the VGT book's funded net inside B4/B5 (`bySymbol`), and the prior leave-one-book-out (−VGT) results
from `ETF_ABLATION.md` (in B4, removing VGT frees other books' signals; this alone does not show S is ineffective).

**Bootstrap (in-sample uncertainty only):** the prior paired stationary bootstrap (Politis–Romano, mean block 21
sessions, 5,000 resamples) of the daily fixed `strategyMark` changes of S, B4, B5, B4 − S and B5 − S, from arming
(2017-06-15) to the end; seed `deriveSeed('vgt-standalone-vs-pooled-robustness-v1', 'bootstrap')`. Reported: the
resampled total's quantiles and the share ≤ 0. Not validation.

## 8. Costs, financing and fills (Workstream C)

S is re-simulated fresh under the prior protocol's **19 scenarios** (unchanged definitions, no double counting:
fee + slippage enter `costBps`; stop overshoot only on stop and stop-gap exits; `nxo` = stops fill at the next trade
after the trigger minute, an execution-rule stress):

base 11%/5 bps; r08/r14/r18; f00/f02/f10/f15/f20/f30/f45; s10/s25/s50/s100; nxo; C1 (14%, 20 bps); C2 (18%, 45 bps);
C3 (18%, 45 bps, 50 bps overshoot) — fixed and portfolio. B4/B5 figures come from the prior stored `cost` records (not
re-run).

Every scenario is re-simulated because rate and per-side cost change D1's net-profit stop and continuation paths. Per
scenario: lots added/removed/exit-changed versus base, and a **same-trade re-costing** of the base lots (the prior
`recostLot`) to separate pure cost from path change. Portfolio results are given as absolute end equity and as
incremental wealth over C0 (C0 trades nothing, so it is the same under every scenario). Break-even only by linear
interpolation between two tested points with a sign change, never extrapolated. Minute OHLCV does not guarantee stop
execution or sub-minute ordering.

## 9. Portfolio risk and capital efficiency (Workstream R)

S, B4, B5 and C0 at the base (portfolio), plus S under C1–C3 and the symmetric dividends:
- initial/final equity, total return, CAGR, incremental wealth over C0;
- max daily-close and minute-sampled drawdown **in $ and %** (running peak), incremental drawdown over C0 on each
  measure, the five deepest daily episodes with time to trough and to recovery;
- max principal, max principal ÷ equity, time with a funded lot, minimum passive equity ÷ requirement per schedule
  (U35, U50, U60, L50, L60, G50, G60) and its date;
- **efficiency:** fixed net per $1M borrowing dollar-days; portfolio incremental wealth per $1M borrowing
  dollar-days; incremental CAGR per pp of max daily % DD;
- **VGT duplication:** the VGT share of long market value (core + lots) — its maximum, and its mean while a lot is
  open — for S, B4, B5 against C0's; computed from the base portfolio runs re-executed inside `analyze` (checked equal to
  their stored records).
- Fixed-pool % of $100k and portfolio % of marked equity are never interchanged.

The 30% (preferred) and 35% (conditional) thresholds are historical evaluation thresholds, not risk bounds. C0 itself
breached 30% without leverage (33.89% daily, 35.76% minute).

## 10. Interpretation flags (qualitative warnings, predeclared)

| Flag | Raised when |
|---|---|
| **W1** Concentration | top calendar year > 50% of total fixed net, or top-3 winning lots > 50% (the prior gate B) |
| **W2** Low trade count | fewer than 30 funded lots in the window (inference from few lots is weak) |
| **W3** Cost fragility | the prior gate E: under r14, f15, f20 or C1, fixed net ≤ 0 or portfolio incremental over C0 ≤ 0; or under C1 fixed net falls > 50%, or fixed net ÷ minute DD falls > 50% |
| **W4** Matched-parameter fragility | in the matched 8-D design (S: the 64 paired samples, and separately the joint seed 1; pools: their per-book VGT design), < 75% of samples have net > 0, or the median retention < 50% (the prior gate A thresholds) |
| **W5** Portfolio drawdown | the prior gate D: D35 (> 35% daily or minute, base or C1–C3), D30 (> 30%), D+ (base max % DD above C0's on the same measure) |
| **W6** Unmodelled margin risk | always raised for a margin overlay: no maintenance calls, no forced sales, the Vanguard 30-day rule (newly bought VGT/VOOG not marginable), house-requirement changes, gaps |
| **W7** Neighbourhood drawdown | the median portfolio max daily % DD of a matched 8-D design (or S's joint design) > 35% |

For the pools, W4/W7 are evaluated on the prior per-book VGT records and, labelled separately, on the system-level joint
designs.

An accounting failure (anchors, prior-record equality, ledger identities, % DD recomputation, path re-execution
equality) stops the comparison (§3, §4).

## 11. Decision rules (predeclared)

Three separate conclusions:

**(a) Historical profitability of S.**
- *Plausible:* fixed net > 0 at the base and under C1, C2 and C3; ≥ 75% of the paired matched design and of the
  joint seed-1 design net-profitable; and the portfolio's incremental wealth over C0 > 0 at the base and under C1.
- *Plausible but thinly evidenced:* the above holds and W1 or W2 is raised.
- *Not supported:* any of the conditions fails.

**(b) Robustness on comparable tests**, S against each pool separately (B5 first, then B4). The matched items are below.
Each scores "S better", "pool better" or "tie".

| Item | Measure (better = …) | Tie band |
|---|---|---|
| b1 | paired 8-D median retention (higher) | 2 pp |
| b2 | paired 8-D P10 retention (higher) | 2 pp |
| b3 | paired 8-D worst retention (higher) | 2 pp |
| b4 | OAT worst retention over the 32 VGT points (higher) | 2 pp |
| b5 | paired 8-D P10 of Δ$ against its own frozen net (less negative) | $2,500 |
| b6 | paired 8-D median lot-path preservation (higher) | 2 pp |
| b7 | C1 fixed net ÷ base fixed net (higher) | 2 pp |
| b8 | paired 8-D median of the portfolio max daily % DD minus its own frozen value (lower) | 0.5 pp |

- **"S more robust on matched tests":** S is better on ≥ 5 items and worse on ≤ 2.
- **"Pool more robust":** the reverse.
- Otherwise **"no clear difference"**.

Retention inside a pool is diluted by the unperturbed books, while Δ$ and lot-path items are not. That is why both kinds
are in the list. The system-level joint stresses (§5.4) are **not** part of (b). They inform the complexity judgment
in the overall outcome.

**(c) Prospective observation.**
- S *merits prospective observation* if all three hold:
  - (a) is plausible (or plausible but thin);
  - no accounting flag is unresolved;
  - the median portfolio daily % DD of its matched design is ≤ C0's + 2 pp.
- **Live deployment is never concluded from this historical audit.** It would need forward evidence and a review of
  broker mechanics.

**Overall outcome** (one of four; B5 is the reference because it is the leading pool; B4's default status and B5's
leading status are preserved unless the user decides otherwise). "Own-neighbourhood median" means S's joint 8-D seed-1
median, and each pool's seed-1 joint median. It is each configuration's central estimate under its own full parameter
uncertainty, labelled as such.
- **B5 preferable** if all of:
  - B5's incremental wealth over C0 exceeds S's both at the frozen point and at the own-neighbourhood medians;
  - B5's own-neighbourhood median daily % DD ≤ S's + 1.0 pp;
  - (b) against B5 is not "S more robust".
- **Standalone VGT preferable for prospective observation** if all of:
  - S's own-neighbourhood median daily % DD is lower than B5's by more than 1.0 pp;
  - S's incremental wealth over C0 is > 0 at both points;
  - (b) against B5 is "S more robust";
  - S's fixed net per $1M borrowing dollar-days ≥ B5's.
- **Both worth parallel observation** if neither rule holds, and S's (c) holds.
- **Insufficient evidence to choose** otherwise (including an unresolved accounting flag).

The outcome is a recommendation for **prospective observation only**. It is not a promotion, default change or trading
instruction.

## 12. Budget, seeds, cutoffs, outputs

**Runs (623 new):**

| Family | Runs |
|---|---:|
| `s-base` | 2 (stored by the baseline) |
| `s-control` | 7 (0/2/10 bps fixed and portfolio; symmetric dividends) |
| `s-cost` | 36 |
| `s-oat` | 64 |
| `s-paired` | 128 |
| `s-joint` | 256 |
| `p-path` | 130 |

- **Seeds:** as in §5 and §7. Generation is deterministic, and a run is reused only while its specification hash
  matches.
- **Data access:** only the canonical `all` rows through 2026-10-13. No download, no `.env`, no broker.
- **Outputs** (all under `research/vgt-standalone-vs-pooled-robustness/`):
  - `results/runs/*.jsonl`;
  - `results/detail/` (S base ledgers);
  - `results/analysis.json`;
  - CSV tables, including chronological funded-trade ledgers;
  - `MANIFEST.json`;
  - the reports listed in the brief;
  - `RESEARCH_RECOVERY.md`.
- **Code:** `src/vgt-standalone-robustness/`.
- **The only tracked file changed outside these:** `package.json` gains the separate `vgt-robustness` script.

**Disclosure: what was known when this was written.**
- **Known:**
  - B4/B5/C0 anchors, and the prior audit's complete findings (its joint medians of 47%, its per-book VGT designs
    retaining 91% (B4) / 95% (B5), its cost and portfolio results);
  - S's base figures from the frozen controls B1 and the baseline: fixed $176,260.47, 21 lots, minute DD $19,534.41;
    portfolio end $2,958,025.76, 32.78% daily / 35.21% minute;
  - 21 lots (so W2 was foreseeable);
  - the shadow identity (B4 funds 14, B5 12 of S's lots);
  - from earlier VGT studies on the 2016–2025 research files, that D1 was the maximum of its local search box, and
    that costs of 2–10 bps did not change its trades.
- **Not computed for S:** any OAT, matched, joint, cost-scenario, attribution, concentration or path result.
- **Thresholds:** W1, W3, W4 and W5 are the prior audit's. W2 (30 lots), W7 (35%), the tie bands and the 1.0 pp /
  2 pp margins are this protocol's choices, made before any S result.

## 13. Amendments

**A1 — 2026-10-27T13:11:51Z, after the batch and the first `analyze`. A correction of a rationale sentence; no rule changes.**

- **The error.** §11 says that "Δ$ and lot-path items are not" diluted by unperturbed books. That is wrong for item b6.
  Whole-pool lot-path preservation counts every funded lot of the pool, and most of those belong to books whose
  parameters were not perturbed. So b6 is diluted in the same way as the retention items b1–b3.
- **What stays the same.** The predeclared items, tie bands, tally rule and verdicts are unchanged, and they remain
  the reported (b) result.
- **Two additions, both labelled as post hoc and descriptive, and neither entering any rule:**
  1. **Sensitivity.** The (b) tally is also given without b6.
  2. **Supplementary path diagnostics.** These are the VGT book's own funded-lot preservation inside each pool, and
     entry-session preservation (the same symbol and entry date, whatever the exit) for S and for the pools' VGT book.
- **One reported sensitivity**, also not a rule: the overall-outcome conditions recomputed on the seed-2 joint designs.
- **Why it was found.** It surfaced while inspecting the measured b6 values: S median 4.8% against B5 82.9%.
