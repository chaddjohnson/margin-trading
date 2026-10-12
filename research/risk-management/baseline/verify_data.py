"""Data verification for BASELINES.md: ranges, rows, gaps, OHLC sanity, duplicates, large jumps."""
import json
from pathlib import Path

import numpy as np
import pandas as pd

from engine import DATASETS, load

out = {}
for ds in DATASETS:
    df = load(ds)
    gaps = df['date'].diff().dt.days
    r = df['close'].pct_change()
    bad_ohlc = ((df['low'] > df[['open', 'close']].min(axis=1) + 1e-9) | (df['high'] < df[['open', 'close']].max(axis=1) - 1e-9)).sum()
    out[ds] = dict(file=DATASETS[ds]['file'], first=str(df['date'].iloc[0].date()), last=str(df['date'].iloc[-1].date()),
                   rows=len(df), duplicate_dates=int(df['date'].duplicated().sum()), non_increasing_dates=int((gaps <= 0).sum()),
                   gaps_over_5_days=[str(d.date()) for d in df['date'][gaps > 5]],
                   nonpositive_prices=int((df[['open', 'high', 'low', 'close']] <= 0).sum().sum()),
                   ohlc_inconsistent_rows=int(bad_ohlc), zero_range_rows=int((df['high'] <= df['low']).sum()),
                   largest_daily_moves=[(str(df['date'].iloc[k].date()), round(float(r.iloc[k]), 4)) for k in r.abs().nlargest(3).index],
                   sma200_first_available=str(df['date'].iloc[199].date()), sessions_before_first_full_90d_window=90)
    print(ds, out[ds])
json.dump(out, open(Path(__file__).parent / 'results' / 'data_verification.json', 'w'), indent=1)
