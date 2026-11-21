# Context for the original conversation — the GPU backend and the deferred risk-envelope pilot

**RISK-ENVELOPE PILOT NOT STARTED.** This GPU engineering study did not implement, configure, schedule, preflight,
launch or run anything of the pilot: no pilot study, protocol, branch, adoption manifest, attestation, selection policy,
constraint, threshold, fitness change, delivery change or optimizer command exists because of it. The pilot's protocol
and its go / no-go decision belong to the original Margin Trading conversation. This file is context only.

## 1. The GPU backend the pilot would run on

The status, the acceptance record's sha256, the merged revision and the checked-out branch are stated once, in
`GPU_FINAL_HANDOFF.md` §1–§4 (this file does not repeat figures that could drift from it).

What the backend is, independent of that status:

- the CUDA evaluator of Phase 2 (kernels byte-identical since then), the parallel host path of Phase 3 (8 worker
  threads, batch 8,192), and — from this study — an **atomic, write-once dataset export** and the requirement that
  every official process runs its JavaScript **without V8's Maglev compiler** (`node --no-maglev …`; the official gate
  and the official runner refuse otherwise);
- official optimization only through `openOfficialGpuSession` → `GpuPool` → `EvalLab`, started by an npm script through
  `src/gpu-backend/officialRunner.ts`; GPU-only, fail-closed, no CPU fallback;
- one job for the fastest turnaround, or two independent jobs at once for the most total throughput (each with its own
  job name and its own dataset cache directory).

## 2. What the pilot still needs on the GPU side (unchanged since Phase 3)

`research/gpu-phase3/GPU_PILOT_READINESS.md` remains the reference. In short:

- **Ready:** the evaluation the pilot needs (Assignment 3's genome, both D1 books with RC 2 controls, Growth 1.4.0, the
  one-slot pool with every option, the detailed record) and the risk-envelope **inputs** (trade principal loss and
  banked-capital drawdown, marked and liquidation bases), all computed on the device and parity-verified with zero
  tolerance; the capability coverage of the pilot's reachable domain; the marked minute drawdown in the compact record.
- **Not ready — the one source change the pilot needs:** the official pool and Lab neither request nor deliver the
  envelope inputs to a search (`EvalLab.evalMany` has no `risk` flag; `GpuPool.run` hands the caller only the record).
  A minimal delivery change (an optional `risk` on the Lab's items with its own archive-key suffix; the pool returning
  the envelope with the record) touches `src/gpu-backend/pool.ts` (evaluation manifest) and `lab.ts` (enforcement
  group) and therefore **makes the acceptance STALE until a fresh acceptance cycle passes** (the parity checklist §2:
  rebuild, parity campaign, sanitizer, negative and tamper suites, mini-optimization, a sealed-job replay; with this
  study's chain `research/gpu-phase5/chains/final.sh` adapted to a successor study, several hours of mostly unattended
  Apollo time).
- **Not implemented here**, deliberately: that delivery change, any pilot gate, arm, ranking or threshold.

## 3. Facts from this study that matter to a pilot's design (not instructions)

1. **Run every engine process without Maglev.** The official path enforces it. A pilot's own diagnostics, CPU
   references or Strategy Lab comparisons run on the CPU engine and are *not* covered by that enforcement: start them
   with `node --no-maglev …` too (`PARITY_ROOT_CAUSE.md` §9 item 4). Under the default engine this study reproduced
   silently wrong numbers in freshly created objects — including the D1 books' standalone figures — on a loaded machine.
2. **A record field that is a computed NaN would make the parity hash intermittent** (`PARITY_ROOT_CAUSE.md` §9 item
   1). If the pilot adds record fields (for example envelope ratios), define their not-applicable value as a literal
   (`NaN` written as such, or `null`), not as the result of arithmetic on NaN or of `Math.min` / `Math.max`.
3. **Two concurrent official jobs** need separate job names and separate dataset cache directories; a shared cache
   directory no longer fails at start-up, but a directory holding another data revision of the same door now refuses
   with an explicit conflict.
4. **A fresh acceptance is hardware-, driver-, toolkit- and Node-specific** (RTX 5090 `GPU-ae5f222c…`, driver
   595.91.07, CUDA 13.2, Node v24.21.0 / V8 13.6.233.17). A Node upgrade changes the JavaScript engine both sides of the
   parity run under and should be treated like any other evaluation-dependency change.
5. **Where a GPU job's time goes.** A complete Assignment 3 replay takes ≈ 585 s; the device is busy ≈ 59 % of it and
   waits for the host the rest. About half of the host's main-thread time is the canonicalization of each
   configuration through Strategy Lab's parameter schema, in files of the canonical CPU engine that this study must
   keep unchanged (`PERFORMANCE_AUDIT.md` §5). Making that cheaper is estimated — not measured — at 15–30 % of a job;
   it needs the user's authorization of a change to the canonical engine and a full acceptance cycle. No performance
   change was made here.

## 4. What the original conversation decides before a pilot

- whether to authorize the pilot as a new study (standard 3.0.0, scope `optimization`, `evaluationBackend`
  gpu-required) and its exact protocol;
- whether to implement the envelope-delivery change and spend the acceptance cycle it needs, or to define the pilot's
  gates on quantities the official path already delivers;
- whether to extend `--no-maglev` to the repository's other engine entry points (legacy CPU runners, Strategy Lab's
  server) — recommended by this study, outside its assignment;
- whether to authorize the parameter-canonicalization speed-up of `PERFORMANCE_AUDIT.md` §5 (a change to the canonical
  CPU engine's parameter code, then a fresh acceptance cycle) before or after a pilot — it changes run time only, and
  could share one acceptance cycle with the envelope-delivery change;
- everything about thresholds, fitness, budgets, folds and the go / no-go.
