"""Regression test: production allIn.ts (single strategy: 0.5% material-loss trigger + 3% lower-price
re-entry + 38% retracement reset) vs the frozen Python research implementation.

References:
- the four frozen datasets: adaptive-reentry/validation/results/stage2/results/*/<ds>__V2_G8_c050_r38.csv
  (the stage-2 sensitivity grid point with cutoff -0.5% and retrace 0.38 = exactly this strategy);
- VGT 2016 .. 2025-12-31: results/python/trades|daily|states|events/VGT_2016_2025__new.csv written by
  reference_runs.py (same framework, same components, truncated date range).

Compared at full stored precision (tolerance 1e-6): every trade (session index, dates, prices, reason,
shares, investment, interest, net P&L); every session's close, borrowed balance and cumulative
mark-to-market P&L, plus the derived drawdown path and its peak/trough dates; every state-log row
(date, states, reason kind, frozen loss-exit price and reference high, lower level, close, 10% signal,
entry flag); every restriction episode (exit date/reason, loss, price return, frozen values, episode
low, resolution kind and date); headline totals and open-position valuation.

Run:  <python with pandas+numpy> regression_test.py     (from this directory; node on PATH)
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
STAGE2 = REPO / 'research/risk-management/adaptive-reentry/validation/results/stage2/results'
PYREF = HERE / 'results' / 'python'
TS_OUT = HERE / 'results' / 'ts'
TOL = 1e-6
DATASETS = {
    'VGT_2005_2015': ('VGT', 'data/VGT/VGT-2004-2015.csv', None),
    'QQQ_1999_2015': ('QQQ', 'data/QQQ/QQQ-1999-2015.csv', None),
    'VGT_2016_2026': ('VGT', 'data/VGT/VGT-2016-2026.csv', None),
    'QQQ_2016_2026': ('QQQ', 'data/QQQ/QQQ-2016-2026.csv', None),
    'VGT_2016_2025': ('VGT', 'data/VGT/VGT-2016-2026.csv', '2025-12-31'),
}
KINDS = ['losing_exit', 'loss_not_restricted', 'profitable_exit', 'normal_entry', 'lower_price_reentry',
         'recovery_reset', 'entry_blocked', 'restricted']


def kind(reason):
    for k in KINDS:
        if str(reason).startswith(k):
            return k
    return str(reason)


def flag(x):
    return str(x).strip().lower() == 'true'


def run_ts(ds):
    symbol, file, end = DATASETS[ds]
    out = TS_OUT / ds
    cmd = ['node', '--experimental-transform-types', '--disable-warning=ExperimentalWarning', 'src/app.ts', 'allIn',
           symbol, '-', end or '-', file, str(out)]
    subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, check=True)
    return out


def ref_paths(ds):
    if ds in STAGE2_DS:
        return {k: STAGE2 / k / f'{ds}__V2_G8_c050_r38.csv' for k in ['trades', 'daily', 'states', 'events']}
    return {k: PYREF / k / f'{ds}__new.csv' for k in ['trades', 'daily', 'states', 'events']}


STAGE2_DS = {'VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026'}


def close(a, b):
    d = abs(float(a) - float(b))
    return d <= TOL, d


def compare_trades(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py):
        issues.append(f'trade count {len(ts)} vs {len(py)}')
        return maxdiff
    for k in range(len(py)):
        t, p = ts.iloc[k], py.iloc[k]
        te = '' if pd.isna(t['exit_date']) else str(t['exit_date'])
        pe = '' if pd.isna(p['exit_date']) else str(p['exit_date'])
        if str(t['entry_date']) != str(p['entry_date']) or te != pe or str(t['reason']) != str(p['reason']) \
                or int(t['entry_index']) != int(p['entry_i']):
            issues.append(f'trade {k}: {t["entry_date"]}->{te} {t["reason"]} vs {p["entry_date"]}->{pe} {p["reason"]}')
        for a, b in [('entry_price', 'entry_price'), ('exit_price', 'exit_price'), ('shares', 'shares'),
                     ('investment', 'investment'), ('interest', 'interest'), ('profit', 'profit')]:
            ok, d = close(t[a], p[b])
            maxdiff = max(maxdiff, d)
            if not ok:
                issues.append(f'trade {k} ({p["entry_date"]}) {b}: {t[a]} vs {p[b]} (diff {d:g})')
    return maxdiff


def compare_daily(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py) or not (ts['date'].astype(str) == py['date'].astype(str)).all():
        issues.append(f'daily rows/dates differ ({len(ts)} vs {len(py)})')
        return maxdiff, None
    for col in ['close', 'borrowed', 'mtm_pnl']:
        d = np.abs(ts[col].to_numpy(float) - py[col].to_numpy(float))
        maxdiff = max(maxdiff, float(d.max()))
        if d.max() > TOL:
            issues.append(f'daily {col} max diff {d.max():g} at {py["date"].iloc[int(d.argmax())]}')
    mtm = ts['mtm_pnl'].to_numpy(float)
    peak = np.maximum.accumulate(np.r_[0.0, mtm[1:]])
    dd = peak - mtm
    d = np.abs(dd - py['drawdown'].to_numpy(float))
    maxdiff = max(maxdiff, float(d.max()))
    if d.max() > TOL:
        issues.append(f'drawdown path max diff {d.max():g}')
    trough = int(dd.argmax())
    peak_i = int(np.argmax(mtm[:trough + 1] >= peak[trough] - 1e-9)) if trough > 0 else 0
    return maxdiff, dict(mdd=float(dd.max()), peak=str(py['date'].iloc[peak_i]), trough=str(py['date'].iloc[trough]))


def compare_states(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py):
        issues.append(f'state rows {len(ts)} vs {len(py)}')
        return maxdiff
    for k in range(len(py)):
        t, p = ts.iloc[k], py.iloc[k]
        if (str(t['date']) != str(p['date']) or t['prev_state'] != p['prev_state'] or t['new_state'] != p['new_state']
                or kind(t['reason']) != kind(p['reason']) or flag(t['signal']) != flag(p['signal_10pct'])
                or flag(t['entry_executed']) != flag(p['entry_executed'])):
            issues.append(f'state row {k}: {t["date"]} {t["prev_state"]}->{t["new_state"]} {kind(t["reason"])} vs '
                          f'{p["date"]} {p["prev_state"]}->{p["new_state"]} {kind(p["reason"])}')
        for a, b in [('loss_exit_price', 'loss_exit_price'), ('ref_high', 'ref_high'), ('close', 'close')]:
            if pd.isna(t[a]) and pd.isna(p[b]):
                continue
            if pd.isna(t[a]) != pd.isna(p[b]):
                issues.append(f'state row {k} ({p["date"]}) {b}: {t[a]} vs {p[b]}')
                continue
            ok, d = close(t[a], p[b])
            maxdiff = max(maxdiff, d)
            if not ok:
                issues.append(f'state row {k} ({p["date"]}) {b}: {t[a]} vs {p[b]} (diff {d:g})')
        # the Python log carries the required level on restricted/entry rows; it must equal the TS lower level
        if not pd.isna(p['required_level']):
            ok, d = close(t['lower_level'], p['required_level'])
            maxdiff = max(maxdiff, d)
            if not ok:
                issues.append(f'state row {k} ({p["date"]}) required level: {t["lower_level"]} vs {p["required_level"]}')
    return maxdiff


def compare_episodes(ts, py, issues):
    maxdiff = 0.0
    if len(ts) != len(py):
        issues.append(f'episode count {len(ts)} vs {len(py)}')
        return maxdiff
    for k in range(len(py)):
        t, p = ts.iloc[k], py.iloc[k]
        pres = '' if pd.isna(p['resolution']) else str(p['resolution'])
        tres = '' if pd.isna(t['resolution']) else str(t['resolution'])
        prd = '' if pd.isna(p['resolution_date']) else str(p['resolution_date'])
        trd = '' if pd.isna(t['resolution_date']) else str(t['resolution_date'])
        if str(t['exit_date']) != str(p['exit_date']) or str(t['exit_reason']) != str(p['exit_reason']) \
                or tres != pres or trd != prd:
            issues.append(f'episode {k}: {t["exit_date"]} {t["exit_reason"]} -> {tres} {trd} vs '
                          f'{p["exit_date"]} {p["exit_reason"]} -> {pres} {prd}')
        for a, b in [('loss', 'loss'), ('price_return', 'price_return'), ('loss_exit_price', 'loss_exit_price'),
                     ('losing_entry_price', 'losing_entry_price'), ('ref_high', 'ref_high'),
                     ('episode_low', 'min_close_in_episode')]:
            ok, d = close(t[a], p[b])
            maxdiff = max(maxdiff, d)
            if not ok:
                issues.append(f'episode {k} ({p["exit_date"]}) {b}: {t[a]} vs {p[b]} (diff {d:g})')
    return maxdiff


def main():
    results, failed = [], False
    for ds in DATASETS:
        refs = ref_paths(ds)
        if not refs['trades'].exists():
            print(f'{ds:14s} SKIP (no Python reference at {refs["trades"]})')
            continue
        out = run_ts(ds)
        summary = json.load(open(out / 'summary.json'))
        issues = []
        d1 = compare_trades(pd.read_csv(out / 'trades.csv'), pd.read_csv(refs['trades']), issues)
        d2, dd = compare_daily(pd.read_csv(out / 'daily.csv'), pd.read_csv(refs['daily']), issues)
        d3 = compare_states(pd.read_csv(out / 'states.csv'), pd.read_csv(refs['states']), issues)
        d4 = compare_episodes(pd.read_csv(out / 'episodes.csv'), pd.read_csv(refs['events']), issues)
        if dd and (summary['drawdownPeakDate'] != dd['peak'] or summary['drawdownTroughDate'] != dd['trough']
                   or abs(summary['maximumDrawdown'] - dd['mdd']) > TOL):
            issues.append(f'drawdown summary {summary["maximumDrawdown"]:.2f} {summary["drawdownPeakDate"]}->'
                          f'{summary["drawdownTroughDate"]} vs derived {dd}')
        py_tr = pd.read_csv(refs['trades'])
        py_open = py_tr[py_tr['reason'] == 'open']
        py_net = float(py_tr['profit'].sum())
        ok_net, _ = close(summary['netProfit'], py_net)
        if not ok_net or summary['openAtEnd'] != bool(len(py_open)):
            issues.append(f'net/open: TS {summary["netProfit"]:.2f}/{summary["openAtEnd"]} vs Python {py_net:.2f}/{bool(len(py_open))}')
        ok = not issues
        failed = failed or not ok
        n_states = len(pd.read_csv(refs['states']))
        results.append(dict(dataset=ds, match=ok, net_profit=summary['netProfit'], max_drawdown=summary['maximumDrawdown'],
                            realized=summary['realizedProfit'], unrealized=summary['unrealizedProfit'],
                            dd_peak=summary['drawdownPeakDate'], dd_trough=summary['drawdownTroughDate'],
                            trades=len(py_tr), daily_rows=len(pd.read_csv(refs['daily'])), state_rows=n_states,
                            episodes=len(pd.read_csv(refs['events'])), restrictions=summary['restrictions'],
                            lower_price_reentries=summary['lowerPriceReentries'], recovery_resets=summary['recoveryResets'],
                            losses_not_restricted=summary['lossesNotRestricted'],
                            max_abs_diff=max(d1, d2, d3, d4), issues=issues))
        print(f"{ds:14s} {'PASS' if ok else 'FAIL'} net {summary['netProfit']:>11,.2f} mdd {summary['maximumDrawdown']:>10,.2f} "
              f"trades {len(py_tr):>3d} daily {len(pd.read_csv(refs['daily'])):>4d} states {n_states:>4d} "
              f"episodes {len(pd.read_csv(refs['events'])):>2d} maxdiff {max(d1, d2, d3, d4):.3g}")
        for issue in issues[:10]:
            print(f'    - {issue}')
    (HERE / 'results').mkdir(exist_ok=True)
    json.dump(results, open(HERE / 'results' / 'regression.json', 'w'), indent=1)
    print('\nALL CASES PASS' if not failed else '\nFAILURES PRESENT')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
