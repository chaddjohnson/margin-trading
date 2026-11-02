# Research recovery checkpoint — Study 9, Phase A (ETF-pool discovery S0–S3)

## Top screen (read this first)

- **Updated:** 2026-11-02T20:17Z (UTC, from the clock). **Status: COMPLETE (Phase A).**
- **Stopped at the review checkpoint.** No Phase B: no NSGA-II and no joint optimization.
- **Authority:**
  - `PROTOCOL.md` sha256 `a3d84a2b26fa683f…`, FROZEN 2026-11-02T19:14:16Z;
  - amendments A0 (pre-freeze), **E1** (code fix, acknowledged as `code-E1`) and E2 (disclosure only).
- **Chain** (`results/chain.jsonl`; `npm run study9 -- verify-chain` passes): head **`a1e912a2b5fd2556`**.
  `protocol` → `code-E1` → `parity` → `s1` → `s2` → `s3-screen` → `s3-high` → `s3-nominate` → `report-phase-a`.
- **Running process:** none.
- **Follow-up gate (needs the user):**
  1. approval for Phase B: option C, about 49 CPU-hours, or the choice in `PHASE_B_OPTIMIZATION_PROPOSAL.md` §8;
  2. whether to commit and push the study (not yet authorized; nothing is committed).
- **Next action:** none until the user decides.

## Audited deliverables (sha256 prefixes; the reports are sealed in `report-phase-a`)

| File | sha256 |
|---|---|
| `RECOMMENDATION.md` | `d70f1a33f9ac8ef3` |
| `PHASE_B_OPTIMIZATION_PROPOSAL.md` | `0d6fc6ea628c5bc1` |
| `POOL_MARGINAL_CONTRIBUTION.md` (S3) | `8e5dcc1ab8e30867` |
| `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md` (S2) | `63757ae716a93880` |
| `STANDALONE_SCREEN.md` (S1) | `3ef71b05bab8b462` |
| `DATA_AND_UNIVERSE_AUDIT.md` (S0) | `d343ac1aace9073c` |
| `DATA_MANIFEST.md` | `a2288f5dbfccf53a` |
| `reviews/METHODOLOGY_REVIEW.md` | `1ae14893b09aa38b` (sealed in `protocol`) |
| `reviews/METHODOLOGY_REVIEW_VERIFICATION.md` | `f4949a555fbf5ee7` (sealed in `protocol`) |
| `reviews/FINAL_AUDIT.md` | `215b3f28b0013360` |
| `results/s3/nominations.json` | `2f97de53c41e31d0` |
| `results/parity/parity.json` | `ef282568b8311c7f` |
| `results/s2/s2.json` | `6db22bfbef5e8ea3` |

Not sealed, and therefore still editable: `README.md`, `RUN_COMMANDS.md`, this file, and the live `AMENDMENTS.md`
(its snapshot `results/freeze/AMENDMENTS-report.md` is sealed).

## Results (for orientation; the records are authoritative)

- **Data:**
  - all 64 files refreshed through **2026-10-30**;
  - **61 ETFs eligible**;
  - the training projection ends 2024-12-31;
  - no post-2024 strategy computation.
- **S1:** 55 of 61 ETFs have a plausible generic vector; none has a Study 8-feasible one.
- **S2:**
  - 26 market-wide event families hold 70% of decisions;
  - 12 complete-linkage groups;
  - N seeds XLF, IWM, XLB.
- **S3:**
  - 1,303 proposals, 11,427 unique configurations, 576 null pools;
  - 103 proposals high-evaluated, 21 feasible, **6 nominated**:
    - G4 KRE+GDX+ILF+MTUM ($25.9k/yr robust, 90.9%);
    - N3 EDV+IWM+XLF;
    - N2 SMH+XHB, EDV+XHB, IWM+SMH;
    - V3 VGT+IWM+XLF;
  - **VG negative.**
- **Batches:** A = {KRE+GDX+ILF+MTUM, EDV+IWM+XLF, SMH+XHB}; B = {KRE+GDX+ILF+MTUM, VGT+IWM+XLF, EDV+XHB}. The
  recommended option C is their union.

## Environment

- **Checkout:** the main checkout `/home/chad/projects/margin-trading`; no other worktree.
- **Branch:** `research/study9-etf-pool-discovery`, HEAD `535992064764365724fad43ce67988f52fca2c2b`. That is the
  branch point from `research/study8-expanded-regime-d1`; **nothing has been committed**.
- **Working tree:**
  - untracked `research/study9-etf-pool-discovery/` and `src/study9-etf-pool-discovery/`;
  - `package.json` modified (the `study9` npm script);
  - the user's own untouched changes: `config/market-events/distributions.csv` and `distributions.manifest.json`
    modified, the raw folder `config/market-events/raw/vanguard-20261030T184421Z/` and five `._.DS_Store` files
    untracked.
