# Research recovery checkpoint — matched L0/L1/L2 lifecycle optimization (vg-lifecycle-matched-optimization)

## Top screen

- **Updated:** 2026-11-11T17:28Z (UTC, from the clock). **Status: COMPLETE — every stage sealed (28 records verify);
  report written; committing and pushing. Follow-up gate: the user's review (nothing starts automatically).**
- **Task:** the user's brief "Matched optimization under L0, L1 and L2 funding lifecycles" (`brief/BRIEF.md`, sha256
  `224480b4…6d9`).
- **Branch:** `research/vg-lifecycle-matched-optimization` (main checkout), from `b8a5a058`.
- **Authority:** PROTOCOL.md `7e826064…e993` (frozen 10:30:57Z, `1c43f722`); AMENDMENTS head A1 (`c03f5ac7`); standard
  2.0.0.
- **Outcome (frozen labels, before validation):** L1 vs L0 **harmful** (tail risk, no profit gain); L2 vs L0
  **conditional profit/risk trade-off** (no development gain; supported but fragile chronological path). Validation:
  primaries L0 +$96,883.72, L1 +$91,128.15, L2 +$95,627.06 (all trail C4 +$99,081.34); every known target reproduced.
- **Deliverables (sha256 prefix):** FROZEN_SELECTION.json `cd223a0d18c44925`; results/validation/validation.json
  `8393113915ee91f9`; results/folds/sequential.json `7bf8c74463461b96`; results/folds/C24/selection.json
  `0615262bec59bdde`; results/crosstest/C24/matrix.json `e87d080eb87ba812`; results/diagnostics/diagnostics.json
  `520cc385f550f43a`; results/parity/parity-A1.json `d18ebc6cfb984d65`; results/protocol-freeze.json `1a72c321df38bf4f`;
  REPORT.md and results/tables/ (unsealed reporting); results/supplementary/c19-l2-primary-mechanism.json (report-only,
  outside the frozen plan).
- **Running processes:** none.
- **Do not rerun:** any sealed stage (they refuse); the validation ran once.

## Stage log (study; UTC from the chain log)

| Stage | Window | Result | Commit |
|---|---|---|---|
| C19 search (indep, 3 arms) | 10:49:29 → 11:32:50 | 317,159 unique; 1 extension round (5 positions), then resource guard | eb7a5b34 |
| C19 qualify | 11:32:50 → 11:38:13 | primaries L0 R2/B#1, L1 R1/B#1, L2 R1/V#1 | eb7a5b34 |
| C19 cross-test + fold | 11:38:13 → 11:39:09 | slice 2020–21: L0 +$9,083.51 (DD $39,527.29), L1 −$39,829.71 ($65,926.68), L2 +$26,887.52 ($29,279.04) | 04957b61 |
| C21 search | 11:39:09 → 12:41:28 | 310,693 unique; 1 extension round (6 positions), then resource guard | aa57a2dc |
| C21 qualify | 12:41:28 → 12:49:14 | primaries L0 R1/V#1, L1 R1/B#1, L2 R2/B#1 | aa57a2dc |
| C21 cross-test + fold | 12:49:14 → 12:50:39 | slice 2022–23: L0 −$38,341.52 (DD $57,259.44), L1 −$13,416.67 ($52,273.52), L2 +$21,050.14 ($25,971.37) | 7813564b |
| C23 search | 12:50:39 → 13:58:54 | 287,041 unique; 4 extension rounds, then no trigger fired | acfab5c2 |
| C23 qualify | 13:58:54 → 14:07:55 | primaries L0 R2/G#1, L1 R2/G#1, L2 R1/B#1 | acfab5c2 |
| C23 cross-test + fold | 14:07:55 → 14:09:17 | slice 2024: L0 $0.00 (no trade), L1 +$23,363.92 (DD $15,733.96), L2 +$1,730.70 ($9,182.94) | cff56224 |
| C24 independent search | 14:09:18 → 15:31:49 | 313,892 unique; 8 extension rounds, then no trigger fired | 9479ba49 |
| C24 informed search | 15:31:49 → 16:50:59 | 235,609 unique; no extension (no trigger fired) | 9479ba49 |
| C24 qualify | 16:50:59 → 17:12:47 | 72,351 unique; primaries (all informed, V): L0 R1#1 $382,721.46 / $19,459.83, L1 R1#1 $382,163.79, L2 R2#1 $382,163.79; independent primaries L0 R2/G#1 $199,115.31, L1 R1/B#1 $214,405.77, L2 R2/B#1 $195,286.84 | 9479ba49 |
| C24 cross-test | 17:12:47 → 17:17:46 | 14,700 unique; 28 rows × 3 lifecycles | 3798b5d1 |
| Diagnostics | 17:17:46 → 17:21:07 | 1,962 in-process simulations | 3798b5d1 |
| Frozen selection | 17:21:31 | labels L1 harmful, L2 conditional trade-off | 290deefa |
| Validation (FULL, once) | 17:21:41 → 17:23:11 | 75/84 rows pass V1–V3; all known targets reproduced | (final commit) |
| Sequential | 14:09:17 → 14:09:18 | L0 unsupported −$29,358.01 / DD $67,214.22; L1 unsupported −$30,032.46 / $106,883.44; L2 supported +$49,518.36 / $29,279.04 (replicate-alone paths of L2 breach: R1 $35,918.05, R2 $52,503.46) | d3d4bfe2 |

