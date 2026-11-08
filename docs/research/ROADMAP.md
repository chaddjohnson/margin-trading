# Research roadmap — D1 + Growth shared-pool priorities

The sequence the user agreed (Priority 1 brief, 2026-11-08), with status and outcome as of 2026-11-08. Every priority follows the
[optimization standard](OPTIMIZATION_STANDARD.md):
- development 2016-01-04 → 2024-12-31 for all optimization and selection;
- 2025-01-01 → the common complete endpoint only for validating frozen selections, which is validation on previously
  examined history, not an untouched holdout;
- a maximum minute drawdown of $35,000 on one fixed $100,000 principal budget.

Each priority is commissioned and reviewed separately. Nothing starts automatically after another finishes.

| # | Priority | Status | Study | Outcome |
|---|---|---|---|---|
| 1 | Bounded D1 entry eligibility for VG #2 Balanced | **Complete** (2026-11-08) | [`research/vg-balanced-entry-eligibility/`](../../research/vg-balanced-entry-eligibility/REPORT.md) | No useful benefit at the fixed control: eligibility stays OFF. The cost came from capital displacement, not the delayed trade. |
| 2 | Joint D1 + Growth optimization for VGT in one shared $100,000 pool | **Complete** (2026-11-08) | [`research/vgt-d1-growth-joint/`](../../research/vgt-d1-growth-joint/REPORT.md) | A working combination, but no robust improvement. The plain D1 primary + Growth #4 combination beat the joint primary. The joint selection procedure was chronologically unsupported. Architecture A was supported. |
| 2 follow-up | The separately optimized D1 and Growth selections, pooled; the optimization standard | **Complete** (2026-11-08) | [`research/vgt-d1-growth-separate-pooled/`](../../research/vgt-d1-growth-separate-pooled/REPORT.md); [standard 1.0.0](OPTIMIZATION_STANDARD.md) | Retrospective diagnostic: the pooled pair ($145,470.37 development, +$23,858.51 validation, $169,328.88 full; whole-run DD $34,336.64) is below the joint primary on development and full history, and far below both fixed incumbent combinations, with more drawdown. D1's slot occupancy refused four Growth trades. The optimization standard, adoption manifest and preflight are in place. |
| 3 | Joint D1 + Growth for VGT + GDX in one shared $100,000 pool | **Pending review** (not started) | — | — |
| 4 | Joint D1 + Growth for GDX alone | Not started | — | — |
| 5 | Other ETFs suited to Growth | Not started | — | — |

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

## Planning note for Priority 3 (recorded, not implemented)

Priority 3 needs the user's review of Priority 2 and its follow-up first, then a new study protocol that adopts the
current standard and passes the preflight. The agreed direction:

- **A staged benchmark without a fresh D1 search.**
  - Reuse VG #2 (both D1 books and their allocator conventions) as the D1 incumbent.
  - Newly optimize a **VGT + GDX Growth pool**.
  - Evaluate the combination in **one shared $100,000 pool**, not $100,000 per strategy family.
- **Labelled honestly: not a matched-budget method comparison.**
  - VG #2 comes from an earlier, much larger search (Study 8: 9,983,389 point evaluations, 55.4 CPU-hours), under
    native conventions: arming on 2017-06-15 and the alphabetical same-minute tie order.
  - The staged system's provenance and compute differ from any new joint search (standard §3.4).
- **What Priority 3's design should include:**
  - the staged system as a benchmark **and** as an informed seed;
  - a **full four-component joint refinement** (D1 VGT, D1 GDX, Growth VGT, Growth GDX);
  - an **independent joint search** with its own chronological folds;
  - the exact incumbents (VG #2, and the Priority 2 controls where relevant) in the selectable set, or a frozen
    no-improvement fallback (standard §3.2).
- **The final evaluation** runs the full shared pool, so it accounts for the conflicts between families and ETFs that
  separate family pools could not anticipate.
- **Nothing is fixed permanently.** The final D1 parameters are not frozen merely because an incumbent exists: the
  joint refinement may move them.
