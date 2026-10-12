"""Task 3 — unchanged-parameter transfer tests on six fresh instruments.

Instruments (none of which influenced any candidate's design or parameters):
  QLD  (2x QQQ, 2016-2026)      repo file data/QLD/QLD-2016-2026.csv, used as-is
  SOXX (semis, 2016-2026)       repo file data/SOXX/SOXX-2016-2026.csv, used as-is
  VOOG (S&P growth, 2016-2026)  repo file data/VOOG/VOOG-2016-2026.csv, used as-is
  SPY  (S&P 500, 2005-2026)     converted from Stooq (data/convert_stooq.py; covers 2008)
  XLK  (tech sector, 2005-2026) converted from Stooq (covers 2008)
  IWM  (small caps, 2005-2026)  converted from Stooq (covers 2008)

For each instrument: the baseline, REF_lower3 and the seven candidates run at their EXACT frozen
parameters (validation/strategies.py — semantics copied from the family sources; no refitting)
through engine.run(df, strategy). runner.run_family only works for the four frozen datasets, so the
matched-exposure baseline control is computed here directly: a COMPLETE baseline rerun at fixed size
= $100,000 x (variant margin dollar-days / baseline margin dollar-days).

Output: results/fresh/summary.json, results/fresh/trades/<inst>__<cfg>.csv and a printed table.
Window stats use the frozen definitions (metrics.BEAR_WINDOWS / analysis.RECOVERY_WINDOWS_EXT);
because the Stooq files end 2026-09-08, a truncated 2026 window (2026-03-20..2026-09-08) is computed
for SPY/XLK/IWM and labeled as such.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import run as engine_run  # noqa: E402
from framework import ref_baseline  # noqa: E402
from metrics import standard_metrics, window_stats, covered  # noqa: E402
from analysis import RECOVERY_WINDOWS_EXT  # noqa: E402

from strategies import candidate_configs  # noqa: E402

INSTRUMENTS = {
    'QLD': REPO / 'data/QLD/QLD-2016-2026.csv',
    'SOXX': REPO / 'data/SOXX/SOXX-2016-2026.csv',
    'VOOG': REPO / 'data/VOOG/VOOG-2016-2026.csv',
    'SPY': HERE / 'data/SPY-2005-2026.csv',
    'XLK': HERE / 'data/XLK-2005-2026.csv',
    'IWM': HERE / 'data/IWM-2005-2026.csv',
}
TRUNC_2026 = ('2026-03-20', '2026-09-08')
OUT = HERE / 'results' / 'fresh'


def load_pipe(path):
    df = pd.read_csv(path, sep='|', header=None, names=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.reset_index(drop=True)
    df['time'] = (df['date'] - pd.Timestamp('1970-01-01')) // pd.Timedelta(seconds=1)
    return df


def windows_ext(res):
    out = {k: window_stats(res, w) for k, w in RECOVERY_WINDOWS_EXT.items() if covered(res['daily'], w)}
    if '2026' not in out and covered(res['daily'], TRUNC_2026):
        out['2026_truncated'] = window_stats(res, TRUNC_2026)
    return out


def clean(x):
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [clean(v) for v in x]
    if isinstance(x, (np.floating, np.integer)):
        return x.item()
    if isinstance(x, np.bool_):
        return bool(x)
    return x


def main():
    (OUT / 'trades').mkdir(parents=True, exist_ok=True)
    records = []
    for inst, path in INSTRUMENTS.items():
        df = load_pipe(path)
        base = engine_run(df, ref_baseline())
        base['trades'].to_csv(OUT / 'trades' / f'{inst}__baseline.csv', index=False)
        results = {'baseline': (None, base)}
        for name, factory in candidate_configs().items():
            strat = factory()
            res = engine_run(df, strat)
            res['trades'].to_csv(OUT / 'trades' / f'{inst}__{name}.csv', index=False)
            results[name] = (strat, res)
        low3 = results['REF_lower3'][1]
        for name, (strat, res) in results.items():
            rec = dict(instrument=inst, config=name, metrics=standard_metrics(res, inst))
            rec['recovery_windows_ext'] = windows_ext(res)
            if name != 'baseline':
                size = 100000.0 * res['dollar_days'] / base['dollar_days']
                ctrl = engine_run(df, ref_baseline(size=size))
                rec['matched_control'] = dict(
                    control_fixed_size=size, control_profit=ctrl['net'], control_max_drawdown=ctrl['mdd'],
                    profit_difference=res['net'] - ctrl['net'], drawdown_difference=res['mdd'] - ctrl['mdd'],
                    note='complete baseline rerun at matched margin dollar-days')
                rec['counters'] = dict(strat.counters)
                rec['vs_reference'] = dict(
                    net_vs_baseline=res['net'] - base['net'], mdd_vs_baseline=res['mdd'] - base['mdd'],
                    net_vs_lower3=res['net'] - low3['net'], mdd_vs_lower3=res['mdd'] - low3['mdd'])
            records.append(rec)
            m = rec['metrics']
            print(f"{inst:5s} {name:26s} net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                  f"p/dd {(m['net_profit'] / m['max_drawdown']) if m['max_drawdown'] > 0 else float('nan'):>6.2f}  "
                  f"tr {m['closed_trades']:>3d}")
    json.dump(clean(records), open(OUT / 'summary.json', 'w'), indent=1, default=str)
    print(f'\nwrote {OUT / "summary.json"} ({len(records)} records)')


if __name__ == '__main__':
    main()
