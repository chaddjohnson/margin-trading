# Merge into `main` and restoration of the work branch (GPU Phase 5)

## 1. Outcome

**Merged.** The freshly accepted engine is in `main` by a normal, non-fast-forward merge (no force-push, no rewritten
history), verified after the merge, and pushed. `research/gpu-phase2` — the branch that was checked out before this
work — is fast-forwarded to the same history, checked out and clean. The Phase 3 record is superseded, not erased: it
stays in the history (`3a52cc63`) and in the out-of-repository pins.

## 2. Commits

| Ref | Commit | What it is |
|---|---|---|
| `main` before this study (= `research/gpu-phase2` = `research/gpu-phase3`) | `3a52cc635c95f74fc6cf3c22aa30bf4507293fa3` | the accepted Phase 3 tree (record `b08738be…`) |
| `research/gpu-phase4` (origin, unchanged) | `0ac3e4e2edb782963bc64673b10347cf979305d4` | Phase 4's 10 commits; this study's branch starts here |
| final tree for the campaign | `bc428d8b` | every pinned file as accepted; binary gb5 built from it |
| accepted source revision | `0ab04601d64cf20300b1f06b8569335f2987f831` | the campaign's evidence committed; the generator ran on this commit |
| acceptance commit | `9192e697` | `config/gpu-backend/acceptance.json` (sha256 `49e95d7a…`) |
| status documents, merge audit | `d5c8bc75`, `bcd14f59` | `CLAUDE.md`, `docs/gpu/README.md`, roadmap row G5; the audit of §3 |
| **merge commit on `main`** | **`dc926536f32416ee856896aa28f417102dc61dec`** | `git merge --no-ff research/gpu-phase5`; parents `3a52cc63` and `bcd14f59`; no conflict; tree identical to the branch tip |
| post-merge evidence | `3e58785d` | the verification outputs of §4 |
| handoff commit | the commit that contains this file | reports, manifest, bundle, final checkpoint — documentation only; `main`, `research/gpu-phase5` and `research/gpu-phase2` are fast-forwarded to it. Its hash is printed by `git rev-parse main` and is recorded outside the repository in `~/.local/share/margin-trading-gpu/acceptance-pins/pins.jsonl` |

Pushes: `research/gpu-phase5` first (`bcd14f59`), then `main` `3a52cc63..dc926536` (a fast-forward of the remote ref),
each checked with `git ls-remote`. Nothing was force-pushed, reset or rebased; no sealed result was repinned and no
earlier protocol record was rewritten.

## 3. Review of the diff against the accepted Phase 3 tree

Machine-readable: `results/integration/merge-audit.json` (read-only Git queries).

