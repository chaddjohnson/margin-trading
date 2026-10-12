"""Reproduce every recovery-confirmed re-entry configuration on all four datasets.

Writes, under results/:
- summary.json                         standard record per (config, dataset) from metrics.run_config, plus `extra`;
- trades/<dataset>__<config>.csv       engine trades (from run_config);
- daily/<dataset>__<config>.csv        daily series (from run_config);
- events/<dataset>__<config>.csv       one row per losing exit: confirmation date, blocked signal sessions, entry;
- matching/<dataset>__<config>.csv     one row per baseline trade: identical / later entry / no entry (analysis.py);
- shadow/<dataset>__<config>.csv       first-order check on the baseline path (analysis.py);
- recovery/<dataset>__<config>.csv     baseline trades held in each recovery window vs the variant's position.

The `extra` dict depends on the run itself (confirmation events, matching against the baseline), so it is attached
to the record that run_config returns, after the run.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS  # noqa: E402
from metrics import RECOVERY_WINDOWS, run_config, write_summary  # noqa: E402

from analysis import events_table, match_to_baseline, recovery_participation, shadow, summarize  # noqa: E402
from strategies import CONFIGS, RULES  # noqa: E402

EXPERIMENT = 'recovery_reentry'
OUT = HERE / 'results'


def main():
    records = []
    for sub in ['events', 'matching', 'shadow', 'recovery']:
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    for ds in DATASETS:
        base = None
        for cfg, cls in CONFIGS.items():
            strat = cls()
            rec, res = run_config(EXPERIMENT, cfg, strat, ds, OUT)
            if cfg == 'A_baseline':
                base = res
                rec['extra'] = summarize(cfg, None, base, res, None, None, None)
            else:
                ev = events_table(strat, res)
                blocked = {b for e in strat.events for b in e['blocked_is']}
                match = match_to_baseline(base, res, blocked)
                shad = shadow(base, RULES[cfg])
                rp = recovery_participation(match, RECOVERY_WINDOWS, res['first_date'], res['last_date'])
                tag = f'{ds}__{cfg}.csv'
                ev.to_csv(OUT / 'events' / tag, index=False)
                match.to_csv(OUT / 'matching' / tag, index=False)
                shad.to_csv(OUT / 'shadow' / tag, index=False)
                rp.to_csv(OUT / 'recovery' / tag, index=False)
                rec['extra'] = summarize(cfg, strat, base, res, match, shad, ev)
            records.append(rec)
            m, mc = rec['metrics'], rec['matched_control']
            print(f"{ds:14s} {cfg:26s} net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                  f"p/dd {m['profit_to_drawdown']:>6.2f}  exp {mc['exposure_vs_baseline']:.3f}  "
                  f"ctrl net {mc['control_profit']:>10,.0f} ctrl mdd {mc['control_max_drawdown']:>9,.0f}")
    write_summary(records, OUT)


if __name__ == '__main__':
    main()
