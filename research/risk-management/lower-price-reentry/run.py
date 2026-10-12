"""Reproduce every lower-price re-entry configuration on all four datasets.

Writes, under results/:
- summary.json                         standard record per (config, dataset) from metrics.run_config, plus `extra`;
- trades/<dataset>__<config>.csv       engine trades (from run_config);
- daily/<dataset>__<config>.csv        daily series (from run_config);
- states/<dataset>__<config>.csv       chronological state-transition log (every transition, every NORMAL
                                       entry/exit, and every session while RESTRICTED);
- events/<dataset>__<config>.csv       one row per restriction episode (losing exit);
- matching/<dataset>__<config>.csv     one row per baseline trade: identical / later entry / no entry (analysis.py);
- shadow/<dataset>__<config>.csv       first-order replay of the rule on the baseline path (analysis.py);
- recovery/<dataset>__<config>.csv     baseline trades held in each recovery window (incl. 2026) vs the variant.

Run:  <python with pandas+numpy> run.py     (from this directory)
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, load  # noqa: E402
from metrics import run_config, write_summary  # noqa: E402

from analysis import (RECOVERY_WINDOWS_EXT, events_table, match_to_baseline, recovery_participation,  # noqa: E402
                      recovery_window_stats, shadow, states_table, summarize)
from strategies import CONFIGS  # noqa: E402

EXPERIMENT = 'lower_price_reentry'
OUT = HERE / 'results'


def main():
    records = []
    for sub in ['states', 'events', 'matching', 'shadow', 'recovery']:
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    for ds in DATASETS:
        df = load(ds)
        base = None
        for cfg, cls in CONFIGS.items():
            strat = cls()
            rec, res = run_config(EXPERIMENT, cfg, strat, ds, OUT)
            tag = f'{ds}__{cfg}.csv'
            if cfg == 'A_baseline':
                base = res
                rec['extra'] = summarize(cfg, None, base, res, None, None, None)
            else:
                st = states_table(strat)
                ev = events_table(strat, res, df)
                match = match_to_baseline(base, res, strat.blocked_is)
                shad = shadow(base, df, type(strat).threshold)
                rp = recovery_participation(match, RECOVERY_WINDOWS_EXT, res['first_date'], res['last_date'])
                st.to_csv(OUT / 'states' / tag, index=False)
                ev.to_csv(OUT / 'events' / tag, index=False)
                match.to_csv(OUT / 'matching' / tag, index=False)
                shad.to_csv(OUT / 'shadow' / tag, index=False)
                rp.to_csv(OUT / 'recovery' / tag, index=False)
                rec['extra'] = summarize(cfg, strat, base, res, match, shad, ev)
            rec['extra']['recovery_windows_ext'] = recovery_window_stats(res)
            records.append(rec)
            m, mc = rec['metrics'], rec['matched_control']
            x = rec['extra'].get('state_machine', {})
            print(f"{ds:14s} {cfg:14s} net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                  f"p/dd {m['profit_to_drawdown']:>6.2f}  trades {m['closed_trades']:>3d}  "
                  f"blk {x.get('entries_blocked_sessions', 0):>4d}  low {x.get('lower_price_reentries', 0):>3d}  "
                  f"rst {x.get('recovery_resets', 0):>3d}  ctrl net {mc['control_profit']:>10,.0f} "
                  f"ctrl mdd {mc['control_max_drawdown']:>9,.0f}")
    write_summary(records, OUT)


if __name__ == '__main__':
    main()
