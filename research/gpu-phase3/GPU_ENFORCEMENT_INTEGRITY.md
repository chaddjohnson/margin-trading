# GPU enforcement — trust-boundary audit and integrity (GPU Phase 3)

What enforces "official optimization is GPU-only and parity-gated" (standard 3.0.0 §9), what an acceptance record now
binds, which changes are detected, by which independent mechanism, where the root of trust actually lies, and what is
still not covered. Status of the tests: see §6 (filled from `results/policy/negative-final.json` and
`results/policy/tamper-final.json`).

## 1. The gap Phase 2 left

Phase 2's compatibility manifest (`src/gpu-backend/compat.ts`, version 1) covered the canonical CPU closure (94 files),
the CUDA sources and eight host-path files. It did **not** cover the enforcement and acceptance machinery: the official
gate (`official.ts`), the acceptance validator (`acceptance.ts`), the purposes and the legacy-runner gate, the
reachable-domain derivation, the entrypoint audit and its registry, the evaluation Lab (archive binding), the research
preflight's §9 rules, the live preflight tool, the build script, the acceptance generator and the merge-gate tests.
Any of them could be edited — e.g. the CPU-official refusal removed — without making the acceptance stale.

## 2. Inventory (audited files)

| Component | Files | Role | Phase 2 coverage | Phase 3 coverage |
|---|---|---|---|---|
| Canonical CPU engine (reference) | the 94-file import closure of `evaluate`, the risk-envelope reference, the door loader, the session clock | what the GPU must equal | evaluation digest (in the binary) | unchanged |
| CUDA evaluator | `src/gpu-backend/cuda/*` | the accelerator | evaluation digest | unchanged |
| Host path (requests/results) | `batch.ts` (new), `client.ts`, `encode.ts`, `dataset.ts`, `layout.ts`, `canon.ts`, `compat.ts`, `toolchain.ts`, `pool.ts`, `hostPipeline.ts`, `hostWorker.ts`, `hostDoor.ts` (new) | builds every request, turns every response into results, the pool | 8 files | **12 files**, evaluation digest (in the binary) |
| Official gate and provenance | `official.ts`, `lab.ts`, `doors.ts` (new), `officialRunner.ts` (new) | the single entry, archive binding, door access, the official npm-script wrapper | none | **policy group** (pinned) |
| Purposes and CPU refusal | `purpose.ts`, `legacyRunner.ts` | non-official CPU only | none | policy group |
| Domain and audit | `domain.ts`, `entrypoints.ts`, `config/gpu-backend/entrypoints.json` | reachable capabilities; no unregistered search machinery | none | policy group |
| Acceptance | `acceptance.ts` (validator), the generator of the record (`tools/gpu-phase3/accept.ts`), `tools/gpu-backend/verify-acceptance.sh` (new, independent) | what "accepted" means | none | policy group (+ the generator, named in the record) |
| Preflight | `src/research-standard/{gpuPolicy,preflight,main}.ts` | §9.11 rules for studies | none | policy group |
| Tools | `tools/gpu-backend/official-preflight.ts`, `build.sh` | live gate CLI, reproducible build | none | policy group |
| Merge gate | `src/gpu-backend/tests/{policy,enforcement,hostPipeline,layout}.test.ts` | `npm test`'s GPU checks | none | policy group |
| Not pinned (by design) | `package.json` (its research scripts are checked by the pinned policy test: every one goes through the legacy or the official runner gate), `CLAUDE.md` (an instruction, not a mechanism), the standard (its own sha256 registry, checked by every preflight), study harnesses (`src/gpu-phase*/`, `tools/gpu-phase*/` except the generator: non-official parity/benchmark code) | | | |

The classification is itself enforced: `enforcement.test.ts` fails when any `.ts` file of `src/gpu-backend/` or any file
of `tools/gpu-backend/` (three development tools excepted) is in neither group — a new worker, loader or gate file
cannot live outside the acceptance.

## 3. What a schema-2 acceptance record binds

`config/gpu-backend/acceptance.json` (written only by the acceptance generator after every gate passed):

