"""Independent spot-checks of B_drawdown_tiers entries from raw CSVs and written outputs (no engine import)."""
import pandas as pd, numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
REPO = str(HERE.parents[2])
FILES = {'VGT_2005_2015': 'data/VGT/VGT-2004-2015.csv', 'QQQ_1999_2015': 'data/QQQ/QQQ-1999-2015.csv',
         'VGT_2016_2026': 'data/VGT/VGT-2016-2026.csv', 'QQQ_2016_2026': 'data/QQQ/QQQ-2016-2026.csv'}
def tier(dd): return 25000 if dd >= 30000 else 50000 if dd >= 20000 else 75000 if dd >= 10000 else 100000
picks = [('VGT_2016_2026', '2020-03-12'), ('VGT_2016_2026', '2020-03-17'), ('VGT_2016_2026', '2020-04-03'), ('VGT_2016_2026', '2020-09-08'),
         ('QQQ_2016_2026', '2025-04-01'), ('QQQ_2016_2026', '2025-04-17'), ('QQQ_1999_2015', '2009-03-09'), ('VGT_2005_2015', '2008-09-23')]
for ds, date in picks:
    px = pd.read_csv(f'{REPO}/{FILES[ds]}', sep='|', header=None, names=['date', 'open', 'high', 'low', 'close', 'volume'])
    daily = pd.read_csv(f'{HERE}/results/daily/{ds}__B_drawdown_tiers.csv')
    tr = pd.read_csv(f'{HERE}/results/trades/{ds}__B_drawdown_tiers.csv')
    i = int(np.flatnonzero(px['date'].astype(str).str[:10] == date)[0])
    hi = px['high'].iloc[max(0, i - 90):i].max(); pct = 1 - px['close'].iloc[i] / hi
    mtm = daily['mtm_pnl'].to_numpy(); peak = np.maximum.accumulate(np.r_[0.0, mtm[1:]])
    dd_prev = peak[i - 1] - mtm[i - 1]
    t = tr[tr['entry_i'] == i].iloc[0]
    size = tier(dd_prev); c = px['close'].iloc[i]; shares = size / c
    ex = px['date'].iloc[int(t['exit_i'])] if not pd.isna(t['exit_i']) else None
    days = (pd.Timestamp(ex) - pd.Timestamp(date)).days if ex else None
    interest = size * 0.11 * days / 365 if days else None
    profit = shares * t['exit_price'] - size - interest if days else None
    print(f"{ds} entry {date}: close {c:.4f}, 90d high {hi:.4f}, dip {pct*100:.2f}% | prior session {px['date'].iloc[i-1]} "
          f"mtm {mtm[i-1]:,.2f} peak {peak[i-1]:,.2f} dd {dd_prev:,.2f} -> tier ${size:,} | engine size ${t['investment']:,.0f} "
          f"shares {shares:.4f} (engine {t['shares']:.4f}) | exit {ex} @ {t['exit_price']:.4f} ({t['reason']}), {days}d interest "
          f"{interest:,.2f} (engine {t['interest']:,.2f}) profit {profit:,.2f} (engine {t['profit']:,.2f})")
# entries whose prior-session drawdown is within $1,000 of a tier threshold
print('\nNear-threshold B entries (|dd - threshold| < $1,000):')
for ds in FILES:
    e = pd.read_csv(f'{HERE}/results/entries/{ds}__B_drawdown_tiers.csv')
    for _, r in e.iterrows():
        for th in (10000, 20000, 30000):
            if abs(r['prior_dd'] - th) < 1000:
                print(f"  {ds} {r['entry_date']} dd {r['prior_dd']:,.0f} (threshold {th:,}) size ${r['size']:,.0f} profit {r['profit']:,.0f} (A {r['baseline_profit']:,.0f})")
