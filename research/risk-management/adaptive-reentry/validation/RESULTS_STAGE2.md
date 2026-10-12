# Validation stage 2 — the two promising Family-G combinations (G8_A2m1_retrace, G4_A2m1_stall)

Scope: the two combinations flagged in `combinations/COMBINATIONS.md` §9 (items 1 and 2), validated
with the frozen engine/framework/data per the stage-2 brief: independent replay (task 1), joint
sensitivity grids (task 2), unchanged-parameter fresh-instrument tests (task 3). All 32 stage-2
configurations (2 candidate re-registrations + 18 G8 grid points + 12 G4 grid points) were appended
to `validation/registry.jsonl` BEFORE any run (registry now 84 entries; program total 156 + 32 =
188 registered configurations). No new optimum is selected and no configuration was changed.

Candidates (wiring = `combinations/strategies.py`, cited there; component semantics = the stage-1
verified copies in `validation/strategies.py`):

- **G8_A2m1_retrace** = A2_material_1 trigger (arm only when price return ≤ −1%) + fixed 3% level +
  C6_retrace_38 reset (close ≥ low + 0.38·(frozen ref high − low)).
- **G4_A2m1_stall** = A2_material_1 trigger + B7_stall level (3% while the episode low is < 20
  sessions old, then linear decay to 0 over 60) + C1 frozen-high 95% reset.

Mechanics note: the frozen runner writes to `<family_dir>/results/` and stage 1 owns
`validation/results/summary.json`, so the stage-2 runner family dir is `results/stage2/` (its
`registry.jsonl` is a symlink to the single append-only `validation/registry.jsonl`); the runner
tree is at `results/stage2/results/`. Nothing from stage 1 was modified; the SPY/XLK/IWM data
conversions and all stage-1 fresh-instrument results were REUSED, not rerun.

---

## 1. Independent replay — BOTH CANDIDATES PASS

Method identical to stage 1 (`replay_verify_stage2.py`, modeled on `replay_verify.py` /
`lower-price-reentry/verify.py`): on all four frozen datasets the full restriction history was
re-derived from ONLY the raw price file, the registered rule definitions (re-implemented; framework
and combination decision code never imported) and `combinations/results` trades CSVs, then asserted
against the combinations events/states CSVs.

**5,995 checks passed; zero mismatches across all 8 (candidate × dataset) replays**
(`results/stage2/replay_verification.txt`). For both candidates on every dataset:

- every restricted entry satisfied the level rule (fixed 3% for G8; the stall-decayed level for G4)
  and never fell on a session whose close satisfied the reset (reset priority intact);
- every reset satisfied the reset rule with no earlier qualifying session (forward scan plus an
  independent second pass recomputing min_close from scratch);
- frozen values (loss exit, losing entry, ref high, loss, price return) correct at arming and
  constant within each episode; blocked-session sets match the states logs exactly;
- completeness: every flat, unrestricted, non-exit session with the 10% signal has an entry;
- trade spans disjoint; no entry on an exit session;
- **declined-trigger correctness**: every losing trade left without an episode has price return
  > −1% (and every one at or below −1% armed); the declined set matches the `loss_not_restricted`
  state-log lines session for session (e.g. QQQ-old: G8 34 episodes + 16 declined losses, G4 34 +
  14; VGT-old: 13 + 11 / 9 + 7).

Raw-price spot checks (27 assertions, `results/stage2/spot_checks.txt`, script
`tmp/stage2_spotcheck.py`):

1. **G8 QQQ-old 2002-10..2003-03 reset chain** — arming 2002-10-08 (−3.54%), ref high 28.5103, min
   close 17.0068; FIRST session whose close reached the 38% retrace (21.3781) is exactly the logged
   reset 2002-11-01 (close 21.4119); the post-reset −$713 loss on 2002-12-27 (−0.17%) correctly
   declined; second episode armed 2003-02-05 (−2.79%), reset 2003-03-14 (close 21.8046 ≥ 21.7858,
   no earlier session qualifies); the post-reset 2003-03-31 entry (signal 12.28% below the
   90-session high) is the +15,467 trade carrying G8's 2003 rescue.