| Check | Result |
|---|---|
| `main` is an ancestor of the branch (the merge yields exactly the branch tree) | yes — 0 commits behind, 27 ahead at the audit |
| Files | 1,627 added, 17 modified, **0 deleted**, 0 renamed |
| By area | `research/gpu-phase4` 1,113 (its records, kept in the lineage), `research/gpu-phase5` 399, `tools/gpu-phase5` 53, `tools/gpu-phase4` 40, `src/gpu-backend` 13, `src/gpu-phase5` 10, `src/gpu-phase4` 9, `docs` 3, `config` 2, `.gitignore`, `CLAUDE.md` |
| Paths outside the GPU directories | `.gitignore`, `CLAUDE.md`, `docs/research/ROADMAP.md` — no other source file |
| Canonical CPU closure (94 files: D1, Growth, allocator, fills, costs, Strategy Lab's shared parameter code) | **unchanged** (digest `c8a9f416…`) |
| `apps/` (Strategy Lab) | **unchanged** (`git diff 3a52cc63 HEAD -- apps` empty) |
| CUDA sources | **unchanged** (digest `d8899061…`); device code of the binary byte-identical |
| Trading rules, fitness, qualification, search, selection | no change (no file of them is in the diff) |
| Research records of other studies | none modified or deleted; every change under `research/` is an addition in `gpu-phase4/` or `gpu-phase5/` |
| Size | 152 MiB added, largest file 11.1 MiB (Phase 4's handoff ZIP), no file over 50 MiB |
| Archives and binaries | one ZIP (Phase 4's handoff bundle; this study adds its own); no executable, dataset, cache or market data (git-ignored) |
| Credential patterns (private keys, tokens) | 0 hits |

The engine and policy changes, file by file (15 files, +1,008 / −114 lines against `3a52cc63`):

| File | Change | Kind |
|---|---|---|
| `src/gpu-backend/runtime.ts` (new) | the engine-runtime requirement: `--no-maglev`, no other Maglev option | enforcement (correctness fix) |
| `src/gpu-backend/official.ts` | gate check `runtime` after the purpose; the attestation records the runtime | enforcement |
| `src/gpu-backend/officialRunner.ts` | refuses a process started without the flag, before importing a runner | enforcement |
| `src/gpu-backend/acceptance.ts` | the record's optional `runtime` object (schema stays 2) | enforcement |
| `src/gpu-backend/dataset.ts` | write-once atomic publication (exclusive temporary file, fsync, verification, `link(2)`, explicit conflict and invalid-cache errors, stale-temporary cleanup); exported bytes unchanged | host path (data and cache behaviour) |
| `src/gpu-backend/hostPipeline.ts` | Phase 4's type-only fix (`Transferable`); a call after `close()` is refused at once | host path |
| `src/gpu-backend/toolchain.ts` | default binary `research/gpu-phase5/build/gb5` | host path |
| `src/gpu-backend/compat.ts` | the new files classified (runtime in the enforcement group; dataset tests) | manifest |
| `src/gpu-backend/entrypoints.ts`, `config/gpu-backend/entrypoints.json` | the `gpu-phase4` and `gpu-phase5` harness namespaces registered as non-official | enforcement |
| `src/gpu-backend/tests/{dataset.test.ts, datasetChild.ts}` (new), `hostPipeline.test.ts`, `policy.test.ts` | 9 dataset tests, the shutdown regression test, the runtime tests | tests |
| `config/gpu-backend/acceptance.json` | the new record | record |

Schema and versions: the acceptance record stays schema 2 (one added object); the dataset file format, the device
protocol and the batch codec are unchanged (28 datasets byte-identical to the previous exporter; request bytes and
result hashes identical on Phase 3's captured batches). No performance change is in the diff.

## 4. Post-merge verification of `main` (`dc926536`)

`RECORD_SHA=49e95d7a… /bin/bash research/gpu-phase5/chains/post-merge.sh` with `main` checked out
(`results/integration/post-merge-verification.json` and the logs beside it; 2026-11-21T06:03:55Z–06:04:26Z):

| Check | Result |
|---|---|
| tree identical to the accepted branch tip | yes (empty diff) |
| merge-gate tests (policy, enforcement, host pipeline, layout; under `--no-maglev`) | 21 of 21 pass, including "MERGE GATE: a recorded GPU acceptance still matches the working tree" |
| independent verifier with a **reproducible rebuild**, the device and the out-of-repository sha256 | **VERIFIED**: 94 + 7 + 12 + 24 pinned files, the evaluation digest recomputed, 34 evidence files, the accepted revision an ancestor of HEAD, the binary's sha256, the rebuild, the GPU |
| research preflight of every study | 22 of 22 pass |
| live official gate (`official-preflight.ts`, purpose official-optimization, D24, the Assignment 3 domain; a gate check, not an optimization) | **GATE OPEN** — 15 checks: purpose, runtime (Maglev disabled), acceptance, 137 pins re-hashed, source revision, binary, digest of server and tree, device, no test hooks, accepted device, 34 reachable features implemented, smoke kernel = the CPU's expectation, memory, host path (8 workers), parity mini-set 18 of 18 |
| canonical CPU closure | unchanged, `c8a9f416…`, 94 files |
| Strategy Lab code | unchanged against `3a52cc63` |
| repository and Strategy Lab suites repeated on the merged tree (`chains/post-merge-tests.sh`, `results/integration/tests/`) | pass — `npm test` 1,710 tests, 1,699 pass, the 7 known failures, 0 unexpected; root `tsc` 0 errors; Strategy Lab typecheck, lint, 314 unit tests and a scratch build pass; the browser suite 80 passed + 1 failed on its first run (`candles.spec.ts:439`, the stale-width timing race of amendment A5 again) and **81 of 81 on its one allowed rerun**; `state/strategy-lab/` unchanged (2026-11-21T06:09Z–06:24Z). Strategy Lab's static import closure (389 files) contains none of the 132 files this branch changes outside `research/` (`results/integration/tests/strategy-lab-import-closure.json`) |

## 5. The restored branch

- `git switch research/gpu-phase2 && git merge --ff-only main` — a fast-forward from `3a52cc63` to `dc926536`; its
  earlier ancestry is preserved; the working tree is clean.
- Verified there (`results/integration/restore/`, 2026-11-21T06:05:40Z): the independent verifier with rebuild, device
  and the out-of-repository sha256 → **VERIFIED**; policy and enforcement tests 13 of 13; `git status` empty.
- After the handoff commit the three branches (`main`, `research/gpu-phase5`, `research/gpu-phase2`) are fast-forwarded
  to it and `research/gpu-phase2` is left checked out.
- **Read-only protection.** The branch switches of the integration re-created two sealed files as writable
  (`research/gpu-phase4/results/final-binary.json`, `research/gpu-phase5/results/final-binary.json`); their content
  verified against the manifests and mode 0444 was restored on those two files only
  (`results/integration/restore/seal-apply-after-merge.json`). The same two files were re-created once more by the switch to `research/gpu-phase2` while it was
  still at the old tree, and restored again (`seal-apply-2.json`). Final check
  (`results/integration/restore/seal-check-final.json`): 1,053 sealed files of 25 manifests — **999 protected, 0
  writable, 0 content differences**, 11 absent from this checkout, 43 git-ignored cache copies (already read-only,
  not tracked by Git, listed for review). No tree was `chmod`-ed and no content or unrelated permission changed. Re-check at any time:
  `node --no-maglev --experimental-transform-types tools/gpu-phase5/seal-protect.ts --check` (exit 1 if a verified sealed
  file is writable; `--apply` restores the mode on verified files only).

## 6. Source fingerprint and policy pin

| Item | Value |
|---|---|
| Acceptance record sha256 | `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4` |
| Evaluation digest (CPU closure + CUDA + host path; compiled into the binary) | `3a6eacdecc4f0a24fbf008c0ef852644969e72dc8ea0af95bd5dc373ebb6033d` |
| CPU closure / CUDA / host path digests | `c8a9f416e25b393a…` / `d88990612c5cd6d7…` / `53671a6c07c486fb…` |
| Enforcement (policy) group digest, 24 files | `c4832e8856e78785a0beb6ae45af7bac8c0f88fd95d5b8ada8a6c8b5eaf2a55b` |
| Binary sha256 | `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e` |
| Out-of-repository pins (`~/.local/share/margin-trading-gpu/acceptance-pins/`) | `acceptance-gpu-phase5-49e95d7a.json` (a copy of the record, mode 0444) and a line in `pins.jsonl`; **the Phase 3 pin `acceptance-gpu-phase3-b08738be.json` and the earlier lines are untouched** |

The out-of-repository value is the independent integrity reference: whoever can commit can rewrite a file and its pin
together, and only a value kept elsewhere detects that (tamper case T14). This handoff carries the value too.

## 7. Verifying later, and going back

```bash
cd /home/chad/projects/margin-trading
# the accepted engine on the current checkout
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4
GPU_POLICY_PURPOSE=parity-test node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gpu-backend/tests/*.test.ts
# the previous accepted engine (Phase 3), without changing any branch: a detached checkout of its commit
git switch --detach 3a52cc635c95f74fc6cf3c22aa30bf4507293fa3
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214
git switch research/gpu-phase2
# undoing the merge on main, if ever wanted, is a new commit and the user's decision: git revert -m 1 dc926536
```

A return to the Phase 3 engine is **not recommended**: it runs with Maglev enabled and is exposed to the defect of
`PARITY_ROOT_CAUSE.md`.

**RISK-ENVELOPE PILOT NOT STARTED.**
