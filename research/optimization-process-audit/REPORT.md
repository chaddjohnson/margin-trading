# REPORT — bounded optimization-process audit: why development success fails later

Research only. A **bounded archive-reselection experiment** on the selection step of Priority 3B
(`research/vg-d1-growth-expanded/`, VG #2's D1 books + Growth in one $100,000 slot) and Priority 4A
(`research/gdx-growth-standalone/`, standalone GDX Growth). **No new phenotype search**: the subjects' actual,
independently generated cutoff candidate sets (C19, C21, C23, C24) were re-ranked by the unchanged original policy and
three frozen experimental policies, each on its subject's own engine, space, execution, costs, doors and accounting.

- One fixed $100,000 principal, no compounding, 5 bps per side, 11% simple interest (365-day), marked net = realized +
  open P&L. **DD** = maximum minute drawdown of the marked net; the ceiling is **$35,000 on the fixed $100,000** (not
  peak equity). Historical compliance does not guarantee future drawdown.
- **This is retrospective research on heavily examined history, not a fresh holdout.** Every published fold and
  validation outcome of the subjects was known when the experimental formulas were chosen; two experimental choices
  coincide with published role holders (4A C19 P2 and 4A C21 P1 = the robust-profit holders). The three slices
  (2020–2021, 2022–2023, 2024) are the same market periods in both subjects: **correlated evidence, not independent
  replications.**
- Every figure comes from sealed records in `results/` (11 sealed records verify); complete tables in
  `results/tables/`. Written analysis and tables only (standard 2.0.0 §7.7).

## 1. Bottom line

**No demonstrated improvement; stop investing in selection-formula changes of this kind.** None of the three frozen
alternatives (tail severity, subperiod consistency, episode sensitivity) improved the subsequent-period selections:
under the frozen decision rule all three are "no demonstrated improvement" in both subjects, and **none kept the
2020–2024 sequential drawdown within $35,000 in either subject** (sequential DDs $52,563.02–$77,667.98, against the
original $60,874.87 in 3B and $47,820.43 in 4A). The predeclared futility rule therefore stopped the audit before any
new 2025–2026 evaluation; the C24 choices of every policy are frozen and committed, and no FULL door was opened.

The failures are explained mainly by **(d) history that cannot distinguish future winners**, together with **(c) a
robustness instrument that measured one episode rather than robustness across regimes** — not by **(a)** a fixable
selection rule. Useful alternatives did exist in every cutoff archive, but in the decisive slices they sat at the
bottom of the training ranking, and no training-time measurement (including the three new formulas) located them
repeatedly. In 3B the archives contained almost nothing that survived 2020–2022 within the budget, which also points to
**(b)**, coverage of the explored region, as a contributing limit that reselection cannot fix.

## 2. Answers to the brief's questions

1. **Did the failed selections have useful alternatives in their archives, and where were they lost?** Yes, but few in
   the slices that broke the procedure, and mostly **at the final ranking or at promotion**, not at screening. In the
   frozen 96-member cohorts, the members that were "acceptable" in the next slice (P&L > $0 and slice DD ≤ $35,000)
   numbered **3B 10 / 13 / 45** and **4A 27 / 18 / 5** for 2020–2021 / 2022–2023 / 2024 (§7). Among the qualified
   shortlists, the acceptable members in 3B's 2020–2021 slice ranked **19th, 35th, 37th and 39th of 39** on training
   profit; in 2022–2023 6th, 8th, 36th, 38th and 40th of 40; in 4A's 2020–2021 3rd, 5th and 9th of 9; in 4A's
   2022–2023 the only acceptable shortlisted members were the near-dormant robust and balanced holders (+$302.38,
   +$492.88). Screened-out centres (stratum U) were almost never acceptable (0–3 of 8). These are **oracle diagnostics,
   not selectable strategies**, and "not found in this cohort" never means "none exists in the space".
2. **Could cutoff-time information distinguish them?** **No, not consistently.** No training feature available for
   every cohort member (centre net, DD, lots, episodes, top-episode share, net without the best year, rung-1 robust net,
   p90 DD, worst-2-of-16 DD) kept the same sign of association with next-slice P&L in five or six of the six
   subject-cutoffs; the strongest single association was **negative**: in 3B's 2020–2021 slice training centre net
   correlated −0.43 with slice P&L across the cohort (−0.51 within the qualified set; AUC 0.12 for "acceptable"). The
   alternatives looked attractive only after seeing the next period.
3. **Were neighbourhoods reproducing the same few episodes? Did sparse rules, clipping, inactive genes or duplicate
   ledgers inflate stability?** **Episodes: yes.** In fresh reruns of the published role holders' 128 selection
   neighbours, the share whose own largest winning episode overlaps the centre's was **0.78–1.00 at every cutoff from
   C21 on** (0.26–1.00 at C19), and from C21 on the median 4A neighbour earned **64%–104% of its net inside the
   centre's leading-episode window** (the March 2020 rebound). **Sparse rules: yes in 4A** — the C24 primary saw 76 raw
   crossings in 2016–2024, 67 were invalidated at once by minimum strength, 2 became base entries and 9 of its 11 lots
   were continuations. **Duplicate ledgers: no** — selection neighbours were distinct ledgers (≈ 256 of 256; none equal
   to the centre's). **Inactive genes:** canonicalized out of identities in both subjects (no double counting).
   **Clipping:** pervasive in 3B (236–251 of 256 selection draws of the primaries clip at least one coordinate),
   rarer in 4A (0–202); its effect on apparent stability is unmeasured here. The instrument therefore measured how
   insensitive the capture of one episode was to small parameter changes, not stability across regimes.
4. **Did any of three simple predeclared policies improve subsequent selections repeatedly?** **No** (table in §6).
   P1 (tail severity) helped 4A's net (+$22,227.50 over 2020–2024) but created a new slice breach (2020–2021 DD
   $50,556.63) and a $52,563.02 sequential DD, and cost 3B $18,906.78; P2 (subperiod) lost in both subjects (3B
   −$13,284.92, 4A −$25,501.26 against P0); P3 (episode) cut 3B's 2022–2023 loss by $12,702.02 but lost $28,708.95 in
   2020–2021, and in 4A repeated P1's 2020–2021 choice and breach. Each change came from one slice; the 2024 slice
   gave no evidence (every policy chose P0's member in both subjects).
5. **Process change?** The evidence does **not** justify a selection-rule change, even a separately confirmed one.
   It supports **retaining the current process with stronger stated limitations, diagnostic/reporting
   improvements, and reduced further broad optimization on this history** (`PROCESS_PROPOSAL.md`, for review).

**The brief's closing questions.**

- **What explains the failures (observed vs inferred)?** *Observed:* 3B's 2020–2021 failure is the March 2020 crash
  — the C19 primary's $60,874.87 DD (2020-02-19 → 2020-03-17) came from one D1·GDX lot (2020-03-05 → 03-16,
  −$42,553.87) after a long D1·VGT lot; **85 of 96 cohort members (36 of 40 shortlisted) breached $35,000 in that
  slice.** 3B's 2022–2023 failure (−$14,870.14, DD $57,075.51, not recovered) is a D1·VGT lot held from 2020-04-06
  into 2022 that gave back its gains, then a string of losing D1·GDX trades in mid-2022; 72 of 96 cohort members
  breached. 4A's 2022–2023 failure (−$15,359.64, DD $47,820.43, 2022-02-24 → 2022-09-29, unrecovered) is a 25-lot,
  5% stop Rise book whipsawed in GDX's 2022 decline (five stops of −$7,638.18 to −$9,653.86). *Observed:* the training
  windows of these selections were dominated by one or two episodes (C21 primaries earned $129,849.94 of $264,501.50
  and $107,230.48 of $127,595.98 in 2020). *Inferred:* the training data did not contain the regimes that broke the
  selections, so neither profit nor local stability on them could rank the next regime's survivors.
- **Were useful alternatives present, and could a frozen development-only rule find them repeatedly?** Present: yes,
  rarely in the hard slices; findable: no (Q1, Q2, Q4).
- **Did a rule help only one study, episode or slice?** Every gain was confined to one subject and one slice: P1 in
  4A's 2020–2021 and 2022–2023 (with a new breach), P3 in 3B's 2022–2023 only, P2 in 3B's 2020–2021 only (+$2,639.17).
- **Profit surrendered for risk control:** at the choices, the experimental policies gave up $183.56–$87,001.86 of
  training centre net (P2's C24 choice in 3B the most) and, over 2020–2024, between −$25,501.26 and +$22,227.50 of
  sequential net against P0, without bringing any sequential DD under $35,000. The attractive candidates they rejected
  (higher training net) were rarely better afterwards (§6, `results/tables/sequential.md`).
- **Separately confirmed process change, reporting improvement, or no change?** A diagnostic/reporting improvement
  plus stronger limitations; no change to selection, gates or the standard's rules is supported.
- **Allocation/funding study?** **Not supported by a specific mechanism here**; keep it deferred. 4A has no allocation
  at all and failed the same way; in 3B the drawdowns were shared by nearly every candidate in the cohort, including
  pools with a single Growth book (V or G configurations).
- **4B, Priority 6 or a pause?** Recommendation in §10: **pause new broad optimization**; if research continues, a
  bounded 4B comparison of 4A's frozen export set by complete pooled reruns (no search) is the lowest-risk step;
  Priority 6 should wait until the user accepts or changes the process (it would repeat the same procedure on the same
  history). Nothing has been started.

## 3. What was run

| Stage | What | Key records (sealed) |
|---|---|---|
| 0 | Brief verified complete (147 lines, sha256 `75842bfb…`); standard 2.0.0 read and adopted (preflight PASS); protocol frozen and committed before any rerun (`6933fbf5`) | `PROTOCOL.md`, `STANDARD_ADOPTION.json`, `results/protocol-freeze.json` |
| 1 | Archive scans (both subjects, C19–C23: 264,954 fitted configurations, 3,635,233 archive reads); inventory and source manifest; parity gates G1–G7; failure attribution; mechanism audit with training-only features | `results/stage1/*.json`, `SOURCE_MANIFEST.json` |
| 2 | Three frozen policies (one per family), code closure pinned, before any non-published next-slice outcome (`d5878865`) | `POLICIES.md`, `results/stage2/POLICY_FREEZE.json` |
| 3 | Choices and 96-member cohorts per subject/cutoff sealed and committed (`001a84f4`); 576 next-slice runs; sequential paths; decision rule; hindsight diagnostic | `results/stage3/CHOICES.json`, `outcomes.json`, `analysis.json` |
| 4 | C24 choices of every policy (primary and informed secondary universe) frozen and committed (`1a27a01f`); **futility stop — FULL not opened** | `results/stage4/C24_FREEZE.json` |

- **Parity (zero tolerance):** G1 the subjects' 39 sealed records and preflights; G2 roles re-derived exactly at every
  cutoff (independent and final sets); G3 every eligible member's selection statistics rebuilt exactly from archive
  hits (185 members); G4 every eligible centre rerun on its training door to the cent; G5 every published fold
  outcome (21 role holders) and every sealed sequential path (8) reproduced to the cent; G6 causal prefix of every
  role holder; G7 3,571 sealed rung-1 summaries reproduced by the archive reconstruction. G7 first "failed" through a
  comparison bug in this study's check (the sealed `"__-Inf"` encoding); amendment **A1** kept the failed record and
  sealed a corrected recheck (0 failures). Every cohort member's boundary equity equalled its training net (576
  causal checks), and the published role holders' slice outcomes reproduced again inside Stage 3. **No engine defect
  was found.**
- **Compute:** 4,866 fresh simulations (cap 100,000), of which 618 next-slice (cap 800; 42 reproduction + 576
  cohort); 0 new search proposals; archive hits counted apart (`results/tables/compute.md`). Peak unit memory 1.7 GiB;
  every stage ran in `opa.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0). The runner pilot (training door only)
  resumed identically after a self-SIGKILL and after a graceful stop, and removed duplicate keys.
- **Tests:** this study's 16 unit tests (cohort rule, decision rule, policies with a forbidden-field guard, and the
  synthetic eligibility example); full `npm test`: 1,405 tests, 1,394 pass, 4 skipped, 7 fail — exactly the 7 known
  pre-existing failures (intraday-study, minute-optimizer, study7-runners, trailing-buy ×4). No regression. The full
  suite reads other studies' data files as their own regression tests do; no audit candidate was evaluated by it.

## 4. Stage 1: inventory, reproduction and failure attribution

**Promotion funnel** (`results/tables/funnel.md`): per cutoff, 3B fitted 74,917–79,875 centres (63,079–65,577
plausible, 52,158–58,970 rung-1 feasible, 44,032–46,068 distinct feasible ledgers) → 192 rung 2 → 78–84 rung 3 → 40
shortlisted → 39–40 qualified; 4A fitted 10,013–11,084 (4,885–6,306 feasible but only 2,639–4,521 distinct feasible
ledgers) → 48 → 18–20 → 10 → 5–9 qualified. Every plausible centre's rung-1 or refinement neighbourhood is archived.

**The published fold primaries on their next slice** (reruns equal to the sealed records):

| Subject / cutoff | Primary | Training net / top-episode share | Selection p90 DD / worst-10% mean | Slice P&L | Slice DD (peak → trough) | Recovered |
|---|---|---:|---:|---:|---|---|
| 3B C19 | `B_GDX-breakout_VGT-breakout#1 profit` | $162,277.41 / 46% | $32,047.12 / $37,801.79 | $14,619.98 | $60,874.87 (2020-02-19 → 2020-03-17) | 2021-11-22 |
| 3B C21 | `G_GDX-rise#1 profit` | $264,501.50 / 64% | $26,842.57 / $27,521.66 | −$14,870.14 | $57,075.51 (2022-01-04 → 2022-09-01) | no |
| 3B C23 | `B_GDX-rise_VGT-rise#1 profit` | $295,264.76 / 38% | $24,865.32 / $26,826.69 | $13,505.87 | $12,639.84 | no (by 2024 end) |
| 4A C19 | `indep-rise#1 profit` | $79,776.54 / 92% | $33,344.06 / $35,178.86 | −$3,143.02 | $21,815.07 (2020-03-17 → 2020-07-14) | 2020-08-05 |
| 4A C21 | `indep-rise#4 profit order` | $127,595.98 / 73% | $32,563.46 / $35,713.00 | −$15,359.64 | $47,820.43 (2022-02-24 → 2022-09-29) | no |
| 4A C23 | `indep-rise#1 profit` | $133,766.46 / 55% | $29,482.56 / $33,356.59 | $1,965.63 | $9,927.33 | 2024-03-04 |

Sequential (2020–2024, switch charges included): 3B +$13,105.71 with DD $60,874.87; 4A −$16,537.03 with DD $47,820.43,
both reproduced to the cent; every archived role sequence also breached (`results/tables/reproduction.md`). The
lots open between each peak and trough, costs, interest and exposure are tabled there.

**The 4A eligibility interaction** (`results/tables/mechanism.md`; synthetic example
`src/optimization-process-audit/tests/eligibility.test.ts`). The C24 primary pairs a Rise trigger X with
minimum-strength eligibility a > X and no trend filter. Each raw crossing arms an opportunity that is evaluated at once;
when the crossing bar's advance over the fixed signal-time low is below a, the opportunity is **invalidated at its own
arming bar** ("vetoed", `strength_below_minimum`); only a bar that jumps at least a over the low is decided and filled;
after that base entry, classic-D1 **continuations re-enter without any new crossing** (eligibility gates raw crossings
only). On 2016–2024: 76 crossings, 69 armed (7 rejected while invested), 67 invalidated, 2 decisions, 9 continuation
signals, 11 fills. **Classification: a legitimate, specified restrictive rule, not a code/specification mismatch** —
`docs/strategy-lab/GROWTH_ENTRY_GATES.md` §3.2 states that "a minimum above the crossing's own advance invalidates that
crossing at once", and the engine's own test pins it. Its §3.1 and §8 sentences ("without a trend filter … eligibility
ON = OFF", "eligibility changes nothing in a standalone run") hold only when a ≤ X; that **documentation
generalization is incomplete** and is proposed for correction (not changed here). Nothing was repaired.

## 5. Stage 2: the frozen policies (`POLICIES.md`)

| Key | Family | Formula (ranks E(s, c), the subject's qualified independent set; ties by the subjects' profit order) |
|---|---|---|
| P0 | reference | highest centre net (the unchanged original rule) |
| P1 | severity-aware | highest centre net among members whose selection-family **worst-10% mean DD ≤ $35,000**; none → no selection |
| P2 | subperiod consistency | highest **median over selection draws of (net − best calendar year)** |
| P3 | episode sensitivity | highest **causal net with no new funding in the leading winning episode** |

Training doors only; selection-family (ranking) draws only; confirmation never read (a guarded test enforces it);
choices computed once by the freeze command. P2 and P3 measure related things; with three policies one apparent
success could have been chance — none occurred.

## 6. Stage 3: the realizable policy test (2020–2024)

| Policy | 3B slices: P&L / DD (2020–21; 2022–23; 2024) | 3B sequential net / DD | 4A slices: P&L / DD | 4A sequential net / DD | Classification |
|---|---|---:|---|---:|---|
| **P0** | $14,619.98 / $60,874.87; −$14,870.14 / $57,075.51; $13,505.87 / $12,639.84 | $13,105.71 / $60,874.87 | −$3,143.02 / $21,815.07; −$15,359.64 / $47,820.43; $1,965.63 / $9,927.33 | −$16,537.03 / $47,820.43 | reference |
| P1 severity | −$4,286.80 / $60,976.68; = P0; = P0 | −$5,801.07 / $72,409.73 | $3,472.46 / **$50,556.63**; $302.38 / $19,813.53; = P0 | $5,690.47 / $52,563.02 | no demonstrated improvement |
| P2 subperiod | $17,259.15 / $61,303.02; −$30,744.23 / $64,037.14; = P0 | −$179.21 / $64,917.86 | −$28,644.28 / $38,770.96; = P0; = P0 | −$42,038.29 / $59,670.10 | no demonstrated improvement |
| P3 episode | −$14,088.97 / $60,460.04; −$2,168.12 / $34,812.85; = P0 | −$2,901.22 / $77,667.98 | $3,472.46 / **$50,556.63**; = P0; = P0 | −$9,921.55 / $72,510.84 | no demonstrated improvement |

- **Decision rule (frozen before outcomes):** M1 (sequential DD ≤ $35,000) failed for every policy in both subjects;
  M2 (net > max(P0, $0)) passed only for P1 in 4A; M3 failed in 4A for all three (a new 2020–2021 breach or fewer than
  two non-worse slices). No uninvested slices (M4 passed everywhere).
- **Contextual controls** (the archived robust, balanced and lower-drawdown sequences, already published): all lost
  or breached in both subjects (3B −$50,006.84 to +$5,645.63, DD $53,347.94–$97,510.12; 4A −$28,391.90 to
  −$19,768.39, DD $36,643.97–$38,770.96). Switching to an already-tested label is not a new successful hypothesis.
- **Changed trades and exposure:** in 3B's 2020–2021 slice every policy's choice held capital most of the crash (367–434
  of ≈ 505 sessions), so all breached by about the same amount ($60,460.04–$61,303.02); the differences between them
  were small in training (P1's choice gave up $183.56 of training net) and large afterwards (−$18,906.78). P3's 3B
  2022–2023 improvement came from a V configuration (both D1 books + VGT Growth) with 10 new lots in the slice instead
  of the G configuration's (both D1 books + GDX Growth) 26.

## 7. The hindsight availability diagnostic (`results/tables/hindsight.md`)

| Subject / slice | Acceptable / 96 | Better than P0 | Shortlisted acceptable (of 40 or 10) | Breaching $35,000 (all / shortlisted) |
|---|---:|---:|---:|---|
| 3B 2020–2021 | 10 | 9 | 4 | 85 / 36 |
| 3B 2022–2023 | 13 | 13 | 5 | 72 / 30 |
| 3B 2024 | 45 | 17 | 22 | 8 / 3 |
| 4A 2020–2021 | 27 | 27 | 3 | 29 / 4 |
| 4A 2022–2023 | 18 | 18 | 2 | 16 / 3 |
| 4A 2024 | 5 | 4 | 1 | 1 / 0 |

Acceptable alternatives appeared in every promotion stratum except, mostly, the screened-out one, at rates that do not
rise with promotion (3B 2020–2021: shortlisted 4/40, rung-3 1/12, rung-2 1/12, rung-1 feasible 1/12, rung-1
infeasible 3/12, screened out 0/8). In 4A, 38 of 96 cohort members made no trade at all in 2022–2023 and 58 of 96 in
2024 — dormancy is common, not a property of the selected books alone. The hindsight frontier is not an achievable
improvement estimate: it is the best of 96 outcomes chosen after the fact.

## 8. Stage 4: C24 freeze and the futility stop (`results/tables/c24.md`)

Every policy's C24 choice was frozen and committed before any new 2025–2026 evaluation. No policy merited confirmation,
so FULL stayed closed. Already-published outcomes (previously examined history), where a choice coincides with a
published member: 3B E(s, C24) — P0 and P1 choose the independent primary (validation +$55,329.36); P2
(`V_VGT-breakout#2 robust`) and P3 (`B_GDX-rise_VGT-rise#5 profit order`) were never evaluated in 2025–2026 and stay
unevaluated. 4A E(s, C24) — P0, P1, P3 choose the primary and P2 the independent robust holder, both $0.00 in
2025–2026 (no trade). In the informed secondary universe (report-only), P1 and P3 choose 3B's
`informed-fixed#1 profit` — the **C4-refined** alias — whose validation (+$91,512.65) is already published; this is
not new evidence for it, and C4/C4-refined stay as they are.

## 9. Observed versus inferred

- **Observed** (sealed, reproduced): every number above; the neighbourhood episode overlap; the eligibility state
  transitions; the cohort prevalences and associations; the policies' paths.
- **Inferred:** that the training windows lacked the information needed (from the near-universal breaches and the
  absent or negative associations); that the instrument's stability reflects episode capture (from overlap ≥ 0.78 and
  in-window shares); that more search on the same history is unlikely to help (from 3B's 4.6× budget producing a
  similarly fragile archive). None of these is proven for other spaces, ETFs or future data.

## 10. Recommendations (not started; for the user's review)

1. **Do not adopt P1, P2 or P3**, and do not change the primary rule, roles or gates; record the result as "no
   demonstrated improvement" for selection-formula changes on this history.
2. **Adopt only diagnostic/reporting improvements, after review** (`PROCESS_PROPOSAL.md`): report neighbour
   episode overlap and in-window shares beside neighbourhood statistics; label single-episode stability; disclose
   clipping; add a post-fold hindsight cohort to future chronological tests so that selection and discovery failures
   are separated; correct the Growth eligibility documentation sentence.
3. **Reduce further broad optimization on 2016–2024**; treat new history (prospective shadow observation) as the
   only way to gain genuinely independent evidence.
4. **Next research step:** pause. If the user prefers to continue, a bounded **4B** comparison of 4A's frozen export
   set beside VG #2's GDX D1 book by complete pooled reruns (no new search; report dormancy and episodes) is the
   lowest-risk step. **Priority 6** stays pending and should not start until the process limitation is accepted or
   changed. **Funding research stays deferred** (no specific mechanism). **4B stays deferred** (not cancelled).
5. **Hypotheses for later, separately authorized review (not tested here):** 3B's crash breaches were driven by single
   D1 lots (−$42,553.87 in March 2020), so a per-lot loss or gap-exit behaviour of the D1 books is a narrower question
   than selection; 4A's dormancy is a property of the specified minimum-strength rule with a > X.

## 11. Limitations

- Retrospective, previously examined history; three correlated slices; two subjects sharing VGT/GDX history.
- Reselection only: the original screening and promotion, guided by their own objectives, decided what the archives
  contain; a changed **search** would need a separately authorized experiment.
- The cohort is a frozen sample (≤ 96 per cutoff, 576 runs); screen proposals never promoted to rung 1 are not
  archived as configurations and were excluded.
- Three formulas were tested; a different formula could behave differently, but no training feature showed a
  consistent sign across the six subject-cutoffs, which limits the prospects of any re-ranking.
- 3B's blackout window here starts at the episode's first decision session (4A's convention); 3B's own diagnostics used
  the first entry session, so 3B causal figures can differ slightly from its report.

## Reproduce

From the repository root (`RUN_COMMANDS.md` has every stage command; sealed stages refuse to rerun):

```
npm run research-preflight -- --study research/optimization-process-audit
npm run opa -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/optimization-process-audit/tests/*.test.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/optimization-process-audit/tables.ts
```
