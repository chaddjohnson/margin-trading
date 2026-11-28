# RESEARCH_RECOVERY — Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison (P8-GDX)

## Top screen

- **Updated:** 2026-11-27T07:35Z (clock, UTC). **Status: COMPLETE.** Research, reports, commit, push and the verified
  handoff ZIP are done ("Delivery" below). Nothing is running. **Never rerun any official stage** (every one is sealed;
  `results/seals.jsonl`, 156 entries re-verified 07:09Z).
- **OUTCOME (sealed, commit `4615a33b`): NO QUALIFYING GDX CANDIDATE.** Candidates 0; development-only 2 (G
  `f13f3e1d64379748` `C24/G/refine/G.h1.s1/R105#1 profit`; C `rc1-5beecb91ea91c775` `C24/C/pair DF2×GF1`); informed
  development-only 0. All five independent sequential procedures unsupported (D $26,912 / $48,177; G −$36,677 / $62,458;
  C $11,183 / $52,065; J $26,676 / $45,938; S $69,432 / $48,177). Validation: D −$15,255 (V1 ✗); J, S reset DD $60,066 /
  $59,792 (V2, V3 ✗).
- **Total portfolio (report-only, after the outcome):** every GDX-only scenario's max total-account DD exceeds core +
  N/original's ($612,387) by $3,025–$27,954 (+0.5–4.6 %); terminal wealth −$124,242 to −$443,452; §15.8 label "no material
  difference" for all.
- **Sealed records:** `FROZEN_SELECTION.json` `984dd972456d57620e81c4b3a59190cb0014bfb502b949260b00fb6331a1fe0e` (`1ce56feb`);
  `results/selection/C24.json` `2da07d41bf32285af19e9fd215f7879913ce0466650cb40a5460f608899a9952`;
  `results/doors/FULL-authorization.json` `1adbb67257fe426bbedb86e721e789e754c7de4df06eb93fc52b6e838454f558` (`76393753`);
  `results/validation/validation.json` `8e20fa93472ef60b306267b470977c41f1485409fdeeda1fc3b8fed27cd0865e` (`f100a147`);
  `results/outcome.json` `647afac401db031af768ced69f8ef24b783db6b725d1aba9894af532da7ae929` (`4615a33b`);
  `results/sequential.json` `cd5ed595a2f42ffc24728f1ae0dc3d696eec38baa5d823dfb4ec78fcbb06185d` (`3f414d7d`); C23 / C21 / C19
  selections and slices `1b68cd19…` / `dc7c24fc…`, `e90dff15…` / `8e0b21ea…`, `36e3f6f6…` / `c5b7f2ab…`.
- **Report-only deliverables (07:32Z):** `reports/portfolio/portfolio.json` `7324adfd5dbb91e345149d3ac825a7c435b6ce095cb0db2e9df7fea1cb995011`
  (+ `series/*.csv`); `reports/tables/outcome-reconciliation.json` `759c7c68c3b58f269dffe569777707b66c129b05eb9e3b86577ddb7d9bf8cbe0`
  (507/507); `…-mutations.json` `6e5e8ddcc0e6de8f7283f402ca8af55cb30da89ecd9a55358ac6d1a4f34397f9` (13/13);
  `reports/tables/gpu-jobs.json` `858b16d9cc57e83737fba2ea64ba36899799abd516d0bd7ade4cfdcc55d68337` (81 jobs, 0 CPU-scored);
  diagnostics `lots.json` `de810470…`, `nbhd-small-wide.json` `8d50d254…`, `tail-stress.json` `c2a7bb2a…`,
  `buy-and-hold.json` `5ed6551d…`; REPORT.md `75d296a3…`; READ_FIRST.md `4a457511…`; TOTAL_PORTFOLIO_COMPARISON.md `7eea50bd…`.
- **Post-outcome tool corrections (DECISION_REGISTER R1–R3):** reconciler validation path + per-finalist flags (found by
  its mutation tests); portfolio tool `ensureAllFrozen` (S configurations); Yahoo per-current-share distribution units
  (stage rerun 07:14Z). No sealed record changed.
- **Protocol:** `PROTOCOL.md` P8-GDX 1.0.0 FROZEN 2026-11-26T16:03:15Z, sha256
  `27dcba9ae032bb4db8919f1e3a8fdf4291296d2c8fb17b65833b99ff2c15ab65`; freeze record `results/protocol-freeze.json`
  `bf59be1d49bdeed62333f3997c7a2a160648a9a04006a0cc8d3c8f927906e389` (`2bd8153d`); gates `results/engineering/gates.json`
  `43b03b8b…` (E1–E9 pass); frozen code digest `4c2c3fd45d07dd143316d457954beb539c1fa90e896ef76683cc8ecb7f4cd178`.
  Amendments: pre-freeze E1, E2 only (no post-freeze amendment).
- **Delivery:**
  - Reports and tools commit `c1e6ba14841a2e60c6e55e82f3ef5c8dacf3b3c9`, pushed to `origin research/gdx-d1-growth`.
    `git ls-remote` equalled it at 07:33Z (new remote branch).
  - Handoff ZIP built from `c1e6ba14` at 07:34:30Z: `bundle/gdx-d1-growth-handoff.zip`, sha256
    `ad17b93e76c2653a8095d509e0557d4bd7c95b5a41f84d74b9ca13b490c4bd6b`, 7,575,388 bytes, 790 files. `zip -T` OK;
    `sha256sum -c` passed on all files after extraction; secrets / personal-data scan clean (`bundle/VERIFICATION.md`).
  - Stable copy `~/.local/share/margin-trading-gpu/handoffs/gdx-d1-growth-handoff.zip` (+ `.sha256`), re-verified.
  - Bundle commit `9e5958fd58133dedf9e83117f3415972b514ee35` pushed; `git ls-remote origin research/gdx-d1-growth` equalled it
    at 07:35:36Z. This checkpoint update is the branch's last commit; its push is verified the same way.
  - `main` is untouched (`3606f4b3`). No merge, no deployment, no broker access.
- **Follow-up gate (needs the user):** DECISION_REGISTER §U (no adoption; optional new prospective study; merge review;
  archive retention). The MSFT study is not started.

## Environment

- Main checkout (repository root), branch **`research/gdx-d1-growth`**, created from `421e4c87`
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
