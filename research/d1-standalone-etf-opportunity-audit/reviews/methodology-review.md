# Methodology review: D1 standalone ETF opportunity-capture and robustness audit (pre-freeze)

> Saved verbatim from the independent read-only reviewer (a separate agent), received 2026-10-27T16:07Z. Dispositions:
> `METHODOLOGY_DISPOSITIONS.md`.

**Reviewer:** independent, read-only. No file was written and no backtest was run.
**Reviewed at:** 2026-10-27, 16:04Z.
**Git state:** HEAD `b21ed711`, branch `research/d1-standalone-etf-opportunity-robustness`. Uncommitted: `package.json`, plus the untracked study and code directories.

**Files reviewed, with hashes:**
- `PROTOCOL.md` draft: `a3c6f7fd…`
- `SHORTLIST.json` v2: `d4d7b69d…`
- `events.ts`: `70347eb8…`
- `analysis.ts`: `1bc76d47…`
- `analysis.ts`, `verify.ts` and `views.ts` appeared on disk during the review (about 15:52–15:54Z). I reviewed those versions. If they change before the freeze, they need another look.

**Standard applied:** `brief/BRIEF.md`.

## Verdict

- **Chronology:** I found no path by which a research phenotype reads bars after 2023-12-29.
- **Fold-forward check:** it is period-correct and permitted by the source study's rules. It is not laundering.
- **Shortlist rule:** it is deterministic and does not use concentration. The v1→v2 revision is defensible, but it is not yet disclosed accurately enough.
- **Freeze readiness:** the draft is **not ready to freeze**. Three items must be fixed first:
  1. The classification code (flags and standing) is not bound by the freeze.
  2. There is no rule for turning two phenotypes into one verdict per ETF.
  3. The brief's requirement of exact engine parity for every tested vector is not yet met for 9 of the 11 shortlisted ETFs.
- **Other substantive problems:**
  - The capture definition makes "captured" partly a measure of how often a phenotype trades.
  - Comparisons with VGT `primary` start biased in favour of the candidates.
  - The explanation for excluding KRE, XLE and EWZ is wrong.

---

## Critical (must fix before freeze)

**C1. The flags, standing and capture logic sit outside the freeze, and the protocol says they may change.**
- PROTOCOL §11 (lines 256–263) calls `analysis.ts` "not outcome-defining and may change".
- `freeze.ts:21-49` (`boundFiles`) leaves out `analysis.ts` and `tests/rules.test.ts`.
- Yet `analysis.ts` computes every outcome that decides the result:
  - neighbour capture (l.267)
  - winner persistence (l.309–326)
  - profitable and major families (l.337)
  - F1–F9 (l.709–735)
  - the (iii) rule, the three comparison axes, standing (i)/(ii), and "stronger than VGT primary" (l.741–753)
- §10 also leaves real choices open to the implementer, for example:
  - the base net that F5 compares against
  - what happens when the base captured no major episode
  - how tied axes are treated
  - whether F9 uses each seed or the pooled 128 samples (`context.ts:191` says "seed"; §10 says "128")
- As drafted, the classification could be adjusted after outcomes are seen. That contradicts the brief's "Shortlist hash cannot be altered by examining Stage C results" and "Do not allow results to change ... frozen criteria".
- **Recommendation:**
  - Move every computation that feeds a flag, the standing or the axes into a bound module (bind `analysis.ts` itself, or split out `standing.ts`/`capture.ts`).
  - Add it and `tests/rules.test.ts` to `boundFiles`.
  - Rewrite §11 so that only formatting and report text are unbound.
  - Add synthetic tests for F1–F9 and the standing rule, including the edge cases in C2, M1 and M8.

**C2. There is no rule for combining two phenotypes into one verdict per ETF.**
- 8 of the 11 ETFs have an `alternative-1` (19 phenotypes in total), and each phenotype gets its own standing.
- The brief asks about ETFs ("Do any candidates provide a more compelling … case"). Nothing says whether an ETF is (i) if either phenotype is (i), only if both are, or only if the representative is.
- "Best of two" would give ETFs with an alternative two chances, and SLV, XLB and XHB only one.
- **Recommendation:** predeclare it. A good option:
  - The ETF's standing is the representative's standing.
  - `alternative-1` is a corroboration check: an ETF-level (i) also requires that the alternative is not (iii). Report it alongside.
  - Never use the better of the two to promote an ETF.
  - Also state how many tests there are: 19 phenotypes across 11 ETFs, each compared with one control.

