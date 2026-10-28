# Independent pre-freeze methodology review 1 (verbatim)

Reviewer: an independent read-only subagent (general-purpose), 2026-10-28 (UTC), given the brief, draft protocol v1 and the audit notes. Its report follows unedited; dispositions are in `METHODOLOGY_REVIEW_1_DISPOSITIONS.md`.

---

**Pre-freeze methodology review: `research/d1-all61-signal-capital-complementarity/PROTOCOL.md` (draft v1)**

I modified no files. I read the brief, the protocol and the audit notes in full, then checked them against `src/portfolio-aware-d1/nbook/engine.ts`, `src/multi-etf-allocator/shadow.ts`, `src/shared-margin-portfolio/strategy.ts`, `src/portfolio-aware-d1/{opportunity,evaluate}.ts`, `src/d1-ranked-preemption/{context,evaluate}.ts`, the `rankings/{fold-a,fold-b}/R{1,2}.json` files, `universe.json`, `OPPORTUNITY_MAP.md`, `config/pools/B4.json`/`B5.json` and `config/phenotypes/D1/VGT.json`.

**Engine-semantics verdict (part c).** In fixed mode both rules are exactly right, with one fix (finding 3):
- "busy ⇔ ∃b: D_b < D_c ≤ E_b, or D_b = D_c and sym_b < sym_c"
- "granted iff the decision time is later than the exit time of the last granted trade"

Why they hold:
- **Order within a bar:** exits run at step 3 (`engine.ts:1057-1070`), fills at step 5 (`:1077-1084`) and decisions at step 6 in alphabetical tie order (`:262`, `:1093-1114`). The close phase runs exits and then fills, with no decisions (`:1162-1178`).
- **Gate:** it counts lots plus reservations (`:422-430`, `:478`). A grant pushes its reservation before the next same-minute gate runs (`:852-860`), and the reservation is removed at the fill (`:608`).
- **Time stamps:** a decision is stamped bar start + 60 s (`strategy.ts:530`). An exit is stamped `timeAt` (`strategy.ts:134-135`, `:278`): the bar start, or `sCloseTime` for a closing-print exit. Both sit on the minute grid, so "decision ≤ exit" is exactly "the decision was processed before the exit".
- **Closing-print exit:** a decision stamped at the close comes from the last bar, so it is processed before the close-phase exit and is refused. That is consistent with "> E".
- **Overnight pending order:** a decision at or after the close gets fill −1 (`strategy.ts:125-129`) and fills at the next session's first trade (`shadow.ts:135-137`), so the reservation covers the night.
- **Buffered-loss pending sale:** the sale is held over (`strategy.ts:376-383`) and exits at the next session's first trade or as a gap stop at the open (`:291`, `:296-305`). E is that bar's start.
- **No same-session exit after a fill:** exits are evaluated only in `beginSession` (`shadow.ts:139-141`), so D < F < E strictly.
- **No self-overlap:** a book cannot signal while it holds an order or position, or in the session it exits (`shadow.ts:156`).
- **Thin symbols:** a book exits only on its own bars, and E records that bar.

**Findings**

1. **Blocker — §7.2 and §10, published-anchor parity.** The protocol calls "19 S0 lots displaced worth $125,958" one of XOP's first-order counts. It is not: it is the full-replay lost set, i.e. S0 lots absent from the scenario (`portfolio-aware-d1/evaluate.ts:297-299`; the map's column "S0 lots displaced / gained" is 19 / 9). The map's busy test also counts every same-minute decision as busy, ignoring the alphabetical tie order (`opportunity.ts:94`, `:222-223`, `start ≤ T`). As written, this fail-closed gate can fail for a definitional reason, which would force `inconclusive` or tempt a post-hoc fix.
   - Fix: compare 19 / $125,958 / 9 gained against the replay's baseline-only and gained-incumbent lots.
   - Reproduce 49/17/12 with the map's own convention, and report the protocol-convention counts plus the number of same-minute ties separately.

