"""Reproduce experiment 1 (sma_sizing): both configs on all four datasets via the frozen metrics.run_config.

Writes into sma-sizing/results/:
- summary.json                         standard record per (config, dataset) + experiment-specific `extra`
- trades/<dataset>__<config>.csv       (written by metrics.run_config)
- daily/<dataset>__<config>.csv        (written by metrics.run_config)
- entries/<dataset>__<config>.csv      one row per entry: close, SMA200, SMA200 twenty sessions earlier, regime,
                                       size, and the resulting trade's P&L

Run: PYTHONDONTWRITEBYTECODE=1 <venv python> run.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
sys.path.insert(0, str(HERE))

import pandas as pd  # noqa: E402

from engine import DATASETS  # noqa: E402
from metrics import RECOVERY_WINDOWS, BEAR_WINDOWS, run_config, write_summary  # noqa: E402
from strategies import CONFIGS, FIRST_FULL_INDEX  # noqa: E402

EXPERIMENT = 'sma_sizing'
OUT = HERE / 'results'
TOP_WINNERS = 5


def entry_table(strategy, res):
    """Join the strategy's entry log with the engine's trades (closed and open) on the entry session."""
    ent = pd.DataFrame(strategy.entries)
    tr = res['trades'][['entry_i', 'exit_date', 'reason', 'exit_price', 'investment', 'profit']]
    out = ent.merge(tr, on='entry_i', how='left', validate='one_to_one')
    assert len(out) == len(res['trades']) and (out['size'] == out['investment']).all()
    return out


def in_window(dates, window):
    a, b = (pd.Timestamp(x) for x in window)
    d = pd.to_datetime(dates)
    return (d >= a) & (d <= b)


def build_extra(config, ds, ent, res):
    df = res['daily']
    ent = ent.assign(baseline_profit=ent['profit'] * 100000.0 / ent['size'])  # same trade at $100k (size never changes trades)
    extra = dict(
        definition=('SMA200_i = mean(close[i-199..i]); bearish = close_i < SMA200_i and SMA200_i < SMA200_{i-20}; '
                    'size $50,000 if bearish else $100,000; $100,000 fallback if i < 219') if 'regime' in ent
        else 'baseline: $100,000 on every entry',
        first_session_with_full_rule=str(df['date'].iloc[FIRST_FULL_INDEX]),
        entries=int(len(ent)),
    )
    if 'regime' in ent:
        n, nf = len(ent), int((ent['regime'] == 'fallback').sum())
        nb = int((ent['regime'] == 'bearish').sum())
        extra.update(
            fallback_count=nf,
            fallback_entry_dates=list(ent.loc[ent['regime'] == 'fallback', 'date']),
            bearish_entries=nb,
            normal_entries=int((ent['regime'] == 'normal').sum()),
            bearish_share_of_all_entries=nb / n if n else None,
            bearish_share_of_rule_entries=nb / (n - nf) if n - nf else None,
            close_below_sma_but_sma_rising=int(((ent['close_below_sma'] == True) & (ent['sma_falling'] == False)).sum()),  # noqa: E712
            sma_falling_but_close_above=int(((ent['close_below_sma'] == False) & (ent['sma_falling'] == True)).sum()),  # noqa: E712
        )
    closed = ent[ent['reason'] != 'open']
    top = closed.sort_values('baseline_profit', ascending=False).head(TOP_WINNERS)  # the baseline's largest winners
    extra['largest_baseline_winners'] = [dict(entry_date=r.date, exit_date=r.exit_date, size=r.size, profit=r.profit,
                                              baseline_profit=r.baseline_profit, regime=getattr(r, 'regime', 'n/a'))
                                         for r in top.itertuples()]
    extra['recovery_window_entries'] = {
        k: [dict(entry_date=r.date, exit_date=r.exit_date, size=r.size, profit=r.profit, baseline_profit=r.baseline_profit,
                 regime=getattr(r, 'regime', 'n/a'))
            for r in ent[in_window(ent['date'], w)].itertuples()]
        for k, w in RECOVERY_WINDOWS.items() if k in res['_recovery_keys']}
    extra['bear_window_entries'] = {
        k: dict(entries=int(m.sum()), bearish=int((ent.loc[m, 'regime'] == 'bearish').sum()) if 'regime' in ent else None,
                profit_of_entries=float(ent.loc[m, 'profit'].sum()))
        for k, w in BEAR_WINDOWS.items() if k in res['_bear_keys'] for m in [in_window(ent['date'], w)]}
    return extra


def main():
    records = []
    (OUT / 'entries').mkdir(parents=True, exist_ok=True)
    for ds in DATASETS:
        for config, cls in CONFIGS.items():
            strategy = cls()
            rec, res = run_config(EXPERIMENT, config, strategy, ds, OUT, extra={'config': config})
            res['_recovery_keys'] = set(rec['metrics']['recovery_windows'])
            res['_bear_keys'] = set(rec['metrics']['bear_windows'])
            ent = entry_table(strategy, res)
            ent.to_csv(OUT / 'entries' / f'{ds}__{config}.csv', index=False)
            rec['extra'].update(build_extra(config, ds, ent, res))
            records.append(rec)
            m, mc, x = rec['metrics'], rec['matched_control'], rec['extra']
            reg = (f" fallback {x['fallback_count']} bearish {x['bearish_entries']}/{x['entries']}"
                   if 'fallback_count' in x else '')
            print(f"{ds} {config}: net {m['net_profit']:,.0f} mdd {m['max_drawdown']:,.0f} "
                  f"p/dd {m['profit_to_drawdown']:.2f} exposure {mc['exposure_vs_baseline']:.3f} "
                  f"control ${mc['control_fixed_size']:,.0f}: net {mc['control_profit']:,.0f} mdd {mc['control_max_drawdown']:,.0f}{reg}")
    write_summary(records, OUT)


if __name__ == '__main__':
    main()