**C3. Exact engine parity has not been shown for the vectors actually under test.**
- The brief (§5 C3) says: "require exact full-engine parity for tested vectors … mismatch blocks strategy ranking."
- The parity sample (`results/parity/PARITY_SAMPLE.json`) covers only GDX among the shortlisted ETFs. XME, KBE, SLV, FXI, IJH, XLB, MTUM, XHB, EWW and EDV are not covered.
- EDV matters most: its median minute coverage is 0.469 and its median dollar volume about $15.6M, so it is the kind of instrument where sparse-minute handling could diverge.
- Stage C runs in a new 17-symbol universe. The fold runs do get a parity check at the boundary (`analysis.ts` `boundaryParity`, also in `verify.ts`), but the 19 final-window base runs have no check against their stored Stage A records.
- **Recommendation:** make the base-run check a frozen Stage 3 precondition.
  - For each of the 19 phenotypes and for VGT `primary`: base fixed run at 5 bps and 11% versus the stored census figures. Compare trades, wins/losses, net, interest, friction, best/second/third/worst trade, yearly nets and minute/daily drawdown to the cent, using the same tolerances as `PARITY.json`.
  - Stop before any cost, OAT, joint or analysis output if any check fails.
  - This adds no new information (the figures are already stored), so it can also run before the freeze.

---

## Major (should fix or disclose before freeze)

**M1. "Captured" partly measures trade frequency, and F4 (neighbours miss majors) is computed per episode rather than per price event.**
- Attribution (`events.ts:313-319`, `phaseOf` l.265) credits a lot to an episode if it entered anywhere in (peak, rebound end].
- A partial episode's end is the next confirmed peak (`events.ts:161-162`). On choppy ETFs (GDX, SLV, XME, FXI, EWW, KBE), episode spans therefore chain together and cover nearly every session, so almost every lot belongs to some episode.
- A continuation-setup re-entry well up the rebound counts as "capturing" the dip.
- High-turnover phenotypes (KBE 69 trades, GDX 54) will capture more episodes mechanically than sparse ones (FXI 8, EDV 10). Capture rates are therefore not comparable across ETFs.
- The zigzag also splits one crash into several episodes whenever there is a bounce of 10% or more. The set M used for F4 can then hold several legs of one event: a neighbour that profits from a different leg of the same 2020 crash scores as a miss.
- When M has a single episode, each sample's share is 0 or 1, so F4 is effectively a coin flip.
- **Recommendation:** before the freeze, predeclare:
  - (a) A stricter **dip capture**: first entry in the decline phase or at a depth of at least 50% of the episode's depth below the peak. Also break captures down by setup (deep versus continuation).
  - (b) F4 computed per **major family** (one price event) rather than per episode, or state clearly which one gates.
  - (c) F4 recorded as "insufficient" rather than pass/fail when fewer than 2 major families were captured.
  - (d) A price-only diagnostic of the share of eligible sessions that fall inside any episode span, per ETF. It does not depend on strategy results, so it can be computed and bound before the freeze.
  - Binding the catalogs (episodes and families per ETF) before the freeze also blocks any later reinterpretation of F1.

**M2. No neighbourhood drawdown flag, although drawdown fragility is what kept KRE, XLE and EWZ out.**
- G2 excluded those three because their neighbour draws breached the $35k ceiling (see M5). KBE got in with 9 of 16 credible draws, and all 16 of its draws are profitable, so its failures are also most likely drawdown.
- Yet no Stage C flag tests drawdown across the neighbourhood: F3 checks only the base run and C1, and F9 checks only profitability and retention.
- The VGT audit's W7 did test neighbourhood drawdown.
- **Recommendation:** add a predeclared neighbourhood drawdown flag, for example "fewer than 75% of the 128 joint samples have minute DD ≤ $35,000, or the median joint portfolio daily DD is above 35%". Make it block standing (i).

