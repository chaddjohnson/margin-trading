"""Independent checks of the protective-exit mechanics from the written trade CSVs and the raw OHLC files.

For every trade of every protective configuration, it re-derives the protective level from the entry close and
checks, without using the engine:
- the stop never fired on the entry session, and (D) only on sessions entry+1 ... entry+5;
- on every active session before the exit, the low stayed above the level (no missed trigger);
- a protective exit filled at the open when the open was at or below the level (gap), otherwise exactly at the
  level, with the low at or below it;
- a non-protective exit on a session where the protective level was also reached is explained by an earlier
  open trigger (same open fill) or a higher trailing-stop level;
- profit = shares x exit - $100,000 - interest, with interest = $100,000 x 11% x calendar days / 365;
- before the first protective exit, the variant's trades are identical to the baseline's.
It also prints detailed spot checks (OHLC around entry and exit) to results/spot_checks.txt.

Usage: PYTHONDONTWRITEBYTECODE=1 <python> verify.py
"""
import json
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[0] / 'baseline'))
from engine import DATASETS, load  # noqa: E402

RES = HERE / 'results'
LEVELS = {'B_protective_stop_8pct': (0.92, None), 'C_protective_stop_10pct': (0.90, None),
          'D_early_deterioration_5pct_5sessions': (0.95, 5)}
TOL = 1e-9


def check(config, ds):
    mult, window = LEVELS[config]
    df = load(ds)
    o, h, lo, c = (df[k].to_numpy() for k in ['open', 'high', 'low', 'close'])
    tr = pd.read_csv(RES / 'trades' / f'{ds}__{config}.csv')
    base = pd.read_csv(RES / 'trades' / f'{ds}__A_baseline.csv')
    problems = []
    for k, t in tr.iterrows():
        s = int(t['entry_i'])
        x = int(t['exit_i']) if pd.notna(t['exit_i']) else len(df) - 1
        level = c[s] * mult
        assert abs(t['entry_price'] - c[s]) < TOL
        last_active = x if window is None else min(x, s + window)
        for j in range(s + 1, x):  # sessions strictly before the exit session
            if j <= last_active and lo[j] <= level + TOL:
                problems.append(f'{ds} {config} trade {k}: level {level:.4f} reached on {df.date[j].date()} before exit')
        reason = str(t['reason'])
        exit_active = (x - s >= 1) and (window is None or x - s <= window)
        if reason.startswith('protective stop'):
            if not exit_active:
                problems.append(f'{ds} {config} trade {k}: protective exit outside the active window')
            if reason.endswith('gap'):
                ok = o[x] <= level + TOL and abs(t['exit_price'] - o[x]) < TOL
            else:
                ok = o[x] > level and lo[x] <= level + TOL and abs(t['exit_price'] - level) < 1e-7
            if not ok:
                problems.append(f'{ds} {config} trade {k}: bad fill {reason} {t["exit_price"]} level {level} O {o[x]} L {lo[x]}')
        elif reason != 'open' and exit_active and lo[x] <= level + TOL:
            # Another trigger filled first: an open trigger (fill at the open) or a higher intraday level.
            explained = (abs(t['exit_price'] - o[x]) < TOL) or (t['exit_price'] > level)
            if not explained:
                problems.append(f'{ds} {config} trade {k}: level reached but exit {reason} at {t["exit_price"]} unexplained')
        if reason != 'open':
            days = (df.date[x] - df.date[s]).days
            interest = 100000 * 0.11 * days / 365
            profit = 100000 / c[s] * t['exit_price'] - 100000 - interest
            if abs(profit - t['profit']) > 1e-6 or abs(interest - t['interest']) > 1e-6:
                problems.append(f'{ds} {config} trade {k}: profit {t["profit"]} vs recomputed {profit}')
    first = tr.index[tr['reason'].astype(str).str.startswith('protective stop')]
    if len(first):
        f0 = first[0]
        same = tr.iloc[:f0][['entry_i', 'exit_i', 'exit_price']].reset_index(drop=True).equals(
            base.iloc[:f0][['entry_i', 'exit_i', 'exit_price']].reset_index(drop=True))
        if not same:
            problems.append(f'{ds} {config}: trades before the first protective exit differ from the baseline')
    return problems, int(len(tr)), int(tr['reason'].astype(str).str.startswith('protective stop').sum())