2. **G4 2002-09-19 decision at the neighboring grid point** — low 18.1787 set on the arming day
   2002-08-05, age 32 on 2002-09-19, close 18.2941: at (20,60) the level is 18.2975 (discount
   2.400%) → ENTRY; at (20,80) it is 18.2693 (2.550%) → BLOCKED. Confirmed in the grid trades:
   (20,80) has neither the 2002-09-19 entry nor the re-phased 2002-10-07 bottom catch and is
   trade-identical to G_A2m1 — the predicted collapse, verified at the decision level.
3. **G8 on fresh IWM, 2008-09/2009-03** — the 2008-09-23 arming (−24.2%), 2008-10-09 restricted
   re-entry at 42.4769 ≤ level 44.3500 with the retrace threshold (54.1198) safely above; then the
   2008-11-21 arming (−20.8%): no session through 2009-03-02 reached the 38% retrace (ref high
   73.1161), and the first signal session with close ≤ level 32.3823 is exactly the recorded
   2009-03-02 re-entry @ 31.3883 (+9,915).

**Verdict: no finding; the Family-G results for both candidates are replay-verified.**

## 2. Joint sensitivity grids

120 runs (30 grid points × 4 datasets) through the frozen runner (`validation_stage2`); both grid
centers reproduce the combinations G8/G4 **trade for trade on all four datasets** (cross-check in
`tmp/stage2_tables.py`). Full numbers: `results/stage2/results/summary.json`, digest
`tmp/stage2_tables.txt`. Reference legs (cited from combinations, not rerun): QQQ-old net/DD —
G_A2m1 67,162/78,370; G_C6r38 64,997/70,917; G_B7stall 61,425/70,302; REF 40,258/91,469.

### G8 grid (A2 cutoff −0.5/−1/−1.5% × retrace f 0.30–0.50), net/DD

QQQ_1999_2015:

| cutoff \ f | 0.30 | 0.34 | 0.38 | 0.42 | 0.46 | 0.50 |
|---|---|---|---|---|---|---|
| −0.5% | 20,048/118,956 | 54,191/84,813 | 72,539/74,333 | 43,635/80,153 | 46,665/80,153 | 66,843/80,153 |
| −1.0% | 35,587/108,623 | 69,731/74,479 | **87,890/65,407** | 58,986/65,407 | 62,015/65,407 | 82,194/65,407 |
| −1.5% | 38,631/107,441 | 72,775/73,297 | 90,934/64,224 | 85,114/64,224 | 85,114/64,224 | 85,114/64,224 |

QQQ_2016_2026:

| cutoff \ f | 0.30 | 0.34 | 0.38 | 0.42 | 0.46 | 0.50 |
|---|---|---|---|---|---|---|
| −0.5% | 139,317/23,564 | 136,502/26,349 | 138,791/24,060 | 133,462/29,389 | 135,511/27,340 | 133,631/29,220 |
| −1.0% | 123,853/31,093 | 125,442/33,612 | **130,897/30,446** | 113,777/33,317 | 123,972/27,340 | 122,092/29,220 |
| −1.5% | 98,721/59,332 | 93,818/65,236 | 106,801/54,542 | 101,473/54,542 | 102,188/55,875 | 118,183/38,001 |

(VGT-new: plateau 179.7k–200.6k around REF 182.1k, frozen point is its row's maximum, DD stable
28.2–29.3k. VGT-old: noise ±8k around REF at cutoffs ≤ −1%; the −1.5% row jumps to 50.8–54.3k
because the single 2010-05-24 loss (−1.11%) becomes exempt and re-enters 2010-05-25 — one episode,
not a mechanism.)

**Judgments (flip points named):**

- **vs REF, QQQ-old: plateau with one hard floor.** 15 of 18 points beat REF's 40,258 — every
  point with f ≥ 0.34, at every cutoff, with DD also improved (65.4k–84.8k vs 91.5k). All three
  failures sit at f = 0.30 (20,048 / 35,587 / 38,631; DD 107–119k; 2000–02 window −69,851 vs
  −19,395 at f ≥ 0.38) — stage 1's standalone C6 0.30 cliff carries straight into the combination.
  **So: yes, G8's QQQ-old edge over REF survives off (−1%, 0.38)** — anywhere with f ≥ 0.34.
