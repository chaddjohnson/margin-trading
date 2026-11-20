# RESEARCH_RECOVERY — gpu-phase4 (GPU Phase 4: concurrency, batching, final acceptance, handoff)

## Top screen

- **Updated:** 2026-11-20T10:16Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — benchmarks B1–B9 complete (commit `d46604c2`); stage C corrective changes committed (`eaa65dae`); the final acceptance campaign RUNNING (unit `p4chain-final`).
- **Authority:** `brief/BRIEF.md` sha256 `ffcb79abacd9b8a0c3deeed28ba7e394f926891f49ebe84043e242e99c4a353e` (the user's
  handoff, read in full, 147 lines, final section "Success criterion" present). `PROTOCOL.md` FROZEN 2026-11-20T06:04:19Z
  (`results/protocol-freeze.json`; protocol sha256 `b698b929978305e7ca5d37923a34e4115b0d4de5c63fbda99eb736ce3ae578d2`).
  Amendments: A1 (09:19Z, verifier streams its maps), A2 (09:50Z, FULL guard file read-only again; B8 rerun as r1b/r2b); no result change. Standard 3.0.0 adopted (scope diagnostic, `evaluationBackend` non-official-cpu / benchmark);
  preflight PASS.
- **Accepted baseline (valid through B1–B9, re-verified at `d46604c2`; STALE since `eaa65dae`, record moved to
  `results/superseded/acceptance-gpu-phase3.json`, official optimization blocked until the new acceptance):** `config/gpu-backend/acceptance.json` sha256
  `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` (= the brief's out-of-band value; copy outside Git
  `~/.local/share/margin-trading-gpu/acceptance-pins/`), binary `research/gpu-phase3/build/gb3` `06a4a04a…dc23`,
  compat digest `30824182…2998`; verifier VERIFIED 2026-11-20T05:38Z.
- **Running:** `p4chain-final.service` IN `gpup4.slice` (`MODEA_K=2 MODEA_W=8 START=1 chains/final.sh`, from 10:13:21Z, log
  `results/logs/final-chain.txt`); its sub-units `gpup4-par-*`, `gpup4-final-*`. Resume after an interruption: inspect
  the log for the last `end N … status 0`, then relaunch with `START=<N+1>` (each step writes its own record).