2. **Major — §0, incomplete disclosure.** The opportunity map published the U vector ("unchanged D1") against S0 = B4 on T for seven ETFs, not four. Besides XOP, GDX and XLE, it shows EWZ −$107,571, TLT −$16,748, XLU −$31,591 and GLD $0, each with busy/clean/displacing counts. The designer has also seen the 0 bps first-order diagnostic for all seven and the "best Track P" rows.
   - Fix: list all of these, and mark these ETFs "designer-seen (T, B4)" in every table and label.
   - Optionally add EWZ, TLT, XLU and GLD as extra parity anchors.

3. **Major — §6.5 and §5.2, missing ∞ convention for baseline holders.** The protocol sets ∞ only for E_c. In the engine, an open lot keeps `exitTime` NaN (`shadow.ts:315-327`, `engine.ts:1270-1279`) and a pending reservation keeps `entryTime` NaN (`:1310`). Since `D_c ≤ NaN` is false, a candidate that arrives while a baseline lot is held open to the data end is misclassified as idle.
   - Fix: set E_b := +∞ and F_b := +∞ for baseline lots and reservations open or pending at the end, in both `occupancy.ts` and `gate.ts`, and add a test.

4. **Major — §7.1, the source-selected candidate's identity is already known.** Applying the stated exclusions to the sealed R2 files gives:
   - Fold A: IYT. It is F7-flagged as thin, has 8 trades and is rated "sparse".
   - Fold B: XOP, because TIP is `rejected`. XOP is designer-seen with favourable T full-path results (U +$48,199; P-add-XOP +$81,268).
   - Because the identities are visible now, the choice between R2 and R1 is not result-blind.
   - Fix: write both identities into the protocol, justify R2 on principle, and fix any robustness filter now. For example, `credible` plus sample "adequate" would give XLB in fold A.
   - Label SRC results "designer-seen", and define what happens when SRC equals S1.

5. **Major — §11 ordering (leakage).** The screen is sealed at Stage 4, after Stage 3/4 have already produced fold-window Level D economics for every ETF. Any "instrumentation correction" made after that could change the screen. Separately, Stage 2's per-nominee fold-V parity creates fold-window P ledgers before the code freeze.
   - Fix: compute and seal `SCREEN.json` right after the code freeze, from the preA/preB runs only, and before any run whose data end is after the cutoff. Stage 3 should verify that seal.
   - Limit Stage 2 to scalar comparisons and do not persist its ledgers.

6. **Major — §9.3, a winner can be manufactured.** "Limited" needs just one C ∧ R among up to 24 fold replays. The negative control and SRC both count, and there is no materiality floor and no single-event check.
   - The negative control must never support a positive verdict. If it passes C, report "screen non-discriminating" and require S1's ΔV to exceed the control's.
   - Declare a materiality floor now (e.g. ΔV@10 bps > 0 and ΔV@5 bps ≥ max($5k, |worst candidate lot|)).
   - If ΔV minus the best candidate lot or best family share is ≤ 0, the result is thin and yields `inconclusive`, not "limited" (brief §9).
   - Report k passes out of n replays.

7. **Major — §9.2, the label logic is contradictory or incomplete.**
   - Label 5 requires C ∧ R, yet lists a `risk-incompatible` (C ∧ ¬R) qualifier, which can never apply.
   - A mixed result (C in fold A, ¬C in fold B) fits no label.
   - Label 3's "¬C" does not say which fold.
   - "Updated by any fold-window replay" lets P replays change U labels, which confounds H3.
   - An ETF whose profit sits mostly in idle-clean trades but in a single event gets "coincident only".
   - "Positive lot net" is undefined.
   - Fix: write an ordered decision list per view, with C aggregated across folds as all/any; add a label "asynchronous but thin"; define positive lot net as Σ max(net, 0).

8. **Major — §7.3 and §9.1, portfolio minute-DD horizon.** The brief requires both daily and minute portfolio % drawdown. The protocol gives a windowed daily figure and a whole-history minute figure to the window end, which for fold A includes the 2020 crash, so it is not matched. The engine exposes no minute equity series in portfolio mode (`:884-886` only feed trackers).
   - Fix: either rebuild windowed minute equity from `events` and the minute bars, gated against the engine's `minutePercentDrawdown`, or declare it not computed.
   - Either way, state that R is daily-only.

