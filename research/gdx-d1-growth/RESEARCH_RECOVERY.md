# RESEARCH_RECOVERY — Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison (P8-GDX)

## Top screen

- **Updated:** 2026-11-26T15:52Z (clock, UTC). **Status: INCOMPLETE** — pre-freeze engineering. Committed `10389e64`.
  Gates **E1–E6 PASS** and the **pilot (E9) PASS** (all under code digest `4c2c3fd45d07dd14…`, 195 files); E7/E8
  (`chains/tests.sh`, unit `gdx8-tests`, log `cache/logs/tests.log`) RUNNING; `STANDARD_ADOPTION.json` written
  (protocol sha256 `27dcba9a…` at that time); preflight PASS.
- **Brief:** `research/gdx-d1-growth/brief/BRIEF.md` sha256 `2325d8875280fc85ca08890f1148407083a2205e25c3a32302fb7aa14b739d3d`.
- **Protocol:** `PROTOCOL.md` P8-GDX 1.0.0 — final draft (sha256 `27dcba9ae032bb4d…`); not yet frozen.
- **Next steps (in order):** tests finish → `python3 -I tools/gdx-d1-growth/tests-record.py` → commit everything →
  `npm run gdx8 -- gates` → commit → `npm run gdx8 -- freeze` → commit → launch the chain
  `tools/gdx-d1-growth/launch.sh gdx8-chain $PWD/research/gdx-d1-growth/cache/logs/chain.log -- /bin/bash $PWD/research/gdx-d1-growth/chains/chain.sh`.
- **Pilot:** 957 requested/s on D21; per broad lane D 14,130, G 10,498, J 13,333, S 11,960; refinement 30,735; every lane
  "triggers not met"; planning ≈ 66 M requested before rounds/qualification, ≈ 19 GPU-hours.
- **Gate results:** E1 VERIFIED + entrypoints clean; E2 doors = canonical, causal, no split, = N/original's GDX slot (D24,
  FULL); E3 N/original/New L0 = sealed (D24, FULL), the ablation native = projected lot by lot (NORIG, NL0, VG2; D24, FULL),
  4A Growth incumbents = 4A sealed dev figures to the cent; E4 0/1,198 differ on each of D19–D24 (251 configs, 72 cells);
  E5 graceful / process-kill / server-kill resumes and CPU identical (0 diffs); E6 single-family, inert slot, causal,
  accounting all 0. P6-TSLA's 163 seals verify on this branch (`results/engineering/tests/tsla-verify.txt`).
- **Portfolio tool** `tools/gdx-d1-growth/portfolio.ts`: engineering test on D24 with the three references reconciled
  (cache/portfolio-test; not a report).

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
