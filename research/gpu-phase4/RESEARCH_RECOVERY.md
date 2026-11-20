# RESEARCH_RECOVERY — gpu-phase4 (GPU Phase 4: concurrency, batching, final acceptance, handoff)

## Top screen

- **Updated:** 2026-11-20T06:17Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — protocol FROZEN; B1 complete (583.1 s, identical); B2 running (unit `p4chain-b2`).
- **Authority:** `brief/BRIEF.md` sha256 `ffcb79abacd9b8a0c3deeed28ba7e394f926891f49ebe84043e242e99c4a353e` (the user's
  handoff, read in full, 147 lines, final section "Success criterion" present). `PROTOCOL.md` FROZEN 2026-11-20T06:04:19Z
  (`results/protocol-freeze.json`; protocol sha256 `b698b929978305e7ca5d37923a34e4115b0d4de5c63fbda99eb736ce3ae578d2`).
  Amendments: none. Standard 3.0.0 adopted (scope diagnostic, `evaluationBackend` non-official-cpu / benchmark);
  preflight PASS.
- **Accepted baseline (must stay valid during B1–B9):** `config/gpu-backend/acceptance.json` sha256
  `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` (= the brief's out-of-band value; copy outside Git
  `~/.local/share/margin-trading-gpu/acceptance-pins/`), binary `research/gpu-phase3/build/gb3` `06a4a04a…dc23`,
  compat digest `30824182…2998`; verifier VERIFIED 2026-11-20T05:38Z.
- **Running:** `p4chain-b2.service` (started 06:16:29Z by `chains/after.sh` after B1's gate; log
  `results/logs/chain-b2.txt`); its job units `gpup4-ss*-j*` in `gpup4.slice`, monitors `gpup4-mon-*`.
- **Next command (after B2):** `tools/gpu-phase4/launch.sh p4chain-b2r $PWD/research/gpu-phase4/results/logs/chain-b2r.txt
  -- /bin/bash research/gpu-phase4/chains/b2r.sh`, then `chains/b3-b9.sh` (unit `p4chain-b3`).
- **Never:** start/implement/preflight/run the risk-envelope pilot; change strategies, fitness, genome, budgets, seeds,
  selection, kernels, the optimizer; start MPS, change clocks/power/GPM/driver/display, stop services; touch
  `research/gpu-phase3/` or other studies' records; edit a pinned file before B1–B9 are complete; a long endurance run.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/gpu-phase4`** created from
  `3a52cc635c95f74fc6cf3c22aa30bf4507293fa3` (= `main` = `research/gpu-phase2` = `research/gpu-phase3` on origin,
  verified with `git ls-remote` 2026-11-20T05:38Z). No other worktree. Branch to restore at the end:
  **`research/gpu-phase2`** (active at the start, clean).
- Node v24.21.0; units use `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Containment: `gpup4.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); per-job units via
  `tools/gpu-phase4/group.sh` (per-job MemoryMax 11G default; per-server VRAM budget ⌊28,000/k⌋ MiB for k ≥ 2).
- Environment record: `results/preflight/environment.json` (RTX 5090 idle P8, 767 MiB used by the desktop incl.
  gnome-remote-desktop 504 MiB; no LLM service, no container; 16 logical CPUs, governor performance; 59 GiB RAM).
- Git-ignored: `research/gpu-phase4/{build,cache,results/raw-large,results/logs}`.

## Stage table

| Stage | Status | Command (repo root) | Output | Result |
|---|---|---|---|---|
| S0 state, inventory, harness | complete | — | `results/preflight/environment.json`; tools `tools/gpu-phase4/*`, `src/gpu-phase4/context.ts` | baseline verified; smoke checks smoke-m1/m2 (tool tests, not results) identical |
| S1 protocol freeze | complete | — | `results/protocol-freeze.json` | frozen 06:04:19Z |
| B1 baseline | complete | `tools/gpu-phase4/launch.sh p4chain-b1 <abs log> -- /bin/bash research/gpu-phase4/chains/b1.sh` (06:05:31–06:16:29Z) | `results/bench/ftw1-r1/` | 583.1 s, 2,131 ev/s; verify identical (1,242,714 rows = CPU reference, lanes = sealed, digest `9c2d7108…`); VRAM 5,138 MiB/job, host 5,008 MiB/job |
| B2 SS matrix | running | `chains/after.sh p4chain-b1 …ftw1-r1/gate.json chains/b2.sh` (unit p4chain-b2, from 06:16:29Z) | `results/bench/ss*/`, `results/decisions/b2.json` | |
| B3 batching | not started | | | |
| B4 FTW | not started | | | |
| B5 W-A2 SS | not started | | | |
| B6 W-S mini | not started | | | |
| B7 W-K | not started | | | |
| B8 W-R | not started | | | |
| B9 isolation/failure | not started | | | |
| C corrective work + acceptance | not started | | | |
| D integration | not started | | | |
| E bundle | not started | | | |

Resume semantics: every benchmark group is write-once (`group.sh` refuses an existing `results/bench/<G>/group.json`);
an interrupted group is rerun under a NEW name (labelled as a rerun), never overwritten.

## On disk versus in memory

- Nothing decided only in memory.

## Disclosures

- (none yet)
