# RESEARCH_RECOVERY — Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison (P8-GDX)

## Top screen

- **Updated:** 2026-11-26T16:05Z (clock, UTC). **Status: INCOMPLETE** — the official chain is RUNNING (C19 first).
- **Protocol:** `PROTOCOL.md` P8-GDX 1.0.0 **FROZEN** 2026-11-26T16:03Z, sha256
  `27dcba9ae032bb4db8919f1e3a8fdf4291296d2c8fb17b65833b99ff2c15ab65`; freeze record `results/protocol-freeze.json`
  `bf59be1d49bdeed62333f3997c7a2a160648a9a04006a0cc8d3c8f927906e389` (commit `2bd8153d`); gates `results/engineering/gates.json`
  `43b03b8b68452e02b761a29c2c54e93a5dd02861b5ff74690f7f4f8d8f6dfd77` (E1–E9 pass; commit `3d734a96`); adoption
  `STANDARD_ADOPTION.json` `25640700…`; frozen code digest `4c2c3fd45d07dd143316d457954beb539c1fa90e896ef76683cc8ecb7f4cd178`.
  Amendments: pre-freeze E1, E2 only.
- **Running:** systemd user unit **`gdx8-chain`** (MainPID 2394239 at start; started 2026-11-26T16:03:27Z) running
  `/bin/bash research/gdx-d1-growth/chains/chain.sh` (all cutoffs); log `research/gdx-d1-growth/cache/logs/chain.log`;
  per-stage units `gdx8-<stage>` with logs `cache/logs/chain/<stage>.log`. The chain commits each sealed block itself.
  First attestation `results/gpu-attestations/C19-D-broad-2026-11-26T16-03-35-711Z.json`: 16/16 checks pass.
- **If the chain stopped:** read `chain.log` (the failing step), fix the cause (a code defect needs a sealed code
  amendment `npm run gdx8 -- code-amendment --id A<n> --why …` committed with the fix), then relaunch the SAME command
  (idempotent: sealed stages are skipped; an interrupted job resumes with `--resume`). Never edit `chain.sh` while it runs.
- **While it runs:** no change to `src/gdx-d1-growth` closure files, PROTOCOL.md, AMENDMENTS.md, STANDARD_ADOPTION.json
  (dirtyCode guard); git read-only with `GIT_OPTIONAL_LOCKS=0`; tools/ edits are allowed (not in the closure).
- **Next after CHAIN COMPLETE:** portfolio stage (fetch Yahoo dividends VOOG/VGT/GDX 2016–2026, `npm run gdx8-port -- run`),
  diagnostics (bh, tail, lots, nbhd), tables, reports, bundle, commit, push.
- **Pilot:** 957 requested/s; planning ≈ 66 M requested before rounds/qualification (≈ 19 GPU-hours).

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/gdx-d1-growth`**, created from `421e4c87`
  (`research/tsla-d1-growth` head: the accepted GPU Phase 7 lineage, P6-TSLA's study code). No extra worktree.
- Commit `a33c6ff1`: cherry-pick of `aca31b5f` (the identity-join module and its tests only; byte-identical; 12/12 tests
  pass; dry-run onto `main` clean, tree `a7b2ede6…`). Nothing merged into `main`.
- GPU acceptance `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`
  (GPU Phase 7; out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/pins.jsonl`):
  `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` **VERIFIED** 2026-11-26T15:00Z.
- Node 24.21.0, every evaluating process `node --no-maglev`. npm scripts `gdx8`, `gdx8-eng`, `gdx8-diag`, `gdx8-port`.
- `.git/info/exclude` hides `research/gpu-phase8/`, `research/vg-l0-staged-stop/` (never stage).

## Data (Phase 1.1) — done

- Canonical `data/GDX/data.csv` (Alpaca SIP 1-min raw; 1,490,494 rows; sha256 `77dba9b2…`), existing verified file; nothing
  downloaded. Doors `research/gdx-d1-growth/data/DOOR_PINS.json` sha256 `6c9a9167a721104083cfbba95938c9799c30083a70b96b3fd09a6030ff7a87bd`
  (D19 1,006 / D21 1,511 / D23 2,012 / D24 2,264 / FULL 2,723 sessions; door files in git-ignored `cache/doors/`).
- `GDX_DATA_AUDIT.json` sha256 `72c3d5caaeddeff4bb15e0db901d195d8ac4be66d870dcd88d79a50a54055e53`: 2,723/2,723 sessions, 0
  missing/extra, 0 duplicates/out-of-order/inconsistent bars, development missing minutes 199 (0.02 %), the four March-2020
  14-minute market-wide halts; no split (central ledger, raw gaps, Yahoo 2006–2024 split events). **Finding (disclosed, not a
  blocker):** the canonical closing-print proxy (open of the 16:00 bar, `src/lib/session.ts`) differs from the official
  auction close on 2020-03-18 (5.2 %) and 2020-03-17 (1.2 %); every other development close within 1 % (p99 0.19 %).
- Independent Yahoo series `cache/independent/yahoo-GDX-daily-2006-2024.json` (git-ignored; fetched 2026-11-26, through
  2024-12-31 only); GDX annual December distributions listed (price-only convention).
- `reports/data/SUITABILITY.json` sha256 `6bda64832ea1eb37a9d7d62116c11f9670af370ad3b074d407297e4e20a5a4b7` (D24 only).

## Design decisions so far (to be frozen in PROTOCOL.md)

- GDX trades in the engine's VGT-named slot (both slots one GDX SymDoor; second slot disabled) — P6-TSLA's design.
- Incumbents (`src/gdx-d1-growth/controls.ts`): D1 NORIG (= the N/original ablation), NL0, VG2 (A3 FROZEN_SELECTION
  `4080d4b1…`); Growth G4A1, G4A2, P08, P09, APXA (4A FROZEN_SELECTION `5d262154…` export4B); J controls NORIG × each Growth.
  All on the fine grid (unit test).
- Informed lanes at C24 only for arms D (cells D.A0, D.D1) and G (G.h0.s1, G.h1.s1, G.h2.s1), 6 replicates each;
  populations D+, G+ (incumbents are members), C+ (pairs of D+ × G+ finalists); no independent chronological test.
- Budget = P6-TSLA × 1.5 by replicates (D 6, G 12, J 6, refine 6, S R_S = max(6, ⌈240/(6F)⌉)); ceiling 160 M requested.
- Outcome joins by (population, id) via `joinByIdentity`, fail closed (unit tests).

## Guards

- No official evaluation before the freeze. FULL opens only for data-integrity equality before the freeze.
- Do not edit `src/tsla-d1-growth/` or any other study's records.
