# Protocol: VGT D1 refinement, trailing-stop redesign and no-dip entries

Written on 2026-10-22 from the research brief, before any sweep or search of this program was run; the baseline
reproduction (A0) and the stop-semantics diagnostic (B0) were run first and are reported in
[D1_BASELINE_AND_DIAGNOSTICS.md](D1_BASELINE_AND_DIAGNOSTICS.md). Amendments made after seeing results are listed
at the end with their reason; everything else below was fixed in advance.

## 1. Scope and fixed settings

- Instrument and data: VGT only, `data/VGT/VGT-2016-2025-1-minute.csv`, sha256
  `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f`, raw Alpaca one-minute bars, 2,459 sessions
  2016-01-04 → 2025-10-13 (809,490 rows). Checked by every command (`loadData` throws on a different hash).
- Baseline: **D1**, `src/app/allIn-trailingBuy-postExitContinuation.ts` as shipped: X 21.6%, Y 0.3%, stop 7.3%,
  hold 8 calendar days, L 74 sessions, buffer 2.9%, pullback P 9.0%, window W 60 sessions. Reproduction targets
  (not asserted results): D1 $183,044 / $19,331 / 20 entries; Set 2 $150,630 / $21,183 / 14; Trades2 $154,213 /
  $27,408 / 18; D3 (P 7%) $176,943 / $19,705 / 20; `allIn.ts` $169,090 / $32,084.
- Accounting as the files: $100,000 borrowed per entry, no compounding, simple 11% annual interest by calendar day
  (none on the entry date), idealized stop fills at the stop level (`next-open` as a sensitivity), minute-sampled and
  daily mark-to-market drawdowns of the cumulative strategy P&L, open position marked at the last close net of
  accrued interest. No slippage or spread model. Headline results, rankings, objectives and decisions use 11%; 8% and
  14% are diagnostics only.
- Common eligibility: every engine run arms from session 365 (2017-06-15), as the previous program, so lookbacks up to
  365 are comparable and the no-dip paths start on the same session as the deep path. D1's first trade
  (2018-12-21) is unaffected (asserted in `tests/equivalence.test.ts` for arming from session 74 as well).
- Feasibility: a candidate with a minute-sampled drawdown above **$35,000** on the window it is judged on is
  infeasible whatever its profit. Reported by regime as well. This is a historical test constraint, not a loss cap.
- Quantization: every percentage parameter is an integer number of tenths of a percentage point in generation,
  search, refinement, probes, deduplication and reporting (216 = 21.6%; 216 / 1000 is the same double as the source
  literal 0.216); durations are integers. New parameters (G, E, Ya, K, Ys, Z) follow the same rule.
- Causality: a minute's decision uses only completed minutes and completed sessions. The rolling high and the swing
  path's rolling low exclude the current session; the continuation window's high is updated at session ends; the
  stop level and every activation latch are updated once a day after the session; the activation of a session is a
  pre-open fact. Tests cover the boundaries (`tests/mechanisms.test.ts`).
- No global optimization. No fresh holdout exists: 2023 was the inspected problem of the previous program and
  2024–2025 was examined by the two before it. The chronological folds below are development/validation-style
  diagnostics of the *selection rule*, not an independent test.

## 2. Architectures

The engine (`src/d1-refinement/engine.ts`) is D1 generalized along two independent axes; with the deep entry mode,
the net stop policy and the continuation window on it is the D1 file statement for statement (asserted against the
previous program's engine, itself verified against the files, on Set 2, D1, 24 random vectors and 120 synthetic
scenarios).

| Axis | Key | Rule | New parameters (grid) |
|---|---|---|---|
| stop | `net` | D1: active on a session iff shares × stop − investment − interest(date) > 0, re-decided every session | — |
| stop | `netLatched` | the same test, irreversible once true (B0 diagnostic) | — |
| stop | `gross` (B-A) | latched at a daily update once postEntryHigh ≥ entry × (1 + G); replaces the net test | G 0–30.0% |
| stop | `breakeven` (B-B) | latched once the stop level ≥ entry (gross breakeven); replaces the net test | — |
| stop | `twoStage` (B-C) | EARLY: fixed protective stop at entry × (1 − E) executing like the trailing stop; ESTABLISHED (once the stop level ≥ entry, irreversible): the trailing stop, no net test | E 1.0–30.0% |
| stop | `always` (B-D) | the trailing stop executes from the session after the entry, whatever the net result | — |
| entry | `deep` | D1 / Set 2: X below the rolling L-session high (+ continuation when postExit) | — |
| entry | `always` (C1) | a flat strategy arms on its first completed minute; the trailing low starts at that close; buys on a Ya rebound from the lowest later low; re-arms the session after an exit, never on the exit session | Ya 0.1–20.0% |
| entry | `swing` (C2) | arms on a completed minute closing ≤ (lowest session low of the previous K sessions) × (1 + Z); buys on a Ys rebound | K 2–250, Ys 0.1–20.0%, Z 0–10.0% |
| entry | `deepAlways` / `deepSwing` (C3) | D1's deep and continuation paths plus the extra path; D1 paths have absolute precedence at arming, an armed extra setup is re-armed as a D1 setup on the minute D1 would have armed, an extra arming never closes the continuation window | as above |

In every stop alternative the stop level is D1's (post-entry high × (1 − stop width), once a day, never lowered),
reaching an activation threshold never sells, and there is no take-profit. The maximum-hold loss exit and the
buffered intraday loss exit are unchanged in every architecture.

## 3. Stages, grids and budgets

