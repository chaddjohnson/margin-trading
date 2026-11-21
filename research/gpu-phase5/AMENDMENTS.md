# gpu-phase5 — amendments to the frozen protocol (append-only)

`PROTOCOL.md` is frozen by `results/protocol-freeze.json` (its sha256). It is never edited; every change after the freeze is
recorded here with its ID, UTC time, the change, why, which results existed and its effect. No gate, tolerance or decision
rule is loosened after results it governs exist.

## A1 — 2026-11-20T22:56Z: the fresh-context loop stopped at its first capture; the reproduction continued with dedicated instruments (no rule, gate or tolerance changes)

- **What happened:** the fresh-context loop (§4.5 item 2; `results/rootcause/fresh-loop-p4/`) captured a CPU-reference
  transient in its cycle 16 (an envelope mismatch with equal books, pool and record hashes; the GPU value equal to every
  re-evaluation). I stopped the loop gracefully after 36 cycles (432 fresh CPU workers, 36 fresh GPU contexts) instead
  of running it to the planned minimum (2,000 workers, 150 contexts) on the unfixed configuration, because the capture
  gave an exact arithmetic lead that dedicated instruments could dissect far faster.
- **Instruments added** (all within §4.3 H3/H4 and §4.5 items 3–4; each is a tool of `tools/gpu-phase5/`, writes only
  under `results/rootcause/`, and changes no engine file): `diag-envelope.ts` (which pair of path values gives the
  captured wrong number exactly), `envelope-stress.ts` (cold processes running CPU worker 0's first chunk, the path kept
  and inspected), `v8-alias-repro.ts` and `alias-hunt.ts` (synthetic variants; neither triggers), `record-stress.ts`
  (cold processes running worker 8's chunk, three passes, compared with a `--no-maglev` ground truth), `host-soak.ts`
  (fresh host pipelines decoding one real device response of the original batch).
- **Consequence for the budget:** the loop's minimum (≥ 2,000 fresh CPU workers and ≥ 150 fresh GPU contexts, original
  first chunks and original batch) is run in full on the FIXED configuration as part of gate A3 (§7), where it must
  show zero mismatches; the unfixed configuration's evidence is the stress experiments' (their concurrency is stated
  with every figure). §4.7's rule is unchanged and is applied to that evidence.
- **Results that existed:** the loop's 36 cycles and the stress runs up to 22:52Z (`envelope-stress-*.json`,
  `record-stress-{default,no-maglev}.json`, `host-soak-default-full.json`).
- **Disclosure:** the first `record-stress` pair compared each pass with the process's own last pass; in the three
  processes with wrong evaluations the last pass was wrong too, so its per-part counts are relative. The tool now
  compares every pass with a fixed ground truth (one `--no-maglev` child, self-consistent, equal to Phase 4's own
  diagnostics for the original candidate); the rerun is `record-stress-truth-*.json`. The first pair's files are kept.

## A2 — 2026-11-20T23:25Z: the acceptance campaign's composition (additions only; no gate, tolerance or rule loosened)

Written before the final campaign starts and before any of its results exists.

- **Root-cause gates added to §7** (`tools/gpu-phase5/accept.ts` R1–R3, A0): R1 the record stress with the default
  engine (must show the defect: at least one record-only wrong evaluation against a ground truth equal to Phase 4's
  diagnostics) and without Maglev (zero in ≥ 200 processes) — existing files of 2026-11-20T23:06Z, CPU-only, independent
  of the GPU binary; R2 the fresh-context loop at its full budget on the FINAL binary in the fixed configuration (A1);
  R3 the host-path cold soak on the final binary under CPU load (≥ 100 fresh pipelines, zero mismatches); A0 every
  parity run, optimizer replay and the negative suite of the campaign must record `runtime.maglev = disabled`.
- **The engine configuration of the campaign:** every Node process runs under `--no-maglev` (the fix). The
  accepted-configuration baselines (`p3-*`: binary gb3, Maglev enabled) are the only exception and are benchmarks, not
  acceptance evidence.
- **§7 A10** is run as `chains/isolation.sh` (Phase 4's I1–I6 on the final candidate; I7 replaced by the atomic race and
  the conflicting-writers test on the final binary) plus the existing kill and byte-identity records.
- **§7 A9 and stage P baselines:** the baseline chain `chains/p-baseline.sh` is stopped after its first two groups
  (`p3-a3-r1` the accepted configuration, `nm-a3-r1` the same under `--no-maglev`): the fixed configuration's remaining
  measurements are the campaign's own `final-*` replays (the same host path; a binary that differs from gb3 only in
  its compiled-in digest string), and the accepted configuration's second Assignment 3 run, its mini run and its
  Assignment 2 run are steps of `chains/final.sh` (`p3-a3-r2`, `p3-s-r1`, `p3-a2-r1`). The CPU-profiled prefix runs
  separately (`chains/p-profile.sh`; never a timing). `tools/gpu-phase5/regression.ts` compares `final-a3-r1/r2` with
  `p3-a3-r1/r2` (±3 %).
- **Parity tool:** `tools/gpu-phase5/parity.ts` keeps the CPU reference pool alive until the comparison is done and
  captures original evidence on a mismatch (§4.4); in record-only runs of more than 4,000 tasks the workers keep the
  records only (the books and replays of tens of thousands of tasks would not fit in memory) — a books or pool mismatch
  there is attributed by the labelled re-evaluations, as in Phase 4's amended tool. A `--test-inject` option exists to
  exercise the capture; a run using it records the mismatch and can never pass.
