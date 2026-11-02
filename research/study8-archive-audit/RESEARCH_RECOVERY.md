# Research recovery checkpoint — Study 8 archive audit (read-only, report-only)

## Top screen

- **Updated:** 2026-11-02T16:11Z (UTC, from the clock). **Status: COMPLETE (audit, reports and verification).**
  **Committed and pushed at the user's explicit request** (2026-11-02, answering the commit/push question):
  - `b31ce7c3f7a7275f7a41f28be736d5a9d10185b1` on `origin/research/study8-expanded-regime-d1`;
  - `git ls-remote` equals local, verified 2026-11-02T16:12:39Z;
  - the follow-up commit records this checkpoint;
  - no PR, no merge.
- **Task:** the user's brief of 2026-11-02, "Study 8 archive audit: profitable, genuinely robust D1 candidates
  overlooked by selection?" (reissued). A read-mostly audit of the existing Study 8 records.
  - No optimization, search, T1 extension or refreshed candidate generation.
  - No new pool or ETF backtest, no replay and no new test door.
  - No change to fitness, thresholds, protocol, nominations or sealed records.
  - No engine runs: every number comes from archived records.
- **Authority:** `research/study8-expanded-regime-d1/PROTOCOL.md` and `AMENDMENTS.md`, with the sealed records and
  `results/chain.jsonl`. All read-only and unchanged: `outputs/baseline-manifest.sha256` (609 files, sha256
  `6491f8d504f25659…`, written 15:29Z) re-verified at 16:11Z, all OK.
- **Running process:** none.
- **Next action:** none in this task. Any optimization, ETF-selection test or rule change needs the user's approval in
  a new assignment.
- **Reproduce everything:** `python3 -B research/study8-archive-audit/scripts/run_all.py` (then `--check`), and
  `python3 -B research/study8-archive-audit/scripts/fill_report_tables.py --check`.

### Audited deliverables (sha256, first 16 hex; recomputed 2026-11-02T16:11Z)

| file | sha256 |
|---|---|
| `README.md` | `fee2bca7924a439f` |
| `ARCHIVE_INVENTORY.md` | `a48bd36d9d1c0ddc` |
| `PROFIT_ROBUSTNESS_FRONTIER.md` | `41b4f74334af561d` |
| `VALIDATION_PERSISTENCE_AUDIT.md` | `960a701756e9b41b` |
| `OPTIMIZER_SELECTION_AUDIT.md` | `71bb99d6b2faac29` |
| `FUTURE_ETF_POOL_DISCOVERY_DESIGN.md` | `50a9658707c496f0` |
| `RECOMMENDATION.md` | `25fc0b7ef21ee12e` |
| `RUN_COMMANDS.md` | `0d67334ab5384a09` |
| `reviews/REPORT_REVIEW.md` | `75acafa6da316179` |
| `outputs/MANIFEST.sha256` (176 input/output hashes) | `904d83b730b1ef83` |

## Environment

- Repository `/home/chad/projects/margin-trading`, branch `research/study8-expanded-regime-d1`, `HEAD`
  `69934efb9d189020a57c71459f22a07851f8a622` (tracks origin). The audit runs in the main checkout; there is no other
  worktree.
- **Working tree at start:** the user's own changes only, all untouched:
  - `config/market-events/distributions.csv` and `distributions.manifest.json` (modified);
  - `config/market-events/raw/vanguard-20261030T184421Z/` and four `._.DS_Store` files (untracked).
- Audit directory (new, not sealed): `research/study8-archive-audit/`, with:
  - `scripts/`: Python, reading records only;
  - `outputs/`: generated tables;
  - the report `.md` files.
- No new `src/**/*.ts` file is added: other studies' code manifests span `src/`.

## Stages

