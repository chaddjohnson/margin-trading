# material-retrace-implementation

Implementation study for the single production strategy in `src/app/allIn.ts`: 10% dip entry, $100k
margin, 8% profit-conditional trailing stop, 15-day loss exit, 11% interest, plus re-entry rules —
0.5% material-loss trigger, 3% lower-price re-entry, 38% retracement recovery reset.

Reports: `IMPLEMENTATION.md`, `VERIFICATION.md`, `VGT_2016_2025.md`, `COMPARISON.md`, `SENSITIVITY.md`,
`LOC_FEASIBILITY.md`, `RECOMMENDATIONS.md`.

Reproduction (research venv per `../adaptive-reentry/ADAPTIVE_SPEC.md` rule 7; node ≥ 23 on PATH):

```
PY=/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/41909225-8d9b-4bef-b77e-5932b66e8053/scratchpad/venv/bin/python
cd research/risk-management/material-retrace-implementation
$PY reference_runs.py        # Python references + sensitivity grid -> results/python/ (+ registry.jsonl)
$PY regression_test.py       # TypeScript vs Python, 5 cases -> results/ts/, results/regression.json
$PY analyze_vgt.py           # VGT 2016-2025 tables -> results/analysis/vgt_2016_2025.{md,json}
$PY analyze_sensitivity.py   # grid tables -> results/analysis/sensitivity.{md,json}
# LOC study: see loc/README.md
```

Production run examples:

```
npm run app allIn VGT - 2025-12-31 data/VGT/VGT-2016-2026.csv            # VGT 2016 .. 2025-12-31
npm run app allIn QQQ - - data/QQQ/QQQ-1999-2015.csv /tmp/qqq_out        # full file + CSV/JSON outputs
```

Machine-readable outputs: `results/python/{summary.json,trades,daily,states,events}`,
`results/ts/<case>/{trades,daily,states,episodes}.csv + summary.json`, `results/regression.json`,
`results/analysis/`, `registry.jsonl` (pre-registered configurations).
