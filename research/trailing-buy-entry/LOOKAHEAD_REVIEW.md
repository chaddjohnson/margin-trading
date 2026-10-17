# Lookahead, leakage and holdout-contamination review

Independent review, 2026-10-17, of `src/trailing-buy/` and `src/app/trailingBuy.ts` against PROTOCOL.md (with Amendments 1–2), STATE_MACHINE.md and `src/app/allin-original.ts`. No study file was modified and the holdout command was not run. Method: line-by-line reading of every module on the decision, selection, freeze and holdout paths; the study's test suite (45 of 45 pass); and an empirical future-perturbation test of the engine and indicators on the development bars (method in §3).

## 1. Verdict: **minor**

- **No lookahead and no leakage that could affect selection.** Every trading decision at session *t* uses only bars ≤ *t*, and only what is known at the moment the decision is made. The reference high excludes today, the ATR used is ATR[*t*−1], and the stop comes from highs through *t*−1. Every number used for selection comes from runs that stop at the training end. The FINAL fold's test window (the holdout) cannot be scored by any post-protocol development code.
- **The frozen selection is reproducible from development-only inputs.** Candidate types and the Amendment 1 shortlists, re-derived from the result files now on disk, equal `results/freeze/freeze.json` exactly: 26 types × 4 folds and 3 × 10 shortlist members, 0 differences.
- **Issues:** 0 material, 3 minor, 4 informational. All minor items concern disclosure, the audit trail or interpretation. None can produce a false-positive recommendation: no candidate passed §9 (`results/holdout/acceptance.json`), and every ATR candidate already fails both C1 and C2.

## 2. Checks performed

| # | Item | Files / lines inspected | Result |
|---|---|---|---|
| 1 | Reference high excludes today | `indicators.ts:6–27`. The value at :17 is read before index *t* is pushed at :23, and :13 keeps the window at [*t*−L, *t*−1]. Matches `allin-original.ts:265–267`. Used at `engine.ts:556–557` | Pass |
| 2 | ATR lag | `indicators.ts:53–82` (ATR[*t*] includes TR_*t*). The engine reads `atr[index − 1]` at all three call sites: rolling trigger `engine.ts:424`, snapshot on a new trough :508, snapshot at arming :531 | Pass |
| 3 | Signal, arming, trough, trigger, reset, expiry | `engine.ts:464–547`. These run at the decision close on C_*t*, using setup and restriction state carried from ≤ *t*−1. The reset takes precedence (:476–492), the arming close never buys (:519–541), and the drawdown is not re-tested at the trigger (:510–511) | Pass |
| 4 | Exits and stop | `engine.ts:625–731`. Stop activation, gap and intraday checks (:631–641) use the stop set after the previous session; the session's high raises the stop only after the exit test (:726–728). Interest and days held are calendar-known. Fills happen at the open or at the stop. Restriction state is set at :660–666 | Pass (I2 for the maximum hold) |
| 5 | Next-open execution | `engine.ts:572–585, 616–621, 732–738`. The order is placed at close *t* and filled at open *t*+1. The fill session runs no decision and no exit; its high and low count only after the fill | Pass |
| 6 | Pre-close execution (engine) | `engine.ts:586–610`. The decision uses the pre-close price against refHigh[*t*] (today excluded) and the trough, restriction and reset level as of *t*−1. The official close only updates state (`canBuy = false`, :609) | Pass |
| 7 | Mark-to-market and end-of-session resolution | `engine.ts:740–801, 804–828` | Pass |
| 8 | Empirical causality (§3) | engine + indicators on development bars | Pass, 0 failures |
| 9 | Training-window metrics | `study.ts:100–106` (`trainingJob` ends at `trainEnd`); `evaluate.ts:51–78` (the signature comes from the same run, so an open trade is marked at the training-end close); `metrics.ts:62–64` (a window can never extend past its run); `search.ts:113, 137–143`; `grids.ts:123–128`; `phase4.ts:83–90` | Pass. No training metric depends on bars after the training end |
| 10 | Robust neighbourhoods and the B0 reference | `grids.ts:74–115`; `selection.ts:151–211`: neighbours run through the same training-window cache. The B0 baseline is a training job (`grids.ts:123`, `phase4.ts:90`) | Pass |
| 11 | Validation windows in selection | Picks, pool and shortlists use training rows only. Validations run only when `testStart ≥ 0` (`grids.ts:189–202`, `phase4.ts:180–194`) and feed only reports, §9 C1, and the §8 family gate (`phase3.ts:32–42, 57`; `cli.ts:56–59`; `freeze.ts:131–132`; `candidates.ts:107`) | Pass, with M3 |
| 12 | FINAL test window (holdout) evaluated before the freeze | `study.ts:59–64` (bars truncated at 2022-12-30); `study.ts:86–89` (FINAL `testStart = −1`); `validation.ts:83–85` (`holdoutScores` refuses a development study); `prefreeze.ts:215` (FINAL named events excluded); `tests/isolation.test.ts:10–30` | Pass for every post-protocol path. Phase 0 is the exception (M1) |
| 13 | Callers of `openFullUnchecked` and other full-series loads | `openFullUnchecked` is called only at `holdout.ts:76` (after `checkFreeze` :44–70, which verifies the freeze hash at :49–53) and `events.ts:28` (after the `attempts.json` gate at :23–25). Other full loads: `phase0.ts:79` (M1); `replayExport.ts:94–95` (sliced at `developmentEnd`); the golden-master tests (B0 only) | Pass |
| 14 | Analysis episodes | `episodes.ts:34–174` use future closes, which is allowed for description. They are used only in `phase1.ts:144–147`, `phase2.ts:214–218`, `phase3.ts:64–102`, `prefreeze.ts:145–163`, `holdout.ts`, `events.ts` and `detail.ts:63–112`, i.e. reports, attribution and the bootstrap. They are never used in `engine`, `grids`, `search`, `selection`, `candidates` or `freeze`. Whole-trade values (`entriesDuring.profitOfEntries`, `metrics.realizedInWindow`) are report-only | Pass |
| 15 | Pre-close price series | `preclose.ts:36–66`. The scale factor is the adjusted close[*t*−1] divided by the minute file's official close[*t*−1] (:62). The decision bar is the last minute bar ending by 15:55, or 12:55 on early-close days (:55–56, with `session.ts:92, 114`: `closeTime` = 16:00 or 13:00; the closing print is kept out of `bars`, :127–129) | Pass (I1 for ex-dates) |
| 16 | `prefreeze.ts` | Development study (:57). WF folds only (`validation.ts:55`). FINAL picks are scored on the FINAL training window only (:84–125, 166–187). Pre-close runs end at `developmentEnd` (:192). FINAL events are filtered out (:215) | Pass (I3) |
| 17 | Freeze and the extended shortlist | `freeze.ts:66–99` reads only `phase4/<family>/FINAL/pool.csv` (training net, drawdown and neighbourhood P25/P75) and removes duplicates by training (net, DD, entries). Types come from training picks (`candidates.ts:19–52`). The current results reproduce the freeze exactly | Pass |
| 18 | Post-freeze code cannot re-select | Parameters come only from `freeze.json` (`holdout.ts:80, 142–163`; `events.ts:32–37`); outputs go only to `results/holdout`, `results/events` and `charts/` | Pass |
| 19 | Execution and data idealizations | Close fills (§5 model 1) and back-adjusted prices are disclosed design choices. Back-adjustment is multiplicative, and ratio decisions depend only on distributions between the two prices compared, which are known at *t* | Not leakage |
| 20 | Post-holdout state of the tree and results | Timestamps, code hash, re-derivation of the freeze | M2 |

