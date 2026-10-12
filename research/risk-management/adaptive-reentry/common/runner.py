"""Family runner for Phase 2 (frozen with the framework).

run_family(experiment, family_dir, configs) evaluates registered configurations on the four datasets and
writes, under <family_dir>/results/: summary.json plus trades/, daily/, states/, events/, matching/,
recovery/ CSVs per (dataset, config). Each record carries:
- metrics: the frozen standard metrics (baseline/metrics.py);
- matched_control: the baseline at equal margin dollar-days (frozen metrics.matched_control);
- matched_lower3_control: the EXISTING 3% strategy at equal margin dollar-days — an ex-post exposure
  control (its size is calibrated retrospectively), NOT a deployable strategy;
- vs_reference: headline deltas against the full-size baseline and the existing 3% strategy;
- extra: state-machine counters, episode stats, matching aggregates, recovery windows (incl. 2026),
  false resets, near-miss diagnostics.

The first run per dataset passes a CALIBRATION GATE: the framework's A_baseline and REF_lower3 must
equal the frozen research results trade for trade (baseline/results and lower-price-reentry/results).
Configs must be registered (registry.jsonl in the family directory) before they run.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, load, run  # noqa: E402
from metrics import matched_control, run_config, standard_metrics, write_summary  # noqa: E402

import registry as registry_mod  # noqa: E402
from analysis import (MAJOR_WIN, RECOVERY_WINDOWS_EXT, events_table, false_resets, match_to_baseline,  # noqa: E402
                      near_miss_blocks, recovery_participation, recovery_window_stats, states_table)
from framework import AdaptiveStrategy, ref_baseline, ref_lower3  # noqa: E402

BASE_RES = HERE.parents[1] / 'baseline' / 'results'
LPR_RES = HERE.parents[1] / 'lower-price-reentry' / 'results'
_REF_CACHE = {}


def _assert_trades_equal(res, ref_csv, label):
    ref = pd.read_csv(ref_csv)
    tr = res['trades'].reset_index(drop=True)
    assert len(tr) == len(ref), f'{label}: {len(tr)} trades vs {len(ref)} reference'
    for col in ['entry_i', 'entry_date', 'exit_date', 'reason']:
        a = tr[col].astype(str).replace({'None': '', 'nan': '', 'NaT': ''})
        b = ref[col].astype(str).replace({'None': '', 'nan': '', 'NaT': ''})
        assert (a == b).all(), f'{label}: column {col} differs'
    for col in ['entry_price', 'exit_price', 'interest', 'profit']:
        assert np.allclose(tr[col].astype(float), ref[col].astype(float), atol=1e-6), f'{label}: column {col} differs'


def references(ds):
    """Baseline and REF_lower3 results for a dataset, calibration-gated on first use."""
    if ds not in _REF_CACHE:
        base = run(ds, ref_baseline())
        low3 = run(ds, ref_lower3())
        _assert_trades_equal(base, BASE_RES / 'trades' / f'{ds}__baseline.csv', f'{ds} A_baseline calibration')
        _assert_trades_equal(low3, LPR_RES / 'trades' / f'{ds}__B_lower_3pct.csv', f'{ds} REF_lower3 calibration')
        _REF_CACHE[ds] = (base, low3)
    return _REF_CACHE[ds]


def matched_lower3_control(res, ds):
    """Ex-post exposure control: the existing 3% strategy scaled to the experiment's dollar-days."""
    _, low3 = references(ds)
    size = 100000.0 * res['dollar_days'] / low3['dollar_days']
    ctrl = run(ds, ref_lower3(size=size))
    return dict(control_fixed_size=size, control_profit=ctrl['net'], control_max_drawdown=ctrl['mdd'],
                profit_difference=res['net'] - ctrl['net'], drawdown_difference=res['mdd'] - ctrl['mdd'],
                control_profit_to_drawdown=ctrl['net'] / ctrl['mdd'] if ctrl['mdd'] > 0 else None,
                control_dollar_days=ctrl['dollar_days'], note='ex-post exposure control, not deployable')


def _episode_stats(strategy, ev, tr):
    res_counts = ev['resolution'].value_counts().to_dict() if len(ev) else {}
    n_false, false_dates = false_resets(ev, tr)
    return dict(
        **strategy.counters,
        losing_exits_restricted=int(len(ev)),
        episodes_by_resolution=res_counts,
        sessions_restricted_total=float(ev['sessions_restricted'].sum()) if len(ev) else 0.0,
        sessions_restricted_median=float(ev['sessions_restricted'].median()) if len(ev) else None,
        sessions_restricted_max=float(ev['sessions_restricted'].max()) if len(ev) else None,
        reentry_discount_vs_loss_exit_median=float(ev.loc[ev['reentry_vs_loss_exit'].notna(), 'reentry_vs_loss_exit'].median())
        if len(ev) and ev['reentry_vs_loss_exit'].notna().any() else None,
        false_resets=n_false, false_reset_dates=false_dates)


