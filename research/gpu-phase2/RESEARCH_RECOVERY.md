# RESEARCH_RECOVERY — gpu-phase2 (GPU acceleration Phase 2: complete parity, mandatory GPU optimization)

## Top screen

- **Updated:** 2026-11-19T00:40Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — Stage S0 (setup, inventory) running; protocol being drafted (not yet frozen).
- **Authority:** `brief/BRIEF.md` sha256 `25c1fa47b1d806c5d9d38950a81934b11f65f97e64ebf346e957d163bdd2459d` (283 lines,
  read in full, final section verified). `PROTOCOL.md`: draft, not frozen. Standard: 2.2.0 to be adopted (scope
  diagnostic); the Phase 2 policy is to be registered as standard 3.0.0 by this study (S2).
- **Running:** background toolkit install (`tools/gpu-phase2/install-toolkit.sh`, log
  `results/logs/install-toolkit.log`; writes only `/home/chad/.local/share/margin-trading-gpu/{cuda-13.2-toolkit,downloads-13.2.2}`).
- **Next:** finish the protocol, freeze it, adopt the standard, pass the preflight; then S2 (policy code) and S3/S5 (GPU
  evaluator v2 with the Growth port).

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/gpu-phase2` created 2026-11-19T00:12Z from
  `727681c06de4bbd06d56f1bd063cdef0d4f632f5` (tip of `research/gpu-phase1-feasibility`, clean tree). No extra worktree
  (user preference). `data/` read in place, never written.
- Node v24.21.0 (`.node-version`); absolute node for units: `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Apollo inventory at start: `results/inventory/s0-start.json` (GPU `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, RTX 5090
  32,607 MiB, **31,342 MiB free**, driver 595.91.07, CUDA 13.2 driver API; GPU processes: gnome-remote-desktop 504 MiB,
  gnome-shell 182 MiB, Xwayland 8 MiB; **no vLLM process, no Docker container**; image `nvidia/cuda` only). Monitor
  stays on the RTX 5090 (display attached). Ryzen 7 9800X3D 8C/16T, 59 GiB RAM, 8 GiB swap.
- Toolchain: Phase 1's PyPI nvcc 13.2.86 venv (`/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv`); Phase 2
  adds the redistributable 13.2.2 subset (same nvcc 13.2.86, sanitizer 13.2.87 full layout, CUPTI, Nsight Compute) in
  `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit` (uninstall: delete that directory and
  `…/downloads-13.2.2`).
- Containment for heavy runs: transient systemd user units in one slice `gpup2.slice` (MemoryHigh 44G, MemoryMax 48G,
  MemorySwapMax 0), as Phase 1 (`tools/gpu-phase1/launch.sh` pattern).

## Stage table

| Stage | Status | Command / output | Result |
|---|---|---|---|
| S0 setup, inventory | running | branch, dirs, `brief/BRIEF.md`, `results/inventory/s0-start.json` | vLLM absent, 31.3 GiB free |
| S1 toolkit + sanitizer | running | `tools/gpu-phase2/install-toolkit.sh` | — |
| S2 policy + enforcement | not started | — | — |
| S3 GPU evaluator v2 (Phase 2a: D1/RC/pool options, receipts, capability) | not started | — | — |
| S4 optimizer integration (GpuPool, GpuLab) + Checkpoint A | not started | — | — |
| S5 Growth tranche 1 + gate | not started | — | — |
| S6 Growth tranches 2–3 | not started | — | — |
| S7 verification (parity, identities, mini-optimization, negative tests, sanitizer, 24 h, npm test, Strategy Lab) | not started | — | — |
| S8 benchmarks + projections | not started | — | — |
| S9 reports, bundle, commit/push, docs-only main integration | not started | — | — |

## Guards

- Do not run the deferred 40% / 25% / 25% risk-envelope pilot or any official optimization; no strategy, fitness,
  budget, random-stream or selection change; no merge of GPU engine code into `main`; no deployment or broker access.
- Do not edit completed studies (their code, protocols, records); Phase 1 code (`src/gpu-phase1/`) is frozen and only
  imported. Do not touch `state/strategy-lab/`. Do not reinstall/restart language models; no display/driver/BIOS/boot
  change; do not modify the `ai-trading` project.
- No visuals (CLAUDE.md). No money figure for non-reference configurations (as Phase 1 AD7).

## Disclosures

- (none yet)
