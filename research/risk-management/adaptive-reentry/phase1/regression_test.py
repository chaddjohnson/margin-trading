"""SUPERSEDED (2026-10-12): this test targeted the earlier allIn.ts CLI with selectable `baseline`/`lower3`
strategies. allIn.ts now contains one strategy (0.5% material-loss trigger + 3% + 38% retracement reset); its
regression test is research/risk-management/material-retrace-implementation/regression_test.py. Kept as the
historical record of the Phase 1 verification (PHASE1_VERIFICATION.md); it no longer runs against current code.

Phase 1 regression test: the production TypeScript allIn.ts vs the frozen Python research results.

For every dataset x strategy it runs the TS implementation with machine-readable outputs and compares,
at full stored precision:
- trades: entry/exit session index and date, entry/exit price, exit reason, shares, investment, interest,
  net P&L (baseline vs baseline/results, lower3 vs lower-price-reentry/results B_lower_3pct);
- daily series: close, borrowed balance, cumulative mark-to-market P&L per session, plus the derived
  running peak, maximum drawdown and its peak/trough dates;
- state transitions (lower3): the full per-session state log row for row (dates, states, reason kind,
  frozen loss-exit price and reference high, both thresholds, the 10% signal flag, entry execution);
- headline figures against the research brief's tables (rounded dollars).

Writes results/comparison.json and prints a per-case PASS/FAIL line. Exits nonzero on any failure.

Run:  <python with pandas+numpy> regression_test.py     (from this directory; node must be on PATH)
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
BASE = REPO / 'research/risk-management/baseline/results'
LPR = REPO / 'research/risk-management/lower-price-reentry/results'
TS_OUT = HERE / 'ts_output'
TOL = 1e-6  # dollars / price units; actual differences are expected to be < 1e-9 of a unit

DATASETS = {
    'VGT_2005_2015': ('VGT', 'data/VGT/VGT-2004-2015.csv'),
    'QQQ_1999_2015': ('QQQ', 'data/QQQ/QQQ-1999-2015.csv'),
    'VGT_2016_2026': ('VGT', 'data/VGT/VGT-2016-2026.csv'),
    'QQQ_2016_2026': ('QQQ', 'data/QQQ/QQQ-2016-2026.csv'),
}
EXPECTED = {  # rounded dollars from the research brief
    ('VGT_2005_2015', 'baseline'): (11602, 73404), ('VGT_2005_2015', 'lower3'): (26384, 54279),
    ('QQQ_1999_2015', 'baseline'): (-2886, 149561), ('QQQ_1999_2015', 'lower3'): (40258, 91469),
    ('VGT_2016_2026', 'baseline'): (161772, 38323), ('VGT_2016_2026', 'lower3'): (182094, 28687),
    ('QQQ_2016_2026', 'baseline'): (116388, 39237), ('QQQ_2016_2026', 'lower3'): (132242, 23564),
}


def run_ts(ds, strategy):
    symbol, file = DATASETS[ds]
    out = TS_OUT / f'{ds}__{strategy}'
    cmd = ['node', '--experimental-transform-types', '--disable-warning=ExperimentalWarning',
           'src/app.ts', 'allIn', symbol, '-', '-', strategy, file, str(out)]
    subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, check=True)
    return out


def close(a, b, tol=TOL):
    a, b = float(a), float(b)
    return abs(a - b) <= tol, abs(a - b)


def compare_trades(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py):
        issues.append(f'trade count {len(ts)} vs {len(py)}')
        return maxdiff
    for k in range(len(py)):
        t, p = ts.iloc[k], py.iloc[k]
        for a, b, name in [(t['entry_date'], p['entry_date'], 'entry_date'),
                           (t['exit_date'] if pd.notna(t['exit_date']) else '', p['exit_date'] if pd.notna(p['exit_date']) else '', 'exit_date'),
                           (t['reason'], p['reason'], 'reason')]:
            if str(a) != str(b):
                issues.append(f'trade {k} {name}: {a} vs {b}')
        if int(t['entry_index']) != int(p['entry_i']):
            issues.append(f'trade {k} entry index: {t["entry_index"]} vs {p["entry_i"]}')
        for col_ts, col_py in [('entry_price', 'entry_price'), ('exit_price', 'exit_price'), ('shares', 'shares'),
                               ('investment', 'investment'), ('interest', 'interest'), ('profit', 'profit')]:
            ok, d = close(t[col_ts], p[col_py])
            maxdiff = max(maxdiff, d)
            if not ok:
                issues.append(f'trade {k} ({p["entry_date"]}) {col_py}: {t[col_ts]} vs {p[col_py]} (diff {d:g})')
    return maxdiff


def compare_daily(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py):
        issues.append(f'daily rows {len(ts)} vs {len(py)}')
        return maxdiff, {}
    if not (ts['date'].astype(str) == py['date'].astype(str)).all():
        issues.append('daily dates differ')
    for col in ['close', 'borrowed', 'mtm_pnl']:
        d = np.abs(ts[col].to_numpy(float) - py[col].to_numpy(float))
        maxdiff = max(maxdiff, float(d.max()))
        if d.max() > TOL:
            k = int(d.argmax())
            issues.append(f'daily {col} max diff {d.max():g} at {py["date"].iloc[k]}')
    # Derived drawdown path from the TS mtm series vs the Python peak/drawdown columns.
    mtm = ts['mtm_pnl'].to_numpy(float)
    peak = np.maximum.accumulate(np.r_[0.0, mtm[1:]])
    dd = peak - mtm
    d = np.abs(dd - py['drawdown'].to_numpy(float))
    maxdiff = max(maxdiff, float(d.max()))
    if d.max() > TOL:
        issues.append(f'derived drawdown max diff {d.max():g}')
    trough = int(dd.argmax())
    peak_i = int(np.argmax(mtm[:trough + 1] >= peak[trough] - 1e-9)) if trough > 0 else 0
    return maxdiff, dict(mdd=float(dd.max()), peak_date=str(py['date'].iloc[peak_i]), trough_date=str(py['date'].iloc[trough]))


REASON_KINDS = ['losing_exit', 'profitable_exit', 'normal_entry', 'lower_price_reentry', 'recovery_reset',
                'entry_blocked (reset priority)', 'entry_blocked (price not low enough)', 'restricted']


def kind(reason):
    for k in REASON_KINDS:
        if str(reason).startswith(k):
            return k
    return str(reason)


def compare_states(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py):
        issues.append(f'state rows {len(ts)} vs {len(py)}')
        return maxdiff
    for k in range(len(py)):
        t, p = ts.iloc[k], py.iloc[k]
        def flag(x):
            return str(x).strip().lower() == 'true'
        if (str(t['date']) != str(p['date']) or t['prev_state'] != p['prev_state']
                or t['new_state'] != p['new_state'] or kind(t['reason']) != kind(p['reason'])
                or flag(t['signal']) != flag(p['signal_10pct']) or flag(t['entry_executed']) != flag(p['entry_executed'])):
            issues.append(f'state row {k}: {t["date"]}/{t["prev_state"]}->{t["new_state"]}/{kind(t["reason"])} vs '
                          f'{p["date"]}/{p["prev_state"]}->{p["new_state"]}/{kind(p["reason"])}')
        for col_ts, col_py in [('loss_exit_price', 'loss_exit_price'), ('ref_high', 'ref_high'),
                               ('lower_level', 'lower_reentry_threshold'), ('reset_level', 'recovery_reset_threshold'),
                               ('close', 'close')]:
            a, b = t[col_ts], p[col_py]
            if pd.isna(a) and pd.isna(b):
                continue
            if pd.isna(a) != pd.isna(b):
                issues.append(f'state row {k} ({p["date"]}) {col_py}: {a} vs {b}')
                continue
            ok, d = close(a, b)
            maxdiff = max(maxdiff, d)
            if not ok:
                issues.append(f'state row {k} ({p["date"]}) {col_py}: {a} vs {b} (diff {d:g})')
    return maxdiff


def main():
    results, failed = [], False
    for ds in DATASETS:
        for strategy in ['baseline', 'lower3']:
            out = run_ts(ds, strategy)
            ts_tr = pd.read_csv(out / 'trades.csv')
            ts_da = pd.read_csv(out / 'daily.csv')
            summary = json.load(open(out / 'summary.json'))
            if strategy == 'baseline':
                py_tr = pd.read_csv(BASE / 'trades' / f'{ds}__baseline.csv')
                py_da = pd.read_csv(BASE / 'daily' / f'{ds}__baseline.csv')
            else:
                py_tr = pd.read_csv(LPR / 'trades' / f'{ds}__B_lower_3pct.csv')
                py_da = pd.read_csv(LPR / 'daily' / f'{ds}__B_lower_3pct.csv')
            issues = []
            d1 = compare_trades(ts_tr, py_tr, issues)
            d2, dd = compare_daily(ts_da, py_da, issues)
            d3 = 0.0
            n_states = 0
            if strategy == 'lower3':
                ts_st = pd.read_csv(out / 'states.csv')
                py_st = pd.read_csv(LPR / 'states' / f'{ds}__B_lower_3pct.csv')
                d3 = compare_states(ts_st, py_st, issues)
                n_states = len(py_st)
            exp_net, exp_mdd = EXPECTED[(ds, strategy)]
            if round(summary['netProfit']) != exp_net:
                issues.append(f'net {summary["netProfit"]:.2f} rounds to {round(summary["netProfit"])}, expected {exp_net}')
            if round(summary['maximumDrawdown']) != exp_mdd:
                issues.append(f'mdd {summary["maximumDrawdown"]:.2f} rounds to {round(summary["maximumDrawdown"])}, expected {exp_mdd}')
            if dd and (summary['drawdownPeakDate'] != dd['peak_date'] or summary['drawdownTroughDate'] != dd['trough_date']):
                issues.append(f'dd dates TS {summary["drawdownPeakDate"]}->{summary["drawdownTroughDate"]} '
                              f'vs {dd["peak_date"]}->{dd["trough_date"]}')
            ok = not issues
            failed = failed or not ok
            results.append(dict(dataset=ds, strategy=strategy, match=ok,
                                net_profit=summary['netProfit'], max_drawdown=summary['maximumDrawdown'],
                                dd_peak=summary['drawdownPeakDate'], dd_trough=summary['drawdownTroughDate'],
                                trades_compared=len(py_tr), daily_rows_compared=len(py_da), state_rows_compared=n_states,
                                max_abs_diff_trades=d1, max_abs_diff_daily=d2, max_abs_diff_states=d3,
                                issues=issues))
            print(f"{ds:14s} {strategy:9s} {'PASS' if ok else 'FAIL':4s} net {summary['netProfit']:>11,.2f} "
                  f"mdd {summary['maximumDrawdown']:>10,.2f}  trades {len(py_tr):>3d}  daily {len(py_da):>4d}  "
                  f"states {n_states:>4d}  maxdiff {max(d1, d2, d3):.3g}")
            for issue in issues[:10]:
                print(f'    - {issue}')
    (HERE / 'results').mkdir(exist_ok=True)
    json.dump(results, open(HERE / 'results' / 'comparison.json', 'w'), indent=1)
    print('\nALL CASES PASS' if not failed else '\nFAILURES PRESENT')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