9. **Minor — §7.1, gate design.** The hard gate `fo_net > 0` is exactly the first-order arithmetic the brief warns can get the sign wrong (the XOP case). It structurally keeps H2-type candidates out of S1/S2. Fix: move it into the score only, or state that H2 is tested only through the negative control, SRC and the B4→B5 diagnostic.

10. **Minor — §9.1, breadth.** T and Breadth can both be met by two broad shocks (e.g. G4 and G7), which is exactly the H0 pattern. Fix: add a `shock-only` qualifier, and require at least one off-shock event for "several credible".

11. **Minor — §9.3.** For "several credible", require the same view in both folds, and say which view's Breadth applies to P candidates.

12. **Minor — §10.** A Stage 3 parity failure (observer = engine) happens after the code freeze, so "corrected before the code freeze" is impossible. Fix: define a correction amendment that re-freezes the code, reruns Stage 3 onward, discloses the change, and leaves the screen seal untouched.

13. **Minor — §5.2.**
   - Define E = `VirtualTrade.exitTime`, including the closing-print case.
   - Portfolio mode adds refusals (minimum equity, Reg T, house requirement: `:522-536`). Gate parity there must match the fixed-mode funded set or list each margin refusal.
   - Recompute the first-order class at every cost, since stops and continuation change the virtual trades.

14. **Minor — §7 and §12.** Label every fold replay "retrospective with an incumbent-hindsight comparator" (brief §6.6). Also disclose that the U vector carries VGT-specific hindsight through 2025 (provenance note in `VGT.json`).

15. **Minor — ambiguities to close before freeze.**
   - State the cost for Level D and the screen (5 bps, 11%), and for R.
   - Say whether `years` counts all decisions or idle ones.
   - `indep_pos` is computed but never used.
   - State that anchor windows are inclusive (≤ anchor + w).
   - Say whether cross-ETF families include incumbents and VOOG.
   - Define "strictly first" by decision time.
   - Say how the first correlation return is computed.
   - Say whether F7 thin symbols may be S1/S2 (if so, flag them).
   - Give the parity tolerance ("exactly" versus ≤ $0.005).

16. **Minor — Q1 thresholds.** Predeclare what "independent by return correlation but colliding at entry" means. For example: ρ ≤ 0.3, ±5-session matched share ≥ 0.5, and n_dec ≥ 4 each.

17. **Minor — omissions against the brief.**
   - Lot-held [fill, exit) overlap, and overlap by G-regime (brief §5).
   - ΔV by regime and without the best lot or family (Q5).
   - A "same-minute tie-preempted" refusal class (concept 7).
   - The capacity cost of losing lots: slot-days, and the standalone net of signals refused during them (needed for the falling-knife answer).
   - The Q7 split: share of B-idle minutes with no armed or decided ETF.
   - Disclosure of exposure-cluster concentration.
   - The list of deliverables and CLI commands (brief §10).
   - Parity against Study 1 controls, plus anchors for windowed minute DD (VGT fold A $14,894 / fold B $17,421) and B4's 843 of 1,647 sessions.

18. **Note.** The P-view screen economics are in-sample to each nominee's own fit, so `sa_net > 0` is nearly guaranteed. B5's GDX book was fitted through 2023-12-29, so it contaminates the idle classification against B5 in both screens. Disclose both.

19. **Note.** The three published-anchor T replays sit outside the 6-candidate budget. Declare them parity-only and keep them out of every table and verdict.

**What already complies.** Views U/P/I, the windows and doors, the no-post-2023 rule, the per-baseline-per-view replay bound, cost re-simulation at 0/2/5/10 plus s25, the portfolio overlay and the risk tables are present. The source-cutoff caps are consistent: fold-a vectors stop at 2021-12-31, and the liquidation-at-both-ends V matches `ranked-preemption/evaluate.ts:435`.

**Overall.** Do not freeze yet. Once finding 1 (blocker) and findings 2–8 (major) are fixed, the protocol can be frozen. The minor items are cheap and each opens a result-dependent choice, so they should be closed or explicitly declared before the freeze as well.
