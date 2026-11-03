# Implementation audit

What was built, how it was checked against the frozen code, how the data doors were enforced, and what changed in
the repository. All times UTC, 2026-10-26. Hashes are SHA-256 (file hashes unless "body" — the sealed record's own
canonical body hash).

## 1. What was built and why it is a derived engine

The frozen N-book allocator (`src/portfolio-aware-d1/nbook/engine.ts`) and fixed-pool replay
(`src/portfolio-aware-d1/replay.ts`) are inside the prospective B4/B5 freeze's code closure (134 files), so they could
not be edited without invalidating `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`. The study therefore
implements its allocator as **derived code in its own namespace** whose P0 path must equal the frozen code exactly:

| File (`src/d1-ranked-preemption/`) | Role |
|---|---|
| `allocation.ts` | policies P0, P0R, P1, P1-B250, P1-B500; frozen priorities; fixed and portfolio liquidation values |
| `engine.ts` | `runPAllocator`: the frozen engine's per-bar order plus P1 (two-stage net-breakeven test, binding fill-time test, aborts, supersession, auction-print and intrabar-stop rules, preemption records with ranks) |
| `replay.ts` | `replayPreemptive`: the trace replay used by the searches (fixed mode), windowed records, the P0 overlap diagnostic |
| `evaluate.ts`, `evaluator.ts`, `pool.ts`, `worker.ts`, `space.ts` | standalone and pool metrics, scores, trace cache, worker pool, the D1 grid |
| `data.ts`, `guard.ts`, `freeze.ts`, `freezes.ts` | data doors, environment/Node/freeze guards, write-once sealed records, protocol and code freezes, amendments |
| `audit.ts`, `benchmark.ts`, `parity.ts`, `standalone.ts`, `ranking.ts`, `diagnostic.ts`, `joint.ts`, `controls.ts`, `walkforward.ts`, `final.ts` | the stages |
| `incumbents.ts`, `inputs.ts`, `researchPools.ts`, `runs.ts`, `tables.ts`, `cli.ts`, `main.ts` | B4/B5 loading, stage inputs, research-pool export/load, engine runs, tables, CLI |
| `tests/` | `engine.test.ts` (18), `scenarios.test.ts` (15), `leakage.test.ts` (2), `pipeline.test.ts` (1), `fixtures.ts` |

## 2. Parity (sealed gate, before any optimization)

`results/parity/PARITY.json` (file `0ebb80c6…`, body `adb60092…`), 18:10:07Z → 18:16:53Z, **PASS, no failures**;
log `results/logs/parity.log`.

| Check | What was compared | Runs | Differences |
|---|---|---:|---:|
| (i) | derived engine under P0 = frozen engine, every output field: B4 and B5 on `all`, fixed and portfolio (frozen dividends), 0 / 2 / 5 / 10 bps; regression anchors to the cent at 5 bps | 16 | 0 |
| (ii) | derived replay under P0 = frozen replay, random pools of 1–12 books (fold-a training data) | 40 | 0 |
| (iii) | derived engine (fixed) = derived replay, every lot, signal, daily row, drawdown and preemption record, under P0, P0R, P1, P1-B250, P1-B500 with random priority orders | 200 (40 × 5) | 0 |
| (iv) | worker pool = in-process evaluation (96 standalone, 48 pool evaluations) | 1 | 0 |
| (v) | replay's windowed daily drawdown and increment = the engine's daily marks after a boundary | 20 | 0 |
| (vi) | portfolio P1 funds the fixed pool's sequence when no margin test refuses | 20 | 0 |

Coverage under P1: 31 of 40 runs executed a switch (245 executed, 11 aborted, 315 declined; B250 230 / 14 / 348;
B500 220 / 12 / 386). Supersession never arose on real data; it is covered by synthetic tests (§5).

Anchors reproduced to the cent (5 bps): **B4** fixed net $284,244.74, minute DD $28,659.34, 76 lots; portfolio end
equity $3,608,484.05, daily DD 34.65%. **B5** fixed $486,207.77, $26,509.97, 94 lots; portfolio $5,410,976.72,
29.67%.

