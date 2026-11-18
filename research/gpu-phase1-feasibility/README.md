# gpu-phase1-feasibility — GPU acceleration Phase 1: feasibility and proof of concept (RTX 5090)

Research-only study of whether Apollo's RTX 5090 can accelerate the optimizer's candidate evaluation without changing a
single research decision. Standard 2.2.0 (scope diagnostic); no search, no selection, no runner integration, no merge to
`main`. **Verdict: CONDITIONAL GO** for a separately authorized Phase 2.

| Document | Content |
|---|---|
| [GPU_PHASE1_REPORT.md](GPU_PHASE1_REPORT.md) | verdict, executive summary, context, environment, profiling, architecture, POC, benchmarks, projections, limitations |
| [GPU_CPU_PARITY.md](GPU_CPU_PARITY.md) | feature matrix, test sets, parity results (bit-exact), failure tests, numerics, commands |
| [GPU_BENCHMARKS.md](GPU_BENCHMARKS.md) | CPU baseline, production decomposition, GPU slice scaling, hybrid end to end, projections, system effects |
| [GPU_PHASE2_PLAN.md](GPU_PHASE2_PLAN.md) | the gated Phase 2 plan, acceptance criteria, deliverables |
| [GPU_RESEARCH_HANDOFF.md](GPU_RESEARCH_HANDOFF.md) | standalone handoff for the original conversation |
| [PROTOCOL.md](PROTOCOL.md) / [AMENDMENTS.md](AMENDMENTS.md) / [STANDARD_ADOPTION.json](STANDARD_ADOPTION.json) | frozen protocol (2026-11-18T18:20:06Z), amendments (none), adoption manifest |
| [RUN_COMMANDS.md](RUN_COMMANDS.md) | every command |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | checkpoint |

Records: `results/s1/` (CPU baseline), `results/s4/` (parity, fixtures, negative tests; `first-pass/` = an earlier build),
`results/s5/` (benchmarks; `pre-fix/` = the run that exposed the client buffering bug), `results/tables/*.csv`,
`results/doors.jsonl`, `results/protocol-freeze.json`, `results/seals.jsonl`. Notes: `notes/`. Chains: `chains/`.
Code: `src/gpu-phase1/` (client, dataset export, comparator, CPU reference pool, tests), `src/gpu-phase1/cuda/` (CUDA
evaluator), `tools/gpu-phase1/` (profiling, parity, fixtures, negative tests, benchmarks, tables, launch, toolchain).
Git-ignored local artifacts: `build/` (the compiled evaluator), `cache/` (exported binary bar files), `results/logs/`.