- **Runtime:**
  - Node v24.21.0;
  - npm script heap 16 GB;
  - parallel stages: 8 S1 workers, 4 screen processes, 5 high processes.
- **Local data (git-ignored):**
  - `data/<SYMBOL>/data.csv` (refreshed);
  - `data/vintages/pre-study9-2026-11-02/` (the prior vintage, read-only hard links);
  - `data/vintages/study9-refresh-2026-11-02/` (increments and run records);
  - `data/vintages/study9-train-2024/` (the read-only projection, 2.8 GB).
- **Caches:** `results/cache/` (1.1 GB, git-ignored). Retained until the user's Phase B decision. Deleting it changes
  no sealed result.

## Stage table

| Stage | Status | Command | Sealed output | Rerun guard |
|---|---|---|---|---|
| S0 refresh | complete 17:01–17:12Z | `scripts/s0_refresh.sh snapshot`, `… download 2026-10-31`, `… append`; `npm run datasets -- verify` | `results/s0/inventory-*.json`, `data-vintage-manifest.csv` | the snapshot is write-once; **do not rerun** |
| S0 audit and projection | complete | `npm run study9 -- s0-audit`, `npm run study9 -- s0-project` | `results/s0/symbols.json`, `projection.json` | refused after the freeze |
| Pilot | complete 17:31Z | `npm run study9 -- pilot` | `results/pilot/pilot.json` | refused after the freeze |
| Smoke tests (5) | complete; outputs deleted unread | scratch `smoke.ts` | none | code-path only |
| Reviews | complete (review, verification) | fresh agents | `reviews/` | — |
| Freeze | complete 19:14:16Z | `npm run study9 -- freeze-protocol` | chain `protocol` | write-once |
| E1 acknowledgement | complete 19:15:24Z | `npm run study9 -- acknowledge-code E1` | chain `code-E1` | — |
| Parity | complete 19:21:48Z | `npm run study9 -- parity` | chain `parity` | refuses once sealed |
| S1 | complete 19:24:50Z | `scripts/run_s1.sh 8`; `seal-s1` | chain `s1` | refuses once sealed |
| S2 | complete 19:27:43Z | `npm run study9 -- s2` | chain `s2` | refuses once sealed |
| S3 screen | complete 19:36:45Z | `s3-screen --family V\|G\|VG\|N` (parallel); `seal-s3-screen` | chain `s3-screen` | refuses once sealed |
| S3 mid/high | complete 19:50:44Z | `s3-high --part V\|G\|VG\|N\|C` (parallel); `seal-s3-high` | chain `s3-high` | refuses once sealed |
| S3 nominate | complete 19:50:51Z | `npm run study9 -- s3-nominate` | chain `s3-nominate` | refuses once sealed |
| Tables and reports | complete | `python3 research/study9-etf-pool-discovery/scripts/build_tables.py all`; reports; final audit; `seal report-phase-a …` | chain `report-phase-a` | — |

## Constants

- **The definitions:** `PROTOCOL.md` and the pinned rulebook in `results/protocol_freeze.json`.
- **Seeds:** `deriveSeed('study9-etf-pool-discovery', …labels)`.
- **Budgets:**
  - 64 vectors per ETF;
  - nine assignments;
  - 96 proposals per stratum (72 + 24);
  - 48 null pools per non-exhaustive stratum;
  - neighbourhoods of 16 / 64 / 3×128 points.
- **Door:** ≤ 2024-12-31, projection root only.

## Guards

- **Do not rerun:** any stage. All are sealed; the stage commands refuse.
- **Never:**
  - open a post-2024 door in Phase A;
  - edit `PROTOCOL.md`, the reviews or any sealed file (the chain would fail);
  - edit Study 8 or earlier records;
  - touch `config/market-events/*`.
- **Commit and push:** only on the user's explicit request.
- **Phase B:** only after the user's approval, as a new run with its own protocol (`study9-phase-b` seeds).

## Disclosures (carried into the reports)

- **The smoke tests.** Training data at toy budgets, outputs deleted unread. Their fail-safes (the ETF-order fallback
  and the risk-flagged fill) chose the N seeds and the protected list, because no ETF had a feasible standalone
  vector (AMENDMENTS A0; `RECOMMENDATION.md`).
- **E1.** A post-freeze fix to the loader-caller check's self-match. The refused first parity attempt opened no door.
- **E2.** The value of y in the protocol text (7.524 against 7.5357); no effect on any rule.
- **The degenerate "weak but distinct" list.** Uninformative in this study (`STANDALONE_SCREEN.md` §4).
- **SMH in the N family.** A near-tech ETF, not a VGT proxy by the frozen thresholds (disclosed in the S2, S3 and
  recommendation reports).
- **The inherited `npm test` suite** was not run: it reads post-2024 data in this checkout.
- **Logs.** `results/logs/` is git-ignored by the root `.gitignore` (`logs/`). It would not be committed.