Runtime cross-checks during the study (each stage refuses to seal on a mismatch): every P1 sale's booked net equals
its tested fill-time net; the rankings' recheck reran every representative alone through the derived engine (59/59,
60/60, 60/60 identical to 1e-6); the controls re-ran every pick through the engine; the validation stage recomputed
V at 5 and 10 bps, the windowed daily drawdown and the lots from the engine's daily marks (equal to the replay's) and
checked that the continuous run's boundary mark equals the sealed training run (exact for all 9 configurations in
both folds).

**Disclosure (comment only):** the header comment of `parity.ts` is stale in two places: it says checks (ii)–(iii)
use "the final window" (the code, lines 137–138, uses fold-a's training data, as the protocol requires after the
preregistration review's finding 5), and it lists (iii)'s policies as "P0R, P1 and P1-B250" (the code runs all five).
The file is under the code freeze, so the comment was left unchanged.

## 3. B4/B5 baseline reproduction and the CLI

- The study CLI's `fixed B4` / `fixed B5` ledgers are **line-for-line identical** to `npm run pools -- fixed B4|B5`
  (104 and 123 ledger lines; `results/logs/cli-fixed-B4.log` vs `cli-pools-fixed-B4.log`, and B5), and both
  reconcile (ledger total net = run summary net, exact).
- B4/B5/B1 under P0 are the only configurations allowed to read `all` (through 2026-10-13); they are the unchanged
  frozen incumbents, loaded from `config/pools/` by `incumbents.ts`.
- `npm run pools -- verify` (rerun after the reports, `results/logs/pools-verify-final.log`): 66 PASS, 0 FAIL — every
  summary field at 0/2/5/10 bps, lots and daily ledgers byte-identical to the archived runs, and the anchors. Fixed
  nets: B4 $291,774.90 / $289,004.93 / $284,244.74 / $275,364.20; B5 $495,746.71 / $492,172.98 / $486,207.77 /
  $476,273.69 (0 / 2 / 5 / 10 bps; 76 and 94 lots). The study CLI's `fixed B4 --cost-bps 10` gives the same
  $275,364.20 (`results/logs/cli-fixed-B4-10bps.log`).

## 4. Data-source isolation (PROTOCOL §4.4; `data.ts`)

| Door | Who may use it | Refuses |
|---|---|---|
| `trainingUniverse(window)` | the stages of a window | fold-b until fold-a's sealed VALIDATION verifies; final until the sealed PROCEDURE_GATE verifies; any bar after the window's search end (the loader truncates; the loaded bars' hashes go into every record's `door`) |
| `validationUniverse(fold)` | the validation stage only | until the fold's `PICKS.json` is sealed and verifies |
| `inspectionUniverse` | every CLI read of a window's training data | chronology, the audited universe, an end after the window's allowed end |
| `benchmarkUniverse` | B4, B5, B1 unchanged under P0 (`all`), parity (i) | anything else |
| `historicalUniverse` | the one historical check, for a nominee ∪ B5 ∪ B4 ∪ VOOG/VGT | without a nominee — **never opened** (`results/logs/historical-check-refusal.log`) |

Demonstrated refusals: `fixed RP-final-D-R1 --end 2024-06-28` ("research-only: it may read through 2023-12-29
only") and `fixed B5 --policy P1 --ranking final/R1 --end 2026-10-13` ("final may be read through 2023-12-29 only")
— `results/logs/cli-refusal-*.log`. **No configuration of this study and none of the 15 diverse-d1 finalists was
evaluated on any bar after 2023-12-29.**

Guards on every stage, freeze and parity run (recorded in every stage record's `guard`; `PARITY.json` has no guard
field, though the parity run enforces the same guards): Node v24.21.0 only;
`RANKED_PREEMPTION_ROOT` / `RANKED_PREEMPTION_DATA` overrides only inside the OS temporary directory (tests), never
with a freeze; the protocol freeze (and, after it, the code freeze or the latest amendment) must verify.

The one read before the freeze outside these doors: the outcome-blind compute benchmark (16:53Z) timed loads and
evaluations on the final window's training span (`beforeProtocolFreeze`; refused after the freeze); it recorded
timings only (`results/benchmark/tier.json`). Disclosed in PROTOCOL §0.

No network access, download, credential read or broker access took place. Data were read only from `data/`.

## 5. Tests

Study tests (36): `engine.test.ts` 18, `scenarios.test.ts` 15, `leakage.test.ts` 2, `pipeline.test.ts` 1. They cover:

- equality with the frozen engine and replay (fixed and portfolio, several costs; P0 with a fifth book);
- engine = replay under every policy with accounting, arming and end offsets (seeded fuzz); the P0 diagnostic is
  actionable exactly when P1 executes its first preemption;
- every P1 rule: $0 / +$0.01 / −$0.01 boundaries, the $250 buffer at $250 and $249.99, interest/friction turning a
  gross gain into a net loss, weekend interest, lower or equal priority never preempting, pending reservations never
  preempted, no incumbent trade before the replacement fills (abort), three simultaneous higher-priority signals,
  own exits superseding at the sale bar, an intrabar stop not pre-empting the sale at the bar open, auction prints
  at the close and at a later session's opening trade, closing-print sales, a sale due after the last event, a
  pending preemption at the end of data, a two-minute chain, own exits in the decision minute, friction-driven
  aborts, stale signals never reconsidered, shadow divergence of the incumbent book, portfolio margin binding,
  portfolio = fixed when margin does not bind (no dividend after the sale), split-adjusted units;
- **fake-leakage mutations:** mutating every array after a switch, or any later bar, never changes an earlier
  switch; a post-cutoff mutation of the data files leaves the loaded bars' hashes, standalone metrics and pool
  metrics identical while a pre-cutoff mutation is visible; the validation door refuses before the picks are sealed;
- the pipeline on synthetic data: every stage runs once, in order, refuses a rerun and the chronology violations, and
  the CLI reads the sealed records.

Full suite at the code freeze: **607/607 passing** (`results/logs/npm-test-code-freeze.log`). Final run: §9.

## 6. Freezes, sealed records and amendments

| Record | File | Body | When |
|---|---|---|---|
| `PROTOCOL_FREEZE.json` (binds PROTOCOL.md `154ef7d7…`, context.ts `1e6cf762…`, the brief, universe, tier, data baseline list, B4/B5 configs, five D1 phenotypes, market events, partitions, package-lock, the four review documents, prospective body `407a669b…`) | `3713ec3f…` | `e7f6f5fa…` | 18:09:47Z |
| `results/code_freeze.json` (451 files, digest `71c0a9e3…`; study code 35 files `ac6ab00a…`; needs PARITY pass and the engine review) | `117bcac6…` | `ca324dfe…` | 18:20:46Z |
| `results/parity/PARITY.json` | `0ebb80c6…` | `adb60092…` | 18:16:53Z |
| `results/walkforward/PROCEDURE_GATE.json` | `c6f218d8…` | `d2bd6ebd…` | 18:57:21Z |
| `FROZEN_SELECTION.json` | `450e6f7f…` | `ee251d7a…` | 19:18:25Z |

Every stage record (Stage A, rankings, diagnostic, joint, controls, picks, validation; per window) is write-once with
its body hash; `npm run ranked-preemption -- verify` rechecks all of them, the 20 research pools, the Stage A files
and the unchanged external files (`results/logs/cli-verify.log`: all ok).

**Amendment chain:** one reporting amendment (`results/amendments.jsonl` file `2a17325d…`; the amendment's chained record hash
`40a936a4…`; 19:19:37Z): three
Markdown column labels in `tables.ts` renamed to say the incumbent comparison uses the better of B5 and B4 (the values
already were that maximum). Report-only file; touches no stage, door, gate or score.

## 7. Independent reviews

| Review | When | Verdict | Dispositions |
|---|---|---|---|
| Preregistration (`reviews/preregistration-review.md`) | before the freeze | safe to freeze after fixing 5 MATERIAL findings | all fixed before the freeze (`reviews/DISPOSITIONS.md`) |
| Engine (`reviews/engine-review.md`) | before the freeze | no material defect; safe after the parity gate | minor items fixed or documented |
| Confirmatory (`reviews/confirmatory-review.md`) | before the freeze | safe to freeze after 1 MATERIAL finding (B4 was not a gate comparator) | fixed: every comparison uses the better of B5 and B4 |
| Final audit (`reviews/final-audit.md`, verbatim) | after all outcomes and the reports | decision sound; reports accurate enough to rely on; 14 minor findings, 1 note, none MATERIAL | `reviews/FINAL_AUDIT_DISPOSITIONS.md` (report text corrected; no sealed record changed) |

The three pre-freeze reviews and their dispositions are bound by the protocol freeze and unchanged.

## 8. Repository changes and performance

**Git** (branch `research/trailing-buy-four-family-optimization`, `HEAD` `9b0ab947`, nothing committed by this
study): `package.json` modified (one added script `ranked-preemption`; the `pools` script, `imports` map and
`package-lock.json` unchanged); new untracked `src/d1-ranked-preemption/`, `research/d1-ranked-preemption/`,
`config/research-pools/d1-ranked-preemption/`. CLI outputs go to the git-ignored `evaluations/ranked-preemption/`.
The tracked index (`git ls-files -s`) hashes to `eede9f2d…`, identical to the start-of-task baseline. This describes
the state when the reports were written; the study was then committed at the user's request as `9400593d`
(2026-10-26, parent `9b0ab947`), and `verify`, `pools verify` and `pools forward status` passed again afterwards.

**Unchanged frozen artifacts** (rechecked at the end against `results/baseline/`): all 64 canonical `data/*/data.csv`;
splits, distributions, partitions; `config/pools/B4.json`, `B5.json`; the five D1 phenotypes; the prospective
protocol and freeze (verifies; observation count 0); the earlier studies' universe and controls records;
`package-lock.json`. Only `package.json` differs, as intended.

**Compute** (tier T1; Apple M1 Pro, 10 cores, 16 GB; 8 workers; outcome-blind projection 1.50 h and 3.9 GB):

| Stage | fold-a | fold-b | final |
|---|---|---|---|
| Stage A (evaluations; minutes) | 144,782; 5.5 | 146,211; 6.6 | 147,689; 7.9 |
| Stage D, both rankings in lockstep (pool evaluations; minutes) | 43,759; 3.2 | 43,903; 3.9 | 101,697; 6.0 |
| Controls (minutes) | 1.2 | 1.7 | 2.1 |
| Validation (minutes) | 1.4 | 2.0 | — |

Parity 6.8 minutes. From the parity start (18:10Z) to the sealed selection (19:18Z): 68 minutes wall-clock. Budgets
are evaluation counts, never time limits; every arm used exactly its budget.

## 9. Final checks (after the reports, 19:40–19:47Z)

| Check | Result | Log |
|---|---|---|
| `npm test` (whole repository) | **607/607 pass**, 0 fail (179 suites, 178 s) | `results/logs/npm-test-final.log` |
| `npx tsc --noEmit` | clean (exit 0) | `results/logs/tsc-final.log` |
| `npx eslint` | 0 errors; 15 warnings, all in earlier studies' files unchanged since `HEAD` (`src/four-family/`, `src/multi-etf-d1/`, `src/shared-margin-portfolio/`, `src/trailing-buy-variants/`). A first run found 15 `no-undef` errors for `console` in the new helper `scripts/joint_diversity.mjs`; fixed with a `/* global console */` line (its output is byte-identical) | `results/logs/eslint-final.log` |
| `npm run ranked-preemption -- verify` | all ok (67 checks, rerun after the audit corrections) | `results/logs/cli-verify.log`, `cli-verify-final.log` |
| `npm run pools -- verify` | 66 PASS, 0 FAIL | `results/logs/pools-verify-final.log` |
| `npm run pools -- forward status` | prospective freeze `407a669b…` verifies; observation count 0 | `results/logs/pools-forward-status-final.log` |
| baseline hashes | 64/64 data files OK; configs OK; `package.json` differs (intended); `git ls-files -s` hash `eede9f2d…` = baseline | `results/baseline/` |