def ohlc_block(df, a, b, marks):
    rows = []
    for j in range(max(0, a), min(len(df), b + 1)):
        r = df.iloc[j]
        rows.append(f"    {r.date.date()}  O {r.open:9.4f}  H {r.high:9.4f}  L {r.low:9.4f}  C {r.close:9.4f}  {marks.get(j, '')}")
    return '\n'.join(rows)


def spot(config, ds, exit_date, out):
    mult, window = LEVELS[config]
    df = load(ds)
    tr = pd.read_csv(RES / 'trades' / f'{ds}__{config}.csv')
    base = pd.read_csv(RES / 'trades' / f'{ds}__A_baseline.csv')
    k = tr.index[tr['exit_date'] == exit_date][0]
    t = tr.loc[k]
    s, x = int(t['entry_i']), int(t['exit_i'])
    level = t['entry_price'] * mult
    nxt = tr.loc[k + 1] if k + 1 in tr.index else None
    marks = {s: f'<- entry at close {t.entry_price:.4f}, {t.shares:,.2f} sh for $100,000; level {mult} x {t.entry_price:.4f} = {level:.4f}',
             x: f'<- {t.reason}: fill {t.exit_price:.4f}'}
    if nxt is not None:
        marks[int(nxt['entry_i'])] = marks.get(int(nxt['entry_i']), '') + f' <- next entry at close {nxt.entry_price:.4f}'
    b = base[(base['entry_i'] <= x) & (base['exit_i'].fillna(len(df) - 1) >= x)]
    out.append(f"\n## {ds} / {config}: protective exit on {exit_date} ({t.reason})")
    out.append(f"  entry {t.entry_date} close {t.entry_price:.4f}; shares = 100000 / {t.entry_price:.4f} = {t.shares:.4f}")
    out.append(f"  protective level = {t.entry_price:.4f} x {mult} = {level:.4f}" + (f", active sessions entry+1..entry+{window}" if window else ", active every session after entry"))
    out.append(ohlc_block(df, s - 1, x + 1 + (int(nxt['entry_i']) - x if nxt is not None and int(nxt['entry_i']) - x <= 3 else 0), marks))
    ox, lx = df.open[x], df.low[x]
    if str(t.reason).endswith('gap'):
        out.append(f"  open {ox:.4f} <= level {level:.4f} -> stop-market fills at the open {t.exit_price:.4f}")
    else:
        out.append(f"  open {ox:.4f} > level {level:.4f} and low {lx:.4f} <= level -> fills at the level {t.exit_price:.4f}")
    days = (df.date[x] - df.date[s]).days
    out.append(f"  interest = 100000 x 11% x {days} / 365 = {t.interest:,.2f}; P&L = {t.shares:.4f} x {t.exit_price:.4f} - 100000 - {t.interest:,.2f} = {t.profit:,.2f}")
    if nxt is not None:
        out.append(f"  next trade: entry {nxt.entry_date} ({int(nxt.entry_i) - x} sessions later) at {nxt.entry_price:.4f}, exit {nxt.exit_date} {nxt.reason}, P&L {nxt.profit:,.2f}")
    for _, bt in b.iterrows():
        out.append(f"  baseline trade open that session: {bt.entry_date}..{bt.exit_date} {bt.reason}, P&L {bt.profit:,.2f}")