- **vs its own best leg (G_A2m1 67,162), QQQ-old: NOT a plateau.** At the frozen −1% cutoff the
  edge survives only at f ∈ {0.34 (+2.6k), 0.38 (+20.7k), 0.50 (+15.0k)} and FLIPS NEGATIVE at
  0.42 (−8.2k) and 0.46 (−5.2k); one step in f from the frozen point costs −18.2k to −28.9k. The
  headline "+20.7k over A2m1" is a local peak at exactly the pre-registered 0.38 (the same caveat
  stage 1 recorded for standalone C6: the Σ-best point is the Fibonacci number). Across the whole
  grid the beats-both-legs condition holds at 9 of 18 points, mostly in the −1.5% row — which the
  new era disqualifies (next bullet).
- **QQQ-new 2022 stacking-permissiveness: confirmed, and it is CUTOFF-driven.** The 2022 window
  deteriorates monotonically as the cutoff loosens: −0.5% row −9,636 (window DD 21.4k, 0 false
  resets) at every f; −1% row −13.5k to −20.7k; −1.5% row −25.1k to −52.3k with net collapsing to
  93.8–118.2k and DD up to 65k. At (−1.5%, 0.38) calendar-2022 has 12 trades, 11 losers, −40.0k —
  the G3/G5 repeated-entry cascade rebuilt one cutoff step from the frozen point. The retrace
  fraction moves 2022 only mildly within a row. The frozen −1% is thus one step from a cliff on
  its permissive side, and strictly dominated by −0.5% on QQQ-new (139.3k/23.6k at (−0.5%, 0.30)
  even beats REF there) — consistent with stage 1's "A2's new-era benefit is knife-edge residue"
  and flag 2 (prefer _05).
- 2003 rescue: +15,403 at every f ≥ 0.38, +13,557 at 0.30/0.34 — robust to the grid; it is the
  reset's doing at every point.

### G4 grid (cutoff fixed −1%; stall fresh_age {15,20,25,30} × decay {40,60,80}), net/DD

QQQ_1999_2015 (G_A2m1 = 67,162/78,370):

| age \ decay | 40 | 60 | 80 |
|---|---|---|---|
| 15 | 87,165/63,294 | 87,165/63,294 | 87,165/63,294 |
| 20 | 87,165/63,294 | **87,165/63,294** | 67,162/78,370 =A2m1 |
| 25 | 67,162/78,370 =A2m1 | 67,162/78,370 =A2m1 | 67,162/78,370 =A2m1 |
| 30 | 67,162/78,370 =A2m1 | 67,162/78,370 =A2m1 | 67,162/78,370 =A2m1 |

- **COMBINATIONS.md §9.2's honest null is CONFIRMED.** On QQQ-old, 7 of 12 grid points are
  trade-identical to G_A2m1 (verified trade for trade, not just equal totals): the whole +20,003 /
  −15,076 edge is the single 2002-09-19 decision, which exists only while the low's age (32) is
  inside the decay window tightly enough — it dies at (20,80) (level 18.2693 < close 18.2941; spot
  check 2) and at every age ≥ 25. The surviving region (age 15 any decay, (20,40), (20,60)) is the
  same binary cliff stage 1 found for standalone B7 (5 of 9 points), with the frozen point again
  sitting on its edge. The 2000–02 window is +2,507 where the trade exists and −17,559 (= A2m1)
  where it does not; there is no intermediate outcome anywhere on the grid.
- On VGT-old the stall binds ONLY at decay 40 with age ≤ 20 (46,504 vs 28,363, +18.1k — a different
  single decision that the frozen point does NOT capture; stage 1 saw the same for standalone B7).
  On both new-era datasets all 12 points are trade-identical to G_A2m1.
- Summary: across 48 grid-point-dataset cells, the stall changes the trade sequence in exactly 7
  (5 QQQ-old + 2 VGT-old), each via one decision. G4 is G_A2m1 plus a one-trade option whose strike
  sits on a parameter cliff.