def _matching_stats(match, var, base):
    win, lose, closed = match['b_profit'] > 0, match['b_profit'] < 0, ~match['b_open']
    ne, le = match['classification'] == 'no entry', match['classification'] == 'later entry'
    major = match['b_profit'] >= MAJOR_WIN
    rebound = match['b_prev_losing'] & win

    def grp(mask):
        sub = match[mask]
        return dict(n=int(len(sub)), baseline_pnl=float(sub['b_profit'].sum()) if len(sub) else 0.0,
                    variant_window_pnl=float(sub['v_window_pnl'].sum()) if len(sub) else 0.0,
                    eliminated=int((mask & ne).sum()), later=int((mask & le).sum()),
                    identical=int((mask & (match['classification'] == 'identical')).sum()))
    rep = match['b_prev_losing'] & lose & closed
    return dict(
        baseline_trades=int(len(match)), variant_trades=int(len(var['trades'])),
        baseline_entries_missed=int(ne.sum()), baseline_entries_delayed=int(le.sum()),
        net_difference=float(var['net'] - base['net']),
        repeated_losers=grp(rep), rebound_winners=grp(rebound),
        major_winners_10k=grp(major), major_rebound_winners_10k=grp(rebound & major))


def run_family(experiment, family_dir, configs, datasets=None, quiet=False):
    """configs: {name: factory} where factory() -> AdaptiveStrategy (or Strategy). Returns records."""
    family_dir = Path(family_dir)
    out = family_dir / 'results'
    registered = registry_mod.registered_names(family_dir)
    missing = [n for n in configs if n not in registered]
    if missing:
        raise RuntimeError(f'unregistered configs (register BEFORE evaluation): {missing}')
    for sub in ['states', 'events', 'matching', 'recovery']:
        (out / sub).mkdir(parents=True, exist_ok=True)
    records = []
    for ds in (datasets or list(DATASETS)):
        base, low3 = references(ds)
        for name, factory in configs.items():
            strat = factory()
            strat.name = name
            rec, res = run_config(experiment, name, strat, ds, out)
            tag = f'{ds}__{name}.csv'
            extra = {}
            if isinstance(strat, AdaptiveStrategy):
                ev = events_table(strat, res)
                st = states_table(strat)
                match = match_to_baseline(base, res, strat.blocked_is)
                rp = recovery_participation(match, RECOVERY_WINDOWS_EXT, res['first_date'], res['last_date'])
                st.to_csv(out / 'states' / tag, index=False)
                ev.to_csv(out / 'events' / tag, index=False)
                match.to_csv(out / 'matching' / tag, index=False)
                rp.to_csv(out / 'recovery' / tag, index=False)
                extra = dict(state_machine=_episode_stats(strat, ev, res['trades']),
                             matching=_matching_stats(match, res, base),
                             near_miss_blocked_winners=near_miss_blocks(match, ev))
            extra['recovery_windows_ext'] = recovery_window_stats(res)
            extra['vs_reference'] = dict(
                baseline_net=base['net'], baseline_mdd=base['mdd'], lower3_net=low3['net'], lower3_mdd=low3['mdd'],
                net_vs_baseline=res['net'] - base['net'], net_vs_lower3=res['net'] - low3['net'],
                mdd_vs_baseline=res['mdd'] - base['mdd'], mdd_vs_lower3=res['mdd'] - low3['mdd'])
            rec['extra'] = extra
            rec['matched_lower3_control'] = matched_lower3_control(res, ds)
            records.append(rec)
            if not quiet:
                m = rec['metrics']
                sm = extra.get('state_machine', {})
                print(f"{ds:14s} {name:28s} net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                      f"p/dd {(m['profit_to_drawdown'] if m['profit_to_drawdown'] is not None else float('nan')):>6.2f}  "
                      f"tr {m['closed_trades']:>3d}  blk {sm.get('blocked_sessions', 0):>4d}  "
                      f"low {sm.get('lower_price_reentries', 0):>3d}  alt {sm.get('alt_entries', 0):>3d}  "
                      f"rst {sm.get('recovery_resets', 0):>3d}  fRst {sm.get('false_resets', 0):>2d}")
    write_summary(records, out)
    return records
