"""Write the frozen baseline outputs (standard metrics, trades and daily series) for all four datasets."""
from pathlib import Path

from engine import DATASETS, Strategy
from metrics import run_config, write_summary

OUT = Path(__file__).parent / 'results'
records = []
for ds in DATASETS:
    rec, res = run_config('baseline', 'baseline', Strategy(), ds, OUT)
    records.append(rec)
    m = rec['metrics']
    print(f"{ds}: {m['first_date']}..{m['last_date']} net {m['net_profit']:,.0f} mdd {m['max_drawdown']:,.0f} "
          f"({m['mdd_peak_date']}..{m['mdd_trough_date']}) closed {m['closed_trades']} open {m['open_position_at_end']} "
          f"interest {m['margin_interest']:,.0f} $-days {m['margin_dollar_days'] / 1e6:,.1f}M min P&L {m['min_cumulative_pnl']:,.0f} "
          f"underwater {m['longest_underwater_days']}d")
write_summary(records, OUT)
