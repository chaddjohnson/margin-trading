# GPU integration into `main`, branch state and operations

## 1. Branches and commits (FILL at the end: every SHA verified with `git ls-remote`)

| Ref | Before this study | After |
|---|---|---|
| Initial checkout | `research/gpu-phase2` at `a183640793ddc6635a0ac9be4b1f4b5b1db7bfb9` (clean, pushed) | FILL |
| `main` (= `origin/main`) | `10ca342234eb73db79f8691ea32c88f3e32dcc80` (Phase 2's documentation-only integration) | FILL (merge commit + post-merge verification record) |
| `research/gpu-phase3` | — (created from `a1836407`) | FILL |
| `research/gpu-phase2` | `a1836407` | FILL (fast-forwarded to the final `main`; `a1836407`, Phase 2's final state, stays in its history) |
| Accepted source revision (`source.commit` of `config/gpu-backend/acceptance.json`) | — | FILL |

Graph: `main` was an ancestor of `research/gpu-phase2` (merged into it at `ee13a497`), and `research/gpu-phase3` grew
from `research/gpu-phase2`; the integration is therefore a merge whose tree equals the accepted branch tree byte for
byte (verified: `git diff research/gpu-phase3 main` empty after the merge).

## 2. What the merge brought into `main` (audit)

FILL: the diff audit (`results/integration/merge-audit.json`).

## 3. The restored checkout

FILL.

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
