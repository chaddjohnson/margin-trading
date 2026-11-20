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
