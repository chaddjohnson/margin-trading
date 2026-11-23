# Priority 4 — decision register (staged trailing stops, S1)

Concise and append-only. Times are UTC, 2026-11-23. Every "evidence" path is relative to `research/vg-l0-staged-stop/`
unless stated otherwise.

## Decisions

| # | Time | Decision | Basis / evidence | Status |
|---|---|---|---|---|
| R1 | 11:49 | Work on branch `research/vg-l0-staged-trailing-stop` from `research/vg-l0-trailing-stop-audit` `5d587bb2`. Use the main checkout and no extra worktree; leave `main` (`3606f4b3`) untouched | brief §10; `RESEARCH_RECOVERY.md` | done |
| R2 | 12:00 | Implement only S1 `staged-stop@1`: arming when high ≥ entry × (1 + A), then stop = max(stop, high × (1 − τ₂)). Integer tenths, rules V1–V5, no-early-lock minimum. OFF keeps the legacy identity, key and record | brief §2; `RULE_SPECIFICATION.md` (frozen E0, `3aa51963`) | done |
| R3 | 12:55–14:30 | Amendment E1: the staged Growth runner lives in `src/d1-risk-controls-rc3/growth.ts` (the frozen Priority 3 directory was reverted), plus disabled-book semantics. Amendment E2: staged-aware evidence identity | `AMENDMENTS.md` E1, E2 (before the freeze; no study evaluation existed) | done |
| R4 | 13:02–18:03 | Renew GPU acceptance for the staged delivery: GPU Phase 8. Record `c02a8a92…` ACCEPTED, pinned out of band; this branch only | `research/gpu-phase8/`; `reports/IMPLEMENTATION_VERIFICATION.md` §5 | done |
| R5 | 18:06 | Engineering gates E0–E5 sealed, all PASS | `results/engineering/gates.json` (`234f05c9`) | done |
| R6 | 18:17:12 | Protocol P4-S1 1.0.0 frozen: arms, lanes, budgets, materiality $10k / L90 > 0, risk margins, mechanism test, label order, doors, seeds | `PROTOCOL.md` `bd57ea2a…`; `results/protocol-freeze.json` `ea75d7ed…` (`5ff3bc0a`) | done |
| R7 | 18:17 | Stage A (D24, 144 points × 4 frictions): no material fixed point; A0 PASS (OFF = sealed incumbents) | `results/ablation/`; `reports/ABLATION_REPORT.md` | done |
| R8 | 18:18–21:30 | Folds C19, C21 and C24 ran exactly as frozen. Gate R was identical at every fold. The extension block triggered at every fold (EXP 50 %, 53 % and 64 % budget-bound) | `results/{search,gate-r,extend,qualification,selection,intervals}/`; `reports/SEARCH_REPORT.md` | done |
| R9 | 21:28:46 | Frozen selection committed, then FULL authorized and opened once for validation 2025-01-02 → 2026-10-30 | `FROZEN_SELECTION.json` `4210775b…`; `results/doors/FULL-authorization.json`; `results/intervals/C24.json` `284dc1d5…` | done |
| R10 | 21:30:30 | **Outcome label: INCONCLUSIVE (budget).** EXP was 48.4 % budget-bound after the extension at C21 and C24, above 25 %. Harmful did not fire. Never to be reinterpreted | `results/outcome.json` `949756c9…` (`490325a3`) | sealed |
| R11 | 21:30 | Primary effect not material at any fold: D̄ $2,340, $6,684 and $8,761, all below $10k. Risk non-inferior at every fold. Mechanism confirmed in-sample at every fold | `results/outcome.json` | sealed |
| R12 | 21:30 | Chronological check (§9.3) not passed by either arm. Every selection is "no chronological support: not a deployment-qualified candidate without an explicit user decision" | `results/outcome.json` | sealed |
| R13 | after 21:31 | Post-freeze report-only analyses only, purpose `diagnostic`. New tools outside the frozen code closure: `lots`, `tails`, `census`, `annual`, `abc`, `post.sh`, `bundle.sh`. No selection and no official evidence. CPU = sealed GPU for every replayed subject | `reports/diagnostics/`, `reports/tables/`; `results/doors.jsonl` (FULL diagnostic openings only after the validation) | done |
| R14 | — | **Recommendation: keep S1 OFF and preserve New L0 and N/original unchanged.** Do not make S1 a Priority 5 successor optimization | `reports/FINAL_COMPARISON.md` §4–§5 | recommendation (awaiting review) |
| R15 | — | Not adopted, not deployed, not merged into `main`, no broker access. The staged-stop engine and CUDA changes and the Phase 8 record stay on this branch | brief §1, §10; `CLAUDE.md` | in force |

## Open follow-up decisions (the user's)

| # | Question | Recommendation |
|---|---|---|
| F1 | Close S1 as "OFF, not pursued", or authorize a budget-only re-run of the EXP `GB0.VD1` lanes to resolve "inconclusive (budget)" | Close. More budget fits the same training history, and three later windows show no S1 benefit |
| F2 | Ever merge the staged-stop implementation (S1 OFF by default) and the Phase 8 acceptance into `main` | Only if a future study needs S1. It would need a reviewed merge, the parity gate, and handling of the two declared Priority 5A test failures |

## Disclosures

- **Development smoke, 12:20Z.** A development smoke tool appended two lines to a completed study's door log. They were
  restored before any commit.
- **Engineering outputs viewed before the protocol freeze.** At 12:40Z an engineering mini-optimization printed mini-lane
  centre nets on D19. At 13:30Z one D19 comparison was printed by a diagnostic-tool test. No protocol choice depends on
  either. Details are in `RESEARCH_RECOVERY.md`.
- **GPU Phase 8 read every door, including FULL, for CPU/GPU equality only.** Its outputs were equality counts and
  pass/fail.
- **No amendment after the freeze.** `AMENDMENTS.md` has entries E1 and E2 only, both before the freeze. It is pinned by
  the freeze, so the post-freeze report-only additions (R13) are recorded here and in the checkpoint instead.
- **Two report tables were cosmetically re-run after the post-fold analysis**, with identical numbers:
  - `lots-C24-FULL.md`, re-run with duplicate role names collapsed;
  - `tails.md`, re-run with the benchmarks named by their benchmark origin instead of a coinciding informed-projection
    label.
- **npm test: 2 declared failures of the completed Priority 5A study**: its byte pin of `riseTrading.ts` 1.4.0. They
  follow from the Growth engine revision 1.5.0 and are not relaxed.
