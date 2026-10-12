"""Spot-check helper: print raw closes around an episode plus the config's events row.
Usage: python inspect_episode.py <dataset> <config> <exit_date> [n_days]"""
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE.parents[0] / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import load  # noqa: E402

pd.set_option('display.width', 220)


def main(ds, config, exit_date, n=40):
    ev = pd.read_csv(HERE / 'results' / 'events' / f'{ds}__{config}.csv')
    row = ev[ev['exit_date'] == exit_date]
    print(row.T.to_string())
    df = load(ds)
    df['date'] = df['date'].astype(str).str[:10]
    i0 = df.index[df['date'] == exit_date][0]
    end = row['resolution_date'].iloc[0] if isinstance(row['resolution_date'].iloc[0], str) else None
    i1 = df.index[df['date'] == str(end)[:10]][0] if end and str(end) != 'nan' else i0 + n
    i1 = min(max(i1, i0 + 5), i0 + int(n), len(df) - 1)
    sub = df.loc[i0:i1, ['date', 'open', 'high', 'low', 'close']].copy()
    # rolling 90-high prev for signal context
    import numpy as np
    h = df['high'].to_numpy()
    rh = [h[max(0, j - 90):j].max() if j > 0 else np.nan for j in sub.index]
    sub['roll90_prev'] = rh
    sub['sig10'] = 1 - sub['close'] / sub['roll90_prev'] >= 0.10
    print(sub.to_string(index=False))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], *(sys.argv[4:] or []))
