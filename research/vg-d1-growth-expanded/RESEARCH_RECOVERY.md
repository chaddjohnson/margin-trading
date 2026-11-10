# RESEARCH RECOVERY — Priority 3B: larger VGT + GDX D1/Growth pooled search with C4 as the preferred benchmark

## Top screen

- **Updated:** 2026-11-10T10:47Z (UTC). **Status: COMPLETE.** Pushed: `git push -u origin research/vg-d1-growth-expanded` (new remote branch, no force,
  outside the sandbox, 2026-11-10T10:46:33Z); `git ls-remote` at 10:46:38Z = `0bfb5c8b2dc0ae2ecf83ff5d7279ac75efd79de8`
  = local. No PR, no merge into `main`. This push record is its own follow-up commit, pushed the same way. Every stage sealed; `REPORT.md`, tables, roadmap written. **Outcome: keep C4** — no qualified candidate
  dominates C4 on development (no replacement candidate); the formal primary `C24/informed-joint#1 profit` is a
  higher-profit trade-off (development +$79,377.88; p90 DD $31,814.77 vs $24,519.07; validation $95,627.06 vs C4
  $99,081.34); the independent procedure is chronologically unsupported.
- **Follow-up gate:** the user's review of `REPORT.md`. Nothing further is started (next in the roadmap: 4A).
- **Validation:** `results/validation/validation.json` `e7e467de…1425` (committed `e3e8a321`); 20/25 pass V1–V3; all known
  targets reproduced to the cent.
- **Full `npm test`** (unit `vgexp-npm-test` in `vgexp.slice`, shell PATH set; 10:41:53Z → 10:45:57Z): 1,373 tests,
  1,362 pass, 7 fail, 4 skipped — exactly the 7 known pre-existing failures (intraday-study ×1, minute-optimizer ×1,
  trailing-buy ×4, study7-runners ×1); this study added 18 passing tests. No regression.
- **Disclosures:** amendments A1 (fixed-D1 lane's search neighbourhoods Growth-only) and A2 (B → V/G refinement moves
  in independent cells; one occurrence, C24, no role) — after the results, no record changed.
- **Authority:** `PROTOCOL.md` sha256 `79494d1e67d77649ff21ef15002559674439659dd47fb921cd2e6b0b0de5e9e2`;
  `results/protocol-freeze.json` `e700c679a2b7f8a4b73d1dcc5d1c2afc71bc5b6ceabc61d0f4713224362c5182` (frozen
  2026-11-09T18:34:25Z, closure 252 files, digest `ed5103b76489…`); `AMENDMENTS.md` R1–R4 (pre-freeze); adoption
  standard 2.0.0 (preflight PASS); engineering gates `results/parity/parity.json` `49b203c5…c799` (233 checks, 0
  failed); `CONTROL_MANIFEST.json` `2ed9cec0…41dc`. Commits: `a6ab9a2d` (pre-freeze), `1997c2d0` (freeze).
- **Running:** unit `vgexp-chain` (bash `chains/study.sh`, outside the slice; log `results/logs/study-chain.log`), started
  2026-11-09T18:34:35Z. It runs, one unit at a time inside `vgexp.slice`: C19 search → qualify → commit selection →
  fold-eval → C21 … → C23 … → sequential → C24 indep search → C24 informed search → C24 qualify. Each step's log is
  `results/logs/<unit>.log`; progress `.cache/vg-d1-growth-expanded/jobs/<job>/progress.json`.
  Check: `systemctl --user list-units 'vgexp*'`; `tail results/logs/study-chain.log`.
- **Stage log (sealed records; verify with `npm run vg-exp -- verify`):**
  | Stage | Record | sha256 | Wall | Fresh evaluations |
  |---|---|---|---:|---:|
  | C19 search indep | `results/search/C19/indep.json` | `7b644217…21b1` | 2.42 h (18:34:35Z → 21:00:00Z) | 1,212,750 (137,216 distinct proposals; 6 of 8 cells "triggers not met") |
  | C19 qualify | `results/folds/C19/selection.json` | `8ad0f610…bf9c` (committed `583fac45`) | 4.8 min | 57,088 (40 members, 39 qualified) |
  | C19 fold evaluation | `results/folds/C19/evaluation.json` (slice 2020–2021, D21) | `929477d3…7b23` | 4 s | in-process |
  | C21 search indep | `results/search/C21/indep.json` | `3c2b36d9…dd8b` | 2.74 h (21:04:56Z → 23:49:20Z) | 1,169,417 (133,120 distinct proposals; 8/8 "triggers not met") |
  | C21 qualify | `results/folds/C21/selection.json` | `49f6bae7…d28b` (committed `b63418d2`) | 6.6 min | 40 members, 40 qualified |
  | C21 fold evaluation | `results/folds/C21/evaluation.json` (slice 2022–2023, D23) | `81380c54…4cfb` | 6 s | in-process |
  | C23 search indep | `results/search/C23/indep.json` | `5e48f8fb…0106` | 3.47 h (23:56Z → 03:26Z) | 1,178,935 (137,216 distinct proposals; 8/8 "triggers not met") |
  | C23 qualify | `results/folds/C23/selection.json` | `ef9b5bd5…9724` (committed `878b9b6e`) | ≈ 7 min | 40 members, 39 qualified |
  | C23 fold evaluation | `results/folds/C23/evaluation.json` (slice 2024, D24) | `b08aa710…35c4` | 6 s | in-process |
  | Sequential | `results/folds/sequential.json` | `aa7ffc3d…0106` | 1 s | verdict **chronologically unsupported** (procedure net +$13,105.71, sequential DD $60,874.87) |
  | C24 search indep | `results/search/C24/indep.json` | `1ab3880d…887e` | 4.60 h (03:33Z → 08:09Z) | 1,308,569 (149,504 distinct proposals; 8/8 "triggers not met"; peak 13.8 GB) |
  | C24 search informed | `results/search/C24/informed.json` | `bc820b02…3cd9` | 2.07 h (08:09Z → 10:14Z) | fixed + joint lanes |
  | C24 qualify | `results/folds/C24/selection.json` | `4b17acc4…8b30` | 22.7 min | 114,109 (61 final + 3 historical; 53 of 61 final qualified); primary `C24/informed-joint#1 profit`; C4 qualified; no replacement candidate |
  | Diagnostics | `results/diagnostics/D24/diagnostics.json` | `f3291633…3616` | 1 min | 22 subjects, 66 ledger files |
  | Frozen selection | `FROZEN_SELECTION.json` | `f7629968…422e` | — | sealed 2026-11-10T10:37:52Z; to be committed before the validation |
