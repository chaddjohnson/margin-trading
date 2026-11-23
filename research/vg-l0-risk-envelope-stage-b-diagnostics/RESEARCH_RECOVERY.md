# RESEARCH_RECOVERY — RES-BD 1.0.0: Stage B census and profit-giveback diagnostics — INCOMPLETE

**Top screen** (times UTC from `date -u`; `ls` listings on Apollo show CET = UTC+1)

- Updated: 2026-11-23T07:53Z. **INCOMPLETE.**
- Current stage: **S2/S3 by cutoff.** C19 complete (census, qualification replay, giveback); C21 census running.
- Authority: `PROTOCOL.md` (sha256 `90341d41…`, in `STANDARD_ADOPTION.json`), `brief/BRIEF.md` sha256 `b15e9746…`,
  `AMENDMENTS.md` head **D3**.
- Running: units `vgl0rebd-census-C21` (started 07:50:02Z) and `vgl0rebd-census-C24` (started 07:54:45Z), chain
  `chains/census.sh`, logs `results/logs/census-C2x.log`. Finished cleanly when the log ends with `chain census C2x done`
  and `systemctl --user show vgl0rebd-census-C2x -p Result` = success. Two search copies exist at once (C21, C24; C19's
  removed), never all three (O2).
- Next: `CUT=C21 chains/giveback.sh` after the C21 census; then remove the C21 search copy; then C24 the same way.

## Environment

| Item | Value |
|---|---|
| Checkout | the main checkout `/home/chad/projects/margin-trading`; no extra worktree |
| Branch | `research/vg-l0-risk-envelope-stage-b-diagnostics`, from Stage B's `1c1f9e72` (= `origin/research/vg-l0-risk-envelope-stage-b`; `main` = `3606f4b3`, untouched) |
| Node | v24.21.0 (`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`); every replaying process runs `node --no-maglev`, `GPU_POLICY_PURPOSE=diagnostic` |
| Scratch | `.cache/vg-l0-risk-envelope-stage-b-diagnostics/` (git-ignored `/.cache/`, main disk; not tmpfs) |
| Containment | `vgl0rebd.slice` (44G / 48G / swap 0) via `tools/vg-l0-risk-envelope-stage-b-diagnostics/launch.sh` |

## Baseline identities (before processing)

- The 12 Stage B job archives: `results/verification/archives-before.sha256`, hashed 2026-11-23T07:32:35Z–07:32:42Z.
- Stage B's sealed records: `research/vg-l0-risk-envelope-stage-b/results/seals.jsonl` (22 files).

## Stage table

| Stage | Status | Command / output | Resume |
|---|---|---|---|
| S0 plan | written | PROTOCOL.md, STANDARD_ADOPTION.json (preflight PASS 07:34Z), AMENDMENTS.md, brief/BRIEF.md | — |
| S1 tools + tests | complete (`60b42db2`; tests 7/7) | `tools/vg-l0-risk-envelope-stage-b-diagnostics/` | rerun |
| S2 C19 | complete 07:39:41–07:49:32Z: 64/64 lanes = sealed, 98,339 centres, 58,545 neighbourhoods, fresh 0, refusals 0; qualification = sealed (194 members); population sha256 `d99957ad…`, qualification `4e72e7e3…`; C19 search copy removed 07:50Z | `launch.sh vgl0rebd-census-C19 … CUT=C19 chains/census.sh` | deterministic rerun from a fresh copy |
| S3 C19 | complete 07:51:27–07:51:41Z (rerun r2 after D3): parity 67/67 to the cent and bit for bit; `results/giveback/giveback-C19.json` `7b91084d…` | `launch.sh vgl0rebd-giveback-C19-r2 … CUT=C19 chains/giveback.sh` | deterministic rerun |
| S2 C21 | running | `CUT=C21 chains/census.sh` | rerun from a fresh copy |
| S2/S3 C24, S3 C21 | not started | — | — |
| S4 analysis, reports | not started | — | deterministic rerun |
| S5 regression, ZIP, push | not started | — | — |

## Guards

- Never write into `research/vg-l0-risk-envelope-stage-b/` or `tools/vg-l0-risk-envelope-stage-b/`. Never open an
  original archive except to hash it. Never delete a Stage B archive.
- No GPU job, no search, no D23 or FULL door.

## Exact commands (repository root `/home/chad/projects/margin-trading`)

```bash
L=/home/chad/projects/margin-trading/research/vg-l0-risk-envelope-stage-b-diagnostics/results/logs
C=/home/chad/projects/margin-trading/research/vg-l0-risk-envelope-stage-b-diagnostics/chains
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
# tests
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test tools/vg-l0-risk-envelope-stage-b-diagnostics/tests/tools.test.ts
# S2 per cutoff: verified copies (search + qualify), census replay, qualification replay (zero evaluations)
tools/vg-l0-risk-envelope-stage-b-diagnostics/launch.sh vgl0rebd-census-C19 $L/census-C19.log -- /usr/bin/env CUT=C19 /bin/bash $C/census.sh
# after its census is verified: remove the cutoff's search copy (re-verifies the original first; logs the removed files)
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-stage-b-diagnostics/archive.ts remove --job C19-search
# S3 per cutoff (needs S2's qualification intermediate): the bounded CPU replays
tools/vg-l0-risk-envelope-stage-b-diagnostics/launch.sh vgl0rebd-giveback-C19-r2 $L/giveback-C19.log -- /usr/bin/env CUT=C19 /bin/bash $C/giveback.sh
# S4 analysis (no evaluation): results/census, results/qualification, results/giveback, results/analysis/TABLES.md
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 tools/vg-l0-risk-envelope-stage-b-diagnostics/analyze.ts
# S5 originals re-hashed against the baseline; regression; bundle
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-stage-b-diagnostics/archive.ts verify-all
/bin/bash $C/regression.sh
tools/vg-l0-risk-envelope-stage-b-diagnostics/bundle.sh <scratch dir>
```

Determinism: the census and qualification replays are pure functions of the archive copy and the sealed records; the
CPU replays are deterministic (bit-for-bit equal to the GPU records); the paired bootstrap uses Stage B's seeded
`Rng.from('vg-l0-risk-envelope-stage-b', 'bootstrap', 'giveback', <metric>, <cutoff>)`. A rerun from a fresh verified
copy reproduces every number.
