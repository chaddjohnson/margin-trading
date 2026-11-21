# GPU acceptance and merge (GPU Phase 4)

## 1. Outcome in one table

| Item | State |
|---|---|
| Accepted engine during every benchmark (B1–B9) | the Phase 3 acceptance, `config/gpu-backend/acceptance.json` record sha256 `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` (= the brief's out-of-band value; a copy outside Git in `~/.local/share/margin-trading-gpu/acceptance-pins/`), binary `06a4a04a…dc23`; re-verified VERIFIED after the benchmarks at commit `d46604c2` |
| Corrective change | CC1 the root TypeScript error fixed (type-only; byte-identical emitted JavaScript; root `tsc` 0 errors), CC2 the new binary path, CC3 the campaign harness registered — committed `eaa65dae` on `research/gpu-phase4` |
| Final acceptance campaign on the final candidate | run once (2026-11-20 10:13–14:01Z, completed for evidence after the parity stop, A4; the test step rerun after A5): **every gate passes except the parity gate**, which found **one unattributed, non-reproducible mismatch** in 146,356 candidates (§3, §4) |
| New acceptance record | **NOT issued** (zero tolerance; the generator writes a record only if every gate passes — `results/acceptance-dry-run.txt`). The renewal needs the user's decision (§5) |
| `main` | **unchanged** (`3a52cc63`): still the accepted Phase 3 engine with its valid record `b08738be…` — **no merge** (the corrective change is not accepted, and merging it would make `main`'s acceptance stale) |
| `research/gpu-phase4` | all Phase 4 work (reports, records, tools, the corrective change, the diagnostics); its tree carries **no** acceptance record (official optimization blocked there by design until the decision) — pushed (§6) |
| Restored branch | `research/gpu-phase2` checked out again, unchanged at `3a52cc63` = `main`: it already contains the accepted Phase 3 engine |
| Integration class | **no merge required / no merge made** (neither a new-source merge nor a report-only integration); a report-only integration of the documentation into `main` is available on request |

## 2. Old versus new: what changed, digests and integrity

| Group | Phase 3 acceptance (`b08738be…`) | Final candidate (`eaa65dae` …) | Changed by |
|---|---|---|---|
| Canonical CPU closure (94 files) | `c8a9f416e25b393a…` | `c8a9f416e25b393a…` | — (unchanged) |
| CUDA sources (7) | `d88990612c5cd6d7…` | `d88990612c5cd6d7…` | — (unchanged) |
| Host path (12) | `1275967f45ee9bba…` | `f68c54872cd89deb…` | CC1 `hostPipeline.ts` (type-only), CC2 `toolchain.ts` (default binary path) |
| Evaluation digest (compiled into the binary) | `30824182b111fa12…` | `3594f002d8e5ce62…` | the host group |
| Enforcement group (21 files incl. the generator) | `2bb80f072807e3aa…` (generator `tools/gpu-phase3/accept.ts`) | `56d6154d4c75a34b…` (generator `tools/gpu-phase4/accept.ts`) | CC3 `entrypoints.ts`, `config/gpu-backend/entrypoints.json` (`gpu-phase4` registered non-official; legacy digests unchanged) |
| Binary | `research/gpu-phase3/build/gb3` `06a4a04a…dc23` (untouched) | `research/gpu-phase4/build/gb4` `b01f4362383526c78d0621d1573dc9937bb1a85711e23cfd375670d19fa7441e` | the compiled-in digest string only |
| Device code | fatbin `a8e53c14…` (2,064,184 bytes), SASS `6a558a85…` (160,991 lines) | **byte-identical** (= gb3 = Phase 2's gb2) | — |

- **CC1 is type-only:** `import { type Transferable, Worker } from 'node:worker_threads'` and the `as never` cast at
  `postMessage` removed; Node's TypeScript transform (`--experimental-transform-types`, every script here) emits
  byte-identical JavaScript for the old and new file (sha256 `db51a760…`, `results/final/cc1-transform-identity.json`);
  no `any`, no disabled check; ESLint 0, root `tsc --noEmit` **0 errors** (it was 1: TS2304 at `hostPipeline.ts:196`).
- **gb4** builds reproducibly (twice the same sha256) from the committed tree (`results/final-binary.json`).
- **Enforcement intact:** the official gate, the acceptance validator, the independent verifier, the enforcement pins,
  the merge-gate tests (19/19 on the changed tree with no record present) and the out-of-band pin are unchanged in
  behaviour; the negative (45/45) and tamper (14/14) suites ran on the final tree. No gate was weakened; Strategy Lab's CPU
  engine and `apps/` are untouched (no file of `apps/` changed on the branch).

## 3. The final acceptance campaign (once, on the final candidate)

| Gate | Requirement | Result | Evidence |
|---|---|---|---|
| A1 | reproducible final binary, kernels identical | **pass** (`b01f4362…`, built twice; fatbin and SASS = gb3 = gb2) | `results/final-binary.json` |
| A2 | offline codec check on the 7 captured batches, 1/2/3/8/12 workers | **pass** (7/7, 0 failures) | `results/final/offline-check.json` |
| A3 | parity campaign through the final host path, zero mismatches | **FAILED: 1 mismatch** in 146,356 candidates (55 runs incl. the labelled rerun `D24-fund-r2`; 143,100 random genomes; every door, window, episode, fixture and option set; 65,606 risk envelopes; 176 determinism runs with 0 differences) — candidate `O-fund:coarse:28` of run `D24-fund`, record hash only, **not reproducible** (§4) | `results/parity/final/SUMMARY.json` (`pass: false`, `everyRunPassed: false`, every other check true), `D24-fund.json`, `D24-fund-r2.json` |
| A3 | Assignment 3's 48 sealed finalists | **pass** (D24 96/96, sealed figures 48/48; FULL 96/96) | `results/parity/final-finalists.json` |
| A4 | sealed-job replays and the fixed-seed mini-optimization | **pass**: Assignment 3 C19 broad1 ×2 = sealed (582.3 / 583.2 s); Assignment 3 C19 qualification = sealed (385 members, 377 qualified, 251,405 evaluations, 163.9 s); Assignment 2 C19 base = sealed (722.6 s); mini CPU (122.9 s) = GPU (65.1 s) = GPU interrupted + resumed = 1 host worker (73.7 s) = serial path (72.6 s), 30,749 records each | `results/optimizer/compare-final-*.json` |
| A5 | compute-sanitizer | **pass** (memcheck with leak check, racecheck, initcheck, synccheck: 0 errors, 97/97 identical each) | `results/sanitizer-final/sanitizer.json` |
| A6 | negative and source-tamper suites | **pass** (45/45; 14/14 + baseline) | `results/policy/negative-final.json`, `tamper-final.json` |
| A7 | one bounded reliability run, Mode A configuration (2 processes) | **pass** (32.6 min each; 3,211,264 GPU evaluations; 4,704 CPU parity samples, 0 mismatches; repeatability 0; 0 failures; CPU-scored 0) | `results/sustained/p0`, `p1/summary.json` |
| A8 | `npm test`, root `tsc`, ESLint, Strategy Lab suites | **pass** after A5 (run 1: 23 failures from writable sealed records of Priority 3, the D3 environment cause; rerun: `npm test` 1,699 / 1,688 / 7 known / 4 skipped = the Phase 3 baseline; root `tsc` **0 errors**; ESLint 0; Strategy Lab 314/314, e2e 81/81) | `results/tests-run1/`, `results/tests/` |
| A9 | benchmarks recorded; final-binary regression ±3 % | **pass** (benchmark groups all identical; final binary 582.8 s vs accepted 583.5 s, ×0.9986, identical) | `results/bench/SUMMARY.json`, `results/optimizer/regression.json` |

## 4. The one parity mismatch — what is known

- **What:** in run `D24-fund` (D24, the `fund` option set, detail + risk; 1,561 candidates; this study's seeds), one
  candidate's detailed-record hash differed between the canonical CPU reference (12 worker processes) and the GPU (the
  whole run in one batch through the 8-worker host pipeline). Its books, its pooled replay (including the daily series)
  and its four risk-envelope inputs were identical; the run's own in-process re-evaluation found no field difference.
- **Reproduction (all identical, record `f17d66f4…`):** CPU in a fresh process; CPU after every earlier task of the run in
  one process; the 12-worker CPU pool exactly as the campaign ran it (twice); GPU in the full batch (2 + 20 repeated
  batches of all 1,561 candidates: 0 differences in any candidate); GPU alone; with and without the smoke kernel first;
  1,560 single-predecessor cache-poisoning pairs on the CPU (`results/diagnostics/`). The labelled rerun `D24-fund-r2`
  passed 1,561/1,561.
- **Hardware:** no GPU (Xid) or memory (MCE/EDAC) error in the kernel log; the GeForce RTX 5090 has no ECC (device-memory
  errors are not reported); the host memory is not ECC-reported either.
- **Attribution:** not possible from the record (the run kept booleans, not the two hashes). On the GPU side the record
  is a deterministic host reduction of the books, the pooled replay and the checksummed RC counters — all of which
  matched; on the CPU side the record comes from a separate (cached) evaluation in a worker process. A transient on either
  side remains possible; a reproducible defect was not found.
- **What it is not:** it is not caused by the corrective change (byte-identical emitted JavaScript, identical kernels);
  the final candidate is runtime-identical to the accepted Phase 3 engine, so the event is evidence about the accepted
  engine (or its CPU reference, or the machine) as much as about the final tree. Phase 2's and Phase 3's campaigns
  (≈ 290,000 candidates) had none.
- **Since then:** the parity tool attributes any mismatch automatically (amendment A4: both sides' original hashes kept,
  both sides recomputed, verdict CPU-side / GPU-side transient or reproducible defect).

## 5. The decision the user owns

The zero-tolerance gate is not loosened by this study. Options:

1. **Accept a documented departure** (standard §7.3) for this one unattributed, non-reproducible event, citing the
   evidence above; then `tools/gpu-phase4/accept.ts` issues the record on the final tree (a departure entry in the
   record and the protocol), and the corrective change is merged into `main` by the documented procedure (§6).
2. **Ask for more evidence first** — e.g. a second full parity campaign with the attribution instrumentation (≈ 1 h 50
   min), a GPU memory test and a host memory test (the latter needs a reboot: not done without authorization) — and decide
   on the combined evidence.
3. **Keep the Phase 3 acceptance and defer the TypeScript fix** to the next acceptance cycle (the status quo on `main`).

Independently of the fix, the user may want official runs to sample CPU parity during a search (e.g. 1 candidate per
1,000; a design choice), and a future CUDA change to extend the device checksum to the variable-length output sections
(trades, lots, funding, series) — today only the fixed per-candidate structs are covered (Phase 2's design, disclosed
since Phase 3).

## 6. Git revisions and pushes

| Ref | Before Phase 4 | After |
|---|---|---|
| `main` (= origin) | `3a52cc635c95f74fc6cf3c22aa30bf4507293fa3` | unchanged |
| `research/gpu-phase2` (= origin; the branch active at the start) | `3a52cc63…` | unchanged; checked out again at the end |
| `research/gpu-phase3` (= origin) | `3a52cc63…` | unchanged |
| `research/gpu-phase4` (new) | — | pushed to origin (new branch); its final SHA (the push record's commit) is in `RESEARCH_RECOVERY.md` §Push record and the final answer, verified with `git ls-remote` |

Commits on `research/gpu-phase4` (from `3a52cc63`): `44417328` brief, frozen protocol, harness · `2f40c201` chains and
campaign tooling · `d46604c2` B1–B9 results · `eaa65dae` stage C corrective changes · `6d5efa4e` the mismatch, A4 ·
`83140031` launcher option · `8ba491ef` campaign evidence, tests rerun, Mode A confirmation, dry run, reports, manifest ·
then the bundle commit and the push record (`RESEARCH_RECOVERY.md`).

If option 1 is chosen later, the merge procedure is the one Phase 3 used (`research/gpu-phase3/GPU_INTEGRATION_AND_OPERATIONS.md`):
the acceptance commit on `research/gpu-phase4`, `git merge --no-ff research/gpu-phase4` on `main` (no force, no rewrite),
`research/gpu-phase4/chains/post-merge.sh` with the new record sha256 (verifier with a reproducible rebuild, merge gate,
research preflight of every study, the live official gate on the Assignment 3 domain, Strategy Lab untouched, the CPU
closure digest unchanged), then `research/gpu-phase2` fast-forwarded to `main`.
