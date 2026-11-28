# RESEARCH_RECOVERY — Priority 9: MSFT D1 + Growth, comprehensive GPU research (P9-MSFT)

## Top screen

- **Updated:** 2026-11-28T09:18Z (clock, UTC). **Status: INCOMPLETE** — data done; PROTOCOL.md final text (not yet frozen); gates
  E1–E6 and the pilot PASS; pre-freeze commit `e9317da8`; E7/E8 running (`chains/tests.sh` in unit `msft9-tests`, log
  `cache/logs/tests.log`, outputs `results/engineering/tests/`). **No official evaluation has run.**
- **Brief:** `brief/BRIEF.md` (256 lines, 28,460 bytes, sha256 `562e12eb3ab85ae1013bcda139cc7329e42ad80508bc9b1957f38ae116e6aad5`,
  read in full to its final line 2026-11-28T08:20Z). It authorizes implementation and the full optimization after the
  data, protocol-freeze and CPU/GPU gates; commit and push of the research branch; no trading, broker, deployment,
  adoption, merge into `main`, combination with any other security, or start of the additional-stocks study.
- **Protocol:** not yet written/frozen (`PROTOCOL.md` P9-MSFT 1.0.0 to be derived from P8-GDX / P6-TSLA).
- **Next step:** finish the protocol, adoption manifest, functionality audit and chain scripts; run gates E1–E9 and the
  pilot; commit; seal `gates`; `freeze`; commit; launch the chain.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/msft-d1-growth`** created from `main` at
  `ef0014bc` (the Assignment 2 integration: standard 5.0.0, GPU Phase 9 ACCEPTED, the TSLA identity fix, GDX and TSLA
  study code all on `main`). No extra worktree (the locked Strategy Lab release worktree is untouched).
- Node 24.21.0 (fnm), every evaluating process `node --no-maglev`. npm scripts `msft9`, `msft9-eng`, `msft9-diag`.
- GPU acceptance `config/gpu-backend/acceptance.json` sha256 `9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4`
  (GPU Phase 9; binary `research/gpu-phase9/build/gb9` `36dcc251…`; RTX 5090 `GPU-ae5f222c…`); out-of-band pin
  `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json` equal.
  `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 9ebb33ce…` **VERIFIED** 2026-11-28T08:22Z
  (19 PASS; log `cache/logs/verify-acceptance-p0.log`).
- Standard `docs/research/OPTIMIZATION_STANDARD.md` **5.0.0** sha256 `68487de7b67cd9ccbf70478f51d12f5ef19287d6fa34a737c69f4b49b277eeaf`,
  read in full 2026-11-28T08:20Z; research date range R1 (development 2016-01-04 → 2024-12-31, validation 2025-01-01 → 2026-10-30).
- Free disk 348 GB at start (2026-11-28T08:20Z).

## Phase 0 — lineage (done)

- TSLA (`research/tsla-d1-growth/`, NO QUALIFYING TSLA CANDIDATE) and GDX (`research/gdx-d1-growth/`, NO QUALIFYING GDX
  CANDIDATE) are complete and on `main`; never edited here.
- Identity join `src/research-outcome/identityJoin.ts` is on `main` (cherry-pick `aca31b5f` via GDX, and the TSLA fix
  `70f8bdf1` merged by A2 `efd7454b`): **not cherry-picked again**.
- Code base: `src/msft-d1-growth/` copied from `src/tsla-d1-growth/` (the no-incumbent design; collision-free rename
  TSLA→MSFT; the engine's slot names GDX/VGT untouched), with P8-GDX's doors (central split ledger) and a rewritten
  `outcome.ts` (identity join by (arm, id), fail closed; evidence-sufficiency condition (d) ES1–ES3). Tools
  `tools/msft-d1-growth/` from TSLA's (data tool from GDX's). Search lane re-derived (`search.ts` sha256 `2f812203…`).

## Phase 1 — data (done; blocking prerequisite satisfied)

- Download 2026-11-28T08:23:45Z → 08:26:58Z: `( set -a; . ./.env; set +a; OUTPUT_DIR=data scripts/download.sh MSFT 2016-01-04 2026-10-30 )`
  (162 requests; log `cache/logs/download.log`, no secret text), then `npm run datasets -- import MSFT --dry-run`,
  `… import MSFT --keep-source`, `… verify MSFT` (VERIFIED); staging `data/MSFT.csv` removed after sha256 equality.
- Canonical `data/MSFT/data.csv`: 1,619,189 rows, 90,939,174 bytes, sha256 `b2d79f9425e9f79eb3f59584a3bdfc3b7f797124f247399b759f2aab1a98be91`,
  2016-01-04T09:00Z → 2026-10-30T23:59Z (= the R1 byte-prefix pin through 2026-10-30; `npm run datasets -- prefix MSFT --through 2026-10-30`).
  Import report `data/MSFT/dataset-report.json` `62630ce3…`.
- Doors `data/DOOR_PINS.json` `7deac6d79b56b2db4e331e45c1ab687a0b7f698ea196f7dc10e54fa40ed75f7f`: D19 1,006 / D21 1,511 /
  D23 2,012 / D24 2,264 / FULL 2,723 sessions (door files in git-ignored `cache/doors/`).
- Audit `MSFT_DATA_AUDIT.json` `74e087e7…`: 2,723/2,723 sessions, 0 missing/extra; early closes 18/18 + 3/3; missing
  regular minutes 115 dev (0.01 %), 0 validation; 6 intra-session gaps ≥ 5 min (2016-02-02, 2016-02-22 — source-wide,
  same minutes in TSLA's file — and the four March 2020 market-wide halts); 0 duplicates / out-of-order / inconsistent;
  0 minute outliers; 558,391 extended-hours rows (kept, never a bar); no split (central ledger `e5bde427…` 0 MSFT events;
  0 split-sized raw gaps; Yahoo's 9 splits all ≤ 2003-02-18); 36 dividends 2016–2024 ($19.47/share; price-only
  convention); closes within 1.42 % of Yahoo (2020-03-18 closing-print proxy; p99 0.19 %). No blocker.
- Independent Yahoo series `cache/independent/yahoo-MSFT-daily-1986-2024.json` `898346b3…` (fetched 2026-11-28; through
  2024-12-31 only). Suitability (D24 only) `reports/data/SUITABILITY.json` `9cd3d641…`.

## Design decisions so far (to be frozen in PROTOCOL.md)

- Budget (`budget.ts`): P8-GDX × 4/3, Growth base × 2 → D 8, G 24, J 8, refine 8, S R_S(F) = max(8, ⌈320/(6F)⌉) = 54/27/18;
  rounds ≤ 4 at 2 %; island caps 16; hard ceiling 250 M requested.
- Evidence sufficiency (d) ES1–ES3 (≥ 10 lots, ≥ 3 per family for C/J/S; ≥ 5 episodes and ≥ 4 entry years; top episode
  ≤ 50 % of net): binding on the candidate determination only; departure DP1 from standard §2.6 citing brief Phase 3 item 7.
- External controls: New L0's and N/original's VGT books projected unchanged onto MSFT (arms D, G, J; never members).
- No informed lane (no MSFT incumbent). No total-portfolio stage (brief Phase 2: not in this study).

## Engineering gates (pre-freeze; `results/engineering/`)

| Gate | Status | Evidence |
|---|---|---|
| E1 | PASS 08:45Z | verify-acceptance VERIFIED (9ebb33ce…), entrypoint audit clean |
| E2 | PASS | 5 doors = partition path; causal prefixes; no split; regular-session semantics (0 bars outside, 2,723 closing prints, 21 early closes at 13:00) |
| E3 | PASS | New L0 / N/original GPU = CPU = sealed on D24 and FULL (own VGT/GDX data) |
| E4 | PASS 08:51Z | 0 / 2,852 record comparisons differ on each of D19, D21, D23, D24 (576 configs, 72 cells, box extremes included) |
| E5 | PASS 08:57Z | graceful stop/resume, process SIGKILL resume, server SIGKILL (fails closed, exit 1) resume, CPU: 0 differences |
| E6 | PASS 08:58Z | single-family 48/48, inert slot 48/48, causal 136 × 3 doors, accounting: 0 differ |
| E9 pilot | PASS 09:17Z | D21, BENCH keys: 1,168,221 requested in 1,140 s (1,025/s); per broad lane D 13,910 / G 14,660 / J 16,546; refine 30,766; all *triggers not met*; cgroup peak 9.5 GB. Summary step re-run (no evaluation) after fixing its planning arithmetic, which had used P6-TSLA's lane counts: ≈ 100.2 M requested before rounds/qualification |
| E7, E8 | running since 09:18Z (tests.sh) | — |
| Adoption | written 09:17:53Z | `STANDARD_ADOPTION.json` (protocol sha256 `a0ff207e…` at writing); preflight PASS |

## Guards

- No official evaluation before the freeze. FULL is read before the freeze only for data-integrity counts (done: audit).
- Never edit `src/tsla-d1-growth/`, `src/gdx-d1-growth/` or any other study's records.
- `.env` credentials: read only by the download subshell; never print.