- **If the chain stopped:** read its log; if a step was interrupted (exit 75 or a killed unit), rerun the chain unit
  with the same command (`RUN_COMMANDS.md`): sealed steps are skipped, the interrupted step resumes from its archive.
  A failure (exit 1) needs diagnosis first; never rerun a sealed step.
- **Next (by hand, after CHAIN DONE):** diagnostics → freeze-selection → commit FROZEN_SELECTION.json → validate →
  tables → REPORT.md → roadmap → full npm test (contained, PATH) → commit and push. The diagnostics/final/tables code
  was completed before the freeze and piloted; if it changes before its stage runs, record an `O*` amendment with the
  new closure digest (§14).

## Environment

- Repository root `/home/chad/projects/margin-trading`; Node v24.21.0 at
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`; host 8 cores / 16 threads, 59 GiB.
- Canonical data unchanged (verified 2026-11-09 by `npm run vg-exp -- doors`): VGT `2ee06310…412e`, GDX `77dba9b2…5049`,
  both ending 2026-10-30T23:59Z; doors = Priority 3's pinned prefixes in `.cache/vg-d1-growth-joint/doors/`.
- Code: `src/vg-d1-growth-expanded/` (`npm run vg-exp -- <command>`): context, config (space), fitness, search, budgets,
  controls, lab/workers/worker, stages, folds, qualify, parity, diagnostics, final, freeze, doors, launch, bench,
  commands, main; tests `tests/config.test.ts` (18 pass). Reuses Priority 3's engine unchanged (evaluation digest
  `147cad7c…4e88`), 5A's subject loader and archived-instrument reconstruction, 3A's observer and tail statistics.

## Pilot and bench (engineering only; cache `.cache/vg-d1-growth-expanded/pilot/`)

- Bench (D24, rung-1 mix of random configurations of every cell, 3,264 evaluations, after warm-up): 8 workers 75.8/s
  (5.1 GiB), 12 → 77.6 (7.7 GiB), 14 → 78.7 (8.9 GiB), 16 → 78.5 (10.2 GiB); 16 with book cache 256 → 78.1; 16 with
  GC every 32 → 73.8. **Chosen: 14 workers, GC 64, cache 48.** Only 3 of 192 random centres were plausible.
- Pilot p1 (old trigger key; superseded) and ref: P18 independent search (8 lanes concurrently, 52,975 fresh, 4 min,
  peak 6.9 GiB); informed search (20,566 fresh, 1.7 min); qualification running.

## Decisions written into the draft protocol

- Inclusion choice V/G/B; 8 independent cells (V 25%, G 25%, B 50%); same-instant order fixed D1-first (AD2);
  centre-first fidelity (AD7); protected both-Growth stratum (AD4); fresh confirmation decides qualification, the
  archived Priority 3 instrument is report-only (§8.5); budgets 131,072 base / 196,608 cap per independent cutoff (AD9);
  informed fixed-D1 and joint lanes at C24; C4 labels + replacement candidate + prudent-recommendation rule (§9.4).
- Pre-freeze protocol changes so far (to be listed as R amendments): R1 the extension trigger's "new behaviour" became a
  new funded-component pattern in the cell (the pilot showed the gate × eligibility × funded key fired on combinatorics
  alone); R2 the declaration that diagnostics/frozen-selection/validation/table code may be completed after the freeze
  (§14); R3 the archived instrument also runs at the pilot's P18 (code only).

## Do not rerun / guards

- Never modify `src/vg-d1-growth-joint/`, `src/vg-d1-growth-diagnostic/`, `src/vg-growth-funding-lifecycle/` or any
  completed study's records. Pilot jobs always carry `--pilot NAME` (job names `pilot-NAME-…`).
