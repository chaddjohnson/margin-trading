# Implementation audit — Study 4

What was built, how it was checked, how the data doors were enforced, and what changed in the repository. All times
UTC, 2026-10-29/30. Hashes are SHA-256 (file hashes unless "body" — a sealed record's canonical body hash).

## 1. Code (`src/study4-two-tier-d1-allocator/`, new namespace; nothing outside it changed except one `package.json` script line)

| File | Role |
|---|---|
| `context.ts` | study constants, read from the frozen `EXPERIMENT_MATRIX.json` |
| `doors.ts` | the only market-data access: bounded multi-symbol reader (stops unparsed at end + 1 day 06:00Z), prefix hashes, calendar checks, authorisation by purpose, one door per process, main thread only, append-only door log |
| `books.ts` | books, the B5 control via `loadPool('B5')`, grid conversion (`paramsOf`), volatility role bands |
| `trace.ts` | drives the frozen `ShadowBook` exactly as the frozen `traceBook` (trades proven equal) and records setup spans for the gates; LRU trace cache |
| `allocator.ts` | the fast two-tier allocator (trace replay): tiers, priorities, P0/P0M/P1/P2/P2L/P3/P4, gates G0/G1/G1d/G2, mirror and orphan lots, chained schedules and resets; pass 2 books lots with the frozen ledger formulas and the frozen strict-peak `Tracker` |
| `reference.ts` | the **independent reference engine**: written by a separate agent from ENGINE_CONTRACT.md alone, without reading the fast path; drives live `ShadowBook`s minute by minute over the merged timeline (the frozen N-book engine's per-bar order) |
| `metrics.ts` | B5 preservation (one-to-one, capped), idle-capital attribution, paired contributions |
| `evaluate.ts` | the window specification (σ, bands, ρ, B5's development run), role checks, the 4A standalone profile, the shared-pool evaluation of a genome with the selection features |
| `space.ts`, `search4d.ts`, `selection.ts`, `phases.ts` | Sobol designs, mutations, the 4D genome and island NSGA-II, the selection rule and perturbations, 4A/4B/4C |
| `pool.ts`, `worker.ts` | 14 worker threads sharing the datasets (SharedArrayBuffer); results in request order |
| `develop.ts` | the development stage of one window (SPEC → 4A → 4B → 4C → six 4D searches → SELECTION), write-once and resumable |
| `parity.ts`, `referenceParity.ts` | the parity gate |
| `evaluation.ts`, `final.ts`, `verify.ts`, `main.ts` | 4E, the nominee rule, `verify`, the CLI (frozen separately before the evaluation door) |
| `tests/` | `allocator.test.ts` (19 closed-form fixtures F1–F18 + metamorphic), `doors.test.ts` (poisoned tail, refusals), `books.test.ts` (B5 books, bands, quantization), `parity.test.ts` (small parity runs), `reference.selfcheck.ts` (the reference author's self-check script) |

`package.json`: one added script line, `study4-allocator`. No other file outside the two Study 4 namespaces changed.

## 2. Parity gate (sealed before each code freeze; records keyed by the frozen closure's digest)

The records in force are those of freeze 2 (digest `203fb76ec8e7ee55…`, amendment A4); the freeze-1 set (digest
`87b46c2a726cd505…`) passed identically and is kept. Bodies (first 8 hex): freeze 2 — B5 `0f7155ea…`, synthetic frozen
`b777f1de…`, reference synthetic `407c988e…`, reference F20 `9883f13a…`; freeze 1 as in the table.

| Record | Body | What it shows |
|---|---|---|
| `results/parity/PARITY_B5-87b46c2a726cd505.json` | `25be43da…` | **373/373.** B5, B4 and B1 at 0/2/5/10 bps on 2016-01-04 → 2023-12-29 through the Study 4 door equal the sealed training anchors (`research/joint-16-etf-d1/results/controls/controls.json`) to the cent: net, minute and daily DD with peak/trough times, lots, virtual trades, refusals, interest, costs (B5 5 bps $388,489.25791641016, minute DD $26,509.97304978661). Tier ties = frozen ties = frozen `replayFixedPool` (every lot, mark, drawdown) = frozen N-book engine `runNAllocator` (net, DDs, lots) on the same bounded data; Study 4 traces = frozen `traceBook`; loaded-bar hashes = the ranked-preemption door's sealed hashes; the sealed fold increments (2020-06-30 → 2021-12-31 +$46,506.24; 2021-12-31 → 2023-12-29 +$170,997.21) and windowed drawdowns reproduced |
| `PARITY_SYNTHETIC_FROZEN-…` | `8450802e…` | P0 = frozen `replayFixedPool` on 60 random distinct-symbol pools (0/2/5/10 bps, random tiers); P2L = frozen `replayPreemptive` (P1, $0, deep above shallow) on 300 random one-deep/one-shallow pools on dense and sparse markets: 843 executed, 145 aborted, identical |
| `PARITY_REFERENCE_SYNTHETIC-…` | `fd4c80f2…` | fast = reference on 2,164 random pools (dense, sparse, 30-minute, twin and orphan-twin markets; all policies, gates, latencies, chained schedules and resets): every lot, switch record, mark and drawdown identical; branch quotas all ≥ 10 (orphan-mirror 27, aborted 10, stale-wait 17, cancelled reservations 828, …) |
| `PARITY_REFERENCE_F20-…` | `5ff8fcd7…` | fast = reference on 60 random pools of B5 + 1–3 shallow books on **real F20 development data** (through the F20 development door) |

Earlier parity records (`PARITY_B5.json`, `PARITY_SYNTHETIC_FROZEN.json`, and the set keyed by digest `e866d06e…`, all
PASS) were computed before the final formatting and fixes and are superseded (kept, not used). A4 changed only the 4D
refinement (search4d.ts), so the parity results are identical under both freezes (B5 373/373; 2,164 synthetic and 60
F20 reference pools).

### 2.1 What the reference comparison found (amendments A1–A3, all before any outcome-bearing run)

- The first comparison (3,000 pools) showed identical money in every pool and differences only in switch-record
  conventions; these were aligned (A1).
- A later comparison found one **look-ahead in the fast path**: a forced sale due at an opening trade was cancelled when
  the deep trade's gap stop fired at that same print (information the sale order could not have had). Fixed (A2) — it
  favoured preemption.
- The reference itself cancelled a pending sale on a deep gap stop at the sale's own print (the sale-side twin of review
  finding R2-1). Adjudicated by the contract text ("ends **before** the sale's event"): the reference was patched in two
  places, documented in its header as A18 — the only edit to `reference.ts` after its author's hand-back (A3). No hash of
  the handed-back version was recorded, so "the only edit" rests on the A18 header and the session record; the final
  reviewer confirmed that `reference.ts` imports only frozen modules and that the two A18 sites match A3.

### 2.2 Parity case-count minimums (final review, finding 7)

The reference-parity quotas do not include a separate "closing-print" minimum and count P4 deadline cases inside "P4
forced or recovered" (`referenceParity.ts`); the P2L check against the frozen `replayPreemptive` requires executed ≥ 20
and aborted ≥ 10 only, and its record shows no superseded or auction-aborted case. ENGINE_CONTRACT §10 lists those
minimums separately. No fold pick uses P2L (H's in-sample 4D-C pick uses P2, not P2L), so no result depends on the
uncovered P2L branches.

## 3. Data doors and embargo

- Every Study 4 market-data read went through `doors.ts`: each canonical file read from its first byte in 1 MiB chunks,
  stopped at the first line whose timestamp is ≥ end + 1 day 06:00Z **without parsing it** (only that line's first 32
  bytes, its timestamp, are decoded to compare with the bound; the rest of the chunk, up to about 1 MiB beyond the bound,
  sits unparsed in a memory buffer and is discarded), prefix-hashed over the consumed bytes only (the prefix hashes are
  identical across repeated openings of the same bound); no whole-file hash, no shared
  loader (the shared loader parses every row of a file, including post-2023 rows), no generic CLI, no `npm test` in the
  data checkout. Every opening is in `results/doors.jsonl` (purpose, window, end, symbols, prefix and loaded-bar hashes).
- Door openings: the parity door (B5 members through 2023-12-29, reproducing known sealed figures) before each code
  freeze; the F20 development door for the reference parity on random pools (21:14Z, 21:36Z) and for F20's development
  (21:15Z under freeze 1, 21:37Z under freeze 2); one development door each for F21, F22, F23 (bars through their
  development ends); **two evaluation doors** (02:46Z, the run that crashed — A5 — and 02:54Z, the rerun), both after
  the last fold selection was sealed (02:43:47Z); the H door (02:59Z) after the evaluation was sealed (02:57:14Z).
  Synthetic test doors read only files under the OS temp directory and are not logged here. The full door log (`results/doors.jsonl`; prefix and loaded-bar hashes per symbol are in the file):

<!-- TABLE doors -->
- Tests: a synthetic file whose rows after the bound are garbage loads, and mutating those rows changes neither the
  prefix hash nor the loaded bars; every refusal fires before a read (`doors.test.ts`; the record-dependent refusals
  against an empty results tree in `doors.refusals.test.ts`).
- The market-event configs `config/market-events/splits.json` and `distributions.csv` (corporate actions, not bars) are
  parsed whole by the frozen adjustment code; their 2024–2026 entries are filtered out before use.
- **Evaluation-stage hash cross-check (PROTOCOL §3), not implemented** (final review, finding 5): only the five B5
  members' loaded-bar hashes are compared with sealed hashes (`parity.ts`). Checked afterwards: all 29 symbols in
  `research/d1-ranked-preemption/results/controls/final/CONTROLS.json` (`door.barsSha256`) equal both evaluation doors'
  `loadedBarsSha256`; the other 32 symbols have no earlier sealed hash to compare with. The evaluation record carries no
  door-log hash of its own; the H SPEC record's `doorLogSha256` covers the log through both evaluation doors.

## 4. Freezes

- Protocol: `PROTOCOL_FREEZE.json` 2026-10-29T20:25:32Z, body `4d2f5e50…` (9 files, including both pre-freeze reviews and
  the dispositions).
- Development code: `results/CODE_FREEZE.json` 2026-10-29T21:14:59Z, body `51a534db…`, 92 files (the Study 4 development
  closure, the parity harness and every frozen module they import), bound to the four parity records above; F20
  SPEC/4A/4B/4C sealed under it. **`results/CODE_FREEZE-2.json`** 2026-10-29T21:36:59Z (amendment A4), body
  `5cd75c85c475df0c61243aa75ee6702c33ff05a589bce9f8e65062e1ec0c682c`, digest `203fb76e…`, 92 files: every 4D record
  and every later window sealed under it. The superseded first F20 4D-A record (217,649 of 240,000 evaluations) is in
  `results/superseded/F20/4D-A-freeze1/`.
- Evaluation code: frozen 2026-10-30T02:44:36Z after the four fold selections were sealed (first freeze, body
  `27a9cce50670eabd…`, 96 files, now `results/superseded/evaluation-freeze1/`); the first evaluation run crashed before
  sealing anything (amendment A5) and the fixed code was frozen again at 02:52:32Z: **`results/CODE_FREEZE_EVALUATION.json`**,
  amendment A5, body `a5d4e956331ba525ce5bb6095c6641d9ad99b7cb495d00deafbcd8e98f3f13fb`, 96 files (the evaluation entry
  points `main.ts`, `evaluation.ts`, `worker.ts`, the dynamically imported `final.ts` and `verify.ts`, and everything they
  import, including the frozen development closure unchanged). `results/evaluation/RECORD.json` sealed 02:57:14Z (body
  `350e949d…`); H developed after it (the H door refuses without the sealed evaluation).

## 5. Deviations and notes

- Trace cache 5,000 traces per worker instead of the SEARCH_PLAN's 20,000 (speed only; A1). Stage records keep the 200
  best configurations (`top`) and up to 300 Pareto points; every evaluation is in the git-ignored archive with its hash.
- The frozen `ShadowBook` manages a mirror lot by the virtual position's exit state (ENGINE_CONTRACT §5.11, disclosed).
- **A5 (evaluation crash, after the evaluation door opened).** The PROTOCOL §10.3 perturbations built a stand-in
  context without B5's books, which a neighbourhood-reoptimized deep book (4D-B) needs for its bounds; the first
  evaluation run crashed at 4D-B after printing the 4B, 4C, 4D-A and 4D-A0P chained figures. Fixed in `evaluation.ts`
  (`perturbContext`), smoke test extended to neighbourhood and broad deep books, dry run with the real sealed picks on a
  synthetic market (`scripts/a5_dryrun_synthetic.ts`), evaluation refrozen and rerun in full; the rerun reproduced the
  printed figures exactly. No sealed selection or criterion changed. A5 changed **three** files: `evaluation.ts` (the
  fix), `main.ts` (`freeze-evaluation` names its amendment and the superseded freeze) and `verify.ts` (one added check);
  `floorsMet` did not change. No copy of the first-frozen versions was kept; `scripts/a5_diff_proof.py` proves the diff by
  undoing exactly these edits and matching the superseded freeze's recorded hashes (AMENDMENTS.md A5 and its addendum).
- **D1 — the 4A floor was not fully spent** (found by the final review): the 4A refinement never tops up when fewer
  than 16 seeds pass its filters, so 18,432 of 1,428,480 planned 4A vectors (1.29%) were not evaluated (F21–F23 and H;
  `results/tables/4A_floor_coverage.csv`). `floorsMet` checks only the existence of each 4A record, so `verify` and V2
  did not detect it. V2 passes as coded and fails under the protocol's literal text (AMENDMENTS.md D1).
- `verify.ts`'s header says it "recomputes the verdict labels"; it does not (the labels are computed by the evaluation
  code and FINAL). The comment is in frozen code and was left; the independent recomputation is
  `reviews/final_review_recompute.py`.
- E11's Spearman uses the 100 best development configurations with ordinal ranks, not the protocol's "pooled" wording
  and without tie-averaging; no label depends on it (final review, finding 6; PHASE_4E).
- The E7b latency stress is an absolute 300 s replacement latency (+4 minutes over the 60 s base), not "+5 minutes".
- The chained account would apply a continuing shallow book's new priority rank to earlier years; no shallow book
  continues from one fold to the next in any experiment, so it never applies. The reset accounting's non-executable
  closing mark (a session without a closing print) is not labelled separately in the record.
- Additions to the evaluation code before its first freeze (no outcome had been computed): B5's 2020–2023 lots in the
  record and a per-trade preservation listing (`chained.b5Trades`) read from the frozen `preservationOf` itself by
  prefix differencing (checked against its counters in the smoke test).
- Seed stability (PROTOCOL §10.5) and B5's idle gaps (§10.7) are computed by `scripts/report.py` from the sealed records,
  not by the evaluation code. Not computed: §10.7's idle minutes after a deep lot exits while a preempted shallow
  virtual trade is still open, and development-period event diagnostics (2018 Q4).
- Throughput: the predeclared extension runs the islands one after another on converged populations, so only ~4 of 14
  workers were busy during extensions; floors were still met by the A4 refinement fill.

## 6. Compute, tests, lint, scope (2026-10-30)

- **Search effort.** 4A: 1,410,048 standalone D1 vectors over the five windows; 4B/4C: 3,915 shared-pool
  configurations; 4D: **10,016,000** shared-pool genome evaluations in 30 window × experiment searches (every one at or
  above its floor, the predeclared extension in 11 of 30); 4E: the sealed evaluation (fold replays, chained carry and
  reset accounts, 64 perturbations per fold pick and per shallow-off ablation, one-at-a-time profiles, 9 cost settings,
  7 stresses, skill rows, a 100-replicate random-champion null, 16 reference checks).
- **Wall time** (16 cores, 14 worker threads; `results/logs/run_development.log`): F20 21:15→21:30Z (freeze 1, stopped
  for A4) and 21:37→22:23Z; F21 71 min; F22 90 min; F23 99 min; evaluation 4.6 min (the A5 rerun; the crashed run 2.7
  min); H 116 min.
- **Study 4 unit tests** (synthetic data only), main checkout and data-less worktree: 29/29 pass (`allocator.test.ts`
  F1–F18 + metamorphic, `doors.test.ts`, `doors.refusals.test.ts`, `books.test.ts`, `parity.test.ts`). `tests/evaluation.smoke.ts` (a script):
  passes, 16/16 reference checks, per-trade listing equals the counters, neighbourhood and broad deep books exercised.
- **Repository suite in a data-less worktree** (`scripts/dataless_suite.sh`, worktree detached at `9d9513bf` with only
  `data/partitions.json`; logs in `results/logs/`): baseline without Study 4 — 784 tests, 733 pass, 8 fail, 28
  cancelled, 15 skipped; with Study 4 (final run 05:27–05:34Z, `dataless_suite_study4.log`) — 813 tests, 762 pass,
  8 fail, 28 cancelled, 15 skipped (an earlier run before `doors.refusals.test.ts` existed: 812 / 761, same failures,
  `dataless_suite_study4-run2.log`). The failure sets are identical (data-dependent tests of earlier studies that need `data/` files, plus their timeouts); no Study 4 test
  fails. A first Study 4 run had one extra failure in `doors.test.ts` (it assumed a checkout outside the OS temp
  directory and unsealed selections); the test was made location-independent, and after the final review the
  record-dependent refusals moved to `doors.refusals.test.ts`, which runs them against an empty results tree
  (`STUDY4_ROOT`), so they are exercised whatever the study's state (`doors.ts` unchanged).
- **Types and lint.** `tsc --noEmit -p .`: no errors. `eslint src/study4-two-tier-d1-allocator`: 0 errors, warnings only
  (`no-use-before-define` on hoisted helpers, as in earlier studies); `prettier --check`: clean.
- **`verify`** (`npm run study4-allocator -- verify`): 89 of 90 checks pass — protocol and both code freezes, the A5
  supersession, the parity records, 76 sealed records, every 4D floor in F20–F23 and H, selections sealed before the
  first evaluation door, the protected inputs (B4/B5 pools, B5 phenotypes, the prospective shadow protocol, market-event
  configs, `data/partitions.json`, frozen engines), and 35 raw archives by hash. The one failure is a verifier
  limitation, not an evidence defect: the superseded first F20 4D-A record (A4) still names its archive's original path
  `results/archive/F20/4D-A.jsonl.gz`, which now holds the rerun's archive (sha256 `6829aff6…`, matching the current
  record); the superseded archive was moved to `results/archive/superseded/F20/4D-A-freeze1.jsonl.gz` and its sha256
  `046bdee9225bbcf9…` equals the superseded record's. The check runs only where the git-ignored archives exist; on a
  fresh clone it is skipped. The verifier is part of the frozen evaluation code and was not changed after sealing.
- **Scope** (`git status`, `git diff --stat 9d9513bf`): only `package.json` (one added script line) and the two new
  namespaces `research/study4-two-tier-d1-allocator/` and `src/study4-two-tier-d1-allocator/`. The two untracked
  `._.DS_Store` files under `research/study3-vgt-momentum-stage1c/` predate the task and are not part of it. No change to
  `main`, B4/B5 configs, phenotypes, the prospective shadow protocol, earlier studies, `data/` bars, or any live, paper
  or broker configuration. `results/logs/` is committed with `git add -f` although the repository ignores `logs/`
  globally: the reports cite these logs (development runs, both evaluation runs, the parity runs, the data-less suite
  runs) as evidence. `results/archive/` (1.3 GB of raw per-evaluation archives) stays git-ignored; every sealed record
  lists its archive's sha256.
