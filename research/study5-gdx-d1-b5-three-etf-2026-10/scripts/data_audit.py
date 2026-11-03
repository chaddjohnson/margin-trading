#!/usr/bin/env python3
"""Study 5 data audit (read-only): ranges, hashes, append prefix, sessions, completeness, gaps, stale bars,
overnight moves and price-drawdown episodes of the canonical minute files.

Usage: python3 research/study5-gdx-d1-b5-three-etf-2026-10/scripts/data_audit.py
Writes results/data-audit/data-audit.json. Never writes under data/.
"""
import datetime as dt
import hashlib
import json
import os
import sys
from zoneinfo import ZoneInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'research', 'study5-gdx-d1-b5-three-etf-2026-10', 'results', 'data-audit')
NY = ZoneInfo('America/New_York')
SYMBOLS = ['GDX', 'VGT', 'KRE', 'XBI', 'XRT']
# Frozen B5 pins (config/pools/B5.json regressionAnchors.dataSha256) of the files ending 2026-10-13.
FROZEN = {
    'VGT': 'd8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09',
    'XBI': '9afecc0606330d68ca12f7b0c331f75a150f64d0dad2e6ff910538a667b0c031',
    'XRT': 'ca0fdc6a4c77a97d047bb710bcefc24fe7fdbd0dc117794725008b33700a0752',
    'KRE': '40e7bd6c72c1dffb343b265bed16d69c964ba5bee81ad297a15e6d8a5607e01a',
    'GDX': '86ce101fede1a412dd452fcc29dc87b69ade4ad67629230172fde878b7c2c320',
}
FROZEN_END = '2026-10-13'
SPLITS = json.load(open(os.path.join(ROOT, 'config', 'market-events', 'splits.json')))['splits']


