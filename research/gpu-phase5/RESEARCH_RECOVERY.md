# RESEARCH_RECOVERY — gpu-phase5 (parity root cause, atomic dataset cache, performance audit, acceptance, integration)

## Top screen

- **Updated:** 2026-11-21T03:12:23Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — Q1 root cause **RESOLVED by rule §4.7** (`PARITY_ROOT_CAUSE.md`: a V8 Maglev defect; fix =
  the engine runs under `--no-maglev`, enforced by the official gate); stage C (atomic dataset export) complete; sealed
  files protected (988 restored); **stage P complete: no host-path performance change retained** (amendment A3;
  `PERFORMANCE_AUDIT.md` still to write); a host-pipeline shutdown guard added (A3); **stage A (final campaign):
  see "Running"**.
- **Authority:** `brief/BRIEF.md` sha256 `bff746987861bd2837864af4c86ad2f2d980b386e465f0b6dfd0f12a6d221476` (224 lines,
  read in full). `PROTOCOL.md` FROZEN 2026-11-20T21:12:21Z (`results/protocol-freeze.json`, protocol sha256
  `c9ddb605181cda43b804119e3ebe0931e7494423e4ea56fd7c76beae76aa2819`); amendments: A1, A2, A3, A4 (head). Standard 3.0.0
  (scope diagnostic); preflight PASS.
- **Final tree digests** (`node --no-maglev … src/gpu-backend/compat.ts`): evaluation `3a6eacdecc4f0a24…`, CPU closure
  `c8a9f416…` (unchanged), CUDA `d8899061…` (unchanged), host `53671a6c…`, policy `a2560e85…`.
- **Running:** the final campaign, RESUMED 03:10:44Z as unit `p5chain-final-r1` (`chains/final-resume-30.sh`,
  amendment A4; steps 1–29 done, see "Campaign log"; waiter `bht53w5dr`) — first launch was unit `p5chain-final`, log
  `/home/chad/projects/margin-trading/research/gpu-phase5/results/logs/chain-final.txt` (start time and commit: see
  "Campaign log" below). 36 steps, fail-fast; a step's sub-units are named `gpup5-final-*` / `gpup5-par-*`. Check with
  `systemctl --user list-units 'p5chain-*' 'gpup5-*'` and `grep -E "start|end|FAILED|complete" <log> | tail`.
  **While it runs: no CPU-heavy tool, no edit of any file under `src/`, `tools/`, `config/` or `research/gpu-phase5/chains/`.**
- **Next commands (in order):**
  1. wait for `chain final complete` in the log; on `FAILED <k> [<name>]` read `results/logs/final/<step>.txt`, fix the
     cause (a tool or chain fix is a new commit; an engine or host-path fix invalidates the earlier steps), resume with
     `tools/gpu-phase5/launch.sh p5chain-final-r<n> <abs log> -- /usr/bin/env START=<k> MODEA_K=2 MODEA_W=8 /bin/bash
     research/gpu-phase5/chains/final.sh` (a COPY of the script if it had to change: never edit the running one);
  2. `node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/accept.ts
     --dry-run`, then without `--dry-run` on a committed tree; record the new record's sha256 out-of-band
     (`~/.local/share/margin-trading-gpu/acceptance-pins/`, keeping Phase 3's pin);
  3. only if ACCEPTED (PROTOCOL §8): push the branch, `tools/gpu-phase5/merge-audit.ts`, `git merge --no-ff` into
     `main`, `chains/post-merge.sh`, push `main`, fast-forward and check out `research/gpu-phase2`, re-run
     `tools/gpu-phase5/seal-protect.ts --apply` / `--check`; otherwise the fallback (no merge);
  4. reports (`PERFORMANCE_AUDIT.md`, `GPU_ACCEPTANCE_REPORT.md`, `MERGE_AND_RESTORE.md`, `GPU_FINAL_HANDOFF.md`),
     `MANIFEST.json`, `tools/gpu-phase5/bundle.sh <scratch>`, copy the ZIP to
     `~/.local/share/margin-trading-gpu/handoffs/`, final checkpoint, commit, push.
- **Never:** start/implement/preflight/run the risk-envelope pilot; write under `research/gpu-phase4/` or any other
  study; merge into `main` unless Q1 is RESOLVED and Q4 ACCEPTED (PROTOCOL §8); reboot or change driver/display/clock;
  edit a file that a running chain's jobs load, or a chain script while it runs.

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
| P performance audit | complete (decision in A3; report to write) | `chains/p-baseline.sh` (stopped after `nm-a3-r1`), `chains/p-profile.sh`, `tools/gpu-phase5/cpuprof-summary.ts` | `results/bench/{p3-a3-r1,nm-a3-r1,prof-a3-nm}`, `results/optimizer/<run>-j0`, `results/perf/cpuprof-summary.json` | accepted configuration 586.6 s; the same under `--no-maglev` 587.8 s (+0.2 %), both verified identical; main thread active 370 s of 587 s, ≈ 48 % of it (profiled prefix) in the parameter-schema canonicalization of the pinned CPU closure (not changed here); response copies ≤ 1.7 %; **no change retained** |
| A acceptance campaign | running (see Top screen) | `chains/final.sh` | `results/{final,parity/final,parity/original,optimizer,sanitizer-final,policy,isolation,sustained,rootcause/fresh-loop-final,rootcause/host-soak-final.json,tests}`, logs `results/logs/final/` | — |
| I integration or fallback | not started | | | |
| E bundle | not started | | | |

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
    `PARITY_ROOT_CAUSE.md` (to write).
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

