# RESEARCH_RECOVERY — gpu-phase5 (parity root cause, atomic dataset cache, performance audit, acceptance, integration)

## Top screen

- **Updated:** 2026-11-21T06:26:21Z (UTC, from `date -u`)
- **Status:** **COMPLETE.** Q1 root cause **RESOLVED** (a V8 Maglev defect; `PARITY_ROOT_CAUSE.md`); atomic dataset
  export implemented and proven; performance audit done, **no change retained** (×1.00 against Phase 3); **ACCEPTED**
  2026-11-21T06:00:58Z (38 of 38 checks); **merged into `main`** (merge commit `dc926536`), verified after the merge,
  pushed; `research/gpu-phase2` fast-forwarded and checked out. **RISK-ENVELOPE PILOT NOT STARTED.**
- **Authority:** `brief/BRIEF.md` sha256 `bff746987861bd2837864af4c86ad2f2d980b386e465f0b6dfd0f12a6d221476` (224 lines,
  read in full). `PROTOCOL.md` FROZEN 2026-11-20T21:12:21Z (`results/protocol-freeze.json`, protocol sha256
  `c9ddb605181cda43b804119e3ebe0931e7494423e4ea56fd7c76beae76aa2819`); amendments: A1, A2, A3, A4, A5 (head). Standard 3.0.0
  (scope diagnostic); preflight PASS.
- **Accepted:** record `config/gpu-backend/acceptance.json` sha256
  `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4` (out-of-repository copy and line in
  `~/.local/share/margin-trading-gpu/acceptance-pins/`; the Phase 3 pin kept); binary `research/gpu-phase5/build/gb5`
  sha256 `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e`; evaluation digest `3a6eacdecc4f0a24…`, CPU
  closure `c8a9f416…` (unchanged), CUDA `d8899061…` (unchanged), host `53671a6c…`, enforcement group (24 files)
  `c4832e88…`; accepted source revision `0ab04601`; acceptance commit `9192e697`.