- `compat` — the evaluation manifest (CPU closure, CUDA, host path): every file's sha256 and the combined digest that is
  compiled into the binary (`GB_COMPAT_DIGEST`; the gate compares the server's INFO with the tree);
- `policy` — the enforcement group, every file's sha256 and its digest, plus the generator that wrote the record;
- `source` — the Git commit (and tree) whose files were verified;
- `binary` (sha256, reproducible from the pinned sources by `tools/gpu-backend/build.sh`), `device` (UUID), the
  capability mask and the reachable domain, every evidence file's sha256, and the record it supersedes.

A schema-1 record (Phase 2's) is refused as INVALID: it pins no enforcement code.

## 4. The mechanisms (and why they are not all the same mechanism)

| # | Mechanism | Where | Independent of |
|---|---|---|---|
| M1 | the validator: every pinned file (evaluation and policy) unchanged, the record pins every policy file this tree requires, the source revision is an ancestor of HEAD, evidence intact, binary and device | `acceptance.ts` `checkAcceptance` | — |
| M2 | the official gate re-hashes every pinned file itself (not through M1) and requires them committed and unmodified (an official run starts from a commit; the attestation names HEAD) | `official.ts` steps `pins`, `source` | M1's code |
| M3 | the binary carries the evaluation digest; the gate refuses a server whose INFO digest differs from the tree | `gb_server.cu` + `official.ts` `compat` | M1, M2 (a different language and process) |
| M4 | the official npm-script wrapper refuses before importing the runner unless the purpose is official, the study's preflight passes (which runs M1) and the module imports the gate | `officialRunner.ts` | `official.ts` |
| M5 | the independent verifier: Python and git, no shared code: pins, both digests (recomputed), evidence, ancestry, committed and unchanged since the source revision, binary (optionally a reproducible rebuild), device, and the record's sha256 against an out-of-band value | `tools/gpu-backend/verify-acceptance.sh` | M1–M4 |
| M6 | the merge gate in `npm test`: M1 on the recorded acceptance, M5 on it and on tampered copies, the file-classification rule, the legacy and official runner gates, the npm-script rule, the entrypoint audit | `src/gpu-backend/tests/*.test.ts` | — |
| M7 | the out-of-band pin: the record's sha256 and the commit SHA written into the handoff (outside the repository) | the handoff bundle | everything in the repository |

A single modified file is caught by a mechanism that does not live in that file (e.g. a validator that always says
ACCEPTED is refused by M2's own re-hash and by M5; a weakened M5 is a pinned file caught by M1–M3).

## 5. Root of trust (stated honestly)

- **No cryptographic signature exists.** Every pin is a sha256 written into a file of the same repository. Whoever can
  commit can change a file *and* its pin together and regenerate the record (tamper case T14): M1–M6 then pass.
- **What anchors trust:** (1) the reviewed Git history on GitHub (`origin`), where the acceptance commit, its evidence
  and every pinned source are visible and attributable; (2) the record's sha256 and the commit SHA kept **outside** the
  repository — in this study's handoff — which M5 checks (`--expect-record-sha256`), and which detects T14; (3) the
  reproducible build: anyone can rebuild the binary from the pinned commit and compare its sha256 (M5 `--rebuild`);
  (4) the evidence itself can be re-run (the commands are in `RUN_COMMANDS.md`).
- `main` is **not** branch-protected and the repository has **no CI** (GitHub API: "Branch not protected", no rulesets,
  no workflows); review is by the user. A protected `main` with required review would strengthen (1); it is a user
  decision and was not changed.
- The mechanisms are fail-closed against **accidental drift and single-file changes** (an edited enforcement file, a
  stale binary, an unregistered loader, an uncommitted change, a record from another history). They are not a defence
  against a deliberate, coordinated rewrite by someone with commit rights — only review and the out-of-band pin are.

## 6. Tests (final binary `06a4a04a…`; the final campaign, 2026-11-19 20:18–20:20Z)

### 6.1 Source-tamper suite (`tools/gpu-phase3/tamper.ts` → `results/policy/tamper-final.json`): 14/14 detected, baseline ok

A throwaway clone of the committed HEAD (`git clone --shared`, with the checkout's git-ignored generated sources) under
this study's cache; a provisional acceptance record for the clone's own tree (a fixture, never committed) and a fixture
official study (`research/zz-tamper`, only to exercise the runner wrapper; it searches nothing). Baseline before any
modification: validator ACCEPTED, gate opened (all 14 checks), runner ran,
verifier VERIFIED, merge-gate tests pass. Then each case: one modification, every
mechanism probed in fresh processes, the file restored from Git and the clone checked clean.

| ID | Modification (in a sandbox clone; restored after) | Validator (M1) | Gate (M2/M3) | Official runner (M4) | Verifier (M5) | Merge gate (M6) | Out-of-band pin (M7) |
|---|---|---|---|---|---|---|---|
| T1 | a modified host-worker decoder (results returned in another order) | STALE | refused | refused | refused | fails | refused |
| T2 | a modified batch encoder (the request assembly) | STALE | refused | refused | refused | fails | refused |
| T3 | the CPU-official refusal removed (a CPU runner accepts official optimization) | STALE | refused | refused | refused | fails | refused |
| T4 | acceptance verification disabled (the validator always says ACCEPTED) | ACCEPTED | refused | ran | refused | fails | refused |
| T5 | the manifest generator altered (a host-path file dropped from the evaluation digest) | STALE | refused | refused | refused | fails | refused |
| T6 | the official entrypoint altered (the parity mini-set check removed) | STALE | refused | refused | refused | fails | refused |
| T7 | the entrypoint registry altered (an unregistered optimizer declared non-official) | STALE | refused | refused | refused | fails | refused |
| T8 | the legacy-runner purpose gate disabled | STALE | refused | refused | refused | fails | refused |
| T9 | the preflight §9 rule weakened (no GPU backend or acceptance required) | STALE | refused | ran | refused | fails | refused |
| T10 | the independent verifier altered (it always says VERIFIED) | STALE | refused | refused | VERIFIED | fails | VERIFIED |
| T11 | forced mixed CPU scoring in the pool (a CPU-scored counter bypass) | STALE | refused | refused | refused | fails | refused |
| T12 | a CUDA source changed without a new build and acceptance | STALE | refused | refused | refused | fails | refused |
| T13 | a new, unclassified GPU-backend file (a loader outside the manifest) | ACCEPTED | not run | ran | VERIFIED | fails | VERIFIED |
| T14 | a weakened gate committed with a regenerated record (the malicious-committer case: the parity mini-set shrunk to one seeded genome); only the out-of-band record pin detects it | ACCEPTED | not run | ran | VERIFIED | pass | refused |

Reading the table: a single changed file is always refused by at least one mechanism that does not live in that file —
T4 (a validator that always says ACCEPTED) is believed by the validator and the runner wrapper that calls it, and refused
by the gate's own re-hash, the independent verifier and the merge gate; T10 (a verifier that always says VERIFIED) is
refused by the validator, the gate and the runner (its "VERIFIED" in the out-of-band column is the tampered verifier's
own lie: the out-of-band check is only as trustworthy as the verifier copy that runs it — run it from the reviewed commit
or a copy kept with the handoff); T13 (a new unclassified loader) is refused by the merge gate's
classification rule. **T14** — a weakening (the parity mini-set shrunk) committed **together with a regenerated record**
— passes every in-repository mechanism, exactly as §5 states; only the record's sha256 kept outside the repository
detects it.

### 6.2 Negative tests (`tools/gpu-phase3/negative.ts` → `results/policy/negative-final.json`): {n['passed']}/{n['total']}

Phase 2's 35 cases on the final binary (gate, runtime, CLI; the runtime cases through the GpuPool on 3 host workers) plus
the new cases (schema-1 record, enforcement-pin mismatch, foreign history, a host path that cannot start, a wrong kernel
through the serial path, host workers that throw / exit / hang mid-job, a pipeline holding another door, the serial path
on a corrupted response). Every case refused or terminated with **no CPU-scored evaluation** and no result released.

| # | Group | Case | Observed refusal / termination |
|---:|---|---|---|
| 1 | gate | no execution purpose declared | GPU policy (standard 3.0.0 §9): preflight-purpose: no execution purpose declared (official optimization must declare it explicitly) |
| 2 | gate | a non-official purpose opening the official gate | GPU policy (standard 3.0.0 §9): preflight-purpose: purpose cpu-reference is not official optimization; a non-official run must not open the official gate |
| 3 | gate | no GPU acceptance record (the activation gate) | GPU policy (standard 3.0.0 §9): preflight-acceptance: no GPU acceptance record (research/gpu-phase3/cache/negative-aDVluN/none.json): official GPU optimization is blocked |
| 4 | gate | a forged acceptance with a stale CPU source digest (source-hash mismatch) | GPU policy (standard 3.0.0 §9): preflight-acceptance: the GPU evaluator was verified against other sources; changed since acceptance: apps/strategy-lab/shared/strategies. |
| 5 | gate | an acceptance for another binary (resume with the wrong binary) | GPU policy (standard 3.0.0 §9): preflight-acceptance: GPU binary sha256 06a4a04a83265616 ≠ accepted 1111111111111111 (a stale or different build) |
| 6 | gate | an acceptance for another GPU (wrong GPU) | GPU policy (standard 3.0.0 §9): preflight-accepted-device: device GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4 ≠ the accepted GPU-00000000-0000-0000-0000-000000000000 |
| 7 | gate | CUDA disabled (no GPU visible) | GPU policy (standard 3.0.0 §9): preflight-server: the GPU evaluator did not start or answer: GPU evaluator exited (4): gb2: no CUDA device |
| 8 | gate | a stale build (compiled from other sources) | GPU policy (standard 3.0.0 §9): preflight-compat: server built from compatibility digest stale-digest-for, working tree 30824182b111fa12 (stale build or changed sources) |
| 9 | gate | a server with test hooks / fault injection | GPU policy (standard 3.0.0 §9): preflight-no-test-hooks: the server runs with fault injection / test hooks enabled: never an official evaluator |
| 10 | gate | a reachable feature the GPU does not implement (unsupported Growth structure in the domain) | GPU policy (standard 3.0.0 §9): preflight-capability: the search domain reaches features the GPU does not implement: LIFECYCLE_L1_L2 |
| 11 | gate | insufficient VRAM for the planned batch | GPU policy (standard 3.0.0 §9): preflight-memory: free VRAM 32336314368 < planned batch 32950800000000 + 1 GiB headroom |
| 12 | gate | a wrong kernel (deliberately perturbed build): the parity mini-set refuses | GPU policy (standard 3.0.0 §9): preflight-parity: 2 of 8 precommitted parity subjects differ from the canonical CPU engine |
| 13 | gate | a wrong kernel through the serial host path (host workers 0): the parity mini-set refuses | GPU policy (standard 3.0.0 §9): preflight-parity: 2 of 8 precommitted parity subjects differ from the canonical CPU engine |
| 14 | gate | a host path that cannot start (an invalid worker count) | GPU policy (standard 3.0.0 §9): preflight-host-path: host path: 0 of -1 workers ready |
| 15 | gate | a schema-1 acceptance record (it pins no enforcement code) | GPU policy (standard 3.0.0 §9): preflight-acceptance: acceptance schema 1 does not pin the enforcement code and the source revision (schema 2 required): regenerate it wit |
| 16 | gate | a forged acceptance whose enforcement pin differs (the CPU-official refusal changed) | GPU policy (standard 3.0.0 §9): preflight-acceptance: the enforcement code changed since acceptance: src/gpu-backend/purpose.ts. Re-verify the enforcement (docs/gpu/PARIT |
| 17 | gate | a forged acceptance from another history (its source revision is not an ancestor of HEAD) | GPU policy (standard 3.0.0 §9): preflight-acceptance: the accepted source revision ffffffffffff is not an ancestor of HEAD (fatal: Not a valid commit name fffffffffffffff |
| 18 | gate | a failed smoke kernel (wrong live result) | smoke ok=false (sum 1636.3944173366574 vs 1635.3944173366574) |
| 19 | gate | resume/restart repeats the preflight and records a new attestation | two attestations, each before any evaluation |
| 20 | runtime | GPU out of memory (VRAM budget exceeded) | GPU evaluator: GPU memory: batch needs 33 MiB > VRAM budget 1 MiB |
| 21 | runtime | the GPU server killed during a search | GPU evaluator exited (SIGKILL): [gb2 0.239 s] eval n=64 flags=22 launching [gb2 0.344 s] D1 done [gb2 0.554 s] Growth done [gb2 0.655 s] pool + hash done [gb2 0.660 s] ev |
| 22 | runtime | a corrupted batch response (a bit flipped after the device checksum) | GPU evaluator: receipt mismatch: the results differ from the device checksum (corrupted transfer) |
| 23 | runtime | device execution counters that disagree (untrustworthy receipt) | GPU evaluator: receipt mismatch: device counters {"nonce":"53f4f4ff7d7ab709","uuid":"GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4","nCand":64,"d1Executed":128,"gExecuted":65, |
| 24 | runtime | a receipt from another GPU | GPU evaluator: receipt mismatch: receipt from GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4, expected GPU-00000000-0000-0000-0000-000000000000 |
| 25 | runtime | a stalled server (heartbeat lost) | GPU policy (standard 3.0.0 §9): gpu-hang: a batch of 64 did not return within 3000 ms |
| 26 | runtime | a device fault (trap) during the run | fault: GPU evaluator: CUDA error: CUDA error cudaErrorLaunchFailure: unspecified launch failure at cudaDeviceSynchronize() / GPU evaluator exited (3): gb2: sticky CUDA er |
| 27 | runtime | a task outside the attested domain (mid-run capability re-check) | GPU policy (standard 3.0.0 §9): capability-outside-domain: task NEG-RET:retain=on:0 needs G_RETENTION outside the attested domain; the batch's results are withheld |
| 28 | runtime | a CPU-scored evaluation in the official counters (mid-run routing to the CPU) | GPU policy (standard 3.0.0 §9): cpu-scored: 1 evaluation(s) scored on the CPU; the batch's results are withheld |
| 29 | runtime | a host worker that throws while decoding a batch (mid-job) | host worker: injected decode failure (test) |
| 30 | runtime | a host worker that exits while decoding a batch (mid-job) | host worker 1 exited (7) |
| 31 | runtime | a host worker that stops answering (mid-job) | host worker 1 did not answer decode 2:1 within 5000 ms |
| 32 | runtime | a host pipeline holding another door | host pipeline: a batch for another door |
| 33 | runtime | the serial host path still fails closed on a corrupted response (host workers 0) | GPU evaluator: receipt mismatch: the results differ from the device checksum (corrupted transfer) |
| 34 | runtime | a capacity overflow re-evaluated on the GPU (positive control) | completed 57/57; capacity retries 3; CPU-scored 0 |
| 35 | runtime | the same tasks at normal capacities (reference for the retry) | completed 57/57; capacity retries 0; CPU-scored 0 |
| 36 | runtime | records after the GPU capacity retry equal the normal run | identical |
| 37 | runtime | a corrupted dataset file | GPU evaluator: dataset check failed: dataset checksum mismatch |
| 38 | runtime | invalid (non-integer) timestamps in a door | VGT 2017-01-04: minute times not strictly increasing integers |
| 39 | runtime | a resume under another GPU binary/backend | /home/chad/projects/margin-trading/research/gpu-phase3/cache/negative-aDVluN/jobs/negative-binding/archive.sqlite: bound to backend = gpu:A, refused for gpu:B |
| 40 | runtime | a resume under changed evaluation code | /home/chad/projects/margin-trading/research/gpu-phase3/cache/negative-aDVluN/jobs/negative-binding/archive.sqlite: bound to codeDigest = code-1, refused for code-2 |
| 41 | cli | a legacy CPU optimizer started without a purpose | exit 3: ❌ GPU policy (standard 3.0.0 §9): purpose-required: the legacy CPU runner 'vg-l0fj' evaluates strategies on the CPU. Official optimization is GPU-only (no CPU fal |
| 42 | cli | a legacy CPU optimizer started as official optimization (forced CPU backend) | exit 3: ❌ GPU policy (standard 3.0.0 §9): cpu-official-refused: the legacy CPU runner 'vg-l0fj' is a CPU evaluator: official optimization must use the attested GPU path ( |
| 43 | cli | the generic CPU optimizer (app.ts) without a purpose | exit 3: ❌ GPU policy (standard 3.0.0 §9): purpose-required: the legacy CPU runner 'optimizer' evaluates strategies on the CPU. Official optimization is GPU-only (no CPU f |
| 44 | cli | a CPU evaluation worker started for official optimization (non-GPU evaluation from an optimizer worker) | exit 1: /home/chad/projects/margin-trading/src/gpu-backend/purpose.ts:68     throw new PolicyError(           ^  PolicyError: GPU policy (standard 3.0.0 §9): cpu-official |
| 45 | cli | the standard preflight of an official 3.0.0 study without an accepted GPU evaluator | official GPU optimization is BLOCKED (§9.9): no GPU acceptance record (research/gpu-phase3/cache/negative-aDVluN/none.json): official GPU optimization is blocked until an |

## 7. Residual limitations

- The device checksum covers the fixed per-candidate output structs (GbCandOut), not the variable-length sections
  (trades, lots, funding records, daily series): a corruption confined to those sections in transit would not be caught
  by the receipt (Phase 2 design, unchanged — changing it is a CUDA server change). The pipe is local; the parity
  campaign, the sanitizer and the sustained run's CPU parity samples are the evidence that results are correct.
- The entrypoint audit recognizes search machinery by markers; a disguised CPU optimizer could evade it (Phase 2's
  limitation, unchanged).
- `package.json` is not pinned; the pinned policy test checks its research scripts.