## 3. Fresh instruments — unchanged parameters

`run_stage2_fresh.py`: baseline + G8 + G4 on QLD/SOXX/VOOG (repo files) and SPY/XLK/IWM (stage-1
conversions reused), each with a complete matched-exposure baseline rerun; the baseline reruns were
asserted equal to stage 1's. Legs (A2_material_1, C6_retrace_38, B7_stall, A2_material_05) and
REF_lower3 are stage-1 numbers reused from `results/fresh/summary.json`. Full tables:
`tmp/stage2_tables.txt`; summary: `results/stage2/fresh/summary.json`.

Net / DD, with net Δ vs REF_lower3 and the matched-exposure control Δnet/Δdd:

| inst | REF_lower3 | A2_material_1 (=G4) | C6_retrace_38 | G8 | G8 vs REF | G8 mCtl Δnet/Δdd |
|---|---|---|---|---|---|---|
| QLD | −21,552/88,403 | 64,381/80,871 | −9,342/113,938 | 69,038/113,938 | +90,589 | −133,245/+59,126 |
| SOXX | 71,855/53,395 | 67,659/53,106 | 112,792/60,101 | 105,494/59,812 | +33,639 | +1,163/+8,647 |
| VOOG | 63,258/27,401 | 67,160/27,006 | 58,899/27,401 | 63,352/26,921 | +94 | +17,193/−9,915 |
| SPY | −19,097/93,047 | −6,823/53,682 | 10,932/59,136 | −13,242/59,790 | +5,855 | −23,053/+17,668 |
| XLK | 107,647/50,243 | 175,514/50,214 | 151,816/73,699 | 205,350/73,670 | +97,703 | +21,716/+8,999 |
| IWM | −6,848/76,783 | −11,747/87,015 | −5,244/63,379 | 30,469/62,217 | +37,318 | +13,571/−5,304 |

**G4 ≡ A2_material_1 trade-for-trade on ALL SIX fresh instruments** (trade-date/price identity
checked per instrument). The stall component never made a single decision out of design — stage 1
found standalone B7 inert on 5 of 6 fresh instruments (IWM only, harmful −3.2k); on the composed
A2m1 path even that disappears, because A2m1's exemptions keep IWM's cycle turning past the one
session where standalone B7 acted. **Answer to the key question: yes, G4 is exactly A2_material_1
outside QQQ-old basing — on every instrument that never influenced its design.**

**G8 is the only Phase-2 configuration so far that is sometimes genuinely additive out of design.**
Σ fresh net 460,461 vs A2_material_1 356,144, C6 319,852, REF 195,263 — and above stage 1's
strongest standalone, A2_material_05 (387,210). Per instrument, honestly split:

- **beats BOTH its legs on net on 3 of 6**: QLD (+4.7k/+78.4k vs A2m1/C6), XLK (+29.8k/+53.5k),
  IWM (+42.2k/+35.7k; on IWM on BOTH dims vs both legs, and it is the only config that beats the
  matched-exposure baseline there, +13,571 net / −5,304 DD). The IWM edge is the 2008 chain of
  spot check 3: C6-anchored re-entries that A2m1 alone never gets (2007–09 window −3,877 vs REF
  −46,485, A2m1 −51,862, C6 −16,429) — same component attribution as QQQ-old 2003, on data neither
  component ever saw.
- **loses to a leg on 3 of 6**: SOXX (105.5k < C6's 112.8k), VOOG (63.4k < A2m1's 67.2k), and SPY
  **below both legs** (−13.2k vs A2m1 −6.8k, C6 +10.9k) — on SPY the two components interfere
  exactly as the 2000–02 frozen-dataset cell warned: A2m1's exemptions re-phase the path so that
  C6's 2008/2009 SPY rescue (+30.0k standalone) dilutes to +5.9k, and the SPY-2025 two-sided
  exemption cost (stage 1 §3) stays.
