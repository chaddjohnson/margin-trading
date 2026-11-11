# Research recovery checkpoint — matched L0/L1/L2 lifecycle optimization (vg-lifecycle-matched-optimization)

## Top screen

- **Updated:** 2026-11-11T10:49Z (UTC). **Status: INCOMPLETE — protocol frozen (`1c43f722`); amendment A1 (engine failure fixed:
  L2 retained order granted at a door's last session) with stage V re-sealed (`results/parity/parity-A1.json`, 1,425
  checks, 0 failed); chain 1 being restarted from C19 (the failed C19 archive moved aside unread).**
- **Task:** the user's brief "Matched optimization under L0, L1 and L2 funding lifecycles", copied verbatim to
  `brief/BRIEF.md` (161 lines, 21,099 bytes, sha256 `224480b4b0e39e9647e4403dbc7963f1c0c3f5f9c17883bce23776ec0dae06d9`).
- **Branch:** `research/vg-lifecycle-matched-optimization` (main checkout), from `b8a5a058`. Code:
  `src/vg-lifecycle-matched-optimization/`; CLI `npm run vg-lmo -- <command>` from the repository root.
- **Authority:** PROTOCOL.md sha256 `7e8260647c9ec4406609f41863fe81c4106206abcf4b0027229aaaec1af0e993` (frozen);
  AMENDMENTS head **A1** (post-freeze; the evaluation digest `3f902532…e3b` acknowledged in
  `results/code-acknowledgements.jsonl` with `parity-A1.json`); standard 2.0.0 (`2005a88c…0105`).
- **Sealed:** `CONTROL_MANIFEST.json` `e56bc7a6…ecef7`; `results/parity/parity.json` (stage V: 1,415 checks, 0 failed,
  773 simulations); `results/protocol-freeze.json` (evaluation digest `682cef28…cf40`, closure `a0bd79bc…3130`, 256
  files). `npm run vg-lmo -- verify` → 3 ok.
- **Running processes:** chain 1 = `research/vg-lifecycle-matched-optimization/chains/chain1.sh` (first start
  10:31:59Z failed at the C19 search, 10:33:51Z, A1 — log `results/logs/chain1.failed-A1.log`; restarted after A1, log
  `results/logs/chain1.log`); it launches one unit at a time in `vglmo.slice` (`vglmo-<stage>`; logs
  `results/logs/vglmo-<stage>.log`) and commits each fold selection before its slice. Check with
  `systemctl --user list-units 'vglmo-*'` and `tail results/logs/chain1.log`. If the shell died but a unit runs, let the
  unit finish; relaunching the same stage command resumes from its archive (never start a second copy while one runs).
- Full `npm test` (2026-11-11, contained unit, PATH set): 1,422 tests, 1,411 pass, 7 fail, 4 skipped — exactly the 7
  known pre-existing failures (intraday-study, minute-optimizer, study7-runners, trailing-buy × 4). No regression.
- **Next step:** when chain 1 ends (CHAIN1 DONE): inspect the C24 records; `npm run vg-lmo -- freeze-selection`; commit
  FROZEN_SELECTION.json; `launch --unit vglmo-validate --wait -- validate`; tables; report; roadmap; commit; push.
- **Do not rerun:** stage V, the freeze, any sealed search/qualify/cross-test/fold record (they refuse anyway).

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