- **Next (after the campaign):** `GPU_POLICY_PURPOSE=parity-test node --experimental-transform-types tools/gpu-phase4/tables.ts`,
  then `tools/gpu-phase4/accept.ts` (writes `config/gpu-backend/acceptance.json` only if every gate passes), commit, keep
  its sha256 outside the repository, verifier, merge (stage D), bundle (stage E).
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
| B2 SS matrix | complete | `chains/after.sh p4chain-b1 …ftw1-r1/gate.json chains/b2.sh` (unit p4chain-b2, 06:16:29–07:07:12Z) | `results/bench/ss*/`, `results/decisions/b2.json` | all 10 groups identical; aggregate window ev/s k1 2,687/2,679, k2 w8 3,339 w4 3,263, k3 w8 3,489 w5 3,535 w3 3,546, k4 w8 3,489 w4 3,492 w2 3,476; R2 best w: k2 8, k3 3, k4 2; R3 provisional k*=3 (1.32×) |
| B2r repeats | complete | `chains/after-chain.sh p4chain-b2 … b2 chains/b2r.sh` (unit p4chain-b2r, 07:07:15–07:23:32Z) | `results/bench/ss{2-w8,3-w3,4-w2}-r2/`, `results/decisions/b2r.json` | identical; r2 aggregate k2 3,351, k3 3,429, k4 3,466; means k1 2,683, k2 3,345 (1.25×), k3 3,487 (1.30×), k4 3,471; R3 → k*=2 w8 (smallest k within 5 % of the max, ≥ 10 % above k=1 in every run) |
| B3 batching | complete | in `chains/b3-b9.sh` (unit p4chain-b3, 07:23:36–08:08:11Z) | `results/bench/{b4096-r1,b16384-r1,ftw1-r2,ss2-b4096,ss2-b16384}/` | identical; single job wall b4096 673.8 s, b8192 583.1/584.0 s, b16384 609.6 s → R1 keeps 8,192 (no second run triggered); k=2: b4096 2,169, b8192 3,345, b16384 3,423 ev/s → R4 keeps 8,192 (+2.3 % < 3 %) |
| B4 FTW | complete | same chain (08:08–08:53:54Z) | `results/bench/ftw{2,3,4,2-r2}/` | identical (unions = reference, lanes exact, 0 duplicate fresh); makespan k2 543.8/549.2 s, k3 638.5 s, k4 780.1 s vs single 583.6 s |
| B5 W-A2 SS | running | a2-ss1-w8 in `chains/b3-b9.sh` (08:53:54–08:57:13Z; STOP: the verifier's string limit → A1; verified 09:18Z); a2-ss2, a2-ss3 in `chains/b5-b9-resume.sh` (unit p4chain-b5r, from 09:19:07Z) | `results/bench/a2-ss*/` | a2-ss1-w8 identical, 3,101 ev/s |
| B5 (rest), B6, B7 | complete | `chains/b5-b9-resume.sh` (unit p4chain-b5r, 09:19–09:45:22Z) | `results/bench/{a2-ss2-w8,a2-ss3-w3,s1-w8,s2-w4,s4-w2,sf2-w4,k-b*,k2-b8192}/` | identical; A2 k1 3,101, k2 4,821 (1.55×), k3 5,339 (1.72×); mini k1 65.1 s 472 ev/s, k2 487 (1.03×), k4 553 (1.15×), split ×2 107.3 s; W-K device ms/1k cand. 934/477/249/151/104 at 2k–32k, one process 1,023–4,980 ev/s, two × 8,192 3,766 vs one × 16,384 4,580 (shared queue +22 %) |
| B8 W-R | complete | first `r1-w8` refused (FULL guard writable → A2); `chains/b8-b9-resume.sh` (unit p4chain-b8r, 09:50–09:53:47Z) as `r1b-w8`, `r2b-w8` | `results/bench/r{1b,2b}-w8/`, `results/pool/r*` | identical (CPU samples 24/24 per job, repeat 0); k1 829 ev/s, k2 ≈ 860 (1.04×); VRAM 6,524 MiB/server, host 6.1 GiB/job |
| B9 isolation | complete | `chains/b9.sh` (09:53–10:00:42Z) | `results/isolation/i*.json`, `results/bench/i1`, `i2` | I1 kill+resume, I2 stop+resume, I3 server kill, I4 host-worker exit, I5 VRAM refusal (each with an identical neighbour), I6 guards, I7 shared export: 66 verified / 34 refused / 0 wrong — all pass |
| C corrective changes | complete | `research/gpu-phase4/cache/staged/apply.sh`; tsc 0, ESLint 0, merge-gate tests 19/19 | commit `eaa65dae` | CC1 emitted JS identical (`results/final/cc1-transform-identity.json`) |
| C acceptance campaign | running | `tools/gpu-phase4/launch-slice.sh p4chain-final <abs log> -- /usr/bin/env START=1 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase4/chains/final.sh` (from 10:13:21Z) | `results/{final-binary.json,final,parity,optimizer,sanitizer-final,policy,sustained,tests}` | step 1 build: gb4 `b01f4362…`, reproducible, kernels = gb3 = gb2 |
| D integration | not started | | | |
| E bundle | not started | | | |

Resume semantics: every benchmark group is write-once (`group.sh` refuses an existing `results/bench/<G>/group.json`);
an interrupted group is rerun under a NEW name (labelled as a rerun), never overwritten.

## On disk versus in memory

- Nothing decided only in memory.

## Disclosures

- D4 (2026-11-20T11:43Z): ONE parity mismatch in the acceptance campaign (`D24-fund`, candidate `O-fund:coarse:28`,
  record hash only); not reproducible on either side in 26 GPU and 4 CPU-path reproductions plus 1,560 cache-pair tests; no
  hardware error logged (no ECC). Parity gate FAILED (kept); acceptance renewal needs the user's decision (A4). Phase 3's
  acceptance stays in force on `main`.

- D3 (2026-11-20T09:45Z): sealed files under `research/` lost their read-only bit when GPU Phase 3 switched branches for its
  merge (2026-11-19T23:04:57Z; Git does not track it; contents unchanged). Priority 3's FULL-door guard refuses a writable
  frozen selection, so B8's first group refused (fail closed, no evaluation). This study restored 0444 on that ONE file
  (`research/vg-d1-growth-joint/FROZEN_SELECTION.json`, sha256 verified = the pin; A2). The other studies' sealed files
  (e.g. 24 other `FROZEN_SELECTION.json`) stay 664: a housekeeping decision for the user (outstanding decision in the
  handoff).

- D2 (2026-11-20T08:57Z): the B3–B9 chain stopped fail-fast at B5's first group because the verifier could not read the
  Assignment 2 reference map as one string; amendment A1 (streamed reading, same checks); the group verified identical;
  B5–B9 resumed by `chains/b5-b9-resume.sh` (≈ 22 min lost, no result affected).

- D1 (2026-11-20T06:51Z, observed, no change): during B1 (`ftw1-r1`, the complete A3 job) the job's unit reached its
  per-job MemoryHigh (10G; group.sh MEMMAX 11G − 1) — 803 `memory.high` events, 0 `max`/OOM/kill — because the unit's
  memory counts the page cache of the job's 5.4 GB SQLite archive (cgroup peak 10,392 MiB; the job's own VmHWM 5,008 MiB
  incl. its server). Reclaim of page cache, no failure; the wall (583.1 s) equals Phase 3's 582–584 s, measured with a
  44G per-unit MemoryHigh, so no material throttling. The steady-state prefixes (B2) had none (the counter stayed 803
  from B1 on). Complete single-job runs in B3 share the condition (comparable among themselves); reported in the
  benchmarks.
