# Research roadmap — D1 + Growth shared-pool priorities

The sequence the user agreed (Priority 1 brief, 2026-11-08; reordered by the Priority 3 brief, 2026-11-08; Priority 3
split into 3A/3B by the Priority 3A brief, 2026-11-09), with status and outcome as of 2026-11-09. Every priority follows the [optimization standard](OPTIMIZATION_STANDARD.md):
- development 2016-01-04 → 2024-12-31 for all optimization and selection;
- 2025-01-01 → the common complete endpoint only for validating frozen selections, which is validation on previously
  examined history, not an untouched holdout;
- a maximum minute drawdown of $35,000 on one fixed $100,000 principal budget.

Each priority is commissioned and reviewed separately. Nothing starts automatically after another finishes.

| # | Priority | Status | Study | Outcome |
|---|---|---|---|---|
| 1 | D1 entry eligibility (VG #2 Balanced) | **Complete** (2026-11-08) | [`research/vg-balanced-entry-eligibility/`](../../research/vg-balanced-entry-eligibility/REPORT.md) | No useful benefit at the fixed control: eligibility stays OFF. The cost came from capital displacement, not the delayed trade. |
| 2 | VGT D1 + Growth in one shared $100,000 pool, and its separate-then-pooled follow-up | **Complete** (2026-11-08) | [`research/vgt-d1-growth-joint/`](../../research/vgt-d1-growth-joint/REPORT.md); [follow-up](../../research/vgt-d1-growth-separate-pooled/REPORT.md); [standard 1.0.0](OPTIMIZATION_STANDARD.md) | A working combination, but no robust improvement: the plain D1 primary + Growth #4 combination beat the joint primary; the joint procedure was chronologically unsupported; architecture A supported. The separately optimized pair pooled was weaker still. |
| 3 | **VGT + GDX D1 + Growth** in one shared $100,000 pool (four components) | **Complete** (2026-11-09) | [`research/vg-d1-growth-joint/`](../../research/vg-d1-growth-joint/REPORT.md) | **Negative result.** The frozen primary (an informed four-component refinement: $338,642.84 / DD $20,393.61 on development) lost $32,190.25 on 2025–2026 with a $57,568.06 DD (V1–V3 fail). The independent joint procedure was chronologically unsupported (−$61,544.61, sequential DD $102,257.90), although its C24 primary passed validation (+$76,802.05) without funding Growth·GDX. No combined system credibly improved on VG #2 (validation +$74,688.80). The unchanged VG #2 + Growth #4 + Appendix A combination failed the development tail gate (Q3) but did best afterwards, descriptively (+$139,887.46). Searched GDX Growth books were mostly unfunded. The original result is preserved unchanged. |
| 3A | Diagnostic of Priority 3: GDX Growth participation and neighbourhood risk | **Complete** (2026-11-09) | [`research/vg-d1-growth-diagnostic/`](../../research/vg-d1-growth-diagnostic/REPORT.md); [standard 1.1.0](OPTIMIZATION_STANDARD.md) | **GDX Growth went unfunded for three compounding reasons.** (1) The selected GDX books barely decided: 0 decisions in 10 of 28 finalists, 1–4 in 16, as trend-filter and recovery-gate blocks silenced them. (2) Their few decisions met a slot held by Growth·VGT or D1·VGT, with no idle overlap in 11 of the 12 refused-only cases. (3) In the Growth-only search, pairs funding both books earned less on development, so promotion chose VGT-only pools. That penalty is partly architectural: a short GDX lot can lock VGT's long Growth trade into an unfunded virtual hold for hundreds of idle sessions. **A's and B's Q3 misses** come from a narrow Growth·GDX timing cliff (Appendix A's trailing stop 7% → 7.3% gives a $38.2k DD) with modest severity: mean excess about $4k, worst $55,963.54, every draw profitable. B's p90 is within finite-draw uncertainty of $35,000; A's is not. The informed primary has a rarer but deeper tail (worst-10% mean $41,591 against A's $40,207). The Q3 verdicts stand; A and B remain user-directed candidates. **Recommendation:** a bounded current-versus-funding-aware comparison (Priority 5, brought forward) before 3B. |
| 3B | Larger-budget VGT + GDX search | Not started | — | Conditional on the user's review of 3A and of any early funding-behaviour comparison it recommends. |
| 4 | GDX-only D1 + Growth | Not started | — | — |
| 5 | Compare alternative pooling and funding behaviour | Not started | — | Includes actual-position (funding-aware) state, persistent refused opportunities, reassessment on capital release and allocation alternatives. **The current virtual-book behaviour is preserved through Priorities 3 and 4** (the user's decision). Its relevant bounded comparison may be brought forward only after the user reviews 3A (3A recommends it; specification in its report §5). |
| 6 | Explore Growth for other ETFs | Not started | — | — |

**Decisions recorded (Priority 3A brief, 2026-11-09).**
- **Sequencing depends on the evidence:** 3A came next; it could recommend bringing forward the relevant bounded part
  of Priority 5 before 3B. No study is reordered or started automatically: the user reviews 3A first.
- **Candidate consideration is not qualification** (standard 1.1.0 §2.8). The unchanged VG #2 + Growth #4 + Appendix A
  and VG #2 + Growth 08500a60 + Appendix A combinations stay user-accepted candidates for investigation. Their sealed
  Q3 verdict stays "fail". This is not deployment approval, a new p90 tolerance or a change of the $35,000 budget.
- **Severity beside frequency, participation attribution, protected both-symbol exploration:** standard 1.1.0 §5.8,
  §2.9, §4.7 (report-only or [S]; no new gate).

**Decisions recorded (Priority 3 brief, 2026-11-08).**
- Funding-behaviour changes are deferred to Priority 5. Through Priorities 3 and 4 a refused entry still starts the
  component's virtual trade, funding never feeds back into a book, and freed capital never revives a refusal.
- The as-is (unchanged) benchmark is retained beside any joint refinement: combining unchanged phenotypes and refining
  them are separate experiments, and the unchanged combinations stay in every comparison.

## VG #2 Balanced is already a jointly optimized VGT + GDX D1 pool

**Identity.**
- Runner alias `s8-vg-balanced` (equivalently `s8-vg-3`); configuration **`S8-VG-F24-3`**. The config file is
  `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`, sha256 `27cbadf9…6c0da`.
- Do not confuse its shortlist suffix 3 with its overall rank 2. Do not confuse it with Study 7's older `vg-balanced`
  alias.

**What it is: a paired phenotype.**
- Study 8's track VG optimized **all 16 parameters of both books jointly** (8 per book), scored on the executed
  shared-pool replay; standalone P&L was never summed.
- It is not two independently chosen D1 books. It must be preserved, and reused, as the pair below together with its
  allocator conventions.

| D1 parameter | VGT book `d1-bd80e32ee4` | GDX book `d1-7b99d2833d` |
|---|---:|---:|
| targetPercentChange (X) | 23.5% | 27.6% |
| trailingBuyPercentage (Y) | 0.9% | 0.1% |
| trailingStopPercentage | 7.4% | 5.7% |
| maximumHoldDays | 15 | 12 |
| tickWindowSize (L) | 78 | 243 |
| intradayLossBuffer | 4.4% | 2.9% |
| pullback (P) | 11.0% | 15.2% |
| continuationWindow (W) | 55 | 12 |
| `parametersSha256` | `078c4339…e570a8` | `95e0dd80…e83696a` |

**Allocator conventions** (Study 8 PROTOCOL.md §1.5; `src/study8-runners/README.md`):
- **Funding:** one funded $100,000 slot shared by both books, no compounding, no simultaneous funded positions.
- **Books and priority:** shadow books keep their virtual state when a signal is refused. The first executable signal
  wins, with reservations and no preemption; same-minute ties go in alphabetical order.
- **Economics:**
  - 11% simple interest on principal (365-day year);
  - 5 bps per side, $0 commission;
  - stops at the stop or the gapped open, with no extra slippage.
- **Calendar:** accounting from the close of 2016-01-04, arming on 2017-06-15.

**Provenance.**
- **Selection:** Study 8 primary fold F24 (search 2016-01-04 → 2024-12-31): rank 2, tier strong, role balanced,
  shortlist #3.
- **Hashes:** protocol sha256 `22eebc37…`; selection body `5d266eea…`; test body `f85b4d7a…`.
- **Training centre:** net $260,223, minute DD $17,281, 36 lots.
- **Its one-time 2025-01-02 → 2026-10-29 test:** T gates PASS, test net $79,925, run net $340,148, run DD $21,304.
- **Priority 2's external context:** $334,911.93 through 2026-10-30 with a $21,303.61 DD.
- **Status:** research only, not deployed.

## Priority 3 (complete) — what it implies for Priority 4

- **The study:** [`research/vg-d1-growth-joint/REPORT.md`](../../research/vg-d1-growth-joint/REPORT.md). It ran four
  arms in one shared $100,000 slot (architecture A):
  - the unchanged controls;
  - a Growth-pair search combined as-is with VG #2;
  - an informed four-component refinement;
  - an independent four-component search with C19/C21/C23 folds.
- **What it suggests for GDX alone:**
  - the searches rarely funded a GDX Growth book next to D1·GDX;
  - Appendix A's browser-selected GDX Growth (reproduced to the cent: $141,157.37 / $17,709.96, flat at the end) was
    the only substantively funded one.

  Priority 4 can test GDX D1 + Growth without VGT, with VG #2's GDX book and Appendix A as controls.
- **Both failures traced to long Growth holds occupying the exclusive slot.** That is Priority 5's question; the
  behaviour stays fixed until then.