## 3. Empirical causality test (reviewer's scripts, outside the repository)

On the development bars (2005 → 2022-12-30), with random parameters over all four entry modes, `close`/`nextOpen`, fill variants A/B, both frozen-high options and max-wait 0/10/20/40:

- **Future randomized (1,500 runs).** Every bar after a random session *k* was replaced with random OHLC data. `mtm[≤k]`, the entries, decisions, exits, armings and state-log rows up to *k* were all identical.
- **Same-session exits (2,304 exits).** On the exit session, the high and close were changed while the open and low were kept. Every exit index, price and reason was unchanged.
- **Pre-close entries (2,287 entries).** On the entry session, the close, high and low were changed while the pre-close price was kept. Every entry index and price was unchanged.
- **Next-open fills (2,283 decisions).** The fill open and all later bars were randomized. Every decision was unchanged and filled at the new open.
- **Indicators (200 cases).** `refHigh[≤k]` and `ATR[<k]` do not depend on bars ≥ *k*.
- **Training jobs (150 cases).** `runJob` output, including the trade signature, was identical with randomized post-training bars and with bars sliced at the training end.

All checks: 0 failures.

## 4. Issues

### M1 — Minor (disclosure; no selection path). Phase 0 computed the baseline's holdout results before the protocol and before any selection