- **the 2022-grind tax transfers as predicted**: stacked on VOOG (−15,501 vs legs −12,381/−12,645),
  inherited from C6 on QLD (−38,016 vs REF −30,043); XLK/IWM escape it (−5.9k/−11.1k, at or better
  than REF). G8's QLD DD (113,938, +33.1k over A2_material_05) is pure C6 reset tax on a 2x fund.
- vs A2_material_05 head-to-head: net better on 4 of 6 (SOXX +28.0k, IWM +32.5k, XLK +19.6k, QLD
  +4.7k), worse on VOOG (−3.8k) and SPY (−7.6k); but DD WORSE on 4 of 6 (QLD +33.1k, XLK +23.5k,
  SOXX +6.7k, SPY +6.3k; better only IWM −20.8k, VOOG −0.1k). G8 buys transfer breadth with C6's
  drawdown profile.
- Finding-1 ceiling intact: at matched exposure G8 still loses heavily on QLD (−133.2k) and SPY
  (−23.1k); it beats the matched baseline on both dims only on VOOG and IWM (A2_material_05 did it
  on VOOG and XLK). No restriction config transfers as a general improvement over the raw strategy.

## 4. Final verdict — do G8/G4 survive validation better or worse than their best standalone legs?

**G4_A2m1_stall does not survive as a combination.** Its entire difference from its trigger leg is
one QQQ-2002 decision that (i) disappears at 7 of 12 neighboring grid points including one decay
step from the frozen parameters, (ii) never occurs on any of six fresh instruments (trade-identical
to A2_material_1 everywhere out of design), and (iii) was already known to be the same October-2002
trade that carries three other mechanisms' QQQ-old edges. The honest description is A2_material_1
plus a non-replicating historical lottery ticket; and since stage 1 showed A2_material_05 ≥
A2_material_1 on fresh transfer (6/0 vs 4/2, and ≥ on every fresh instrument here), G4 survives
validation strictly WORSE than the program's best standalone leg. Carry the trigger, drop the
stall. **G8_A2m1_retrace survives validation better than either of its own legs** — best Σ fresh
net of anything tested (460k), genuine out-of-design additivity on QLD/XLK/IWM (IWM on both
dimensions, with a replay-verified 2008 mechanism that mirrors the QQQ-2003 one), matched-baseline
wins on VOOG and IWM, and its QQQ-old edge over REF is a parameter plateau — **but against stage
1's strongest standalone, A2_material_05, the result is a trade-off, not a win**: more net on 4/6
fresh instruments yet a worse drawdown on 4/6 (C6's reset tax, catastrophic on leveraged QLD), a
beats-its-legs QQQ-old margin that is a local peak at exactly f = 0.38 (sign flips at 0.42/0.46),
a 2022-style grind tax that stacks on some instruments, and a cutoff one step (−1.5%) from
rebuilding the 2000-02/2022 cascade. If the program wants one combination, G8 at (−0.5% cutoff,
f ∈ 0.38–0.42) is the direction the stage-2 evidence points (better QQQ-new, same QQQ-old plateau)
— but that is an observation for COMPARISON.md, not a selection: per the brief, no new optimum is
chosen here, and every number above inherits the Finding-1 ceiling and the program-wide
dependence-on-few-trades caveat (188 registered configurations on ~7 independent market episodes).

## File index (all new; nothing outside `validation/` touched, nothing existing modified)

- `strategies_stage2.py`, `register_stage2.py` (32 registry appends, pre-run) — configs
- `replay_verify_stage2.py`, `results/stage2/replay_verification.txt` — task 1 (5,995 checks)
- `run_stage2_sensitivity.py`, `results/stage2/` (family dir; `registry.jsonl` symlink →
  `../../registry.jsonl`), `results/stage2/results/` (runner tree, 120 runs) — task 2
- `run_stage2_fresh.py`, `results/stage2/fresh/` (summary.json + trades) — task 3
- `tmp/stage2_tables.py` → `tmp/stage2_tables.txt` (digest incl. center-point and G4≡A2m1
  trade-identity checks), `tmp/stage2_spotcheck.py` → `results/stage2/spot_checks.txt` (27
  raw-price assertions), `tmp/stage2_sensitivity_run.log`, `tmp/stage2_fresh_run.log`
