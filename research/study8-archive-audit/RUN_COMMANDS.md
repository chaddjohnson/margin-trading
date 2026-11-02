# Run commands — Study 8 archive audit (read-only, report-only)

**How every command runs:**

- From the repository root, `/home/chad/projects/margin-trading`, on branch `research/study8-expanded-regime-d1`.
- Python 3 standard library only, with no third-party packages.
- `-B` stops Python writing `__pycache__/` into the scripts directory.

**What they touch:**

- None of them reads market price data. `etf_inventory.py` reads each data file's first and last line, for
  timestamps only.
- None runs the engine or opens a Study 8 door.
- They write only under `research/study8-archive-audit/outputs/` (and the filled tables of the audit's own report
  files).

## Reproduce everything

```
cd /home/chad/projects/margin-trading
python3 -B research/study8-archive-audit/scripts/run_all.py            # all outputs + outputs/MANIFEST.sha256
python3 -B research/study8-archive-audit/scripts/run_all.py --check    # re-run; exit 1 if any input or output hash differs
python3 -B research/study8-archive-audit/scripts/fill_report_tables.py --check   # embedded report tables = current outputs
```

## Individual scripts

| command | reads | writes |
|---|---|---|
| `python3 -B research/study8-archive-audit/scripts/inventory.py` | 30 `search.json` + archives, 30 `qualification.json`, `FROZEN_SELECTION.json`, 5 `test.json` | `outputs/inventory.{md,json}` |
| `python3 -B research/study8-archive-audit/scripts/frontier.py` | F24 search/archive/qualification records; `FROZEN_SELECTION.json`; `test/F24/test.json` (holder status labels only) | `outputs/f24-{overlooked,funnel,frontier,share-threshold}.md`, `outputs/f24-{overlooked-candidates,funnel,frontier}.csv` |
| `python3 -B research/study8-archive-audit/scripts/saturation.py` | 30 search records + archives, 30 qualification records | `outputs/saturation.{md,json}` |
| `python3 -B research/study8-archive-audit/scripts/persistence.py` | 5 `test.json` and the matching `qualification.json` (sealed-tested members only) | `outputs/persistence.{md,json}` |
| `python3 -B research/study8-archive-audit/scripts/etf_inventory.py` | `data/<SYM>/dataset-report.json` (64), the first and last line of each `data/<SYM>/data.csv`, `research/d1-robust-pool-discovery/results/audit/universe.json` and the files listed in its output | `outputs/etf-inventory.{md,csv}` |
| `python3 -B research/study8-archive-audit/scripts/fill_report_tables.py` | `outputs/*` | the `{{…}}` tables of `PROFIT_ROBUSTNESS_FRONTIER.md`, `OPTIMIZER_SELECTION_AUDIT.md`, `VALIDATION_PERSISTENCE_AUDIT.md` (a no-op once filled; `--check` compares) |

## Integrity checks used at the end of the audit

```
# the protected files are unchanged since the audit started (written 2026-11-02T15:29Z)
sha256sum -c research/study8-archive-audit/outputs/baseline-manifest.sha256 --quiet && echo baseline unchanged
# the Study 8 hash chain and pins (read-only)
npm run --silent study8 -- verify-chain
```

`verify-chain` is expected to stop on `config/market-events/distributions.csv`. The user's local edit differs from
the frozen pin (AMENDMENTS E4); the audit does not touch it.

The audit adds no source file and changes none (`git status --short -- src` is empty), so Study 8's code and engine
digests are untouched by it.
