"""Run every staged-entry configuration on all four datasets with the frozen engine and metrics.

Writes (all inside staged-entries/results/):
- summary.json: the standard record per (config, dataset) plus the experiment-specific `extra`;
- trades/<dataset>__<config>.csv and daily/<dataset>__<config>.csv (written by metrics.run_config);
- positions/<dataset>__<config>.csv: one row per position with the lot decomposition, add timing, stop-activation
  effects and the matching baseline trade (experiment-specific detail behind `extra`).

The `extra` block needs the run's own trades, so each configuration is run once to compute it and then passed to
metrics.run_config, which runs it again; the two runs are asserted identical (the strategies are stateless).
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, load, run  # noqa: E402
from metrics import baseline_result, run_config, write_summary  # noqa: E402
from staged_analysis import extra_stats  # noqa: E402
from strategies import CONFIGS  # noqa: E402

EXPERIMENT = 'staged_entries'
OUT = HERE / 'results'


def nan_to_none(x):
    if isinstance(x, dict):
        return {k: nan_to_none(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [nan_to_none(v) for v in x]
    if isinstance(x, float) and math.isnan(x):
        return None
    return x


def main():
    records = []
    (OUT / 'positions').mkdir(parents=True, exist_ok=True)
    for config, cls in CONFIGS.items():
        for ds in DATASETS:
            df = load(ds)
            pre = run(df, cls())
            extra, pos = extra_stats(pre, df, baseline_result(ds))
            rec, res = run_config(EXPERIMENT, config, cls(), ds, OUT, extra=nan_to_none(extra))
            assert res['net'] == pre['net'] and res['mdd'] == pre['mdd'], (config, ds)
            assert res['trades'].equals(pre['trades']), (config, ds)
            pos.to_csv(OUT / 'positions' / f'{ds}__{config}.csv', index=False)
            records.append(rec)
            m, mc, ex = rec['metrics'], rec['matched_control'], rec['extra']
            print(f"{config:30s} {ds}: net {m['net_profit']:>10,.0f}  mdd {m['max_drawdown']:>9,.0f}  "
                  f"p/dd {m['profit_to_drawdown']:6.2f}  int {m['margin_interest']:>8,.0f}  "
                  f"expo {mc['exposure_vs_baseline']:.3f}  ctrl net {mc['control_profit']:>10,.0f} "
                  f"ctrl mdd {mc['control_max_drawdown']:>9,.0f}  adds {ex['positions_with_second_tranche']}/{ex['positions']}")
    write_summary(records, OUT)


if __name__ == '__main__':
    main()