## Engineering done (pre-protocol; mechanics only, no candidate performance read)

- Implementation in `src/vg-lifecycle-matched-optimization/`: `life.ts` (one evaluation path: L0 = Priority 3's
  `evaluate`; L1/L2 = 5A's coupled fixed point with stresses/blackouts/marks), `search.ts` (3B pipeline + lifecycle,
  paired seed keys, 3 structure cells V/G/B, entry-pattern quotas, synchronized extension phases), `stages.ts` (one job
  per cutoff × lane type with all 3 lifecycles; extension rounds per position; resource guard), `qualify.ts`, `folds.ts`
  (per-lifecycle roles, fold exports, sequential paths), `crosstest.ts`, `labels.ts`, `diagnostics.ts`, `final.ts`,
  `parity.ts`, `controls.ts`, budgets, lab/pool (3C's duplicate-key fix; cumulative job caps; runs.jsonl).
- Typecheck clean (temporary tsconfig limited to the study). Tests: `src/vg-lifecycle-matched-optimization/tests/*.test.ts`
  — 19 pass (labels, strata, paired seeds, budgets, caps, control identities, eligibility doc evidence, minimum strength
  under L0/L1/L2, L2 supersession).
- Stage V dry run (not sealed): `npm run vg-lmo -- launch --unit vglmo-parity-dry3 --wait -- parity --dry-run` →
  1,415 checks, 0 failed, 773 simulations, max 233 fixed-point rounds (non-default starting guesses), 2.9 GB peak.
  Earlier dry runs found two test-harness issues (rounding tolerance of realized+unrealized; next-open fallback in the
  stress identity; failure detection must pick a requesting book) — fixed in the harness, no engine change.
- Bench (`bench --door D24 --centres 96 --warm 2 --modes L0,L1,L2`, logs in `.cache/vg-lifecycle-matched-optimization/`):
  12 workers 56.3/s (8.3 GB), 14 workers 57.2/s (9.7 GB), 16 workers 57.0/s (11.0 GB) → choose 14. Random centres are
  rarely plausible (1 of 96 L0 centres has DD ≤ $35,000).
- Engineering simulations (cap 320,000): stage V dry runs ≈ 2,320 + sealed 773; bench ≈ 15,600; probes ≈ 400; straight
  pilot (P18) search indep 77,477 + informed 42,963 + qualify 46,956 + cross-test 11,342 + in-process ≈ 1,000;
  interruption pilots ref / sigterm / wkill / unitkill 4 × 22,596 unique (+ lost in-flight work) → ≈ 290,000.
- Pilot results: every stage path passed (`pilot/straight`); synchronized extension fired in the informed pilot; the
  duplicate seed keys of the two informed replicates did not hang (19,917 hits). Interruption tests on the cheap pilot
  schedule: SIGTERM (coordinator only) → exit 75 → resume; worker SIGKILL → job failed promptly (no hang) → resume; unit
  SIGKILL → resume; `pilot-compare ref sigterm wkill unitkill` → identical lane results (10:26:36Z).
- Pre-freeze changes from the pilot: R1 (one refinement pass, focus 2; caps; cheap pilot fidelities), R2 (engineering
  cap 320,000, independent caps 415,000; the fold evaluation records the independent primary).

## Environment

- Node 24.21.0; 16 logical CPUs (8 physical); 59 GiB RAM visible; vLLM and mongod run on the host.
- Canonical data unchanged: `data/VGT/data.csv` `2ee06310…412e`, `data/GDX/data.csv` `77dba9b2…5049`, both ending
  2026-10-30T23:59Z (checked 2026-11-11T08:57Z).
- Containment: slice `vglmo.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), units via `npm run vg-lmo --
  launch --unit NAME [--wait] -- <command>`; engineering logs in `.cache/vg-lifecycle-matched-optimization/logs/`.

## Disclosures

- A1 (post-freeze): the first C19 search failed on an explicit engine check (L2 retained order granted at D19's last
  session had no pool record); fixed in `lifeBook.ts` (5A's code untouched); stage V re-sealed as `parity-A1.json`; the
  failed archive (11,761 fresh evaluations, unread) moved to `.cache/…/jobs/search-C19-indep.discarded-A1/` and counted as
  discarded work against the ceiling.

- `package.json`: script `vg-lmo` added.
