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

## 6. Tests

Filled from the final campaign (`results/policy/negative-final.json`, `results/policy/tamper-final.json`).

## 7. Residual limitations

- The device checksum covers the fixed per-candidate output structs (GbCandOut), not the variable-length sections
  (trades, lots, funding records, daily series): a corruption confined to those sections in transit would not be caught
  by the receipt (Phase 2 design, unchanged — changing it is a CUDA server change). The pipe is local; the parity
  campaign, the sanitizer and the sustained run's CPU parity samples are the evidence that results are correct.
- The entrypoint audit recognizes search machinery by markers; a disguised CPU optimizer could evade it (Phase 2's
  limitation, unchanged).
- `package.json` is not pinned; the pinned policy test checks its research scripts.
