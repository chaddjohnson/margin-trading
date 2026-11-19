# GPU integration into `main`, branch state and operations

## 1. Branches and commits (verified with `git ls-remote origin`; the final SHAs are in `RESEARCH_RECOVERY.md` and the final answer)

| Ref | Before this study | After |
|---|---|---|
| Initial checkout | `research/gpu-phase2` at `a183640793ddc6635a0ac9be4b1f4b5b1db7bfb9` (clean, = origin) | **restored**: `research/gpu-phase2` checked out again, fast-forwarded to the final `main` (contains the accepted GPU code; `a1836407` stays in its history) |
| `main` (= `origin/main`) | `10ca342234eb73db79f8691ea32c88f3e32dcc80` (Phase 2's documentation-only integration) | merge commit **`30801fd409a8e2c6774a7fc895dcd6df3ca634af`** (parents `10ca3422` and `research/gpu-phase3` at `8fe54146`), then the post-merge verification `6ceb76aa`, the reports and the bundle (fast-forward commits on `main`) |
| `research/gpu-phase3` | — (created from `a1836407`) | pushed at `fc8923b0` before the merge; fast-forwarded to the final `main` |
| `research/gpu-phase2` | `a1836407` | fast-forwarded to the final `main` (no rewrite: `a1836407` is an ancestor) |
| Accepted source revision (`source.commit` of `config/gpu-backend/acceptance.json`) | — | **`e33da74f41a87c75d6aee0d5747065412f9bf9a7`** (an ancestor of every branch above; the record itself in `ce24a977`) |

Graph: `main` was an ancestor of `research/gpu-phase2` (merged into it at `ee13a497`), and `research/gpu-phase3` grew
from `research/gpu-phase2`; the integration is therefore a `--no-ff` merge whose tree equals the accepted branch tree
byte for byte (verified: tree `d0341679…` on both sides, `git diff research/gpu-phase3 main` empty). `main` is not
protected (GitHub API: "Branch not protected", Stage 0); nothing was force-pushed, rebased or deleted.

## 2. What the merge brought into `main` (audit `results/integration/merge-audit.json`) and its verification

| Check | Result |
|---|---|
| `main` an ancestor of the branch | yes (0 behind, 341 ahead): the merge cannot lose or alter anything on `main` |
| Files | 4,858: 4,848 added, 10 modified, 0 deleted, 0 renamed; 887 MiB added |
| Modified files that `main` had | `.gitignore`, `CLAUDE.md`, `README.md`, `docs/claude/context-recovery.md`, `docs/gpu/FEATURE_MATRIX.md`, `docs/gpu/PARITY_CHECKLIST.md`, `docs/gpu/README.md`, `docs/research/ROADMAP.md`, `eslint.config.js`, `package.json` — documentation and configuration, reviewed |
| By area | `research/growth-etf-screening` 909, `research/gpu-phase2` 323, `apps` 299, `research/gpu-phase3` 293, `research/vgt-d1-growth-joint` 260, `research/vg-d1-growth-joint` 214, `research/vg-l0-shadow-eligibility` 192, `research/growth140-vgt-stable` 168, … (3,826 files under `research/`: the committed records of the studies on this branch lineage, already on origin's research branches) |
| Largest file | 15.9 MiB (`research/growth140-vgt-s8m/results/archive/search/configs-000.jsonl.gz`); **none over 50 MB** |
| Archives | 149 (`.gz` test fixtures and study archives, the Phase 2 report ZIP); no compiled binary, no CUDA toolkit, no market data (`data/` is git-ignored) |
| Credential scan (private keys, GitHub/AWS/OpenAI/Slack token patterns) over every added text file | 0 hits |
| The GPU program's own footprint (since `dcc70df7`, before Phase 1): 827 paths | outside the GPU directories only governance documents, `package.json`, `.gitignore` and `src/research-standard/gpuPolicy.ts`, `preflight.ts` (the GPU policy checks) |
| The canonical CPU evaluation closure (94 files) | **unchanged** by the GPU program |
| `apps/` (Strategy Lab) | **unchanged** by the GPU program |
| Strategies, fitness, selection | unchanged: no file of a study's search, fitness or selection code changed (the CPU closure and every study's `src/<study>/` are outside the footprint) |

Post-merge verification on `main` (`chains/post-merge.sh` → `results/integration/post-merge-verification.json`,
2026-11-19T23:05:37Z, HEAD `30801fd409a8`):

| Check | Result |
|---|---|
| tree equal to the accepted branch | yes |
| merge-gate tests (policy, enforcement, host pipeline, layout) | 19/19 |
| `verify-acceptance.sh --rebuild --device --expect-record-sha256 b08738be…` | **VERIFIED** (record = the out-of-band pin; every pin re-hashed; evidence intact; source revision an ancestor; pinned files committed and unchanged; binary; **reproducible rebuild** from the pinned sources; device) |
| `npm run research-preflight -- --all` | 20 of 20 studies PASS |
| live official gate (`official-preflight.ts --study research/gpu-phase3 --door D24 --domain pilot`, purpose official-optimization) | **GATE OPEN** — 134 pinned files re-hashed, source `30801fd4` ⊇ `e33da74f`, compat `30824182…`, smoke, 35 reachable features implemented, VRAM, 8 host workers, parity mini-set 18/18; no search candidate evaluated |

**The acceptance binds to the merged code:** the record pins every evaluation and enforcement file by sha256; those files
are byte-identical on `main` (same tree), the accepted source revision is an ancestor of `main`, and the gate and the
independent verifier both pass there. No record field was edited by hand; nothing was regenerated after the merge.

## 3. The restored checkout

At the end the checkout is back on **`research/gpu-phase2`** — the branch active at the start — fast-forwarded to the
final `main`. Fast-forward only (`git fetch . main:research/gpu-phase2`, which refuses anything else): no commit of the
branch is lost or rewritten, `a1836407` (Phase 2's final state) remains in its history, and the branch now **contains
the accepted GPU engine** (merely switching back to the old commit would not have). The working tree is clean.

To start the separately authorized risk-envelope pilot (the original conversation decides; nothing of it is created
here): from `main` (or the equal `research/gpu-phase2`), create a new branch and study namespace, e.g.
`git switch -c research/<pilot-study> main`, then follow §4 (protocol from the template, `STANDARD_ADOPTION.json` with
standard 3.0.0 and `evaluationBackend` gpu-required, the research preflight, the live official gate, the runner through
`officialRunner.ts`). Before it can gate a search on the 25 % principal-loss / 25 % banked-capital-DD envelope, the
official pool must deliver those inputs to the search — a host-path change that needs a fresh acceptance
(`GPU_PILOT_READINESS.md`).

## 4. Official GPU research from `main` — the steps

```bash
# 0. the accepted binary (git-ignored; reproducible from the pinned sources) and the independent check
D=$(node --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh research/gpu-phase3/build/gb3 "$D"          # sha256 must equal the record's binary.sha256
tools/gpu-backend/verify-acceptance.sh --device --expect-record-sha256 <the record sha256 from the handoff>

# 1. a new study (the original conversation authorizes it): protocol from docs/research/STUDY_PROTOCOL_TEMPLATE.md,
#    STANDARD_ADOPTION.json (standard 3.0.0, scope optimization, evaluationBackend gpu-required), then
npm run research-preflight -- --study research/<study>

# 2. the live official gate (no search; writes research/<study>/results/gpu-attestations/preflight-*.json)
GPU_POLICY_PURPOSE=official-optimization node --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/gpu-backend/official-preflight.ts --study research/<study> --door D24 --domain pilot --batch 8192

# 3. the study's runner: evaluates only through openOfficialGpuSession → GpuPool (session.pipeline, 8 host workers) →
#    EvalLab; its npm script goes through the official runner gate:
#    "<script>": "node --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/officialRunner.ts research/<study> src/<study>/main.ts"
GPU_POLICY_PURPOSE=official-optimization npm run <script> -- <args>
```

- Long jobs run in a contained unit (`tools/gpu-phase3/launch.sh`, MemoryHigh 44G / MemoryMax 48G / swap 0); peak RSS of
  an Assignment 3-shaped job with 8 host workers ≈ 4.8 GiB, VRAM ≈ 5.9 GB at batch 8,192.
- `hostWorkers` (session spec) = 8 by default; 0 selects the serial path (Phase 2's), never a CPU path.

## 5. Failure and recovery

| Situation | What happens | What to do |
|---|---|---|
| a host worker throws, exits, runs out of heap or stops answering | the job fails closed (checkpointed), nothing of the batch is released, CPU-scored stays 0 | read the error (it names the worker and batch), fix the cause, rerun the same command (the archive replays) |
| `preflight-host-path` | the workers did not start or hold another door | environment or code fault: never fall back; check memory and the error |
| `preflight-pins` / `preflight-source` | a pinned file differs from the record, or is not committed | commit or revert; a real change follows `docs/gpu/PARITY_CHECKLIST.md` |
| `preflight-acceptance: … schema 1` | a Phase 2 record | regenerate by an acceptance study |
| every other refusal | as Phase 2 (`docs/gpu/README.md` §7) | |

## 6. CUDA environment notes

- User-space toolkit `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit` (nvcc 13.2.86, compute-sanitizer
  2026.1.1), installed by `tools/gpu-phase2/install-toolkit.sh`; no system or driver change. Driver 595.91.07 / CUDA 13.2.
- Build flags (never change without a parity campaign): `-O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true
  -prec-sqrt=true -Xcompiler -ffp-contract=off`; the build strips the binary (reproducible sha256).
- `objcopy --dump-section` rewrites its input in place: run it only on a copy (an incident of this study, §Disclosures of
  `RESEARCH_RECOVERY.md`; no content changed).