| Stage | Status | Notes |
|---|---|---|
| A0 setup (directory, baseline manifest, checkpoint) | complete | 2026-11-02T15:29Z |
| A1 read protocol, amendments, reports; record formats | complete | PROTOCOL §5–8; search.ts rankOrder/greedyDistinct/shortlist; fitness.ts violationOf |
| A2 archive inventory script and tables | complete | `scripts/inventory.py` → `outputs/inventory.*`; 440,126 rows / 9,983,389 points re-derived; consistent |
| A3 F24 training frontier, bands, funnel | complete | `scripts/frontier.py` → `outputs/f24-*` |
| A4 sealed-test persistence analysis (sealed candidates only) | complete | `scripts/persistence.py` → `outputs/persistence.*` (180 members) |
| A5 search saturation audit | complete | `scripts/saturation.py` → `outputs/saturation.*` |
| A6 ETF pool discovery design (repository ETF inventory, prior studies) | data complete | `scripts/etf_inventory.py` (written by a subagent) → `outputs/etf-inventory.*`; 64 symbols, 61 canonical (`research/d1-robust-pool-discovery/results/audit/universe.json` `eligible`, verified); prior-study summary in conversation only — to be written into FUTURE_ETF_POOL_DISCOVERY_DESIGN.md |
| A7 reports and recommendation | complete | eight files at the audit root; tables machine-filled by `scripts/fill_report_tables.py`; reviewer corrections applied (`reviews/REPORT_REVIEW.md`) |
| A8 verification (rerun determinism, baseline manifest unchanged, chain) | complete | 16:11Z: `run_all.py --check` 176 lines identical; `fill_report_tables.py --check` 17 tables equal; baseline 609 files OK; `verify-chain` stops only on the user's `distributions.csv` (known, E4); `git status`: only `research/study8-archive-audit/` new; no `__pycache__`. Independent reviewer: 10 wording/precision discrepancies, none changing a conclusion, all corrected |

## Data doors

- Training comparisons use only F24-training (2016-01-04 → 2024-12-31) fields of the archived records.
- 2025–2026 figures are read only from already-sealed test records, and only for candidates that were sealed-tested.
- Never-tested archive candidates are never replayed on any window.

## Key results so far (all from outputs/; re-derivable)

- No ≥ 64-point risk-feasible non-holder beats its track's best holder by ≥ 10% robust profit; best non-holders sit
  −4% … +8% (G +8% failed Q7/C-level; VG +6% at 64 pts, 98.4%).
- Rung-1 leads above holders: G 223, VG 53, VXRKG 21 (16-pt; 15/16 shares keep ≥ 0.90 at 64 pts only 52%; robust shrinks
  ~5–6.5% r1→r2).
- ≥ 95% vs ≥ 90% minimum share costs 0% (VXR, VXRG, VXRKG), ~2% (VG), 3–8% (V), ~25% (G) of best robust profit.
- Sealed F23+F24: training share → test share ρ +0.90; → run DD ρ −0.60; → test net ρ −0.48. F19–F21: 100% failed in
  every band.
- Islands: 124/130 stopped on budget; high-D late gains 16–28%; profit-holder location moves L∞ 0.42–0.97 across folds.

## Disclosures

- The ETF-inventory subagent's early `head -c 300` displayed about five data rows of `data/AGG/data.csv` and
  `data/GDX/data.csv` (metadata intent; no analysis used them). There is no data embargo in this audit.
- `scripts/etf_inventory.py` was written by that subagent. It was reviewed: it reads metadata and first/last lines
  only, and writes only its two outputs. It runs under `run_all.py`.
- Two checkpoint timestamps were first written rounded ahead of the clock and then corrected to the clock.
- `verify-chain` cannot pass in this checkout because of the user's `distributions.*` edits (pre-existing,
  AMENDMENTS E4). The audit worked around this read-only and changed nothing.

## Guards

- Never edit:
  - `research/study8-expanded-regime-d1/**`, `config/research-pools/**`, `config/pools/**`, `data/**`;
  - `config/market-events/**`;
  - other studies' records;
  - `src/study8-runners/**` (the runner assignment's files).
- Never run `npm run study8 -- <stage>` other than the read-only `verify-chain`.