- **Git:** merge commit on `main` `dc926536f32416ee856896aa28f417102dc61dec` (parents `3a52cc63`, `bcd14f59`);
  post-merge evidence `3e58785d`; the handoff commit (this checkpoint's) is the tip of `main`, `research/gpu-phase5`
  and `research/gpu-phase2` — its hash is in `pins.jsonl` (outside the repository) and in the session's final message.
  `research/gpu-phase3` (`3a52cc63`) and `research/gpu-phase4` (`0ac3e4e2`) untouched.
- **Running:** nothing (no `p5chain-*`, `p5-*` or `gpup5-*` unit).
- **Deliverables** (hashes of every file: `MANIFEST.json`; of the bundle's files: its `CHECKSUMS.sha256`):
  `GPU_FINAL_HANDOFF.md` (read first), `PARITY_ROOT_CAUSE.md`, `ATOMIC_CACHE_AND_CONCURRENCY.md`,
  `PERFORMANCE_AUDIT.md`, `GPU_ACCEPTANCE_REPORT.md`, `MERGE_AND_RESTORE.md`, `PILOT_HANDOFF_ONLY.md`; the bundle
  `bundle/gpu-phase5-final-handoff.zip` (copy and `.sha256` in `~/.local/share/margin-trading-gpu/handoffs/`).
- **Next (needs the user's decision; nothing is pending in this study):** the four decisions of
  `GPU_FINAL_HANDOFF.md` §7 — the pilot and its protocol; the envelope-delivery change and its acceptance cycle;
  extending `--no-maglev` to Strategy Lab's server and the legacy CPU runners; the parameter-canonicalization
  speed-up in the canonical CPU engine.
- **Never:** start/implement/preflight/run the risk-envelope pilot from this study; rerun a campaign tool into
  `results/` paths that the acceptance record binds by sha256 (`results/tests/*.json`, `results/parity/`,
  `results/optimizer/compare-*`, …: 34 evidence files) — post-acceptance checks write to `results/integration/`;
  edit a pinned file without a new acceptance cycle; force-push or rewrite history.
- **Recovery performed 2026-11-21T05:45Z** (after a context compaction, while the campaign's last steps ran): reread
  `CLAUDE.md`, `docs/claude/context-recovery.md`, this checkpoint, `PROTOCOL.md` §4.5–§8 and `AMENDMENTS.md`; checked
  `systemctl --user list-units 'gpup5-*' 'p5chain-*'` (none active) and the chain log (`chain final complete`) before
  launching anything.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/gpu-phase5`** created from
  `0ac3e4e2edb782963bc64673b10347cf979305d4` (= `research/gpu-phase4` on origin, verified with `git ls-remote`
  2026-11-20T21:1xZ; `main` = `research/gpu-phase2` = `research/gpu-phase3` = `3a52cc63…` on origin). No other worktree.
  Branch to restore at the end: **`research/gpu-phase2`** (active at the start, clean).
- Node v24.21.0 (V8 13.6.233.17); units use `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Containment: `gpup5.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) via `tools/gpu-phase5/launch-slice.sh`.
- Provenance: `results/preflight/provenance.json` (binaries, pins, toolchain, data hashes, kernel-log Xid lines).
- Git-ignored: `research/gpu-phase5/{build,cache,results/raw-large,results/logs}`.
- Read-only files before any switch: 86 (study4-two-tier-d1-allocator 76, vg-d1-growth-joint 10); unchanged by the
  switch to this branch.

## Stage table

| Stage | Status | Command (repo root) | Output | Result |
|---|---|---|---|---|
| S0 provenance, reading, protocol freeze | complete | — | `results/preflight/provenance.json`, `results/protocol-freeze.json` | frozen 21:12:21Z |
| R root cause | complete (RESOLVED by §4.7) | `tools/gpu-phase5/{fresh-loop,envelope-stress,record-stress,host-soak,diag-envelope,diag-bits}.ts` (commands in each file's header; plain processes; fresh-loop in unit `gpup5-fresh-loop-p4`) | `results/rootcause/` | see ROOT CAUSE STATUS and `PARITY_ROOT_CAUSE.md`; pooled A/B default 9/1,180 vs `--no-maglev` 0/1,170 |
| R fix | complete, committed (`2541b610`, `30f8b97e`; toolchain default binary → gb5 in the final-tree commit) | — | `src/gpu-backend/runtime.ts`, `official.ts`, `officialRunner.ts`, `compat.ts`, `acceptance.ts`, tests | GPU backend tests 30/30 under `--no-maglev` (policy + enforcement 13, dataset 9, host pipeline 7, layout 1) |
| C atomic dataset export | complete | `tools/gpu-phase5/dataset-race.ts race|kill|conflict`, `dataset-identity.ts` | `results/cache/` | race 100/100 verified (legacy today: 23 verified, 77 refused); kill 0 partial targets; conflict 20 explicit; identity 28 datasets / 40 comparisons equal |
| S sealed-file protection | complete | `tools/gpu-phase5/seal-protect.ts --apply` (re-check: `--check`) | `results/seals/{check-before,apply,check-after}.json` | 988 restored to 0444, 10 already protected, 43 git-ignored cache files already 0444, 11 absent, 0 content differences |
| P performance audit | complete (decision in A3; `PERFORMANCE_AUDIT.md`) | `chains/p-baseline.sh` (stopped after `nm-a3-r1`), `chains/p-profile.sh`, `tools/gpu-phase5/cpuprof-summary.ts` | `results/bench/{p3-a3-r1,nm-a3-r1,prof-a3-nm}`, `results/optimizer/<run>-j0`, `results/perf/cpuprof-summary.json` | accepted configuration 586.6 s; the same under `--no-maglev` 587.8 s (+0.2 %), both verified identical; main thread active 370 s of 587 s, ≈ 48 % of it (profiled prefix) in the parameter-schema canonicalization of the pinned CPU closure (not changed here); response copies ≤ 1.7 %; **no change retained** |
| A acceptance campaign and record | complete — **ACCEPTED** (38 of 38; `results/acceptance-gates.txt`) | `chains/final.sh` | `results/{final,parity/final,parity/original,optimizer,sanitizer-final,policy,isolation,sustained,rootcause/fresh-loop-final,rootcause/host-soak-final.json,tests}`, logs `results/logs/final/` | — |
| I integration | complete | `tools/gpu-phase5/merge-audit.ts`, `git merge --no-ff`, `chains/post-merge.sh`, `chains/post-merge-tests.sh`, `tools/gpu-phase5/seal-protect.ts` | `results/integration/` | merged (`dc926536`), post-merge verification pass, suites pass on the merged tree (browser suite on its allowed rerun), `research/gpu-phase2` restored and verified, 999 sealed files protected |
| E bundle | complete | `tools/gpu-phase5/manifest.ts`, `tools/gpu-phase5/bundle.sh <scratch>` | `MANIFEST.json`, `bundle/gpu-phase5-final-handoff.zip` | verified (`zip -T`, every checksum after extraction, forbidden-content scan) |

Resume semantics: benchmark groups are write-once (`group.sh` refuses an existing `results/bench/<G>/group.json`); the
campaign chain resumes with `START=<n>`; every root-cause tool refuses to overwrite its `--out`.

## ROOT CAUSE STATUS (2026-11-20T22:57Z) — the original signature is reproduced on the original candidate

- `results/rootcause/record-stress-default.json` (10 cold processes at a time, default V8, 358 processes; concurrently
  the `--no-maglev` arm and the host soak): in TWO processes `O-fund:coarse:28`, as the SECOND task of its chunk (its
  position in Phase 4's worker 8), had books hash = truth `d35779dd…`, pool hash = truth `da74e7df…`, envelope = Phase
  4's values, and a WRONG record hash; first differing leaves `$.virtual.D1:GDX.net` = 53,994.45 and `.dd` = 67,422.29
  — the numbers of `$.virtual.D1:VGT` (truth for D1:GDX: −48,558.44 and 103,786.91). The literal site is
  `virtual[b.book] = { trades, net, dd, first }` in `recordOf` (src/vg-d1-growth-joint/evaluate.ts). Other tasks in
  those processes: record-only and books (the `standalone` literal of the D1 books) differences of the same kind.
- `--no-maglev`: 0 of 357 processes (same time, same load). Pooled A/B (identical concurrent load): default 8/946
  processes with a wrong evaluation, `--no-maglev` 0/939.
- Host path: `host-soak-default-full.json` — 161 fresh pipelines, 1,288 cold worker threads, 251,321 results, 0
  mismatches (Maglev enabled).
- (history, 22:57Z — since committed and tested:) **Fix:** `src/gpu-backend/runtime.ts` (`--no-maglev` required);
  checked by the official gate (`official.ts` check `runtime`, attestation `runtime`) and `officialRunner.ts`; the
  Phase 5 reference pools inherit the parent's setting; `tests/policy.test.ts` (new test + the runner test);
  `compat.ts` (runtime.ts in the policy group); `tools/gpu-phase5/parity.ts` (original-evidence capture, `runtime`).
- (history) `record-stress` against ground truth finished 23:06Z: `record-stress-truth-{default,no-maglev}.json`
  (default: wrong evaluations present, incl. record-only; `--no-maglev`: 0).
- Amendment A1 written (loop stopped at 36 cycles; instruments; the loop's full budget moves to the fixed configuration).

## Findings so far (root cause; written before they are relied on)

- **2026-11-20T22:25Z — a CPU-reference transient is REPRODUCED and dissected (the leading root cause).**
  - Capture in the original configuration: `results/rootcause/fresh-loop-p4/` (stopped by me after 36 cycles: 432 fresh
    CPU workers, 36 fresh GPU contexts, 56,196 GPU evaluations, device response sha256 identical in every cycle).
    Cycle 16, task 3 `R:C4`, CPU worker 0 (its 4th task): CPU envelope `[101060.43759030467, 101108.57625063331, …]`
    vs GPU = CPU first cycle = same-worker re-evaluation = fresh process = `[10335.726877955836, 10383.816891783063, …]`;
    books, pool and record hashes equal (`mismatch-c16-i3.json`). Other tools of mine (dataset identity) were loading the
    CPU at that moment (21:25:18–21:25:36Z) — disclosed.
  - Exact arithmetic: 101060.43759030467 = 117489.45321713819 (the realized net after lot 7 closes, 2020-05-14) −
    16429.01562683351 (the marked net at point 35271, 2020-03-12) (`tools/gpu-phase5/diag-envelope.ts --search`): an
    EARLY path point held a LATER value.
  - Dissection (`tools/gpu-phase5/envelope-stress.ts`: cold processes, the worker's four reference tasks, the path
    kept): in `results/rootcause/envelope-stress-default.json` (2 of 160 processes) and `-default2.json` (2 of 145) the
    cold path of `portfolioPath` (src/vg-l0-risk-metrics/metrics.ts, unchanged canonical code) has exactly ONE wrong
    point: the lot-0 exit point `{ t, date, m: before, liq: before, r: before, lot: null }` holds the NUMBERS (t, m, liq,
    r) of the lot-1 exit point while keeping its own date string; the same ledger rebuilt gives the right path. Two
    object literals of one site share their number storage: a V8 engine defect (Node v24.21.0, V8 13.6.233.17), not a
    logic error. It also occurs in the warm (second) pass, and once without moving the envelope (direct check only).
  - Not triggered by a synthetic ledger called back-to-back (`v8-alias-repro.ts`: 0 of 855) nor on a synthetic door
    (`alias-hunt.ts`: 0 of 765 processes, 30,600 paths): it needs the real flow's tiering (long mark loops, busy compile
    queue, CPU contention).
  - Tier bisect so far (7 min, concurrent): default 2/145, `--no-maglev` 0/144, `--no-turbofan` 0/93 — not yet
    conclusive; the A/B that followed (12 processes each, 15 min) is
    `results/rootcause/envelope-stress-ab-{default,no-maglev}.json` (finished).
  - The independent review (agent, read-only, unanchored) reached the same map of the record path and the same ranking
    (V8 tiering transient in a cold CPU isolate first; hardware second; CUDA last); its report is summarized in
    `PARITY_ROOT_CAUSE.md` §6.
- Why this explains a RECORD-only mismatch: the record reductions create the same construct — object literals with
  number fields in a loop after a hot loop (`recordOf`: `virtual[b.book] = { trades, net, dd, first }` after the sessions
  loop; `riskInputsOf`: `rows`) — and they run in cold isolates on BOTH sides (CPU reference child; GPU host worker
  thread). NOT YET DEMONSTRATED on the record path: rule §4.7(1) needs a captured record-hash-only mismatch. Next: a
  record-focused cold stress (CPU side) and a host-path cold soak (captured response, no GPU).
- Earlier (pre-freeze, exploratory): `canonHash` hashes raw NaN bits and V8 NaN bits are tier-dependent for COMPUTED
  NaNs, but task 33's two NaNs are literals (stable); a worker-thread clone canonicalizes NaNs; the CPU record hash of
  task 33 is `f17d66f4…` under seven tier configurations. Device side: `initKernel` zeroes every `GbCandOut`.
- Kernel log: 12 Xid 43 entries since 2026-11-18, all from test binaries during negative suites; none near the mismatch.
- Stage C (atomic dataset export), committed (`4ac89606`): `src/gpu-backend/dataset.ts` (write-once, exclusive
  temporary file, fsync, verify, link(2) publish-if-absent, explicit CONFLICT / INVALID errors, stale-temporary cleanup),
  `src/gpu-backend/tests/dataset.test.ts` (9/9 pass) + `datasetChild.ts`, `compat.ts` (the two test files classified),
  `tools/gpu-phase5/dataset-identity.ts` (28 datasets, 40 comparisons with the old exporter's sidecars: all equal —
  `results/cache/dataset-identity.json`), `tools/gpu-phase5/dataset-race.ts` (`kill` done: 40 SIGKILLs, 78 directories,
  0 partial targets, 78 restarted complete — `results/cache/kill-d19.json`; `race` and `conflict` done, see the stage table).

## Disclosures

- D1 (2026-11-20T21:18–21:35Z): while the fresh-context loop ran I edited `src/gpu-backend/dataset.ts` and ran other CPU work (unit tests, dataset identity 21:25Z, kill test 21:27–21:29Z). No file that the loop's fresh workers load was edited (they load the engine closure, `canon.ts`, `batch.ts`, `hostWorker.ts`, `src/gpu-phase5/*`); the loop's main process had imported `dataset.ts` before the edit. The extra CPU load coincides with the captured event (cycle 16) and is part of the finding (contention raises the transient's rate).
- D2: `tools/gpu-phase5/envelope-stress.ts --trace` first run (21:53–22:01Z, 465 processes) is VOID: V8's trace lines followed each child's report and my parser counted every child as failed; rerun 22:03–22:13Z (528 processes, 1 transient, in a verification call).
- D3 (2026-11-20T23:10–23:21Z): `tsc`/`eslint` ran beside the timed baseline `p3-a3-r1` (586.6 s; Phase 4 measured 583–584 s for the same configuration). The comparison of the final replays with it allows ±3 %; later timed runs had a quiet machine.
- D4: benchmark group `nm-a3-r2` was interrupted on purpose when the baseline chain was stopped (A2); its directory is kept with `INTERRUPTED.txt` and is not reused.
- D5 (2026-11-20T23:40Z–00:03Z): a host-pipeline shutdown defect (a call after `close()` waited for the 10-minute operation timeout) was found by running the tests under `--no-maglev`, fixed with a 4-line guard and a regression test, before the campaign (amendment A3). The host group digest changed; every acceptance gate runs on the final tree.

## Campaign log (stage A)

- 2026-11-21T00:07:05Z — launched on commit `bc428d8b` (final tree; evaluation digest `3a6eacde…`): unit
  `p5chain-final`, `START=1 MODEA_K=2 MODEA_W=8`; background waiter `b2ca323lb` (this session) fires on `FAILED` or
  `chain final complete`.
- 00:07:38Z step 1 build-final ok (`results/final-binary.json`); 00:08:46Z step 2 offline-check ok; step 3 host-soak
  running (≤ 25 min).
- 00:18:18Z step 3 host-soak ok: final binary gb5 `f444c52139ebd8b2…` (reproducible; device code and SASS identical to
  gb3), 150 fresh pipelines, 1,200 cold worker threads under 12 CPU burners, 234,150 results, **0 mismatches**
  (`results/rootcause/host-soak-final.json`). Step 4 parity-campaign started 00:18:18Z (54 runs, `chains/parity.sh`,
  outputs `results/parity/final/`, logs `results/logs/final/parity/`).
- Written meanwhile (not committed until a quiet moment): `PERFORMANCE_AUDIT.md` (its §6 waits for the campaign's
  timings), `results/perf/{copy-bench.json,copy-bench.mjs,cpuprof-callers.json,cpuprof-callers.py}`.
- 02:10:00Z step 5 parity-summary ok: **54 runs, 144,795 candidates, 144,795 identical, 0 mismatches**, 64,050 envelopes,
  176 determinism runs, one binary, every run through the parallel host path (`results/parity/final/SUMMARY.json`).
  Steps 6–7 the ORIGINAL run D24-fund with Phase 4's seeds: **1,561 of 1,561 identical, twice**
  (`results/parity/original/`). Step 8 finalists 48 ok.
- Steps 9–25 ok: `final-a3-r1` 585.1 s, `final-a3-r2` 584.0 s (identical to the sealed record), qualification replay
  identical, `final-a2-r1` 721.9 s identical, mini CPU = GPU 8/1/0 workers = interrupted + resumed.
- Steps 26–28 ok: sanitizer, negative 49/49 (one expected `Xid 43` from the faulted test binary `gb5-dev` at
  03:00:05Z), tamper 15/15.
- 03:09:29Z step 29 isolation STOPPED on a shell error of `chains/isolation.sh` at I7 (rc 127; I-ref, I3, I4, I5, I1,
  I2, I6 had passed). Amendment A4, commit `9b5b9d98`: `chains/isolation-i7.sh` + `chains/final-resume-30.sh`.
- 03:10:44Z resumed (unit `p5chain-final-r1`): I7 race **100 of 100 loads verified, 0 refused, 0 partial reads**
  (`results/final/race-d19-atomic.json`), conflict 20 explicit conflicts in 10 rounds (`results/final/conflict.json`);
  03:11:19Z step 30 sustained started (2 processes × 32 min); then 31 fresh-loop (170 cycles, ≤ 150 min), 32–34 the
  accepted-configuration baselines (TIMED: keep the machine quiet), 35 regression, 36 tests.
- 03:43:29Z step 30 sustained ok: 2 processes × 32.1 min, 3,276,800 GPU evaluations, 4,800 CPU parity samples, 0
  mismatches, 8 repeat checks 0 mismatches, 0 failures, 0 restarts, peaks 58 °C / 222 W / 14,021 MiB VRAM
  (`results/sustained/p0`, `p1`).
- 05:01:30Z step 31 fresh-context loop ok at its full budget: 170 cycles, 2,040 fresh CPU workers, 170 fresh GPU
  contexts, 265,370 GPU evaluations, 8,160 parity comparisons, **0 mismatches**, response digest unchanged
  (`results/rootcause/fresh-loop-final/summary.json`).
- Steps 32–34 the accepted-configuration baselines (binary gb3, Maglev enabled), all identical to their references:
  `p3-a3-r2` 583.2 s, `p3-s-r1` 65.1 s, `p3-a2-r1` 727.1 s. Step 35 regression ok: final 585.1 / 584.0 s against
  accepted 586.6 / 583.2 s, ratio 0.9994 (`results/optimizer/regression.json`).
- 05:45:12Z step 36 tests, ATTEMPT 1: `npm test` 1,710 / 1,699 pass / 7 known / 0 unexpected, `tsc` 0, ESLint clean,
  Strategy Lab typecheck / lint / 314 unit tests / build ok, **e2e 80 + 1 failed, rerun 80 + 1 failed (a different
  test each time)** → `strategy-lab.json` pass false. Diagnosis and decision: amendment A5 (commit `f2d4fc42`); files
  moved to `results/tests/attempt1/`.
- 05:48:09Z–05:59:09Z step 36 ATTEMPT 2 (unit `p5chain-final-r2`, `START=36`, unchanged script and rule): `npm test`
  1,710 / 1,699 / 7 known / 0 unexpected; `tsc` 0; ESLint clean; Strategy Lab all suites ok, **e2e 81 of 81 on the
  first run**; state and live dist untouched → pass.
- `python3 research/gpu-phase5/results/perf/performance.py` → `results/perf/performance.{json,csv}`;
  `PERFORMANCE_AUDIT.md` §6 filled; `PARITY_ROOT_CAUSE.md` §11, `ATOMIC_CACHE_AND_CONCURRENCY.md` §3/§5 and
  `PILOT_HANDOFF_ONLY.md` §3/§4 extended with the campaign's results.
- 06:00:43Z–06:00:58Z the acceptance generator on commit `0ab04601`: 38 PASS, 0 FAIL → **ACCEPTED**; record sha256
  `49e95d7a…`; commit `9192e697`; out-of-repository pin added; independent verifier with rebuild and device VERIFIED.
- 06:02Z branch pushed (`bcd14f59`); merge audit; `git merge --no-ff` into `main` → `dc926536`; 06:03:55Z–06:04:26Z
  post-merge verification pass; `main` pushed (`3a52cc63..dc926536`).
- 06:05Z `research/gpu-phase2` fast-forwarded to `dc926536`, checked out, verified (VERIFIED; 13 of 13 tests; clean);
  two sealed files re-created writable by the switches, restored twice (see `MERGE_AND_RESTORE.md` §5).
- 06:09:06Z–06:24:33Z the repository and Strategy Lab suites on the merged tree (`results/integration/tests/`): pass
  (browser suite 80 + 1, then 81 of 81 on the allowed rerun — the `candles.spec.ts:439` timing race again).
- D6 (disclosure): gate A8 passed on the second attempt of step 36 (amendment A5); three of the day's five complete
  browser-suite runs had exactly one failing test (timing races in tests of the unchanged application).
