#!/usr/bin/env python3
"""Descriptive count of D1-style dip episodes per period (price data only; no strategy result).
An episode starts at a regular-session close at least X below the highest close of the previous L sessions and ends
when the close recovers above that reference (episodes on the same reference are counted once). Daily closes are the
last regular-session (09:30-15:59 ET) bar of each NY date; registered splits forward-adjusted.
Usage: python3 research/study5-gdx-d1-b5-three-etf-2026-10/scripts/dip_episodes.py > results/data-audit/dip-episodes.txt"""
import datetime as dt, json, os
from zoneinfo import ZoneInfo
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
NY = ZoneInfo('America/New_York')
SPLITS = json.load(open(os.path.join(ROOT, 'config/market-events/splits.json')))['splits']
PERIODS = [('DEV', '2017-06-15', '2021-12-31'), ('VAL', '2022-01-01', '2023-12-31'),
           ('FX', '2024-01-01', '2026-10-13'), ('RECENT', '2026-10-14', '2026-10-29')]
def closes(sym):
    out = {}
    for raw in open(os.path.join(ROOT, 'data', sym, 'data.csv')):
        ts, o, h, l, c, v = raw.rstrip('\n').split(',')
        t = dt.datetime.strptime(ts.strip('"'), '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=dt.timezone.utc).astimezone(NY)
        m = t.hour * 60 + t.minute
        if 570 <= m < 960:
            out[t.strftime('%Y-%m-%d')] = float(c)
    dates = sorted(out)
    f = lambda d: 1.0 * __import__('math').prod([s['ratio'] for s in SPLITS if s['symbol'] == sym and d >= s['effectiveDate']] or [1.0])
    return dates, [out[d] * f(d) for d in dates]
for sym in ['GDX', 'KRE', 'VGT']:
    dates, cl = closes(sym)
    print(f'== {sym}')
    for L in (74, 100, 230):
        for X in (0.10, 0.15, 0.20, 0.25, 0.30):
            counts = {p[0]: 0 for p in PERIODS}
            inside = False
            for i in range(L, len(dates)):
                ref = max(cl[i - L:i])
                below = cl[i] <= (1 - X) * ref
                if below and not inside:
                    for name, a, b in PERIODS:
                        if a <= dates[i] <= b:
                            counts[name] += 1
                inside = below or (inside and cl[i] < ref * (1 - X / 2))
            print(f'  L={L:3d} X={X:.0%}: ' + ' '.join(f'{k} {v}' for k, v in counts.items()))