- **Results that existed:** stages R, C and S complete; `p3-a3-r1` running. **Effect on them:** none.

## A3 — 2026-11-21T00:05:39Z: before the campaign starts — a host-path shutdown guard, the stage P decision, the original run's seeds, two corrections (no gate, tolerance or rule loosened)

Written before the final campaign starts and before any of its results exists.

- **Correction to A2's heading:** A2 was written at 2026-11-20T23:23:34Z (the file's commit `ed4881e8`); its heading
  says 23:25Z.
- **A host-path defect found by running the merge-gate tests under the mandated runtime, and its fix.** Under
  `--no-maglev` the test file `src/gpu-backend/tests/hostPipeline.test.ts` passed but its process stayed alive for ten
  minutes. Traced (instrumented copy in the session scratch directory; both engines): `HostPipeline.call` refused a call
  only when the pipeline had FAILED; a `prepare`/`complete` that reached it after `close()` — a batch whose device
  round trip returns during the shutdown that follows a failed batch whose error is not a pipeline failure (a decode
  error) — posted to a terminated worker and waited for the operation timeout (10 minutes by default) with a live
  timer. Nothing wrong was ever returned (the call rejects in the end); the process just did not exit. It is a timing
  race that exists in the accepted Phase 3 host path too; the one-millisecond shift of `--no-maglev` makes the test hit
  it every time (4 of 4 runs), the default engine did not (0 of 2). **Fix (4 lines):** `call` rejects at once with
  `host pipeline closed` when the pipeline is closing. **Regression test:** "a prepare or complete after close is
  refused at once, not after the operation timeout" — fails without the guard (`complete after close did not settle
  within 5 s`), passes with it; the whole file now ends in 8 s under both engines. No numerical path, codec, shard cut,
  ordering or verification step changes. **Digests:** the host group changes (`68dcc034…` → `53671a6c…`), so the
  evaluation digest that is compiled into the final binary is `3a6eacde…` (it was `945b7130…` with the atomic exporter
  alone); the CPU closure (`c8a9f416…`) and the CUDA sources (`d8899061…`) are unchanged. Every acceptance gate runs on
  this final tree.
- **Stage P decision (§6.3), from the measurements of 2026-11-20T23:10–23:36Z** (`results/bench/{p3-a3-r1,nm-a3-r1,
  prof-a3-nm}`, `results/perf/cpuprof-summary.json`): **no host-path performance change is retained or attempted
  end-to-end.** The profile shows no candidate inside the authorized surface (§6.2) worth ≥ 2 % of a job's wall: the
  response copies are ≤ 1.7 % by microbenchmark; the archive's 67 s are the frozen legacy store's flushed commits (its
  durability is its resume guarantee); the remaining main-thread and worker time is dominated by the parameter-schema
  canonicalization of the search and of the record/encode paths (`apps/strategy-lab/shared/params.ts`,
  `src/growth140-vgt-s8m/space.ts` — files of the pinned canonical CPU closure, which gate A11 keeps unchanged).
  That finding and its estimated size are reported in `PERFORMANCE_AUDIT.md` as a separately authorized follow-up; it
  is not implemented here. `--no-maglev` costs +0.2 % on the complete Assignment 3 job (587.8 s against 586.6 s).
- **§7 A3 "Phase 4's exact D24-fund (its seeds)"** is run as two steps of `chains/final.sh`
  (`orig-d24-fund-r1`, `-r2`: `tools/gpu-phase5/parity.ts --seeds p4 --door D24 --options fund --refs --random 1500
  --strata 2 --label O-fund --detail --risk`, Phase 4's own arguments and subject seeds, read-only from
  `src/gpu-phase4/subjects.ts`) into `results/parity/original/`; the acceptance generator requires 1,561 of 1,561
  identical in both. The campaign's other 54 runs use this study's seeds, as §7 says.
- **§5 item 2 names an atomic `rename`; the implementation publishes with `link(2)`** (create-only-if-absent in the
  same directory). `rename` replaces an existing target, which item 3 forbids for different content; `link` cannot
  replace. The guarantee asked for (a reader sees no file or a complete verified file) holds; the mechanism is stricter.
  Stage C's results existed when this is written (they were produced by the `link` implementation; none is affected).
- **Baselines:** the `p3-*` groups run the accepted binary gb3 with Maglev enabled on this branch's host path, which
  differs from Phase 3's by the dataset publication step and the guard above (neither is inside a timed loop); they are
  benchmarks, not acceptance evidence. `p3-a3-r1` (586.6 s) ran before the guard existed.
- **Pre-campaign checks (not evidence):** a small run of the parity tool with and without `--test-inject`
  (`results/raw-large/smoke/`, git-ignored): 93 of 93 identical; the injected mismatch was captured with both sides'
  original leaves and attributed as a CPU-side transient. Bounded diagnostics (`results/diagnostics/`): 24 GiB of VRAM,
  6 patterns × 3 rounds, 0 mismatched words; 24 GiB of host memory, 6 patterns × 2 rounds, 8 threads, 0 mismatched
  words; no Xid, MCE or EDAC line in the kernel log since 21:00Z.
- **`src/gpu-backend/toolchain.ts`:** the default binary is `research/gpu-phase5/build/gb5` (built by the campaign's
  first step).
- **Results that existed:** stages R, C and S; the stage P measurements named above. **Effect on them:** none.