def audit(symbol):
    path = os.path.join(ROOT, 'data', symbol, 'data.csv')
    full = hashlib.sha256()
    prefix = hashlib.sha256()
    prefix_rows = 0
    rows = 0
    first_ts = last_ts = None
    sessions = {}  # NY date -> dict
    prev_epoch = None
    dupes = out_of_order = 0
    with open(path, 'rb') as fh:
        for raw in fh:
            full.update(raw)
            line = raw.decode().rstrip('\n')
            ts_s, o, h, l, c, v = line.split(',')
            ts = ts_s.strip('"')
            t = dt.datetime.strptime(ts, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=dt.timezone.utc)
            epoch = int(t.timestamp())
            if prev_epoch is not None:
                if epoch == prev_epoch:
                    dupes += 1
                elif epoch < prev_epoch:
                    out_of_order += 1
            prev_epoch = epoch
            rows += 1
            first_ts = first_ts or ts
            last_ts = ts
            local = t.astimezone(NY)
            date = local.strftime('%Y-%m-%d')
            if date <= FROZEN_END:
                prefix.update(raw)
                prefix_rows += 1
            minute = local.hour * 60 + local.minute
            if 570 <= minute < 960:  # regular session 09:30-15:59 ET
                s = sessions.get(date)
                o, h, l, c, v = float(o), float(h), float(l), float(c), float(v)
                if s is None:
                    s = sessions[date] = {'bars': 0, 'open': o, 'high': h, 'low': l, 'close': c, 'first': minute,
                                          'last': minute, 'maxGap': 0, 'prevMinute': minute, 'stale': 0,
                                          'staleRun': 0, 'prevClose': None, 'volume': 0.0}
                else:
                    s['maxGap'] = max(s['maxGap'], minute - s['prevMinute'] - 1)
                    s['prevMinute'] = minute
                    s['high'] = max(s['high'], h)
                    s['low'] = min(s['low'], l)
                    s['close'] = c
                    s['last'] = minute
                if s['prevClose'] is not None and o == h == l == c == s['prevClose']:
                    s['staleRun'] += 1
                    s['stale'] = max(s['stale'], s['staleRun'])
                else:
                    s['staleRun'] = 0
                s['prevClose'] = c
                s['bars'] += 1
                s['volume'] += v
    dates = sorted(sessions)
    new_dates = [d for d in dates if d > FROZEN_END]
    # overnight moves and split check
    moves = []
    for i in range(1, len(dates)):
        a, b = sessions[dates[i - 1]], sessions[dates[i]]
        moves.append((abs(b['open'] / a['close'] - 1), dates[i], b['open'] / a['close'] - 1))
    moves.sort(reverse=True)
    sparse = [(d, sessions[d]['bars']) for d in dates if sessions[d]['bars'] < 300]
    # daily-close drawdown episodes >= 20% (descriptive price history, split-adjusted for registered splits)
    adj = []
    factor = 1.0
    sym_splits = sorted([s for s in SPLITS if s['symbol'] == symbol], key=lambda s: s['effectiveDate'])
    for d in dates:
        f = 1.0
        for sp in sym_splits:
            if d >= sp['effectiveDate']:
                f *= sp['ratio']
        adj.append((d, sessions[d]['close'] * f))
    episodes = []
    peak_d, peak = adj[0]
    trough_d, trough = adj[0]
    in_ep = False
    for d, c in adj:
        if c >= peak:
            if in_ep and (peak - trough) / peak >= 0.20:
                episodes.append({'peak': peak_d, 'trough': trough_d, 'depth': round((trough - peak) / peak, 4),
                                 'recovered': d})
            peak_d, peak = d, c
            trough_d, trough = d, c
            in_ep = False
        else:
            in_ep = True
            if c < trough:
                trough_d, trough = d, c
    if in_ep and (peak - trough) / peak >= 0.20:
        episodes.append({'peak': peak_d, 'trough': trough_d, 'depth': round((trough - peak) / peak, 4),
                         'recovered': None})
    yearly = {}
    for d, c in adj:
        y = d[:4]
        yearly.setdefault(y, [c, c, c, c])
        yy = yearly[y]
        yy[1] = max(yy[1], c)
        yy[2] = min(yy[2], c)
        yy[3] = c
    return {
        'symbol': symbol,
        'file': f'data/{symbol}/data.csv',
        'bytes': os.path.getsize(path),
        'rows': rows,
        'sha256': full.hexdigest(),
        'firstTimestamp': first_ts,
        'lastTimestamp': last_ts,
        'duplicates': dupes,
        'outOfOrder': out_of_order,
        'preAppend': {'rowsThrough2026-10-13': prefix_rows, 'sha256': prefix.hexdigest(),
                      'equalsFrozenB5Pin': prefix.hexdigest() == FROZEN[symbol], 'frozenPin': FROZEN[symbol]},
        'appendedRows': rows - prefix_rows,
        'sessionsWithRegularBars': len(dates),
        'firstSession': dates[0],
        'lastSession': dates[-1],
        'sparseSessions(<300 regular bars)': sparse,
        'appendedSessions': [{'date': d, 'regularBars': sessions[d]['bars'], 'first': f"{sessions[d]['first']//60:02d}:{sessions[d]['first']%60:02d}",
                              'last': f"{sessions[d]['last']//60:02d}:{sessions[d]['last']%60:02d}",
                              'maxIntradayGapMin': sessions[d]['maxGap'], 'longestStaleRun': sessions[d]['stale'],
                              'open': sessions[d]['open'], 'close': sessions[d]['close'],
                              'volume': sessions[d]['volume']} for d in new_dates],
        'largestOvernightMoves': [{'date': m[1], 'move': round(m[2], 4)} for m in moves[:8]],
        'registeredSplits': [s['effectiveDate'] + ' x' + str(s['ratio']) for s in sym_splits],
        'maxIntradayGapAll': max(((sessions[d]['maxGap'], d) for d in dates)),
        'longestStaleRunAll': max(((sessions[d]['stale'], d) for d in dates)),
        'closeDrawdownEpisodes>=20%': episodes,
        'yearlyCloses(first,max,min,last)': {y: [round(x, 4) for x in v] for y, v in yearly.items()},
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    result = {'generatedAt': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
              'script': 'research/study5-gdx-d1-b5-three-etf-2026-10/scripts/data_audit.py',
              'regularSession': '09:30-15:59 America/New_York minute bars (open-stamped)',
              'symbols': [audit(s) for s in SYMBOLS]}
    with open(os.path.join(OUT, 'data-audit.json'), 'w') as fh:
        json.dump(result, fh, indent=1)
    for s in result['symbols']:
        print(s['symbol'], s['rows'], s['firstTimestamp'], s['lastTimestamp'], s['sessionsWithRegularBars'],
              s['preAppend']['equalsFrozenB5Pin'], s['appendedRows'], len(s['sparseSessions(<300 regular bars)']))


if __name__ == '__main__':
    sys.exit(main())
