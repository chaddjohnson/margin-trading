# VERIFICATION_REPORT — what was read, what was run, what was not done

## 1. Identity

| Item | Value |
|---|---|
| Task | Priority 3: D1/Growth trailing-stop audit and staged-stop research design (audit/design only) |
| Brief | `brief/BRIEF.md`, a verbatim copy of the user's upload: sha256 `1f10216eab6f6ec53986dd91b43f9377b3c4c6be2a00a1cb7bb1b8a26c8217f8`, 189 lines / 19,629 bytes. It was read in full; its final line, "PRIORITY 4 NOT STARTED — awaiting review and separate authorization", is present (no truncation) |
| Base | `48090c55b4f78fad9a17be3c0b647f5ec5d4d5dc` (`research/vg-l0-risk-envelope-stage-b-diagnostics`, clean tree at start, 2026-11-23T09:36Z) |
| Branch | `research/vg-l0-trailing-stop-audit` (new). `main` (`3606f4b3`) untouched |
| Working tree | the main checkout (no extra worktree). The only change is the new directory `research/vg-l0-trailing-stop-audit/` |
| Runtime | Node 24.21.0 (`.node-version`); Python 3 for read-only table arithmetic |

## 2. Authoritative sources read (Phase 0)

| Source | Version / sha256 | Notes |
|---|---|---|
| `CLAUDE.md`, `docs/claude/context-recovery.md` | at base | GPU-only official optimization; delivery; no visuals; checkpoint procedure |
| `docs/research/OPTIMIZATION_STANDARD.md` | **3.0.0** (registry current), `4e8244e65bf1dd7c…`. `research-preflight --registry`: PASS | §0–§5 and §9 read in full for the proposal |
| `docs/research/methods/NEW_L0_METHOD.md` | NL0 1.0.0, `9b387bb47ce02178…` (= registry) | §1 identity and settings of New L0 |
| `docs/gpu/FEATURE_MATRIX.md`, `PARITY_CHECKLIST.md`, `README.md` | `9f1646e8…`, `06613c50…`, `f67f301e…` | the feature map and the change procedure |
| `config/gpu-backend/acceptance.json` | `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`, ACCEPTED (2026-11-22, GPU Phase 7 chain) | re-verified (§3) |
| `docs/research/ROADMAP.md` | `8f9ec569…` | priorities and status |
| Frozen comparators | `research/vg-l0-full-joint/FROZEN_SELECTION.json` `4080d4b1…` (`newL0`, `rc1-f1a8b57cb02455c3`) | settings in AUDIT_REPORT §1 |
| Stage A / B / diagnostics | `research/vg-l0-risk-envelope-{sensitivity,stage-b,stage-b-diagnostics}/` (READ_FIRST, REPORT, GIVEBACK_REPORT, DECISION_REGISTER, TABLES, giveback JSON) | hashes in SOURCE_MAP §4 |
| D1 risk-control and Growth studies | `research/vg-l0-full-joint/REPORT.md`, `research/vg-l0-risk-metrics/` (METRIC_SPECIFICATION, CANDIDATE_RISK_AUDIT, tables), `research/vgt-d1-refinement/TRAILING_STOP_MECHANISMS.md`, `research/study3-vgt-momentum-stage1b/EXIT_OPTIMIZATION.md`, `-stage1c/MECHANISM_CATALOG.md` | hashes in SOURCE_MAP §3–§4 |
| Source code | every file in SOURCE_MAP §1–§2 at the base revision | the CPU closure files equal their acceptance pins (§3) |
| Branch provenance | `git cat-file` on `main` vs HEAD; `git grep holdUnit research/vg-l0-session-hold` | RC 1 / RC 2 on `main`; `src/risk-envelope/` not on `main`; the sessions hold unit only on its branch |

## 3. Checks run (all read-only, no strategy evaluation)

