# RESEARCH_RECOVERY — RES-BD 1.0.0: Stage B census and profit-giveback diagnostics — COMPLETE

**Top screen** (times UTC from `date -u`; `ls` listings on Apollo show CET = UTC+1)

- Updated: 2026-11-23T08:14Z. **COMPLETE.** Both deferred Stage B diagnostics are done for C19, C21 and C24, and verified. The
  reports, regression and handoff ZIP are done.
  - **Census:** zero evaluations, 64/64 lanes = sealed at every cutoff.
  - **Giveback:** 199 CPU replays, 199/199 parity to the cent and bit for bit.
  - **Originals:** 12/12 unchanged.
- Authority: `PROTOCOL.md` sha256 `90341d417dcbce6da31ad6d9358ddb6b11ededb2d306e9518a003974c3c61aab` (committed
  `9e5c4767`, unchanged); `brief/BRIEF.md` `b15e9746…`; `AMENDMENTS.md` head **D4 / O3**.
- Running: nothing (`systemctl --user list-units 'vgl0rebd*'` shows only the slice).
- **Follow-up gate:** the user's review of the ZIP and of `DECISION_REGISTER.md` R1–R7: keep P0; close the envelope
  work; proceed to Priority 3; the archives. **Do not rerun anything merely because a session is new.** Every result
  is deterministic and recorded. A rerun needs fresh verified copies (`archive.ts copy`).

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
| S0 plan | complete (`9e5c4767`, before any tool ran on a real record) | PROTOCOL.md, STANDARD_ADOPTION.json (preflight PASS 07:34Z), AMENDMENTS.md, brief/BRIEF.md | — |
| S1 tools + tests | complete (`60b42db2`; tests 7/7) | `tools/vg-l0-risk-envelope-stage-b-diagnostics/` | rerun |
| S2 C19 | complete 07:39:41–07:49:32Z: 64/64 lanes = sealed, 98,339 centres, 58,545 neighbourhoods, fresh 0, refusals 0; qualification = sealed (194 members); population sha256 `d99957ad…`, qualification `4e72e7e3…`; C19 search copy removed 07:50Z | `launch.sh vgl0rebd-census-C19 … CUT=C19 chains/census.sh` | deterministic rerun from a fresh copy |
| S3 C19 | complete 07:51:27–07:51:41Z (rerun r2 after D3): parity 67/67 to the cent and bit for bit; `results/giveback/giveback-C19.json` `7b91084d…` | `launch.sh vgl0rebd-giveback-C19-r2 … CUT=C19 chains/giveback.sh` | deterministic rerun |
| S2 C21 | complete 07:50:02–08:00:13Z: 64/64 = sealed, 97,779 centres, 59,569 neighbourhoods, fresh 0; qualification = sealed; population `68b508d5…`, qualification `e27778b6…`; C21 search copy removed 08:00:28Z | `CUT=C21 chains/census.sh` | rerun from a fresh copy |
| S3 C21 | complete 08:00:28–08:00:47Z: parity 66/66; `giveback-C21.json` `177980dd…` | unit `vgl0rebd-giveback-C21` | deterministic rerun |
| S2 C24 | complete 07:54:45–08:03:39Z (concurrent with C21, O2): 64/64 = sealed, 106,318 centres, 46,974 neighbourhoods, fresh 0; qualification = sealed; population `9fb37c62…`, qualification `97961c2a…`; C24 search copy removed 08:03:51Z | `CUT=C24 chains/census.sh` | rerun from a fresh copy |
| S3 C24 | complete 08:03:51–08:04:12Z: parity 66/66; `giveback-C24.json` `40035f9f…` | unit `vgl0rebd-giveback-C24` | deterministic rerun |
| originals | `archive.ts verify-all` 08:04:39Z: 12/12 unchanged (`archives-after.sha256`); qualify copies removed 08:04:40–41Z | — | — |
| S4 analysis, reports | complete: `results/analysis/TABLES.md`, census / qualification / giveback records; REPORT, READ_FIRST, CENSUS_REPORT, GIVEBACK_REPORT, VERIFICATION, DECISION_REGISTER, DATA_SCHEMAS | `analyze.ts` | deterministic rerun |
| S5 regression | complete 08:07:16–08:11:56Z on `d7f24591`: tool tests 7/7; Stage B tests 41/41; npm test = the 7 known failures (identical set); preflights 28/28; seals 0 differences; integrity diff empty; acceptance VERIFIED; Strategy Lab portfolio parity ALL VERIFIED, state fingerprint unchanged | `chains/regression.sh` | rerun |
| S5 ZIP, push | see Delivery | `bundle.sh` | rebuild |

## Guards

- Never write into `research/vg-l0-risk-envelope-stage-b/` or `tools/vg-l0-risk-envelope-stage-b/`. Never open an
  original archive except to hash it. Never delete a Stage B archive (≈ 18 GB, kept for review; DECISION_REGISTER R5).
- Git-ignored, kept: `.cache/vg-l0-risk-envelope-stage-b-diagnostics/` (the nine intermediates, ≈ 78 MB, sha256 in
  `VERIFICATION.md` §1). The scratch archive copies were all removed (`results/verification/archive-actions.jsonl`).
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

## Disclosures (AMENDMENTS.md)

- D1 / D2: two defects of Stage B's never-run `census.ts`, both fixed in this namespace's tools with regression tests:
  a hash limited to 2 GiB, and a lane comparison that turns `"__Inf"` into `null`.
- D3: an over-strict path check of mine stopped the first C19 giveback run; it was aligned with the established 1e-6
  rule and rerun. D4: the bound check is made to two cents (cent rounding).
- O1: output locations and the added capture. O2: the C21 and C24 census copies coexisted. O3: 798 CPU engine runs
  against 630 planned (the D3 rerun).
