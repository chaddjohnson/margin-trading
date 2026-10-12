"""Stage 2, task 3 — unchanged-parameter transfer tests of G8_A2m1_retrace and G4_A2m1_stall on the
six fresh instruments (modeled on validation/run_fresh.py, stage 1).

Instruments and data files are IDENTICAL to stage 1 (validation/data/{SPY,XLK,IWM}-2005-2026.csv
reused as-is; repo QLD/SOXX/VOOG 2016-2026). For each instrument: the baseline and the two stage-2
candidates run at their exact frozen parameters through engine.run; each candidate gets a COMPLETE
matched-exposure baseline rerun (size = $100k x dollar-days ratio), as stage 1 did. The stage-1
baseline is recomputed and asserted equal (net and mdd) to results/fresh/summary.json — the legs'
and REF_lower3's fresh numbers are REUSED from that file, not rerun.

Output: results/stage2/fresh/summary.json, results/stage2/fresh/trades/<inst>__<cfg>.csv."""
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
sys.path.insert(0, str(HERE))

from engine import run as engine_run  # noqa: E402
from framework import ref_baseline  # noqa: E402
from metrics import standard_metrics, window_stats, covered  # noqa: E402
from analysis import RECOVERY_WINDOWS_EXT  # noqa: E402

from strategies_stage2 import stage2_candidates  # noqa: E402

INSTRUMENTS = {
    'QLD': REPO / 'data/QLD/QLD-2016-2026.csv',
    'SOXX': REPO / 'data/SOXX/SOXX-2016-2026.csv',
    'VOOG': REPO / 'data/VOOG/VOOG-2016-2026.csv',
    'SPY': HERE / 'data/SPY-2005-2026.csv',
    'XLK': HERE / 'data/XLK-2005-2026.csv',
    'IWM': HERE / 'data/IWM-2005-2026.csv',
}
TRUNC_2026 = ('2026-03-20', '2026-09-08')
OUT = HERE / 'results' / 'stage2' / 'fresh'
STAGE1 = json.load(open(HERE / 'results' / 'fresh' / 'summary.json'))


def stage1_rec(inst, cfg):
    for r in STAGE1:
        if r['instrument'] == inst and r['config'] == cfg:
            return r
    raise KeyError((inst, cfg))


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
        s1b = stage1_rec(inst, 'baseline')['metrics']
        assert abs(base['net'] - s1b['net_profit']) < 1e-6 and abs(base['mdd'] - s1b['max_drawdown']) < 1e-6, \
            f'{inst}: baseline rerun differs from stage 1 ({base["net"]} vs {s1b["net_profit"]})'
        s1_low3 = stage1_rec(inst, 'REF_lower3')['metrics']
        base['trades'].to_csv(OUT / 'trades' / f'{inst}__baseline.csv', index=False)
        records.append(dict(instrument=inst, config='baseline', metrics=standard_metrics(base, inst),
                            recovery_windows_ext=windows_ext(base),
                            note='identical to stage 1 baseline (asserted)'))
        for name, factory in stage2_candidates().items():
            strat = factory()
            res = engine_run(df, strat)
            res['trades'].to_csv(OUT / 'trades' / f'{inst}__{name}.csv', index=False)
            size = 100000.0 * res['dollar_days'] / base['dollar_days']
            ctrl = engine_run(df, ref_baseline(size=size))
            rec = dict(instrument=inst, config=name, metrics=standard_metrics(res, inst),
                       recovery_windows_ext=windows_ext(res),
                       matched_control=dict(
                           control_fixed_size=size, control_profit=ctrl['net'],
                           control_max_drawdown=ctrl['mdd'],
                           profit_difference=res['net'] - ctrl['net'],
                           drawdown_difference=res['mdd'] - ctrl['mdd'],
                           note='complete baseline rerun at matched margin dollar-days'),
                       counters=dict(strat.counters),
                       vs_reference=dict(
                           net_vs_baseline=res['net'] - base['net'], mdd_vs_baseline=res['mdd'] - base['mdd'],
                           net_vs_lower3=res['net'] - s1_low3['net_profit'],
                           mdd_vs_lower3=res['mdd'] - s1_low3['max_drawdown'],
                           lower3_source='stage-1 results/fresh/summary.json (reused, not rerun)'))
            records.append(rec)
            m = rec['metrics']
            print(f"{inst:5s} {name:18s} net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                  f"p/dd {(m['net_profit'] / m['max_drawdown']) if m['max_drawdown'] > 0 else float('nan'):>6.2f}  "
                  f"tr {m['closed_trades']:>3d}")
    json.dump(clean(records), open(OUT / 'summary.json', 'w'), indent=1, default=str)
    print(f'\nwrote {OUT / "summary.json"} ({len(records)} records)')


if __name__ == '__main__':
    main()