| Command | Result |
|---|---|
| `wc -l -c`, `tail`, `sha256sum` on the brief | 189 lines, intact, final section present |
| `git status --short`, `git log`, `git worktree list`, `git merge-base --is-ancestor` | clean base; one worktree; `main` and the Phase 7 branch are ancestors of the base |
| `grep -l INCOMPLETE research/*/RESEARCH_RECOVERY.md`; `find … WORK_RECOVERY.md` | no incomplete research checkpoint; every work checkpoint COMPLETE |
| `tools/gpu-backend/verify-acceptance.sh` | **VERIFIED**: 94 CPU, 7 CUDA, 12 host and 29 policy files hash to their pins; evaluation digest recomputed; 42 evidence files intact; source revision `999f299e` is an ancestor; binary `research/gpu-phase7/build/gb7` sha256 matches |
| `npm run research-preflight -- --all` (`node --no-maglev`; reads manifests and hashes only) | exit 0; **28 PASS**, 0 FAIL (unchanged from the Stage B diagnostics' 28/28). This namespace has no adoption manifest: it is not an optimization or evaluation study |
| `npm run research-preflight -- --registry` | PASS (the standard matches the registry) |
| Python (`-I`) over committed CSV/JSON: `research/vg-l0-risk-metrics/results/tables/trades.csv` (`ea799fa1…`), `gaps-through-stop.csv` (`e3e02d91…`), `research/vg-l0-full-joint/results/diagnostics/ledgers.json` (`1c94a640…`), Stage B diagnostics giveback JSON | per-book sums, ratios, implied highs = exit raw ÷ (1 − τ) for stop-level exits (checked: lot #11 340.74 × 0.927 = 315.866 = the recorded fill), activation-gain formula values, design-example arithmetic. Consolidated in the committed, read-only `analysis/giveback_tables.py` (run from the repository root: `python3 -I research/vg-l0-trailing-stop-audit/analysis/giveback_tables.py`; exit 0; output `analysis/giveback_tables.out.txt`). It reads only the committed tables listed here: no engine, no market data |

**Observations recorded during verification:**
- `gaps-through-stop.csv` holds 9 rows for New L0 (one per lot; $10,918.91 beyond the level). An apparent duplicate of
  lot 9 seen in an early terminal listing came from overlapping `head` and `grep` output, not from the file; the
  consolidated script (`analysis/giveback_tables.py`) confirms 0 duplicate rows.
- `trades.csv`'s New L0 net sums to $479,605.15 against the sealed $479,605.18 (per-row cent rounding).

## 4. Explicitly NOT done (confirmations)

- **No optimization, search, genetic algorithm, candidate evaluation, validation campaign or backtest** of any kind,
  CPU or GPU. No GPU job was opened; no official or non-official evaluation was run; no engine runner was started.
- **No implementation**: no change to `src/`, `apps/`, `config/`, `tools/`, datasets, CUDA sources, Strategy Lab, the
  optimization standard, NL0, the acceptance record or any other study's files (`git status`: only this directory is
  new).
- **No staged-stop value was evaluated on any history.** Every parameter value in the design documents is hypothetical
  or a proposed domain bound.
- **No archive was restored or decompressed.** The SQLite archives (Stage B ≈ 18 GB, L0 `.zst`) were not needed: every
  per-lot figure came from committed tables. Nothing was copied to scratch, so there is nothing to clean.
- **No dataset was opened.** `data/*/data.csv` was listed, not read.
- No merge into `main`, no deployment, no broker access, no force-push.
- **Priority 4 was not started.**

## 5. Limits of this verification

- **Line references** are to the base revision. They were re-checked against the files before writing (SOURCE_MAP).
  The CUDA citations rely on reading, not on running kernels.
- **Behavioural statements** are verified by reading code and archived records, not by new tests.
  - Their correctness for the frozen comparators rests on the archived parity of those records with the engines: the
    Stage B diagnostics' 199 CPU replays, equal to the GPU to the cent, and Assignment 3 / risk-metrics reproductions.
- **The giveback analysis covers the frozen comparators** (FULL ledger) and the Stage B summaries. It does not cover
  every searched phenotype at lot level.