1. **A0 / B0** (before any new result): reproduce D1, Set 2, Trades2, D3 and `allIn.ts`; trace the stop rule on
   every D1 trade and on the 2023 trough-recovery trade at 8/11/14%; count switch-offs; `netLatched` counterfactual.
2. **A1**: P 6.0–12.0% (0.1 steps, 61) × W 30–180 (every integer, 151) = 9,211 full-run evaluations with Set 2's six
   parameters frozen at D1's. Report the plateau, where W matters (signature boundaries), the feasible frontier of
   distinct trade lists, picks by policy, 2022 losses and 2023 participation, trade-list changes against D1.
3. **A2**: four A1 anchors (D1; the low-DD plateau end; D3; the in-sample maxNet ridge). Box: X 20.0–25.0%, Y
   0.2–0.8%, stop 6.5–9.0%, hold 6–16, L 60–104, buffer 1.5–4.0%. Per anchor a scrambled-Sobol design of 4,096
   points plus the anchor (seed from `d1-refinement|sobol|a2-<anchor>`), evaluated on the full run and on four
   training windows (through 2019-12-31, 2021-12-31, 2022-12-31, 2023-12-29). Coordinate-wise refinement of every
   full-run pick inside the box (in-sample). A boundary effect is reported, not followed by widening the box.
4. **Walk-forward of the selection rule** (A2, B, C): for each fold the design is evaluated on the training window
   only, the policy picks (feasible, ≥ 1 entry per training year), and the pick, the anchor and frozen D1 are run
   through the validation window (2020–2021, 2022, 2023, 2024-01-01 → 2025-10-13; the continuous run attributed to
   the window). Reported per fold and stitched. 2023 and 2024–2025 are labelled as inspected.
5. **Selection policies**: `maxNet` (highest feasible net), `balanced` (highest net with minute DD ≤ $20,000, else
   maxNet), `lowDd` (lowest DD among candidates with ≥ 80% of maxNet's net), `frequent` (highest net among candidates
   with ≥ 1.5 × the reference's entries, else none). Refinement objectives: net; net − 2 × (DD − $20,000)⁺; net/DD.
6. **Track B**: the six policies at predeclared settings on frozen D1 (G 8%, E 10%); trade-level counterfactuals
   with the fate of every D1 winner ≥ $10,000; G and E swept on the 0.1 grid (G 0.5–20.0%, E 1.0–20.0%); interest
   decision-path check at 8/11/14% (identical trade list or not); per policy a Sobol design of 2,048 points over the
   threshold × stop 5.0–10.0% × hold 6–16 (the 2-D boxes are enumerated completely: 561 cells) with refinement and
   the walk-forward; the `net` policy's box is the control.
7. **Track C**: C1 grid Ya {0.3, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15}% × stop {5, 6, 7.3, 8, 10, 12}% × hold
   {8, 15, 30} (234); C2 grid K {5, 10, 15, 20, 30, 40, 60, 90, 120} × Ys {0.3, 0.5, 1, 2, 3, 5, 8}% × Z {0, 1, 2}% ×
   stop {5, 7.3, 10}% × hold {8, 15} (1,134); buffer 2.9%. Local refinement (2,048 Sobol points) anchored at the best
   feasible grid cell of each design (in-sample) and at the literal C1 design, boxes Ya 0.5–15%, K 3–150, Ys
   0.3–10%, Z 0–3%, stop 4–12%, hold 4–40, buffer 0–5%; walk-forward as above. C3 on frozen D1 with a small grid of
   extra-path settings; added, displaced and altered trades reported separately. Stop policy `net` throughout; no
   joint stop × entry optimization.
8. **Finalists**: every retained candidate on the common run with trade list, episode attribution, differences from
   D1, one-parameter neighbourhood (±1/±3/±5 tenths, ±1–3 days, ±2–10 sessions; "stable" = within 20% of the net and
   under the ceiling), leave-one-recovery-out, 8/14% and next-open sensitivity, and the frozen vector's net on each
   validation window.
9. **Runnable files and parity**: one `src/app/` file per stop alternative (from the D1 source) and per standalone
   no-dip design (from file 4), generated by exact-once substitutions; parity against the engine on the file's
   defaults (both fills, whole file), random vectors at 8/11/14% and random synthetic minute scenarios (early closes,
   missing minutes, sessions without a closing print).

## 4. Reporting

Every table reports net, minute and daily drawdown, net/DD, entries, wins/losses, worst trade, worst losing streak,
worst adverse excursion of a single trade, interest, exposure and average hold; per regime (2017-06 → 2018-09,
2018 Q4 → 2019, 2020, 2021, 2022, 2023, 2024–2025) the window's net, drawdown and entries, distinguishing no trades
from losses. Candidates are compared with D1 trade by trade (preserved / altered / gained / lost). Post-hoc choices
(anchors picked after the A1 sweep, refinements, shipped constants of the no-dip files) are labelled in-sample.

## 5. Amendments

- 2026-10-22, after the A1 sweep: the four A2 anchors were chosen from the A1 results (D1, P 8.6% W 60, D3, P 9.2%
  W 69). The brief asked for a "small, diverse A1 shortlist"; the choice itself is post-hoc and is labelled so.
- 2026-10-22, after the Track C grids: the C1/C2 refinement anchors (the best feasible grid cell of each design) and
  the constants shipped in the two runnable no-dip files (the `balanced` refinements) are in-sample choices; the
  architectures were not credited, and the files exist for inspection.
- 2026-10-22, Track B: a bug in reading the `--samples` option made the first run of the local refinements evaluate
  only the anchor; it was fixed and the stage rerun in full before any number was reported.
