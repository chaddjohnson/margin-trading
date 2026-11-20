# Protocol — GPU Phase 5: parity root cause, atomic dataset cache, performance audit, final acceptance and integration

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written before the first measured
experiment). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This is an **engineering study**. It investigates the one unattributed CPU/GPU parity mismatch of GPU Phase 4, hardens
the dataset export against concurrent writers, audits the accepted GPU path for implementation-only speed-ups, and — only
if every gate passes — renews the acceptance, integrates into `main` and restores the working branch. It does **not**
search for, select, rank, adopt or deploy any trading configuration; it changes no trading rule, candidate, risk gate,
objective, genome, optimizer algorithm, budget, seed or research finding; it builds no shared GPU queue, MPS setup or job
scheduler; and it **does not create, implement, configure, schedule, preflight or run the risk-envelope pilot** (brief:
"Strict boundary").

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `3.0.0`, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (read in full, §0–§9, 2026-11-20T21:0xZ) |
| Adoption manifest | `research/gpu-phase5/STANDARD_ADOPTION.json`; preflight `npm run research-preflight -- --study research/gpu-phase5` |
| Scope | `diagnostic` (root-cause experiments, identity checks of replays of sealed jobs and of seeded configurations, benchmarks; nothing is selected) |
| Brief | `research/gpu-phase5/brief/BRIEF.md`, sha256 `bff746987861bd2837864af4c86ad2f2d980b386e465f0b6dfd0f12a6d221476` (the user's assignment, 224 lines, read in full, final section "Success criteria" present) |
| Branch / base | `research/gpu-phase5` from `0ac3e4e2edb782963bc64673b10347cf979305d4` (= `research/gpu-phase4` on origin: the Phase 4 lineage, unaccepted, unmerged) |
| Accepted baseline (immutable) | `main` = `research/gpu-phase2` = `research/gpu-phase3` = `3a52cc635c95f74fc6cf3c22aa30bf4507293fa3` on origin; its `config/gpu-backend/acceptance.json` ACCEPTED (schema 2, by `research/gpu-phase3/`), record sha256 `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` (= the brief's value = the copy outside Git in `~/.local/share/margin-trading-gpu/acceptance-pins/`), binary `research/gpu-phase3/build/gb3` sha256 `06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23` |
| Phase 4 candidate (starting point) | tree `0ac3e4e2`: evaluation digest `3594f002d8e5ce6206ffb692754ade930ed2708cf76a60b5c67e92f9a3d7c1ca`, binary `research/gpu-phase4/build/gb4` sha256 `b01f4362383526c78d0621d1573dc9937bb1a85711e23cfd375670d19fa7441e` (device code byte-identical to gb3); no acceptance record in the tree |
| Evaluation backend (§9) | `{ policy: "non-official-cpu", purpose: "diagnostic" }` — no official evaluation happens. CPU evaluations are parity references and diagnostics (`GPU_POLICY_PURPOSE=diagnostic | parity-test | cpu-reference | benchmark`); GPU runs are non-official parity tests, replays and benchmarks. Nothing is official optimization evidence (§9.8). |
| Reference method | none |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3 | adaptation | No roles, no primary: nothing is selected. Outcomes are a root-cause verdict (§4.7), engineering changes with their tests (§5, §6), an acceptance verdict (§7) and an integration verdict (§8). |
| AD2 | §4, §1.8 | adaptation | No search for selection and no chronological verdict. Search-shaped runs replay sealed jobs (Assignment 3 C19 broad1 and its qualification, Assignment 2 C19 base) with their own frozen code, seeds, cells, budgets and doors, and Phase 2's parity-only mini schedule; they are compared by identity only. |
| AD3 | §1.4 | adaptation | Doors D19, D21, D23, D24, FULL, the regime windows and episodes and the seeded fixtures are opened quietly through this study's own door log (`results/doors.jsonl`) for parity references, replays and benchmarks, as in Phases 2–4. All of 2016–2026 is previously examined history. |
| AD4 | §5.1 | adaptation | The TypeScript/CPU engine is the unmodified canonical reference (no file of the CPU closure is edited); every result of the final path must reproduce the canonical or sealed records bit for bit (zero tolerance). |
| AD5 | §5.9 | adaptation | Not applicable (no fold primary or final candidate). |
| AD6 | §6.3 | adaptation | Benchmarks measure the evaluator's host path (the study's subject), never a trading parameter; the worker count and batch size stay Phase 4's decisions (8,192 / 8 workers; Mode A k = 2) and are not re-studied. |
| AD7 | §1.5 | adaptation | Stricter: no money figure of any searched configuration is reported as a finding; records of the one failing parity candidate appear only as diagnostic evidence of field identity. |
| AD8 | §6.4 | adaptation | No endurance run (brief §4): one bounded 30–35 min reliability run on the final candidate. |
| AD9 | §0.4 | adaptation | The risk-envelope pilot is out of scope (the brief's boundary takes precedence): nothing of it is created, implemented, preflighted or run; the pool's envelope delivery (`GPU_PILOT_READINESS.md` §2) stays untouched. |

## 1. Questions and outcomes

- **Q1 (root cause).** What produced the one record-hash-only mismatch of Phase 4's run `D24-fund`, candidate
  `O-fund:coarse:28`? Outcome: RESOLVED or UNRESOLVED by the frozen rule §4.7.
- **Q2 (atomic cache).** Make `exportDataset` publish atomically, safe under concurrent writers and readers, without
  changing a byte of any dataset. Outcome: implemented and proven (§5), or not.
- **Q3 (performance).** Are there implementation-only, behaviour-preserving improvements with a measured end-to-end
  benefit? Outcome: each attempted change kept or rejected by the frozen rule §6.3; "no useful headroom" is a valid result.
- **Q4 (acceptance).** Does the final combined candidate pass every gate of §7 with zero unexplained mismatches? Outcome:
  ACCEPTED (a new schema-2 record) or NOT ACCEPTED.
- **Q5 (integration).** Merge into `main` only if Q1 is RESOLVED and Q4 is ACCEPTED; otherwise the fallback (§8).
- **Valid outcomes** include the fallback: Phase 3 stays the accepted engine on `main`, everything here stays on the
  research branch, the blocker is reported. A negative result is a result.

## 2. Provenance and evidence preservation

- Phase 4's records (`research/gpu-phase4/`, tracked and git-ignored) are **read only**: nothing there is rewritten,
  regenerated or re-hashed; the failing record `results/parity/final/D24-fund.json` and its diagnostics stay as they
  are. This study writes only under `research/gpu-phase5/`, `src/gpu-phase5/`, `tools/gpu-phase5/` and the engine files
  named in §4.7, §5 and §6.
- `results/preflight/provenance.json` (before the freeze): branch tips against origin, worktrees, working-tree state,
  running jobs, binaries and their sha256, the out-of-band pin, toolchain, driver, Node and V8 versions, door data
  hashes, the kernel log's GPU/memory error lines, baseline hashes of everything that must not change.
- The original failing task is rebuilt from Phase 4's own seeds (`src/gpu-phase4/subjects.ts`, imported read-only), so
  every reproduction evaluates the original configuration; new parity evidence uses this study's own seeds
  (`src/gpu-phase5/`, a copy of Phase 4's harness with this namespace).

## 3. Environment, safety and containment

- **Never:** reboot; change the GPU driver, BIOS, display configuration, system clock, power or GPM settings; start an
  MPS daemon; stop or restart a host or LLM service; touch another session's job; run a destructive memory or device
  test. A host RAM test that needs a reboot is documented as an optional procedure only.
- **Containment:** every long job is a transient systemd user unit in **`gpup5.slice`** (aggregate MemoryHigh 44G,
  MemoryMax 48G, MemorySwapMax 0 — standard §6.2), launched by `tools/gpu-phase5/launch.sh` (a copy of Phase 4's).
- One GPU workload of this study at a time, except the declared concurrency tests (§5, §7 gate A7/A10).
- Benchmarks (§6) run only while nothing else of this study runs.

## 4. Stage R — the parity root cause

### 4.1 The event and what is preserved (facts from Phase 4's records)

Run `D24-fund` (door D24, option set `fund`, `--refs --random 1500 --strata 2 --label O-fund --detail --risk`; 1,561
tasks; 12 CPU reference worker processes, chunks of 4; the GPU side one batch through the 8-worker host pipeline; binary
gb4): 1,560 identical, 1 mismatch — task index 33, `O-fund:coarse:28`: books hash equal, pool hash equal, the four
envelope numbers equal, **record hash different**. The record kept three booleans, not the hashes. The tool's in-process
re-evaluation found no field difference. 26 GPU and 4 CPU-path reproductions, a labelled rerun and 1,560 cache pairs were
identical (`research/gpu-phase4/results/diagnostics/`).

### 4.2 The code-path map (verified by reading, recorded in `PARITY_ROOT_CAUSE.md`)

For each side: which executions, caches and objects the record hash is derived from, compared with the executions whose
books and pool were hashed; which record fields are not covered by the books and pool hashes; every transformation
between the engine's values and the hashed bytes (object spreads, worker-thread structured clone, child-process IPC,
`canonHash`'s treatment of key order, −0, NaN, `undefined`, typed arrays).

### 4.3 Hypotheses (both sides, equal suspicion) and their discriminating experiments

| ID | Hypothesis | Experiment |
|---|---|---|
| H1 | the hash is not a pure function of the JavaScript value (NaN sign/payload bits, key order, −0, absent fields) and an engine-level, timing-dependent state changed the bytes | bit-level leaf dumps of the record on both sides under V8 tier configurations; NaN bit patterns by source and tier; structured-clone and IPC round trips |
| H2 | CPU reference: cache-key identity or reuse (`d1Cache2`, Priority 3's book caches), aliasing or mutation of book objects between the three pool runs of one task | the exact worker task sequence (worker 8: tasks 32–35) fresh, with caches inspected; object-freeze runs; key-collision search over the run's 1,561 tasks |
| H3 | CPU reference: engine-level nondeterminism in a freshly started worker (JIT tiering, OSR, deoptimization, concurrent recompilation) | the **fresh-context loop** (§4.5) on the original first chunks; V8 stress and tier flags |
| H4 | GPU host path: worker-thread decode, shared response buffer, transfer and result ordering; the record reduction in a freshly started worker thread | the fresh-context loop on the original batch; re-decoding the same response bytes serially and with 1/3/8/12 workers; V8 stress and tier flags |
| H5 | GPU device: a nondeterministic kernel result in a field only the record reads (the RC counters) — uninitialised or stale device memory, a race | repeated batches with byte comparison of the raw responses; compute-sanitizer memcheck/racecheck/initcheck/synccheck on the original batch's tasks |
| H6 | a hardware transient (host RAM/CPU, GPU, transfer), not reproducible by construction | kernel logs; bounded VRAM and host-memory pattern tests without reboot; what these can and cannot rule out on non-ECC parts |

A hypothesis found by the independent review (§4.6) is added by amendment before its experiment runs.

### 4.4 Strengthened attribution (the tool `tools/gpu-phase5/parity.ts`)

A copy of Phase 4's amended parity tool, extended so that **one** occurrence identifies its first differing field:
every CPU reference worker keeps the original record object of each task it evaluated until the parent has compared
the run; the GPU side keeps the raw response bytes and the original decoded results of the primary batch. On any
mismatch the tool writes, before any re-evaluation: both sides' original hashes; both sides' **original** records with
every leaf's bit pattern; the first differing leaves; the CPU worker's index, pid and task sequence; the GPU batch
identity (nonce, shard, worker); the candidate's raw device bytes. Then, separately labelled: a re-evaluation in the
same CPU worker, in a fresh CPU process and in the parent; a serial re-decode of the same response bytes; a GPU
re-evaluation alone and in the whole batch. Original evidence is never overwritten by a retry. No comparison, tolerance
or gate changes.

### 4.5 Targeted reproduction (bounded)

1. **Exact run:** `D24-fund` as Phase 4 ran it (Phase 4's seeds, gb4, 12 CPU workers, 8 host workers), repeated.
2. **Fresh-context loop** (`tools/gpu-phase5/fresh-loop.ts`): each cycle starts 12 fresh CPU reference workers and
   gives worker *i* tasks 4*i* … 4*i*+3 (the original first chunks; task 33 is worker 8's second task), then a fresh
   GPU server and a fresh 8-worker pipeline evaluating the original 1,561-task batch; every result is compared with
   the reference hashes; a mismatch is captured as in §4.4. Budget: at least 2,000 fresh CPU workers and 150 fresh GPU
   contexts (more than every earlier campaign's fresh starts together), at most 3 h.
3. **Variations:** CPU worker counts 1 and 12 (the in-process path is the 0-worker case); host workers 0/1/3/8/12;
   batch sizes 1…4,096; shuffled and reversed order; server restarts; dataset cache cold and warm; two independent
   processes at once; the predecessor sequence of the original campaign (the preceding run `D24-native`, then
   `D24-fund`).
4. **Engine stress:** V8 tier configurations and stress flags on both sides' JavaScript.
5. **Device and host diagnostics (bounded, non-destructive):** compute-sanitizer memcheck (leak check), racecheck,
   initcheck, synccheck on a subset of the original batch; a bounded VRAM pattern test in spare memory; a bounded
   user-space host-memory pattern test (no reboot); kernel log review (Xid, MCE, EDAC). Their limits on a non-ECC
   GeForce RTX 5090 and non-ECC host RAM are stated.

### 4.6 Independent review

A second, independent reviewer (an available review agent given the code and the facts, not this study's hypotheses)
maps the record path and ranks hypotheses. Its claims count only when verified against code or a reproducible
experiment; code and logs are the authority.

### 4.7 Resolution rule (frozen before any reproduction result exists)

**RESOLVED** requires all of:

1. a mechanism demonstrated by a reproducible experiment that produces a mismatch with the original signature (record
   hash differs; books, pool and envelope equal; a re-evaluation agrees) **in the original run configuration**;
2. the first differing field identified from the **original** (pre-rerun) evidence of both sides of at least one
   captured occurrence;
3. the **smallest causal fix**, with a regression test that fails without the fix and passes with it, and the
   reproduction of (1) no longer mismatching with the fix;
4. the limits of the attribution to the historical event stated plainly (the historical run kept no hashes, so its own
   differing field can only be inferred from the mechanism).

If the cause is nondeterminism of a diagnostic or representation detail (not of an economic value), its precise source
is identified, the field's contract is stated and proven, the change is logged explicitly, and contract-level identity
of every output is preserved — never a looser hash, never an ignored field.

**UNRESOLVED** otherwise. Then: the remaining hypotheses and evidence are reported; a clean new campaign is additional
evidence only; no zero-tolerance exception is assumed; **no engine change of this study is merged** and the fallback of
§8 applies. The user decides.

## 5. Stage C — atomic dataset export (`src/gpu-backend/dataset.ts`)

Requirements (brief §2): (1) write to a unique temporary file in the target's directory, per process and call
(exclusive creation, no following of a pre-existing link); (2) write, flush and close; validate length, header, schema
version and sha256 against the expected content; publish by an atomic `rename` in the same directory — a reader sees the
previous complete file or the new complete file, never a partial one; (3) concurrent writers of identical content
converge on one valid file; an existing target or sidecar with a different sha256, door identity or dataset version for
the same name is an **explicit conflict or invalid-cache error** (or, for a provably incomplete or corrupt leftover of
the old in-place writer, a replacement that is itself verified) — never silent last-writer-wins of different data;
(4) defined behaviour for a crash before publication, stale temporary files (bounded, age- and owner-checked cleanup),
an existing corrupt target, concurrent readers, resumed jobs, with the power-loss caveat stated; fail closed
throughout; (5) per-job cache directories and unique job namespaces remain the recommended practice; no cross-job
archive writing; (6) the exported bytes and sha256 of every door equal those of the unchanged exporter, and the device's
loaded dataset is unchanged.

Tests (`src/gpu-backend/tests/dataset.test.ts` on synthetic doors in temporary directories; `tools/gpu-phase5/
dataset-race.ts` on a real door in a scratch directory): simultaneous writers and readers; the original 4 × 25
concurrent-load reproduction (Phase 4's I7: 34 of 100 refused) — now 100 of 100 verified; forced termination mid-export
(a temporary file left, the target absent or the previous valid file); restart; matching and conflicting identities;
interrupted cleanup; a pre-existing symlink at the temporary or target path; byte identity before and after. If a
cross-process lock is needed for correctness it is justified and bounded (no unbounded wait); the design goal is
lock-free publication.

## 6. Stage P — performance audit (measure first)

### 6.1 Workloads and measurement

| ID | Workload | Reference for identity |
|---|---|---|
| W-A3 | Assignment 3 C19 broad1 search replay (joint D1 + Growth, 64 lanes, D19; 1,242,714 fresh) | the canonical CPU archive `9c2d7108…` and the sealed record |
| W-A2 | Assignment 2 C19 base search replay (Growth fixed, 128 lanes, D19; 2,196,920 fresh) | the sealed record and the accepted replay's archive `4a8624fc…` |
| W-S | the mini schedule (16 lanes, D19, median batch ≈ 376; 30,749 fresh) | Phase 3's CPU arm `014239d8…` |
| W-2 | two independent complete W-A3 jobs at once (Mode A), separate namespaces — one confirmation on the final candidate only if a kept change touches scheduling or transfers | as W-A3 |

Baseline: the accepted Phase 3 engine (this branch's unmodified host path — byte-identical emitted JavaScript — with the
accepted binary gb3), then the candidate. Per job: wall, evaluations per second, the receipt ledger's encode / server /
decode / dispatch-to-release times, main-thread event-loop utilization, process CPU (main and workers), GC, peak RSS,
archive-write seconds; CPU profiles (`--cpu-prof`) of the main thread and a host worker; allocation evidence
(`--heap-prof` or GC traces); `nvidia-smi dmon` and the driver's GPM columns (labelled as the driver reports them;
limitations stated). Warm and cold states, repeats and noise are recorded; every run is reported.

### 6.2 Candidates

Only where the profile shows a material share of the wall: the Node encode/decode loops, typed-array and buffer
allocation and copies, binary marshaling, worker-thread transfers (structured clone of results), queue discipline and
waits, archive writing, dataset load. CUDA register pressure and the record reduction are **diagnostics only**. The
optimizer's proposal order, RNG consumption, tie-breaking and archive identity never change.

### 6.3 Decision rule (frozen)

One small reversible change at a time. A change is **kept** only if (a) every output is bit-identical (the offline codec
check on Phase 3's captured batches, the job's archive digest and lanes against their references); (b) its paired
end-to-end measurement on at least one of W-A3 / W-A2 improves the complete job's wall by **≥ 2 % in each of two
runs** against the baseline's two runs, and no workload is slower by more than 1 %; (c) it is small, local and
reviewable. A microbenchmark-only win is rejected. If the profile shows no candidate worth ≥ 2 % of a job's wall, the
audit stops and the accepted engine's host path is retained.

**Prohibited** (brief §3.2): fast-math; any floating-point precision or reduction-order change without exact parity; any
change of search, fitness, qualification, D1, Growth or allocator semantics; undocumented cache relaxation; skipped
records or features; weaker acceptance; a CPU fallback; anything that changes search history or reproducible outputs; a
shared GPU queue, MPS, a scheduler, kernel rewrites.

## 7. Stage A — final acceptance (once, on the final combined candidate)

Preconditions: Q1 RESOLVED (§4.7), stages C and P complete, one commit of all pinned-file changes. Binary:
`research/gpu-phase5/build/gb5` (reproducible; device code byte-identical to gb3 unless a CUDA source changed, which
this protocol does not plan). `docs/gpu/PARITY_CHECKLIST.md` §2; zero tolerance throughout.

| Gate | Requirement |
|---|---|
| A1 | reproducible final binary (built twice, same sha256); `.nv_fatbin` and SASS byte-identical to gb3 |
| A2 | offline codec check on Phase 3's 7 captured real batches (serial codec; 1/2/3/8/12 workers): request bytes and every result hash identical, refusals correct |
| A3 | parity campaign through the final host path: Phase 4's campaign shape with **this study's seeds** (54 runs, ≥ 144,795 candidates: every door, window, episode, fixture and option set; ≥ 100,000 random genomes; risk envelopes; determinism across batch sizes, input order, host workers 0/1/3/12, restarts) **plus** the targeted coverage of the original failure: Phase 4's exact `D24-fund` (its seeds) and the fresh-context loop of §4.5 on the final candidate — **zero unexplained mismatches**; any mismatch is captured with both sides' original values (§4.4); Assignment 3's 48 sealed finalists (D24, FULL) |
| A4 | sealed-job replays: W-A3 twice (also the performance comparison with Phase 3), Assignment 3 C19 broad qualification, W-A2; the fixed-seed mini-optimization CPU = GPU = GPU interrupted and resumed = 1 host worker = serial path; identical proposals, rankings, promotions, refinements, qualification verdicts and archive digests |
| A5 | compute-sanitizer memcheck (leak check), racecheck, initcheck, synccheck: 0 errors |
| A6 | the negative suite and the source-tamper suite (sandbox clone) on the final tree, including the policy/source/acceptance hash sensitivity, a verified binary rebuild and the out-of-repository pin |
| A7 | one bounded reliability run, 30–35 min, in the Mode A configuration (two processes, 8 workers each, separate cache and job namespaces): 0 errors, 0 CPU parity-sample mismatches, stable memory and throughput |
| A8 | `npm test` (the Phase 3 baseline of 1,699 tests plus new tests; the 7 known failures listed separately), root `tsc --noEmit` 0 errors, ESLint on the GPU code, Strategy Lab's suites (typecheck, lint, unit, a UI build into a scratch directory, e2e; `state/strategy-lab/` untouched) |
| A9 | end-to-end performance against the accepted Phase 3 engine recorded (no regression beyond ±3 %; kept changes' gains) |
| A10 | the atomic dataset-cache race regression and the concurrency namespace isolation (two jobs cannot corrupt each other's inputs or archives; Phase 4's isolation tests I1–I7 on the final candidate, I7 now without refusals) |
| A11 | the canonical CPU closure digest unchanged (`c8a9f416…`); the research preflight of every study; the live official gate on the final record |

`tools/gpu-phase5/accept.ts` writes the new record only if every gate passes on a committed tree; its sha256 is kept
outside the repository. A failed gate is NOT ACCEPTED; nothing is waived.

## 8. Integration and fallback

- **Merge** (only if Q1 RESOLVED and Q4 ACCEPTED): the acceptance commit on `research/gpu-phase5`, pushed; a diff
  review against the accepted Phase 3 tree (scope, data/cache behaviour, integrity boundaries, schema and versions,
  tests, no trading-rule or research-record change, no binaries or secrets); `git merge --no-ff` into `main` (no force,
  no rewrite); the post-merge verification on `main` (the independent verifier with a reproducible rebuild and the new
  out-of-band value, the merge gate, every study's preflight, the live official gate, the CPU closure, Strategy Lab);
  push `main`; `research/gpu-phase2` fast-forwarded to `main`, checked out, clean, verified again there.
- **Fallback** (otherwise): no engine change is merged; `main` keeps the accepted Phase 3 engine, re-verified with the
  out-of-band pin; this branch keeps the investigation, the engineering changes and their evidence, pushed;
  `research/gpu-phase2` is checked out again, unchanged; the handoff states what a future acceptance cycle needs.

## 9. Sealed-file protection

Inventory from each study's own manifests (`results/seals.jsonl`, pin lists): for every sealed file, compare its sha256
with the manifest; restore mode 0444 only on files whose content verifies and whose manifest declares them sealed; never
`chmod` a tree; never change content or unrelated permissions; list every file whose content does not verify without
touching it. Record how to re-verify after later branch switches (`tools/gpu-phase5/seal-protect.ts --check`).

## 10. Integrity and reporting

No sealed record of any study is written. Binaries, datasets, caches, raw key maps and unit logs are git-ignored; their
sha256 or digests are recorded. Text, Markdown tables, JSON and CSV only (standard §7.7). Bundle (brief §6):
`GPU_FINAL_HANDOFF.md`, `PARITY_ROOT_CAUSE.md`, `ATOMIC_CACHE_AND_CONCURRENCY.md`, `PERFORMANCE_AUDIT.md`,
`GPU_ACCEPTANCE_REPORT.md`, `MERGE_AND_RESTORE.md`, `PILOT_HANDOFF_ONLY.md`, machine-readable results, logs, this
protocol, amendments, run commands, manifest and `CHECKSUMS.sha256` — a verified ZIP under `research/gpu-phase5/bundle/`
and a copy in `~/.local/share/margin-trading-gpu/handoffs/`. **Risk-envelope pilot NOT STARTED.**