def highest_first(config, ds, exit_date, out):
    """A session where both the trailing stop and the protective stop were reached: the higher level must fill."""
    mult, _ = LEVELS[config]
    df = load(ds)
    tr = pd.read_csv(RES / 'trades' / f'{ds}__{config}.csv')
    t = tr[tr['exit_date'] == exit_date].iloc[0]
    s, x = int(t['entry_i']), int(t['exit_i'])
    trail = 0.92 * max(df.close[s], df.high[s + 1:x].max())  # engine: 8% below the highest high through the previous session
    days = (df.date[x] - df.date[s]).days
    interest = 100000 * 0.11 * days / 365
    active = t['shares'] * trail - 100000 - interest > 0
    prot = t['entry_price'] * mult
    r = df.iloc[x]
    out.append(f"\n## {ds} / {config}: trailing stop and protective stop both reached on {exit_date}")
    out.append(f"  entry {t.entry_date} at {t.entry_price:.4f}; protective level {prot:.4f}; trailing level 0.92 x highest high = {trail:.4f} "
               f"(active: sale at it would earn {t['shares'] * trail - 100000 - interest:,.2f} after {interest:,.2f} interest -> {active})")
    out.append(f"    {r.date.date()}  O {r.open:.4f}  H {r.high:.4f}  L {r.low:.4f}  C {r.close:.4f}")
    out.append(f"  open above both levels; low {r.low:.4f} reaches both; the higher (trailing {trail:.4f}) fills first: recorded "
               f"'{t.reason}' at {t.exit_price:.4f}, also '{t.also}', P&L {t.profit:,.2f}")
    assert active and abs(t.exit_price - trail) < 1e-7 and r.low <= prot < trail < r.open


def main():
    summary = {}
    allp = []
    for config in LEVELS:
        for ds in DATASETS:
            p, n, npx = check(config, ds)
            summary[f'{ds}__{config}'] = dict(trades_checked=n, protective_exits=npx, problems=p)
            allp += p
            print(f'{config:38s} {ds}: {n} trades, {npx} protective exits, {len(p)} problems')
    for p in allp:
        print('  PROBLEM', p)
    json.dump(summary, open(RES / 'verification.json', 'w'), indent=1)
    out = ['Spot checks of protective exits (generated by verify.py from the trade CSVs and the raw OHLC files)']
    for config, ds, date in SPOTS:
        spot(config, ds, date, out)
    for ds, date in NO_TRIGGER:
        no_trigger(ds, date, out)
    highest_first('B_protective_stop_8pct', 'VGT_2005_2015', '2010-05-06', out)
    (RES / 'spot_checks.txt').write_text('\n'.join(out) + '\n')
    print('\n'.join(out))


SPOTS = [  # chosen to cover a gap fill at the open, an intraday fill at the level, each config, and D's window
    ('B_protective_stop_8pct', 'VGT_2016_2026', '2020-03-16'),  # gap fill at the open (largest B loss)
    ('B_protective_stop_8pct', 'QQQ_2016_2026', '2025-04-04'),  # intraday fill at the level (interrupts a recovery winner)
    ('C_protective_stop_10pct', 'QQQ_2016_2026', '2022-05-11'),  # intraday fill, 9 sessions after entry
    ('D_early_deterioration_5pct_5sessions', 'QQQ_2016_2026', '2024-08-05'),  # gap fill at the open
    ('D_early_deterioration_5pct_5sessions', 'VGT_2016_2026', '2025-04-21'),  # fill on entry+5, the last active session
]
NO_TRIGGER = [  # D trades whose low breaches entry x 0.95 only after session entry+5: the stop must not fire
    ('VGT_2016_2026', '2018-12-11'),
    ('QQQ_2016_2026', '2020-02-27'),
]


def no_trigger(ds, entry_date, out):
    config = 'D_early_deterioration_5pct_5sessions'
    df = load(ds)
    tr = pd.read_csv(RES / 'trades' / f'{ds}__{config}.csv')
    t = tr[tr['entry_date'] == entry_date].iloc[0]
    s, x = int(t['entry_i']), int(t['exit_i'])
    level = t['entry_price'] * 0.95
    marks = {j: ('active' if 1 <= j - s <= 5 else 'inactive') + (' LOW <= level' if df.low[j] <= level else '') for j in range(s + 1, x + 1)}
    marks[s] = f'<- entry at close {t.entry_price:.4f}; D level {level:.4f} (active entry+1..entry+5)'
    marks[x] = marks[x] + f' <- exit: {t.reason} at the open {t.exit_price:.4f}'
    out.append(f"\n## {ds} / {config}: level breached only after the window (no protective exit expected)")
    out.append(ohlc_block(df, s, x, marks))
    out.append(f"  P&L {t.profit:,.2f} ({t.reason}); the protective stop correctly did not fire after entry+5")

if __name__ == '__main__':
    main()