**M3. The comparison with VGT `primary` is not like-for-like.**
- Every candidate was optimised on exactly 2016-01-04 → 2023-12-29: 2,048 Sobol vectors plus local search.
- VGT `primary` came out of earlier VGT programmes that inspected 2016–2025 (see the provenance note in `config/phenotypes/D1/VGT.json`). It is not tuned to this particular window.
- On the common window, the merit slot, S1, S2 and the axes "joint median net" and "profitable families" all start biased toward the candidates. F9 (retention against the phenotype's own base) is biased the other way, because a candidate's base is a fitted optimum.
- **Recommendation:**
  - (a) State this asymmetry in §0 and §14.
  - (b) Add **VGT's own final-window research representative** (`d1-681c3ac3cc`, stored net $125,218) as a **procedure-matched control**, run through the same battery. It is not a candidate and is never registered or presented as deployable. This gives a VGT comparison under the same selection procedure and the same window. It costs about 358 runs.
  - (c) Report each candidate's axes against both VGT `primary` and this control.

**M4. F8 (inconclusive temporal evidence) is asymmetric, cannot tell zero from negative, and is weakened by how the shortlist was chosen.**
- At `analysis.ts:727`, VGT `primary`'s F8 uses its stored B1 fold increments. Those were obtained with hindsight over the very same years, so they are not a test at all.
- For candidates, V ≤ 0 raises F8, but sparse phenotypes will often have V = 0 because they made no trade in an 18–24-month fold. That is no evidence, not negative evidence.
- The shortlist was built from final-window records that include 2020–2023. Vectors that have drifted little from the fold vectors will tend to pass F8 for the same reason they were shortlisted.
- **Recommendation:**
  - Split F8 into "negative (V < 0)" versus "no evidence (no lot entered or open in the window)", and predeclare which of these blocks (i).
  - Mark VGT `primary`'s F8 as "not assessable (hindsight)".
  - Also report the VGT instrument's own period-correct fold-representative V, which is already among the 61-symbol fold runs, so VGT faces the same test as the other ETFs.
  - Disclose that an F8 pass for a shortlisted ETF is conditioned on its selection. The cross-sectional analysis across all 61 ETFs (§9.3) is the less biased view.

**M5. The shortlist disclosure is inaccurate or incomplete in four places.**
- (a) **The reason for excluding KRE, XLE and EWZ is wrong.** `SHORTLIST_RULES_AND_CANDIDATES.md:143-145` calls them "sharp optima, not broad regions".
  - In the census, every one of their 16 stored draws has J_s > 0. Minimum J_s: KRE $5,072, XLE $15,306, EWZ $15,963.
  - Since J_s = net − best trade − drawdown excess, all of their neighbours were profitable even after removing the best trade.
  - The 12, 12 and 11 non-credible draws must therefore have failed on minute DD above $35,000 (or, less plausibly, fewer than 7 trades). The stored record does not say which.
  - IWF (some negative J_s) and DBC (negative median J_s) do fit "sharp optimum".
  - Rewrite the text. Note too that excluding XLE leaves the energy cluster unrepresented.
- (b) **The v1→v2 revision needs to be described honestly.**
  - v1 was written at 15:35:59.9Z and v2 at 15:37:36.4Z, about 96 seconds after v1's output was seen.
  - The S5 change had no effect on which ETFs were selected. It only reordered ETFs below the cut (I diffed v1 against v2).
  - The whole change in composition came from the merit slots: XME, GDX and KBE in; XBI (a B4/B5 member) and VPU out; EDV relabelled as the contrast pick.
  - The revision is defensible, because the research question naturally calls for auditing every ETF whose stored net beats VGT `primary`, and it used stored records only. But say plainly that it was a reaction to seeing v1's output, list exactly what changed, and say that the merit picks are the ones most exposed to winner's curse.
- (c) **Merit picks bypass the cluster cap** (`shortlist.ts:187-229`). The list therefore has two materials ETFs (XME, XLB) and two precious-metals ETFs (GDX, SLV), so 4 of 11 are metals/mining, while healthcare/biotech, energy, developed ex-US and broad EM have none.
  - If merit picks had occupied their clusters, the list would have been XME GDX KBE FXI IJH MTUM XHB EWW XBI EDV.
  - Either justify the current choice or, if you revise it, label it as v3 and keep every superseded list. Either way, publish that counterfactual list.
- (d) **KBE is a marginal merit pick.** Its stored net is $137,138, only $1,779 above the $135,359 anchor. It scores 0 on both S3 and S6, and its worst trade is −$17,568. State this.

**M6. The perturbation definitions are the same rule for everyone, but not the same size.**
- `b4-b5-robustness/context.ts:86-102` applies absolute shifts of ±0.5/±1.0 pp to percentage parameters at or above 2.0%, and relative shifts below 2.0%.
- A ±1 pp move in the stop is ±32% for IJH (3.1%), but ±13% for GDX (7.6%) and ±14% for VGT `primary` (7.3%).
- A ±1 pp move in P is ±24% for XLB (4.1%) and ±6% for FXI (16.3%).
- Integer parameters with short holds move by ±67% (GDX hold 3) versus ±25% (VGT hold 8).
- The rule also jumps at Y = 2.0% (Y 1.9% moves ±0.95 pp; Y 2.3% moves ±1.0 pp).
- Across ETFs of very different volatility (GDX/XME versus IJH/EDV), a 1 pp change in X is not equally severe.
- The brief allows a "common transformation blind to P&L". The protocol reuses the old rule, which is acceptable, but the confounding must be disclosed.
- **Recommendation:**
  - Before the freeze, write out every OAT point and all 128 joint vectors for all 20 phenotypes, together with their relative shift sizes (and, optionally, sizes in units of each ETF's realised volatility). This uses no results.
  - Bind that file in the freeze.
  - State that differences in neighbourhood robustness between ETFs partly reflect where each phenotype sits in parameter space, and each ETF's volatility, rather than intrinsic robustness.

**M7. The freeze does not cover the imported modules.**
- Results depend on code outside the namespace: `src/b4-b5-robustness/{context,specs,run,analysis,cli}.ts` (cost scenarios, distances, Latin hypercube, runner, `excursionOf`), `src/d1-ranked-preemption/data.ts`, `src/four-family/data.ts` (`computeReferenceHighs`), `src/multi-etf-allocator/phenotypes.ts`, and the N-book engine.
- `verify.ts:66-84` does check, via `git diff`, that nothing outside the namespace has changed. But `run` and `analyze` only call `requireFrozen()`, and that does not perform the git check.
- **Recommendation:** have `run` and `analyze` also refuse if any tracked file outside the namespace differs from the baseline HEAD (reuse `verify.ts`'s check), or bind the import closure's hashes in `PROTOCOL_FREEZE.json`. Also bind the tests, the price-only catalogs (M1) and the design vectors (M6).

**M8. The standing comparison (two of three axes) is coherent but loose. Tighten it before results exist.**
- **Ties count as wins.** "At least as good" counts a tie. If VGT `primary` has 100% of joint samples profitable (the full-history audit found 100%), any candidate also at 100% gets that axis for free. A candidate equal on all three axes would be called "stronger" (`analysis.ts:753`).
  - Fix: require being **strictly better on at least one axis** before using "stronger".
- **The axes are noisy and the designs are unpaired.** Each phenotype's joint samples are independent draws: the label includes the phenotype id (`specs.ts:162-166`).
  - Fix: require each axis to hold on **both seeds**, not only on the pooled 128. Or use common random numbers, for example the same Latin-hypercube labels as VGT `primary`, so every phenotype's samples sit at the same relative positions within its own intervals and the comparison is paired.
- **"Profitable families" is a raw count.** It depends on how many eligible families an ETF's price history offers. Report it next to the number of eligible families.
- **There is no downside axis.** Drawdown and tail risk act only through the absolute flags, so a candidate with a materially worse drawdown than VGT `primary` can still be (i). That is acceptable if declared. Report drawdown and worst lot beside each axis.
- **VGT `primary`'s own standing.** Report it under the same rules, and say beforehand what it means for the conclusions if VGT `primary` itself would be classed (ii).

**M9. Several bias disclosures are missing from §0 and §14.**
- (a) The source's representatives and libraries were chosen by J_nb (J_s deducts the best trade). The 61-ETF population was therefore generated with a penalty on concentration, which pushes against D1's fat right tail, so the brief's "no concentration penalty" can only be honoured from this study onward.
- (b) G2 and S3 rely on the 16 stored draws, but the representative was chosen by maximising the median J_s over exactly those draws. The statistic is selection-contaminated and biased upward. It is also coarse: with 16 draws the standard error is about 0.125 near a share of 0.5.
- (c) "T-retro" is weaker than true walk-forward evidence. The source procedure (J_s, credibility thresholds, the $35k ceiling, the box) was designed in October 2026 with knowledge of 2016–2026, and the 61-ETF universe is subject to survivorship (ETFs liquid today).
- (d) The common-window asymmetry in M3.

---

## Minor

1. **S4 indirectly penalises concentration.** Survivor status needs J_nb > 0, and J_s deducts the best trade. Every ETF that was "screened-down" in a window failed on J_nb ≤ 0 (for example VGK final −127, IWN fold-a −8,954). None of the affected ETFs is near the selection cut, so the shortlist is unaffected. Disclose it, or base S4 on credibility instead.
2. **F3's portfolio part mostly measures the core.** C0 alone sits at about 33.9% daily DD (full-history anchor), against a 35% threshold. Report each phenotype's daily drawdown increment over C0 alongside it.
3. **F5 is misnamed.** "One-minute dependence" actually measures sensitivity to parameters. No test shifts entry timing (the `nxo` scenario affects stop exits only). Rename it ("winner parameter-dependence") and state the gap.
4. **Winner persistence edge case** (`analysis.ts:318-326`). If the base's net in the top winner's episode is ≤ 0 (losers in the same episode), the 50% threshold becomes negative and passes trivially. Use the lot's own net, or flag the case.
5. **"Not armed" checks only the deep condition** (`events.ts:283-294`). It ignores arming through the continuation setup, and `perEpisode.joint.notArmed` (`analysis.ts:292`) merges "armed, no entry" with "not armed". Keep them separate, label the arming check as a reconstruction, and add a "depth below X by design" note for major episodes shallower than the phenotype's X (many candidates have X between 25% and 28%).
6. **Ineligible episodes leak into family counts.** Lots entered after arming during the rebound of an episode whose trough came before arming are attributed to it, and its net counts toward its family's net (`analysis.ts:330-337`). Exclude ineligible episodes from family net, or label them.
7. **EDV** (minute coverage 0.469, about $15.6M a day) will almost certainly raise F7, and minute-level stops and MAE are less reliable on it. F7 does not block (i). If EDV reaches (i), state F7 prominently next to it. TLT (order 22) would have been the more liquid contrast pick; mention this.
8. **Dividends in portfolio mode.** Only VGT and VOOG distributions are credited, which slightly favours VGT `primary` (this is disclosed). Give an order-of-magnitude estimate (yield × lot-days) for EDV, KBE and XLB.
9. **`store.ts:13-14` turns every `null` into `NaN`.** For example, `grid: null` stored for the pools comes back as `NaN`, so a later `=== null` check would fail.
10. **`shortlist --force` is not blocked after the freeze** (`shortlist.ts:273-276`). The usage text says it is. Add the check.
11. **The full-history door's protection is overstated.**
    - `fullHistoryUniverse` (`data.ts`) only restricts by symbol. GDX (a merit candidate), and the VGT, XBI, XRT and KRE research vectors, could pass that check.
    - The real protection is the cutoff check in `views.ts` plus the fact that `batch.ts` never calls this door.
    - `SOURCE_AND_EVIDENCE_BOUNDARIES.md` and the test at `rules.test.ts:336-338` (which uses XME) overclaim.
    - Fix: make the door accept registered targets only, and add a test that `fixed GDX:representative --end 2026-10-13` is refused.
12. **Inconsistent definitions in reporting.**
    - "Net per $1M dollar-days" uses occupied days × $100k for phenotypes (`analysis.ts:384`) but the engine's `borrowingDollarDays` for incumbents (l.542). Use one denominator.
    - The S2 anchor uses VGT's held days (no 1-day floor), while candidates use occupied days (floored). The difference is negligible but should be noted.
    - The regimes are restated in `analysis.ts:813` instead of being imported from the source context.
13. **Small inconsistencies in the protocol text.**
    - §6.1 says points "outside the source study's narrower search box" are labelled. That is not implemented, and the box appears to equal the legal grid anyway: implement it or delete the sentence.
    - The `context.ts:191` comment says "seed" where §10 says 128 pooled samples.
    - "Core" (SHORTLIST) versus "diversity" (PROTOCOL) naming.
    - Some cluster assignments are debatable (MTUM as tech-growth; USMV and SPLV as broad-market rather than defensive).
14. **`RESEARCH_RECOVERY.md` is stale and contradicts itself.**
    - Lines 13–19 say the protocol is "not yet written", the brief is "to be copied", and the next step is "build the inventory".
    - It has no rows for shortlist v1/v2, the benchmark, the draft protocol, or `analysis.ts`/`verify.ts`/`views.ts`.
    - Under the repository's context-recovery procedure, refresh it, with recomputed hashes, before freezing.
15. **The `lowLots` annotation (< 30 lots) fires for nearly every phenotype**, VGT `primary` included, so it says little. Consider reporting the number of distinct families captured as the annotation instead.

---

## Confirmed sound

1. **Chronology.**
   - `candidateUniverse` (`data.ts`) refuses any end after 2023-12-29 before reading a byte. It routes through the source's `inspectionUniverse('final')`, whose allowed end is `trainingLastSession`, with the training partition, the chronology checks and the audited file hashes.
   - `foldUniverse` caps reads at each fold's validation end.
   - No Stage 3–4 code path calls `fullHistoryUniverse`.
   - `views.ts` refuses research phenotypes after their cutoff and rejects files under `config/`.
   - The doors' refusals are tested.
2. **Fold-forward (§9.1) is legitimate.**
   - It uses the fold-specific representatives, chosen on data through 2020-06-30 and 2021-12-31, run continuously to the validation end.
   - Source PROTOCOL §4.4 permits exactly this through `inspectionUniverse` once a fold's validation is sealed.
   - It is labelled as inspected retrospective evidence.
   - The built-in boundary parity check (liquidation mark at the search end equals the stored Stage A net, for all 122 vectors) is a strong safeguard.
   - No final-window vector is run on an earlier slice and called out-of-sample, and S4 uses period-correct training statuses.
3. **Same-window comparisons are equivalent.**
   - VGT `primary`, B4, B5 and C0 run in the same universe and calendar, with the same arming date (2017-06-15), the same 19 cost scenarios, and the same fixed and portfolio conventions over 2016-01-04 → 2023-12-29.
   - Parity reproduced the sealed controls to the cent: B1, A and B4 at 0/2/5/10 bps fixed, and the portfolios at 5 bps.
   - The full-history anchors are reproduced and kept separate.
4. **The shortlist rule works as claimed.**
   - It is a pure function of the stored census; no run enters it.
   - Top-trade concentration enters neither a gate nor a grade (tested).
   - v2's S5 does not reward spreading profit over more years.
   - The VGT and SMH slot exclusions did not change the selection: MTUM, at order 5, had already taken their cluster.
   - Before the shortlist, the parity record stored only aggregates (no per-lot data), and the benchmark timed incumbents only, after v2 was written.
5. **The episode catalog is well defined.**
   - The zigzag on split-adjusted closes is deterministic.
   - There is one depth band per episode, so overlapping thresholds cannot multiply episodes (tested).
   - Unconfirmed troughs and open rebounds are handled.
   - Episodes before arming are "ineligible", never misses.
   - Episodes do not overlap, so attribution is unambiguous.
   - Labels are retrospective only: the engine reads completed minutes, and the causality parity (cut at 2022-06-30) passed.
   - The deep-condition proxy uses the engine's own `computeReferenceHighs` with X correctly scaled (grid ÷ 1000).
6. **The neighbourhood designs reuse the completed audits' machinery.**
   - Distances, legal grid and Latin hypercube are reused unchanged.
   - Infeasible OAT points are recorded, not run and not replaced.
   - Seeds and budgets are fixed; no extra samples are added.
   - VGT `primary`'s joint design equals the VGT audit's (tested).
   - B4/B5 32-D and 40-D results are kept separate from the 8-D comparisons.
7. **Costs and accounting.**
   - All 19 scenarios are re-simulated rather than subtracted.
   - The per-lot identity net = gross − interest − friction is checked.
   - The liquidation-equivalent treatment of lots still open at the cutoff is reconciled.
8. **Isolation.**
   - Every write goes under the study namespace or the git-ignored `evaluations/`.
   - `package.json` gains one script line; the `pools` script and the imports map are unchanged, so the prospective freeze is unaffected.
   - `verify.ts` re-hashes the data, `config/` and prior-research baselines, and checks the git diff outside the namespace.
   - Logs are git-ignored; one of them contains absolute paths, so never force-add the logs.
9. **The v1→v2 revision was made before any candidate run**, used only the stored census, and v1 is kept and bound. The disclosure needs the corrections in M5, but the sequence itself is legitimate.
