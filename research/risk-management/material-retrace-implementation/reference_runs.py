"""Python research-framework runs for the material-retrace implementation study (frozen engine/framework,
nothing modified). Writes results/python/:

- summary.json: standard metrics + matched-exposure baseline control + windows for every (config,
  dataset), configs = the six reference strategies of the brief plus the 4x5 sensitivity grid;
- trades/, daily/, states/, events/ CSVs per (dataset, config) for the six reference strategies on every
  dataset, and for the grid on every dataset (trades/daily only for the grid);
- registry.jsonl: every configuration registered BEFORE it is evaluated (append-only).

Datasets: the four frozen ones (full files) and VGT_2016_2025 = the VGT 2016-2026 file truncated at
2025-12-31 (no 2026 data is loaded for that run).

Reference strategies (exact component definitions copied from the adaptive-reentry families, cited):
  baseline      original rules (framework restrict=False)
  lower3        3% + frozen-high 95% reset, any net loss arms (framework defaults)
  material05    A2_material_05: price return <= -0.5% arms; 3%; frozen-high 95% reset
  retrace38     C6_retrace_38: any net loss arms; 3%; reset at 38% retrace
  g8            G8_A2m1_retrace: price return <= -1% arms; 3%; 38% retrace
  new           THE PRODUCTION STRATEGY: price return <= -0.5% arms; 3%; 38% retrace
Grid: cutoff {0.25%, 0.5%, 0.75%, 1%} x retrace {0.34, 0.38, 0.42, 0.46, 0.50}, 3% fixed.

Run:  <python with pandas+numpy> reference_runs.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
RM = HERE.parent
sys.path.insert(0, str(RM / 'baseline'))
sys.path.insert(0, str(RM / 'adaptive-reentry' / 'common'))

from engine import DATASETS, FixedSize, Strategy, load, run  # noqa: E402
from metrics import covered, standard_metrics, window_stats, write_summary  # noqa: E402

import registry  # noqa: E402
from analysis import RECOVERY_WINDOWS_EXT, events_table, states_table  # noqa: E402
from framework import AdaptiveStrategy, frozen_high_reset  # noqa: E402

OUT = HERE / 'results' / 'python'
CUTS = [0.0025, 0.005, 0.0075, 0.01]
FRACS = [0.34, 0.38, 0.42, 0.46, 0.50]


def material_trigger(threshold):
    """= adaptive-reentry/loss-classification/strategies.py material_trigger."""
    def trigger(ctx, trade):
        return trade['exit_price'] / trade['entry_price'] - 1 <= -threshold
    return trigger


def retrace_reset(f):
    """= adaptive-reentry/recovery-resets/strategies.py retrace_reset."""
    def reset(ctx, st, i):
        return ctx.e.c[i] >= st.min_close + f * (st.ref_high - st.min_close)
    return reset


REFERENCE = {
    'baseline': lambda: AdaptiveStrategy('baseline', restrict=False),
    'lower3': lambda: AdaptiveStrategy('lower3'),
    'material05': lambda: AdaptiveStrategy('material05', trigger=material_trigger(0.005), reset=frozen_high_reset(0.95)),
    'retrace38': lambda: AdaptiveStrategy('retrace38', reset=retrace_reset(0.38)),
    'g8': lambda: AdaptiveStrategy('g8', trigger=material_trigger(0.01), reset=retrace_reset(0.38)),
    'new': lambda: AdaptiveStrategy('new', trigger=material_trigger(0.005), reset=retrace_reset(0.38)),
}


def grid_name(cut, f):
    return f'grid_c{cut * 10000:04.0f}_r{f * 100:.0f}'


GRID = {grid_name(c, f): (lambda c=c, f=f: AdaptiveStrategy(grid_name(c, f), trigger=material_trigger(c), reset=retrace_reset(f)))
        for c in CUTS for f in FRACS}


def frames():
    out = {ds: load(ds) for ds in DATASETS}
    out['VGT_2016_2025'] = load('VGT_2016_2026', end='2025-12-31')
    return out


def record(name, ds, df, strat, base_res, write_logs):
    res = run(df, strat)
    m = standard_metrics(res, ds)
    m['recovery_windows_ext'] = {k: window_stats(res, w) for k, w in RECOVERY_WINDOWS_EXT.items() if covered(res['daily'], w)}
    size = 100000.0 * res['dollar_days'] / base_res['dollar_days']
    ctrl = run(df, FixedSize(size))
    rec = dict(config=name, dataset=ds, metrics=m,
               matched_control=dict(control_fixed_size=size, exposure_vs_baseline=res['dollar_days'] / base_res['dollar_days'],
                                    control_profit=ctrl['net'], control_max_drawdown=ctrl['mdd'],
                                    profit_difference=res['net'] - ctrl['net'], drawdown_difference=res['mdd'] - ctrl['mdd'],
                                    control_profit_to_drawdown=ctrl['net'] / ctrl['mdd'] if ctrl['mdd'] > 0 else None),
               counters=dict(getattr(strat, 'counters', {})) if isinstance(strat, AdaptiveStrategy) else {})
    tag = f'{ds}__{name}.csv'
    (OUT / 'trades').mkdir(parents=True, exist_ok=True)
    (OUT / 'daily').mkdir(parents=True, exist_ok=True)
    res['trades'].to_csv(OUT / 'trades' / tag, index=False)
    res['daily'].to_csv(OUT / 'daily' / tag, index=False)
    if write_logs and isinstance(strat, AdaptiveStrategy):
        (OUT / 'states').mkdir(parents=True, exist_ok=True)
        (OUT / 'events').mkdir(parents=True, exist_ok=True)
        states_table(strat).to_csv(OUT / 'states' / tag, index=False)
        events_table(strat, res).to_csv(OUT / 'events' / tag, index=False)
    return rec, res


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    existing = registry.registered_names(HERE)
    entries = []
    for name in REFERENCE:
        if name not in existing:
            entries.append(dict(name=name, family='material_retrace_reference', description=REFERENCE[name].__doc__ or name,
                                params={}, hypothesis='reference strategy of the implementation brief (section 9)'))
    for c in CUTS:
        for f in FRACS:
            n = grid_name(c, f)
            if n not in existing:
                entries.append(dict(name=n, family='material_retrace_sensitivity',
                                    description=f'material cutoff {c:.4f}, 3% lower-price re-entry, retrace {f:.2f}',
                                    params=dict(cutoff=c, lower=0.03, retrace=f, production=(c == 0.005 and f == 0.38)),
                                    hypothesis='stability measurement around the fixed production parameters; no optimum is selected'))
    if entries:
        registry.register(HERE, entries)
    records = []
    for ds, df in frames().items():
        base = run(df, Strategy())
        for name, factory in {**REFERENCE, **GRID}.items():
            rec, res = record(name, ds, df, factory(), base, write_logs=name in REFERENCE)
            records.append(rec)
            m = rec['metrics']
            print(f"{ds:14s} {name:16s} net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                  f"p/dd {(m['profit_to_drawdown'] or float('nan')):>6.2f}  trades {m['closed_trades']:>3d}  "
                  f"exp {rec['matched_control']['exposure_vs_baseline']:.3f}")
    write_summary(records, OUT)


if __name__ == '__main__':
    main()
