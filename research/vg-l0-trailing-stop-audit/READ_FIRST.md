# READ FIRST — Priority 3: D1/Growth trailing-stop audit and staged-stop design

**Status: COMPLETE (audit and design only).**
- No optimization, search, backtest, evaluation or code change was performed.
- New L0 stays the frozen reference and N/original the preferred research challenger. P0 (marked DD ≤ $35,000 = 35 %
  of the initial $100,000 allocation) stays the reference envelope.
- **PRIORITY 4 NOT STARTED — awaiting review and separate authorization.**

## Executive conclusions

1. **There is one trailing stop, and it is already profit-activated.**
   - D1 (both books) and Growth·VGT use the same `ExitManager`. The level is 1 − τ times the post-entry high (session
     highs; the fill minute on the entry session), ratcheted once after each close and acting from the next session.
   - It is eligible only while it would lock a net profit after the entry cost and interest. Its implied activation is
     a gain of ≈ +7.9 % (D1·VGT), +6.5 % (D1·GDX) and +6.1 % (Growth·VGT) at day 0, rising with interest. The
     activation can lapse.
   - So the system is "no trailing stop, then one stage at τ". The activation threshold is not a free parameter.
2. **Growth is protected.** Both comparators run Growth·VGT with an ATR initial stop (1.2 × ATR16, from the fill) and a
   22-day losing hold. N/original adds RC protective stops on both D1 books (inert on its history), an adaptive GDX hold
   and a decline gate. A maximum hold in either family **never sells a profitable position**.
3. **No canonical feature tightens the trailing distance after a profit threshold.** Related features are:
   - the RC adaptive hold: a profit-progress-activated change of the hold;
   - Growth retention: two stages, but it loosens;
   - the non-canonical d1-refinement activation variants: one distance throughout, no improvement on VGT D1;
   - Study 3's profit ratchet: best in-sample, but its fold pick lost $28,223 in 2022.

   The staged-stop gap is real, but narrow.
4. **The archived giveback is mostly the designed trailing distance.** In New L0's FULL ledger, each winner gave back ≈
   τ × (its value at the peak): $299.9k across 37 winners, against $280.7k for τ × (principal + peak). Gaps beyond the
   level cost ≈ $10.9k in total. N/original is the same.
5. **Losses are a different population.** Every losing or open lot of both comparators peaked below the activation gain
   and exited at the maximum hold. A profit-activated stage cannot reach them. These losses drive a large part of New
   L0's maximum-DD windows: 53 % of the D24 window, $13.5k of $20.4k in the FULL window.
6. **The hypothesis that survives is narrow and testable.** A later, tighter stage could keep part of the τ-giveback of
   large winners without touching early-trade behaviour, and could change which phenotypes qualify under P0 (Stage B:
   60–90 % of searched DD is open-profit giveback). Whether it raises **whole-portfolio** net is unknown:
   - it may exit ordinary pullbacks;
   - it forfeits trends the books cannot cheaply re-enter;
   - it changes displacement under one slot;
   - it adds idealized level fills.

   Only authorized simulation and search can answer this.
7. **Recommended minimal design (S1).** Per book, an optional second stage: once the post-entry high reaches
   e × (1 + A), trail at τ₂ < τ₁.
   - Same anchor, same once-a-day instants, legacy net-profit eligibility, unchanged exit reasons.
   - OFF = exact legacy parity. 2 genes + 1 switch per book.
   - Not yet: the multi-stage ladder (S2), the retained-profit floor (S3, tight at small gains and loose at large ones),
     lower-activation, ATR, time-based and dollar-cap variants.
8. **The GPU path is feasible without losing capabilities.**
   - One device function at four sites; protocol v3 input layouts; two capability bits.
   - Additive CPU modules: RC 3, and Growth 1.5.0 with an OFF-parity fixture.
   - Then a full acceptance campaign. Until it passes, any staged search is blocked (standard §9).
9. **Proposed Priority 4.**
   - Engineering gates first.
   - Report-only ablations on fixed phenotypes.
   - Then a paired CTRL (OFF) / EXP (staged allowed) independent search: 64 lanes per cutoff at C19 / C21 / C24, cells
     GA0.VA0 and GB0.VD1, whose CTRL lanes must reproduce Stage B's sealed lanes.
   - Informed lanes on New L0 and N/original, OFF projections, a census, chronological and interval tests, and outcome
     labels including "keep OFF".
   - ≈ 9 M requested evaluations ≈ 2.5 h of GPU at the measured 884–1,808 evaluations/s; hard bound 25 M.
10. **Recommendation.** Authorize Priority 4 in this engineering-first, OFF-selectable form, or stop: both are
    defensible. Do not expect a gain; test for one.

## Reading order

1. `READ_FIRST.md` (this file).
2. `DECISION_REGISTER.md`: findings F1–F8, decisions D1–D17, the answers to the brief's Phase 6 questions, roadmap
   dependencies.
3. `AUDIT_REPORT.md`:
   - the comparators §1, architecture §2, D1 versus Growth matrix §3;
   - precedence §4, causal timelines §5, interactions §6, execution realism §7;
   - overlap §8, serialization §9, giveback evidence §10.
4. `STAGED_STOP_DESIGN_OPTIONS.md`: S1 in full (formulas, timing, domains, examples E1–E5, harms), then S2, S3 and the
   exclusions.
5. `GPU_PARITY_AND_INTEGRATION_PLAN.md`: CPU modules, CUDA changes, tests, the acceptance campaign, engineering gates.
6. `PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md`: ablations, the paired search, fairness, budget, metrics, validation,
   outcome labels.
7. `SOURCE_MAP.md`: every file, function and line, and every archived record, with hashes.
8. `VERIFICATION_REPORT.md`: what was read, what was run (read-only), and what was not done.
9. `analysis/giveback_tables.py` and its output `analysis/giveback_tables.out.txt`: read-only arithmetic over committed
   tables that regenerates every ledger figure cited.
10. `RESEARCH_RECOVERY.md` (checkpoint), `brief/BRIEF.md` (the assignment, verbatim), `SHA256SUMS.txt`.

## Evidence labels used throughout

- **[V]** verified in the current code at `48090c55`;
- **[A]** archived research records;
- **[H]** historical (another engine or an unmerged branch);
- **[I]** inference;
- **[P]** proposal.

All market history 2016–2026 is previously inspected; no statement here is out-of-sample evidence.
