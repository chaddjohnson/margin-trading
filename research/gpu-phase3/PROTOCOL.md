# Protocol — GPU Phase 3: host-pipeline acceleration, final acceptance, merge and handoff

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before the
performance path is modified in place). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This is an **engineering study**. It makes the accepted CUDA evaluator's end-to-end optimizer throughput faster by
changing **where host work runs** (Priority A: worker threads for request encoding and response decoding), proves that
nothing else changed, regenerates the GPU acceptance for the final code, hardens the enforcement trust boundary, merges
the accepted GPU engine into `main` and writes the handoff. It does **not** search for, select, rank, adopt or deploy any
trading configuration, does **not** start, implement, search, optimize, validate or otherwise run the risk-envelope
pilot, and changes no trading rule, fitness, genome, budget, random stream, selection rule, sealed result or study pin.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `3.0.0`, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (read in full, §0–§9, completed before the clock reading 2026-11-19T14:05:11Z) |
| Adoption manifest | `research/gpu-phase3/STANDARD_ADOPTION.json`; preflight `npm run research-preflight -- --study research/gpu-phase3` |
| Scope | `diagnostic` (engineering benchmarks and parity runs of seeded/frozen configurations and replays of sealed jobs; nothing is selected) |
| Brief | `research/gpu-phase3/brief/BRIEF.md`, sha256 `925e97e80dd8bca0bbc470fe07ef31388efcbae8ca26f9153efb10d02933f6be` (the user's handoff, read in full) |
| Branch / base | `research/gpu-phase3` from `a183640793ddc6635a0ac9be4b1f4b5b1db7bfb9` (tip of `research/gpu-phase2`) |
| Evaluation backend (§9) | `{ policy: "non-official-cpu", purpose: "parity-test" }` — no official evaluation happens: CPU runs are parity references and benchmark baselines; GPU runs are non-official benchmarks and parity runs; nothing is official optimization evidence (§9.8). The study's output is a new acceptance record (§9.9) for the final code. |
| Reference method | none |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3 | adaptation | No roles, no primary: nothing is selected. Outcomes are engineering gates (§9) and a verdict (§10). |
| AD2 | §4, §1.8 | adaptation | No official search and no chronological verdict. The only search-shaped runs replay sealed jobs of Assignment 3 and Assignment 2 with their own frozen code and seeds, and the parity-only fixed-seed mini-optimization (Phase 2's G7 schedule): compared by identity and hash only. |
| AD3 | §1.4 | adaptation | Doors D19–D24 and FULL are opened quietly (Priority 3's loaders, this study's own door log) for frozen reference identities, sealed-job replays and seeded parity/timing configurations, as in Phase 2 (AD3). All of 2016–2026 is previously examined history. |
| AD4 | §5.1 | adaptation | The TypeScript/CPU engine is the unmodified canonical reference; the GPU result must stay bit-identical to it (zero tolerance), and the new host path bit-identical to the accepted Phase 2 host path. |
| AD5 | §5.9 | adaptation | Not applicable (no fold primary or final candidate). |
| AD6 | §6.3 | adaptation | The worker-count and batch-size measurements are host-path engineering, not a search's tuning benchmark; the CPU reference is the 12-worker CPU pool (Phase 2's). |
| AD7 | §1.5 | adaptation | Stricter: no money figure of any non-reference configuration is reported; seeded and searched configurations appear only as identity booleans, counts, hashes and timings. Timings never select, tune or rank trading parameters. |
| AD8 | §6.4 | adaptation | Endurance: the user does not authorize a new 8 h/24 h test (brief §5). One bounded 30–60 min sustained run on the final code; Phase 2's 8 h run (G8) is reused as evidence only for components that are byte-identical (the CUDA kernels and server). |

## 1. Question, objective and outcomes

- **Question:** can the accepted GPU evaluator's end-to-end optimizer throughput be raised materially by moving the
  host pipeline (encoding, decoding, record reduction) off the Node main thread, with the same strategy, optimizer,
  candidates, fitness and qualification decisions and historical results — bit for bit?
- **Core acceptance principle (brief):** *same strategy, same optimizer, same candidates, same fitness and
  qualification decisions, same historical results — only faster.*
- **Outcomes:** ACCEPTED (a new `config/gpu-backend/acceptance.json` binding the final host path, binary, canonical
  CPU sources, enforcement code and evidence to the final tree and the RTX 5090); or the improvement is rejected and the
  accepted Phase 2 design is preserved (a partial/failed upgrade, reported). A speed-up is never bought with a parity
  exception, a looser comparison or a disabled gate.

## 2. Baselines (re-measured, not assumed)

Phase 2 reported (research/gpu-phase2/GPU_PHASE2_BENCHMARKS.md): Assignment 3 C19 broad1 5,900.8 s on 12 CPU workers
(sealed) vs 1,130.6 s GPU (5.22×); GPU server ≈ 347 s, encode ≈ 160 s, decode/reduction ≈ 291 s, lane logic and
archive ≈ 332 s (residual). Stage 1 re-measures the accepted Phase 2 host path on the current code, data and hardware
(chain `chains/baseline.sh`, unmodified code of `a1836407` plus this study's replay tool), and the 12-worker CPU
baseline of the same job once (non-official, purpose benchmark).

## 3. Workloads (identical inputs between versions)

| ID | Workload | Size | Identity reference |
|---|---|---|---|
| W-A3 | Assignment 3 C19 broad1 search replay (Growth searched jointly; 64 lanes; door D19) | 1,242,714 fresh evaluations | the sealed `research/vg-l0-full-joint/results/search/C19/broad1.json` |
| W-A2 | Assignment 2 C19 base search replay (Growth fixed to New L0's phenotype; 128 lanes; door D19) | 2,196,920 fresh evaluations | the sealed `research/vg-l0-risk-families/results/search/C19/base.json` |
| W-S | small-batch control: Assignment 3's broad lane on Phase 2's G7 schedule (8 cells × 2 replicates, D19) | ≈ 30,700 | CPU arm vs GPU arm, run vs run |
| W-Q | (final campaign) Assignment 3 C19 broad qualification replay (385 members) | 251,405 | the sealed qualification record |

Each job uses its own study's frozen code, seeds, cells, budgets, caps and doors (the job body of its `stages.ts`,
carried over line for line in `tools/gpu-phase3/replay.ts`); the same command line is used for every version. Batch
size 8,192 and linger 30 ms unless a measured variant says otherwise.

## 4. Measurement

- Per run (`results/optimizer/<run>/<backend>/profile.json`): wall seconds (from the Lab's open to the job's end;
  process start, server start and dataset load excluded and reported separately when measured), fresh evaluations per
  second, main-thread event-loop utilization (`performance.eventLoopUtilization`), GC by kind, process CPU, peak RSS,
  archive-write time, the pool's per-batch phases from the receipt ledger (server, encode, decode, batch sizes), GPU
  telemetry every 30 s.
- Repetitions: W-A3 ≥ 2 runs per compared version, W-A2 ≥ 1 (Phase 2 path) and ≥ 2 (final), W-S ≥ 3. **Every run is
  reported**; none is discarded for being slow. One GPU job at a time; the desktop stays on the RTX 5090.
- Measured figures and estimates are labelled separately; GPU-server time is not GPU utilization.

## 5. Engineering plan (priority order; measured before chosen)

- **Priority A (mandatory first):** the batch codec (`src/gpu-backend/batch.ts`, extracted from `client.ts`: one
  implementation for both paths), worker threads (`hostWorker.ts`) and the parallel host path (`hostPipeline.ts`):
  contiguous shards encoded on workers and assembled on the main thread; the response in shared memory, decoded by the
  worker that encoded each shard; the receipt verified on the main thread in the serial path's order (header, nonce,
  counters → checksum → ids and execution marks → decoding errors → device); results released per batch, in dispatch
  order. Variants measured: host workers 0 (serial), 1, 2, 4, 8, 12; batch size 8,192 and 16,384.
- **Priority B (conditional):** only if A leaves measured, separable main-thread overhead: independent host-side work
  (archive record encoding, pre-encoding of queued tasks). Never the lanes' state machine, RNG, ranking or tie-breaks.
- **Priority C (deferred by default):** CUDA changes (record reduction on the device, register pressure, memory
  layout) only if post-A/B profiling shows a material benefit worth a new kernel parity and sanitizer burden.
- Stop when a further change is not justified (brief §6); a valid outcome is stopping after A.

## 6. Correctness gates during development (targeted, after each modification)

1. **Codec equivalence, offline** (`tools/gpu-phase3/offline-check.ts`, no GPU): 7 real captured batches of the Phase 2
   binary (D19, D24, FULL, a fixture; base, detail + risk, all options, periods, blackouts, trades and series): the new
   serial codec builds the captured request byte for byte (nonce excepted) and reproduces the Phase 2 serial decoder's
   canonical hashes of every result (record, books, RC counters, pooled replay, envelope); the pipeline with 1, 2, 3 and
   8 workers does the same; refusals: corrupted output, another device's receipt, a stale nonce, a worker that throws or
   exits (fail closed, every later call refused).
2. **Policy and layout tests** (`npm test` subset: `src/gpu-backend/tests/`), including new unit tests of the pipeline
   (ordering, worker crash, cancellation, timeouts).
3. **Live parity through the new path**: CPU reference vs GPU with the pipeline (books, pooled replay, records,
   envelopes) on D19/D24/FULL and fixtures, with determinism across host-worker counts (1 … 12), batch sizes (1 …
   large) and reversed/shuffled input order.
4. **Optimizer identity**: W-A3 and W-A2 replays identical to their sealed records; W-S CPU arm vs GPU arm and an
   interrupted/resumed GPU run identical (lanes, every archived record hash, every config); host workers 1 vs N.

## 7. Final acceptance campaign (once, after all changes; brief §5)

1. The full applicable Phase 2 parity checklist on the final binary through the final host path: both strategy
   families, the reachable-domain capability matrix, every option set, RC controls, detail and risk fields, short and
   long doors, regime windows, episodes and adversarial fixtures; ≥ 100,000 seeded random genomes (this study's own
   seeds) plus Growth strata, branch-heavy designs, neighbourhoods and references; determinism; zero tolerance.
2. Sealed-job replays with the same seeds and search history: W-A3 (search) and W-Q (qualification), W-A2 (Growth
   fixed); the fixed-seed mini-optimization CPU vs GPU and a substantial interrupted/resumed GPU job.
3. compute-sanitizer memcheck (leak check), racecheck, initcheck, synccheck on the final binary.
4. Negative/tamper tests: Phase 2's 35 cases plus the new host-path and enforcement cases (§8).
5. Benchmarks: W-A3, W-A2, W-S on the final path, against the Phase 2 path measured in Stage 1 and the CPU baseline;
   every run reported.
6. One bounded **30–60 min** sustained run on the final code: production batches and backpressure, telemetry, repeated
   parity samples, error counters, deterministic progress. No longer run without new user approval.
7. `npm test`, TypeScript/ESLint checks, Strategy Lab unit and e2e suites, the research preflight of every study, and
   the live official-gate preflight; pre-existing failures distinguished from regressions.
8. A new acceptance record only after 1–7 pass, bound to the final tree, binary, device and evidence.

A consequential mismatch, race, nondeterministic search result, false acceptance or unfixable memory issue blocks the
affected implementation: fix and re-test, or keep the accepted Phase 2 baseline and report a partial/failed upgrade.

## 8. Enforcement hardening (Stage 4)

Audit `src/gpu-backend/`, `src/research-standard/`, `tools/gpu-backend/`, `tools/gpu-phase2/`, `config/gpu-backend/`,
`package.json`, `CLAUDE.md` and standard §9; extend the compatibility/acceptance coverage to the official entrypoint,
pool, lab, purposes, legacy-runner gate, domain derivation, entrypoint audit and registry, acceptance validator and
generator, preflight rules, the new host-path files and the npm script gate; identify the actual root of trust (no
circular self-issued hash is presented as tamper-proof) and state the limits honestly. Tamper tests run on temporary
copies or with restoration and never modify a production result or sealed manifest.

## 9. Gates

| Gate | Requirement |
|---|---|
| H1 | offline codec and pipeline equivalence on every capture (§6.1), all refusals correct |
| H2 | live parity through the final host path: zero mismatches; determinism across worker counts, batch sizes, input order |
| H3 | W-A3, W-Q and W-A2 replays identical to their sealed records; W-S CPU = GPU = GPU resumed; worker counts 1 vs N identical |
| H4 | sanitizer: 0 errors under the four tools, results identical |
| H5 | negative/tamper tests all refused/detected, CPU-scored 0 |
| H6 | sustained 30–60 min run: 0 errors, 0 parity mismatches, stable memory and throughput |
| H7 | `npm test` = baseline + new tests (known failures listed separately); Strategy Lab suites pass, `state/strategy-lab/` untouched |
| H8 | benchmarks reported (every run); performance verdict per brief §6 |
| P5 | the enforcement coverage and tamper tests of §8 |

Tolerance: zero. Every mismatch is traced to its cause.

## 10. Verdict

- **ACCEPTED** iff H1–H7 and P5 pass on the final binary and tree; `accept` writes the record. The performance verdict
  (H8) decides only whether the new path is the default (brief §6 table); a regression or nondeterminism rejects it.
- Otherwise the accepted Phase 2 design is preserved (its record stays valid where its tree is unchanged) and the report
  states every blocker.

## 11. Resources and recoverability

Transient systemd user units in `gpup3.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); one GPU job at a time;
host workers have their own V8 heap limit (3 GiB each); checkpoint `RESEARCH_RECOVERY.md` at every milestone; rollback
point: host workers 0 (the serial Phase 2 path, kept as an option) and the git commits of each stage.

## 12. Integrity

No sealed record of any study is written; Phase 2's `research/gpu-phase2/` (records, results, bundle) is never edited;
Phase 1/2 harness code (`src/gpu-phase1/`, `src/gpu-phase2/`, `tools/gpu-phase2/`) is not edited (this study works in
`src/gpu-phase3/`, `tools/gpu-phase3/`). Compiled binaries, exported datasets, captures and job caches are git-ignored;
their sha256 are recorded.

## 13. Reporting

Text, Markdown tables and JSON only (standard §7.7). Bundle (brief §8): `GPU_ENGINE_FINAL_HANDOFF.md`,
`GPU_PERFORMANCE_BEFORE_AFTER.md`, `GPU_FINAL_PARITY_AND_ACCEPTANCE.md`, `GPU_ENFORCEMENT_INTEGRITY.md`,
`GPU_INTEGRATION_AND_OPERATIONS.md`, `GPU_PILOT_READINESS.md`, `MANIFEST.json`, `CHECKSUMS.sha256`, as a verified ZIP
under `research/gpu-phase3/bundle/`. "Risk-envelope pilot NOT STARTED."