- **Evidence.** `phase0.ts:79` loads the full series. The golden cases at :98–113 cover the whole research file and the research window to 2026-10-14. :151–158 and :216–232 run B0/B0c through the engine with window metrics to the last bar, including annual P&L. :200–212 writes the original's files for 2014-01-02 → 2026-10-14. The outputs are `results/phase0/golden_master.json`, `baseline_summaries.json` (B0 annual P&L 2023 $44,468, 2024 $21,879, 2025 $32,423, 2026 $23,427) and `baseline/B0_engine_research/`. BASELINE_AUDIT.md §4 publishes the research window ($200,975 / $28,208) and development ($78,778 / $23,723) figures.
- **Derivation.** 200,974.96 − 78,777.91 = **122,197.05**, which is exactly B0's continuous holdout net in `results/holdout/scores.json` (close @ 11%). The research-window drawdown of $28,208.37 (2024-12-16 → 2025-04-08) is exactly B0's holdout drawdown.
- **Cross-asset.** The QQQ/SOXX/IWN golden cases (`phase0.ts:130–136`) likewise give the B0 side of the post-freeze cross-asset check through 2026-09-08.
- **Scenario.** Whoever wrote PROTOCOL.md, set the grid and optimizer domains, and wrote Amendments 1–2 could already know that the comparator earned more in 3.8 holdout years than in 9 development years, and that its worst drawdown falls in the holdout.
- **Why selection is unaffected.** No code reads these files except `cli.ts:17–19`, which reads only `allIdentical`, and B0 is fixed rather than selected. The effect is to weaken the "untouched holdout" claim.
- **Contradiction.** It contradicts PROTOCOL §3: "Only the holdout command loads the full series".
- **Fix.** Add this to §3's known-contamination list. In future studies, limit Phase 0 parity on the research file to the development window, or seal the full-window outputs until after the freeze.

### M2 — Minor (audit trail). Code edited and development results regenerated after the holdout ran

- **Timeline.**
  - The freeze was written at 2026-10-16T22:37:39Z with code hash `ea8bcf65…` over 40 files.
  - The single holdout attempt ran at 22:37:45Z (`results/holdout/attempts.json`).
  - The current tree, hashed with the same algorithm (`freeze.ts:101–124`), gives `cfe08d84…` over **41** files.
  - Edited after the holdout: `cli.ts` (22:39:15Z) and `charts.ts`, `events.ts`, `holdout.ts` (22:40:30Z).
- **The current `holdout.ts` did not produce `results/holdout/`.** `results/holdout/summary.json` lists `charts/holdout_curves*.svg`, but the current `holdout.ts:384` draws no charts.
- **Development outputs were rewritten after the holdout.** Every file under `results/phase0`–`phase4` and `results/validation/development`, and the development charts, were written between 22:40:44Z and 22:41:38Z. PHASE2_XY.md, PHASE3_ATR.md, PHASE4_OPTIMIZATION.md, EXECUTION_SENSITIVITY.md and EVENT_ATTRIBUTION.md also postdate the holdout.
- **Verification.** `loadCandidateTypes()` and `extendedShortlist()`, run on the current results, reproduce `freeze.json` exactly. No re-selection happened.
- **Scenario.** A reader cannot confirm from the tree that the frozen code produced the holdout numbers, and timestamps can no longer show that development outputs and write-ups predate the holdout. Selection is unaffected (verified).
- **Fix.** State in the write-up that the post-holdout edits were reporting-only (chart drawing moved to `events`) and that development outputs were regenerated with identical frozen candidates. Commit with a note and a post-holdout code hash.

### M3 — Minor (interpretation; pre-registered). The §8 gate admits the ATR family using the walk-forward validation windows

- **Evidence.** `phase3.ts:32–42, 57` writes `continuation.json` (profit Dominant, balanced Dominant, lowDD Fails, so the family continues). This decides whether the ATR family is optimized and frozen (`cli.ts:56–59`, `freeze.ts:131–132`, `candidates.ts:107`).
- **Scenario.** The P4.atr.* candidates exist because ATR grid picks did well on WF1–3 validation. Criterion 1 for that family is therefore conditioned on the same windows and is mildly optimistic. The holdout is unaffected.
- **Impact in this study.** None: all P4.atr picks fail both C1 and C2.
- **Fix.** Say so wherever C1 is quoted for the ATR family.

### Informational

- **I1. Pre-close scaling on ex-distribution dates** (`preclose.ts:62`). The factor correctly uses only *t*−1, but on an ex-date the back-adjustment factor steps by the distribution ratio. The scaled pre-close price is then understated by about d/P (roughly 0.1–0.3%, about 4 sessions a year). This is a small bias, not leakage, in a reporting-only model applied to frozen candidates.
- **I2. The maximum-hold exit depends on the open it sells at** (`engine.ts:635`, inherited verbatim from `allin-original.ts:77–78`): it sells at the open only if that sale loses money. This is an idealization (observe the opening print, then sell at it), identical for B0 and every candidate. It uses no later bar.
- **I3. Prefreeze parses the whole minute file**, including 2023-01-03 → 2025-10-13 (`preclose.ts:26–27` via `prefreeze.ts:190`). The loop visits only development daily bars (`preclose.ts:36`), so no holdout-period price is used. Only the file's `lastDate` reaches `preclose_development.json` (`prefreeze.ts:248–252`). Hygiene only.
- **I4. Amendment 2 re-ran Phase 4 after its walk-forward validation had been seen** (development data). It is disclosed, and both versions are kept in `results/freeze/superseded/` and `results/as-run-before-amendment-2/`; 34 of the 36 Phase 4 fold-pick parameter sets changed. There was no holdout contact: the first freeze was at 22:35:16Z, the final freeze at 22:37:39Z, and the single holdout attempt at 22:37:45Z. This is a researcher degree of freedom on validation windows, not holdout leakage.
