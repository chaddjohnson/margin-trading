# RESEARCH_RECOVERY — gpu-phase5 (parity root cause, atomic dataset cache, performance audit, acceptance, integration)

## Top screen

- **Updated:** 2026-11-20T22:57Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — stage R (root cause): a CPU-reference V8 transient reproduced and dissected (see Findings); tier A/B running; stage C implemented (uncommitted).
- **Authority:** `brief/BRIEF.md` sha256 `bff746987861bd2837864af4c86ad2f2d980b386e465f0b6dfd0f12a6d221476` (224 lines,
  read in full). `PROTOCOL.md` FROZEN 2026-11-20T21:12:21Z (`results/protocol-freeze.json`, protocol sha256
  `c9ddb605181cda43b804119e3ebe0931e7494423e4ea56fd7c76beae76aa2819`); amendments: A1. Standard 3.0.0 (scope
  diagnostic); preflight PASS.
- **Running:** background task `bxevgzkp8` (record-stress with ground truth, ends ≈ 23:09Z; plain child processes).
- **Next command:** read `record-stress-truth-*.json`; run `node --no-maglev … --test src/gpu-backend/tests/*.test.ts`; commit the fix; `dataset-race.ts race|conflict` (GPU); then stage P baselines. Do NOT edit files that fresh workers load while a stress runs.
- **Never:** start/implement/preflight/run the risk-envelope pilot; write under `research/gpu-phase4/` or any other
  study; merge into `main` unless Q1 is RESOLVED and Q4 ACCEPTED (PROTOCOL §8); reboot or change driver/display/clock.

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
| R root cause | running | see below | `results/rootcause/` | — |
| C atomic dataset export | not started | | | |
| P performance audit | not started | | | |
| A acceptance campaign | not started | | | |
| I integration or fallback | not started | | | |
| S sealed-file protection | not started | | | |
| E bundle | not started | | | |

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
- **Fix being implemented (uncommitted, tests not yet run):** `src/gpu-backend/runtime.ts` (`--no-maglev` required);
  checked by the official gate (`official.ts` check `runtime`, attestation `runtime`) and `officialRunner.ts`; the
  Phase 5 reference pools inherit the parent's setting; `tests/policy.test.ts` (new test + the runner test);
  `compat.ts` (runtime.ts in the policy group); `tools/gpu-phase5/parity.ts` (original-evidence capture, `runtime`).
- **Running:** `bxevgzkp8` — `record-stress` against ground truth, default vs `--no-maglev`, 10 processes each, 12 min
  (`record-stress-truth-{default,no-maglev}.json`).
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
    conclusive. **Running: A/B default vs `--no-maglev`, 12 processes each, 15 min** (task `b7u1kqu0d`,
    outputs `results/rootcause/envelope-stress-ab-{default,no-maglev}.json`).
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
- Stage C (atomic dataset export) is IMPLEMENTED, uncommitted: `src/gpu-backend/dataset.ts` (write-once, exclusive
  temporary file, fsync, verify, link(2) publish-if-absent, explicit CONFLICT / INVALID errors, stale-temporary cleanup),
  `src/gpu-backend/tests/dataset.test.ts` (9/9 pass) + `datasetChild.ts`, `compat.ts` (the two test files classified),
  `tools/gpu-phase5/dataset-identity.ts` (28 datasets, 40 comparisons with the old exporter's sidecars: all equal —
  `results/cache/dataset-identity.json`), `tools/gpu-phase5/dataset-race.ts` (`kill` done: 40 SIGKILLs, 78 directories,
  0 partial targets, 78 restarted complete — `results/cache/kill-d19.json`; `race` and `conflict` need the GPU: TODO).

## Disclosures

- D1 (2026-11-20T21:18–21:35Z): while the fresh-context loop ran I edited `src/gpu-backend/dataset.ts` and ran other CPU work (unit tests, dataset identity 21:25Z, kill test 21:27–21:29Z). No file that the loop's fresh workers load was edited (they load the engine closure, `canon.ts`, `batch.ts`, `hostWorker.ts`, `src/gpu-phase5/*`); the loop's main process had imported `dataset.ts` before the edit. The extra CPU load coincides with the captured event (cycle 16) and is part of the finding (contention raises the transient's rate).
- D2: `tools/gpu-phase5/envelope-stress.ts --trace` first run (21:53–22:01Z, 465 processes) is VOID: V8's trace lines followed each child's report and my parser counted every child as failed; rerun 22:03–22:13Z (528 processes, 1 transient, in a verification call).
