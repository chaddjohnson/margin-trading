# DECISION_REGISTER — what the user must decide before Priority 4 (proposals only; nothing decided here)

Context:
- New L0 stays the official frozen reference and N/original the preferred research challenger. Neither is replaced.
- P0 (marked DD ≤ $35,000 = 35 % of the initial $100,000 allocation) stays the reference risk envelope. The P3 envelope
  stays not adopted.
- Nothing is authorized by this register.

## 1. Findings the decisions rest on

| ID | Finding | Where | Strength |
|---|---|---|---|
| F1 | D1 and Growth share one trailing stop: level = post-entry high × (1 − τ), ratcheted once a day from session highs, acting from the next session, eligible only while it locks a net profit after entry cost and interest (it can lapse). Its activation gain (≈ +6.1 % to +7.9 % for the comparators at day 0) is tied to τ | AUDIT_REPORT §3 | verified in code (CPU and CUDA) |
| F2 | No canonical feature tightens the trailing distance after a profit threshold. Related features exist: the RC adaptive hold, retention, the d1-refinement activation variants and Study 3's ratchets. They are on other exits, other engines or other directions | AUDIT_REPORT §8 | verified |
| F3 | The giveback of New L0's (and N/original's) winners is ≈ τ × (position value at the peak): the designed trailing distance. Gap costs beyond the level are small (≈ $10.9k over FULL) | AUDIT_REPORT §10.3 | archived ledgers, deterministic arithmetic |
| F4 | Every losing or open lot of both comparators never armed the stop and ended at the maximum hold. A profit-activated stage cannot affect them. New L0's binding DD windows are partly or mostly such losses | AUDIT_REPORT §10.3 | archived |
| F5 | In the searched population (Stage B), DD is 60–90 % unbanked giveback, mostly of winners, so a staged stop could plausibly change which phenotypes qualify under P0 | Stage B diagnostics | archived, descriptive |
| F6 | The effect on whole-portfolio net (premature exits, the trend remainder forfeited because books cannot cheaply re-enter, displacement, optimistic level fills) **cannot** be inferred from records; it needs simulation and search | AUDIT_REPORT §6, §10.4–10.5 | inference |
| F7 | The closest prior test (Study 3's profit ratchet) was best in-sample and failed forward in 2022 | SOURCE_MAP §3 | historical |
| F8 | A GPU port is small (one function per side, four call sites) but changes protocol layouts and requires a full acceptance campaign | GPU_PARITY_AND_INTEGRATION_PLAN | design |

## 2. Decisions for the user

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **Proceed?** | authorize Priority 4 as proposed / modify the design / stop this line | **Authorize a modified-scope Priority 4**: engineering E0–E5 first, then the ablations and the paired search, with OFF fully selectable. The evidence (F3, F5) supports a narrow, testable hypothesis, not an expectation of gain (F6, F7) |
| D2 | Rule family | S1 two-stage tightening / S2 ladder / S3 retained-profit floor / several | **S1 only.** S2 and S3 not yet (STAGED_STOP_DESIGN_OPTIONS §2–§3) |
| D3 | Books | all three independently / D1 only first / Growth only | **All three, independently switchable.** If engineering risk should be minimized: D1 first, with Growth's bit refused and the reduced domain declared (GPU plan §7) |
| D4 | Arming basis | gross gain of the post-entry high over the raw fill (H ≥ e(1 + A)) / net-of-cost-and-interest profit | **Gross on H.** It is the existing level's anchor and the adaptive hold's precedent, is interest-independent and is monotone |
| D5 | Stage-2 eligibility | keep the legacy net-profit rule / always eligible once armed | **Keep the legacy rule** in the minimal design (one behavioural change). Revisit only if diagnostics show interest lapses matter (design example E5) |
| D6 | Transition placement | H-anchored (may exit at the next open after a reversal) / arming-close anchored | **H-anchored**, with placement exits counted separately |
| D7 | Low-A region (A below the existing implied activation: an "early lock") | allow as a reported stratum / exclude by the constraint A ≥ τ₁ ÷ (1 − τ₁) + c | **Exclude it in the first study.** It is a different hypothesis (cf. B-A/B-B/B-D, no improvement). Always require (1 + A)(1 − τ₂) > 1 + c |
| D8 | τ₂ parametrization | absolute (grid tenths / 0.5 %) with repair τ₂ ≤ τ₁ − 0.5 point / ratio r × τ₁ | **Absolute with repair** (grid-consistent; RC repair precedent) |
| D9 | Domains | A 5.0–50.0 %; τ₂ 1.5 % to τ₁ − 0.5 point (design §1.4) / other | **As proposed**, frozen before the ablations |
| D10 | Retention interplay | S1 acts on the stage-`full` level (the partial sale at the first, possibly staged, event) / refuse S1 + retention | **Act on the stage-`full` level**, with dedicated parity fixtures |
| D11 | Exit labelling | keep `trailing stop` / `trailing stop gap` + staged counters / new reasons | **Keep the reasons** (stress semantics, pool and risk code unchanged) |
| D12 | Comparison rules | materiality and risk margins (protocol §7) | Material = mean paired D ≥ $10,000 with a one-sided 90 % lower bound > 0 at C21 and C24. Risk margins +$2,500 (centre DD, p90 DD, PL, BD) and +2 points of breach share. Labels as in protocol §9 |
| D13 | Search architecture and budget | as proposed: 64 paired independent lanes per cutoff (GA0.VA0, GB0.VD1), informed lanes I1–I4 at C24, ≈ 9 M requested (≈ 2.5 h GPU), hard bound 25 M, one extension block / larger / smaller | **As proposed**, sized finally by the E5 pilot. Spend extra compute on replicates rather than on longer lanes |
| D14 | Stress settings for staged fills | 10 / 25 bps stop slippage; D1 next-open; 10 / 20 bps per side; 14 % interest | **As listed** (more assumed level fills under S1) |
| D15 | Strategy Lab | expose S1 in Growth / pooled viewer now / later / never | **Later**, after a successor decision. P4 needs only the backend; Strategy Lab must pass its suites unchanged |
| D16 | Branch and merge policy | P4 on a research branch; new acceptance record there; `main` unchanged until review | **As stated**; no merge into `main` without a separate review |
| D17 | Scope guards | Growth·GDX OFF; no TSLA / MSFT / other symbols; P0 unchanged | **Keep** (the brief's scope) |

## 3. Questions the audit answers (brief Phase 6)

1. **Existing functionality resembling staged stops.**
   - The net-profit activation itself (one profit-activated stage).
   - The RC adaptive hold: profit-progress-activated, but on the hold.
   - Growth retention: two stages, but it loosens the exit.
   - The d1-refinement activation variants, including the "two-stage" protective → trailing switch, on a non-canonical
     engine.
   - Study 3's profit ratchet, on a retired engine.
2. **The gap.** No way to make the trailing **distance** depend on accrued profit on the canonical D1/Growth path. The
   gap is narrow: it targets the τ-giveback of large winners only.
3. **Test first.** S1: one extra stage per book, on the existing anchors and instants. It is minimal (2 genes + 1
   switch per book), keeps legacy behaviour below the threshold, and has exact OFF parity.
4. **Do not test yet.** S2 (no evidence that one stage is insufficient); S3 (tight at small gains, loose at large
   ones, the wrong profile, and failed prior art); lower-activation, ATR, time-based and dollar-cap variants.
5. **How individual retention can worsen total results.**
   - Premature exits in persistent trends: the books cannot cheaply re-enter (D1 needs a P or X pullback, Growth a new
     crossing).
   - Displacement: an earlier free slot captured by a weaker trade, with the later better one refused for good under
     L0.
   - More, idealized level fills.
   - Placement exits.
   - Costs.
   - Search dilution and mechanical in-sample superiority.
6. **CPU/GPU feasibility.** Yes, without sacrificing capabilities.
   - Additive CPU modules (RC 3; Growth 1.5.0 with an OFF-parity fixture).
   - One device function at four sites; protocol v3 layouts; two capability bits.
   - A full acceptance campaign.
7. **Unresolved choices.** D1–D17 above.
8. **Meaningful compute.**
   - The measured throughput for this workload is 884–1,808 evaluations/s with 64-lane jobs.
   - ≈ 9 M requested evaluations (≈ 2.5 h of GPU) for 64 paired lanes per cutoff × 3 cutoffs plus informed lanes,
     ablations and qualification. That resolves effects of about $5–10k (SE ≈ $2.6–3.6k).
   - Hard bound 25 M (≤ 8 h).
   - Doubling the replicates again would halve the SE once more, if the user wants sub-$5k resolution.
9. **Authorize, modify or stop?** Authorize Priority 4 in the modified, engineering-first form above (D1). Stopping
   would also be defensible, given F4 (losses unaffected) and F7 (failed prior art). The narrow hypothesis (F3, F5) is
   cheap to test properly on the accepted GPU.

## 4. Future roadmap dependencies (not started; scope unchanged)

The items below are noted, not recommended for action now.

| Item | Dependency on this line |
|---|---|
| Comprehensive N/original successor optimization | If Priority 4 ends *beneficial*, the successor's domain should include the staged genes (its GPU capability then exists). If it ends otherwise, the successor proceeds without them. **Recommendation (labelled):** do not start the successor before the Priority 4 outcome, to avoid re-running it |
| TSLA D1 / Growth and MSFT D1 / Growth studies | Independent of this line. If staged stops are adopted later, those studies inherit the capability but must test it on their own symbols; no transfer of parameters |
| Additional securities (new conversation) | No dependency |
