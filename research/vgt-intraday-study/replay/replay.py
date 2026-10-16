#!/usr/bin/env python3
"""Independent replay of the VGT intraday-entry study engine (PROTOCOL.md sections 2, 4, 5, 6, 7).

Pure standard library. Reads the raw minute file, groups sessions like src/lib/session.ts, runs eight fixed
configurations (stop fill 'stop', 0 bp), writes out/<CONFIG>.csv and out/summary.json, and optionally
compares against the study engine's trades.csv files (--compare).

Usage (from the repository root):
    python3 research/vgt-intraday-study/replay/replay.py [--compare]
    python3 research/vgt-intraday-study/replay/replay.py --allin <allIn trades.csv> <start|-> <end|->
      (CLOSE_1M + STOP_DAILY on allIn.ts's own legacy session filtering, checked against an allIn.ts output)
"""

import bisect
import csv
import json
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DATA = os.path.join(REPO, 'data', 'VGT', 'VGT-2016-2025-1-minute.csv')
OUT = os.path.join(HERE, 'out')
STUDY = os.path.join(REPO, 'research', 'vgt-intraday-study', 'results', 'runs', 'continuous')

NY = ZoneInfo('America/New_York')
MIN = 60
DAY = 86400
OPEN_MIN = 9 * 60 + 30
CLOSE_MIN = 16 * 60
EARLY_CLOSE_MIN = 13 * 60
EARLY_CLOSES = {
    '2016-11-25', '2017-07-03', '2017-11-24', '2018-07-03', '2018-11-23', '2018-12-24', '2019-07-03',
    '2019-11-29', '2019-12-24', '2020-11-27', '2020-12-24', '2021-11-26', '2022-11-25', '2023-07-03',
    '2023-11-24', '2024-07-03', '2024-11-29', '2024-12-24', '2025-07-03', '2025-11-28', '2025-12-24',
}

# Fixed constants (PROTOCOL.md section 2).
DIP = 0.025
STOP_PCT = 0.021
MAX_HOLD_DAYS = 8
WINDOW = 78
MATERIAL = 0.022
LOWER = 0.04
RETRACE = 0.367
INVEST = 100000
RATE = 0.11
START = '2016-10-07'
END = '2025-10-13'

CONFIGS = [
    ('CLOSE_1M', 'STOP_DAILY'),
    ('FIRST_1000', 'STOP_DAILY'),
    ('STABLE_15', 'STOP_DAILY'),
    ('REBOUND_05', 'STOP_MINUTE_CAUSAL'),
    ('PERSIST_30', 'STOP_MINUTE_CAUSAL'),
    ('BAND_STABILIZE', 'STOP_DAILY'),
    ('BAND_STABILIZE', 'STOP_MINUTE_CAUSAL'),
    ('FIRST_0935', 'STOP_MINUTE_CAUSAL'),
]


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def et(ts):
    return datetime.fromtimestamp(ts, NY).strftime('%Y-%m-%d %H:%M ET')


# ---------------------------------------------------------------------------------------------------------
# Sessions


class Session:
    __slots__ = ('date', 'time', 'open_time', 'close_time', 'early', 'bars', 'starts', 'open', 'high', 'low',
                 'close', 'closing_print')


def parse_ts(text):
    if not text.endswith('Z'):
        raise ValueError(f'not UTC: {text}')
    return int(datetime.strptime(text, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc).timestamp())


def load_sessions(path=DATA):
    offsets = {}
    sessions = []
    cur = None
    prev_t = None
    with open(path, newline='') as fh:
        for row in csv.reader(fh):
            t = parse_ts(row[0])
            if prev_t is not None and t <= prev_t:
                raise ValueError(f'not ascending at {row[0]}')
            prev_t = t
            o, h, l, c, v = (float(x) for x in row[1:6])
            hour = t // 3600
            off = offsets.get(hour)
            if off is None:
                off = int(datetime.fromtimestamp(hour * 3600, NY).utcoffset().total_seconds())
                offsets[hour] = off
            local = t + off
            date = datetime.fromtimestamp(local, timezone.utc).strftime('%Y-%m-%d')
            minute = (local % DAY) / MIN
            early = date in EARLY_CLOSES
            close_min = EARLY_CLOSE_MIN if early else CLOSE_MIN
            if minute < OPEN_MIN or minute > close_min:
                continue
            if cur is None or cur.date != date:
                if minute == close_min:
                    continue  # a closing print without regular trades doesn't make a session
                midnight = int(datetime.strptime(date, '%Y-%m-%d').replace(tzinfo=timezone.utc).timestamp())
                cur = Session()
                cur.date = date
                cur.time = midnight
                cur.open_time = midnight + OPEN_MIN * MIN - off
                cur.close_time = midnight + close_min * MIN - off
                cur.early = early
                cur.bars = []
                cur.open = o
                cur.high = float('-inf')
                cur.low = float('inf')
                cur.closing_print = None
                sessions.append(cur)
            if minute == close_min:
                cur.closing_print = o
            else:
                cur.bars.append((t, o, h, l, c))
                cur.high = max(cur.high, h)
                cur.low = min(cur.low, l)
    for s in sessions:
        s.close = s.closing_print if s.closing_print is not None else s.bars[-1][4]
        s.high = max(s.high, s.close)
        s.low = min(s.low, s.close)
        s.starts = [b[0] for b in s.bars]
    return sessions


def first_trade_from(s, t):
    """(price, time, bar_index, execution) of the first observed trade at or after t, else None."""
    k = bisect.bisect_left(s.starts, t)
    if k < len(s.bars):
        return (s.bars[k][1], s.bars[k][0], k, 'first trade after decision')
    if s.closing_print is not None:
        return (s.closing_print, s.close_time, len(s.bars), 'closing print')
    return None


# ---------------------------------------------------------------------------------------------------------
# Entry policies: each returns the session's ordered list of candidate decisions (time, price, tag)


def is_dip(price, rh):
    return 1 - price / rh >= DIP


def band_of(price, rh):
    d = 1 - price / rh
    if d < DIP:
        return None
    if d < 0.05:
        return 'SHALLOW'
    if d < 0.10:
        return 'MODERATE'
    if d < 0.15:
        return 'DEEP'
    return 'EXTREME'


def final_decision(s):
    dt = s.close_time - MIN
    bar = None
    for b in s.bars:
        if b[0] + MIN <= dt:
            bar = b
        else:
            break
    return dt, bar


def eligible(s, e_minutes):
    e_ts = s.open_time + (e_minutes - OPEN_MIN) * MIN
    last = s.close_time - MIN
    return [b for b in s.bars if e_ts <= b[0] + MIN <= last]


def cands_close(s, rh):
    dt, bar = final_decision(s)
    if bar is not None and is_dip(bar[4], rh):
        return [(dt, bar[4], 'close')]
    return []


def cands_first(e_minutes):
    def f(s, rh):
        return [(b[0] + MIN, b[4], 'first') for b in eligible(s, e_minutes) if is_dip(b[4], rh)]
    return f


def cands_persist(n):
    def f(s, rh):
        out = []
        count = 0
        prev = None
        for b in eligible(s, 10 * 60):
            dip = is_dip(b[4], rh)
            gap = prev is not None and b[0] != prev + MIN
            if gap:
                count = 1 if dip else 0
            else:
                count = count + 1 if dip else 0
            prev = b[0]
            if count >= n:
                out.append((b[0] + MIN, b[4], 'persist'))
        return out
    return f


def cands_stable(n):
    def f(s, rh):
        out = []
        started = False
        trough = timer = None
        prev = None
        for b in eligible(s, 10 * 60):
            dip = is_dip(b[4], rh)
            gap = prev is not None and b[0] != prev + MIN
            prev = b[0]
            if not started:
                if dip:
                    started = True
                    trough = b[3]
                    timer = 0
                    if timer >= n:
                        out.append((b[0] + MIN, b[4], 'stable'))
                continue
            if gap:
                timer = 0
            if b[3] < trough:
                trough = b[3]
                timer = 0
            else:
                timer += 1
            if timer >= n and dip:
                out.append((b[0] + MIN, b[4], 'stable'))
        return out
    return f


def cands_rebound(x):
    def f(s, rh):
        out = []
        trough = None
        for b in eligible(s, 10 * 60):
            dip = is_dip(b[4], rh)
            if trough is None:
                if dip:
                    trough = b[3]
                continue
            trough = min(trough, b[3])
            if b[4] >= trough * (1 + x) and dip:
                out.append((b[0] + MIN, b[4], 'rebound'))
        return out
    return f


def cands_band_stabilize(s, rh):
    out = []
    run_band = None
    trough = timer = None
    run_len = 0
    prev = None
    for b in eligible(s, 10 * 60):
        band = band_of(b[4], rh)
        gap = prev is not None and b[0] != prev + MIN
        prev = b[0]
        if band is None:
            run_band = None
            continue
        if band != run_band:
            run_band = band
            trough = b[3]
            timer = 0
            run_len = 1
        else:
            run_len += 1
            if gap:
                timer = 0
            if b[3] < trough:
                trough = b[3]
                timer = 0
            else:
                timer += 1
        if band == 'MODERATE':
            fire = timer >= 15
        elif band == 'DEEP':
            fire = timer >= 30
        elif band == 'EXTREME':
            fire = timer >= 30 and run_len > 1 and b[4] >= trough * (1 + 0.005)
        else:
            fire = False
        if fire:
            out.append((b[0] + MIN, b[4], 'band-' + band))
    dt, bar = final_decision(s)
    if bar is not None and band_of(bar[4], rh) == 'SHALLOW':
        out.append((dt, bar[4], 'close'))
    return out


POLICIES = {
    'CLOSE_1M': cands_close,
    'FIRST_0935': cands_first(9 * 60 + 35),
    'FIRST_1000': cands_first(10 * 60),
    'STABLE_15': cands_stable(15),
    'PERSIST_30': cands_persist(30),
    'REBOUND_05': cands_rebound(0.005),
    'BAND_STABILIZE': cands_band_stabilize,
}


# ---------------------------------------------------------------------------------------------------------
# Engine


def interest_of(pos, s):
    years = (s.time - pos['entry_ts']) / (365 * DAY)
    return INVEST * RATE * years


def reset_level(r, low=None):
    low = r['episode_low'] if low is None else low
    return low + RETRACE * (r['ref_high'] - low)


def daily_exit(pos, s, interest):
    """allIn.ts evaluateSessionExit with the 'stop' fill. Returns (price, time, reason) or None."""
    shares = pos['shares']
    stop = pos['stop']
    profit_at = lambda p: shares * p - INVEST - interest
    active = profit_at(stop) > 0
    days = (s.time - pos['entry_ts']) / DAY
    due = days >= MAX_HOLD_DAYS and profit_at(s.open) < 0
    if active and s.open <= stop:
        return (s.open, s.bars[0][0], 'trailing stop gap')
    if due:
        f = first_trade_from(s, s.bars[0][0] + MIN)
        return (f[0], f[1], 'maximum hold') if f else None
    if not active:
        return None
    for b in s.bars:
        if b[1] <= stop:
            return (b[1], b[0], 'trailing stop')
        if b[3] <= stop:
            return (stop, b[0], 'trailing stop')
    return None


def minute_walk(pos, s, first_index, interest):
    """Bar-by-bar minute-causal stop from bars[first_index:]; updates pos H/stop. Returns exit or None."""
    shares = pos['shares']
    for b in s.bars[first_index:]:
        stop = pos['stop']
        active = stop is not None and shares * stop - INVEST - interest > 0
        if active and b[1] <= stop:
            return (b[1], b[0], 'trailing stop')
        if active and b[3] <= stop:
            return (stop, b[0], 'trailing stop')
        raise_h(pos, b[2])
    return None


def raise_h(pos, price):
    pos['H'] = max(pos['H'], price)
    level = pos['H'] * (1 - STOP_PCT)
    pos['stop'] = level if pos['stop'] is None else max(pos['stop'], level)


def minute_exit(pos, s, interest):
    shares = pos['shares']
    stop = pos['stop']
    profit_at = lambda p: shares * p - INVEST - interest
    active = profit_at(stop) > 0
    days = (s.time - pos['entry_ts']) / DAY
    due = days >= MAX_HOLD_DAYS and profit_at(s.open) < 0
    if active and s.open <= stop:
        return (s.open, s.bars[0][0], 'trailing stop gap')
    if due:
        f = first_trade_from(s, s.bars[0][0] + MIN)
        if f:
            return (f[0], f[1], 'maximum hold')
        for b in s.bars:
            raise_h(pos, b[2])
        return None
    return minute_walk(pos, s, 0, interest)


def run(policy, stop_mode, sessions, start=START, end=END, alt_restore_on_round_trip=False):
    """alt_restore_on_round_trip: sensitivity only (NOTES.md item 14) - a same-session round trip does not
    clear the pre-existing restriction (allIn.ts's 'open at session end' test read literally)."""
    cands_fn = POLICIES[policy]
    minute = stop_mode == 'STOP_MINUTE_CAUSAL'
    pos = None
    restriction = None
    trades = []
    last = None
    for i, s in enumerate(sessions):
        if s.date < start or s.date > end or i == 0:
            continue
        last = s
        rh = max(x.high for x in sessions[max(0, i - WINDOW):i])
        exited = None  # (pos, exit)
        cleared = None

        if pos is not None:
            interest = interest_of(pos, s)
            ex = minute_exit(pos, s, interest) if minute else daily_exit(pos, s, interest)
            if ex:
                exited = (pos, ex, interest)
                pos = None
            elif not minute:
                pos['high'] = max(pos['high'], s.high)
                pos['stop'] = max(pos['stop'], pos['high'] * (1 - STOP_PCT))
            else:
                raise_h(pos, s.close)
        else:
            entry = None
            for (dt, dp, tag) in cands_fn(s, rh):
                if restriction is not None:
                    low = min(restriction['episode_low'], dp)
                    if dp >= reset_level(restriction, low) or dp > restriction['lower']:
                        continue
                fill = first_trade_from(s, dt)
                if fill is not None:
                    entry = (dt, dp, tag, fill)
                break
            if entry:
                dt, dp, tag, fill = entry
                price, ftime, fidx, fexec = fill
                pos = {
                    'shares': INVEST / price, 'entry_ts': s.time, 'entry_date': s.date, 'entry_price': price,
                    'entry_time': ftime, 'decision_time': dt, 'decision_price': dp, 'tag': tag, 'ref_high': rh,
                    'lower_reentry': restriction is not None,
                }
                cleared = restriction
                restriction = None  # an entry clears the restriction (lower-price re-entry)
                if not minute:
                    pos['high'] = max([price, s.close] + [b[2] for b in s.bars[fidx:]])
                    pos['stop'] = pos['high'] * (1 - STOP_PCT)
                else:
                    pos['H'] = price
                    pos['stop'] = None
                    ex = None
                    if fidx < len(s.bars):
                        raise_h(pos, s.bars[fidx][2])
                        ex = minute_walk(pos, s, fidx + 1, 0.0)
                    if ex:
                        exited = (pos, ex, 0.0)
                        pos = None
                    else:
                        raise_h(pos, s.close)

        if alt_restore_on_round_trip and exited and cleared is not None and exited[0]['entry_date'] == s.date:
            restriction = cleared
        if exited:
            p, ex, interest = exited
            price, etime, reason = ex
            profit = p['shares'] * price - INVEST - interest
            trades.append({**p, 'exit_date': s.date, 'exit_time': etime, 'exit_price': price,
                           'exit_reason': reason, 'interest': interest, 'profit': profit})
            if price / p['entry_price'] - 1 <= -MATERIAL:
                restriction = {'loss_exit': price, 'ref_high': p['ref_high'], 'lower': price * (1 - LOWER),
                               'episode_low': s.close}

        if restriction is not None:
            restriction['episode_low'] = min(restriction['episode_low'], s.close)
            if pos is None and s.close >= reset_level(restriction):
                restriction = None

    if pos is not None:
        interest = interest_of(pos, last)
        trades.append({**pos, 'exit_date': '', 'exit_time': None, 'exit_price': last.close, 'exit_reason': 'open',
                       'interest': interest, 'profit': pos['shares'] * last.close - INVEST - interest})
    return trades


COLUMNS = ['entry_date', 'entry_time_utc', 'entry_price', 'decision_time_utc', 'decision_price', 'exit_date',
           'exit_time_utc', 'exit_price', 'exit_reason', 'interest', 'profit']


def write_trades(path, trades):
    with open(path, 'w', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(COLUMNS)
        for t in trades:
            w.writerow([t['entry_date'], iso(t['entry_time']), repr(t['entry_price']), iso(t['decision_time']),
                        repr(t['decision_price']), t['exit_date'], iso(t['exit_time']) if t['exit_time'] else '',
                        repr(t['exit_price']), t['exit_reason'], repr(t['interest']), repr(t['profit'])])


# ---------------------------------------------------------------------------------------------------------
# Comparison


def compare(name, trades, tol=1e-6):
    path = os.path.join(STUDY, f'{name}__stop', 'trades.csv')
    with open(path, newline='') as fh:
        theirs = list(csv.DictReader(fh))
    result = {'config': name, 'ours': len(trades), 'theirs': len(theirs), 'first_mismatch': None}
    for k in range(max(len(trades), len(theirs))):
        a = trades[k] if k < len(trades) else None
        b = theirs[k] if k < len(theirs) else None
        diffs = []
        if a is None or b is None:
            diffs.append('missing trade')
        else:
            if a['entry_date'] != b['entry_date']:
                diffs.append('entry_date')
            if abs(a['entry_price'] - float(b['entry_price'])) > tol:
                diffs.append('entry_price')
            if a['exit_date'] != b['exit_date']:
                diffs.append('exit_date')
            if abs(a['exit_price'] - float(b['exit_price'])) > tol:
                diffs.append('exit_price')
            if a['exit_reason'] != b['exit_reason']:
                diffs.append('exit_reason')
            if abs(a['profit'] - float(b['profit_after_interest'])) > tol:
                diffs.append('profit')
            if abs(a['decision_price'] - float(b['decision_price'])) > tol:
                diffs.append('decision_price')
        if diffs:
            result['first_mismatch'] = {
                'index': k, 'fields': diffs,
                'ours': None if a is None else {c: a.get(c) for c in (
                    'entry_date', 'entry_price', 'decision_price', 'tag', 'exit_date', 'exit_price', 'exit_reason',
                    'profit')} | {'entry_time_et': et(a['entry_time']), 'decision_time_et': et(a['decision_time']),
                                  'exit_time_et': et(a['exit_time']) if a['exit_time'] else ''},
                'theirs': None if b is None else {c: b[c] for c in (
                    'entry_date', 'entry_price', 'decision_time_et', 'decision_price', 'mechanism', 'band',
                    'entry_time_et', 'exit_date', 'exit_time_et', 'exit_price', 'exit_reason', 'profit_after_interest')},
            }
            break
    return result


def check_allin(sessions, trades_csv, start, end, tol=1e-6):
    """CLOSE_1M + STOP_DAILY under allIn.ts's own (legacy) session filtering vs an allIn.ts trades.csv."""
    lo = '0000' if start == '-' else start
    hi = '9999' if end == '-' else end
    filtered = [s for s in sessions if lo <= s.date <= hi]
    ours = run('CLOSE_1M', 'STOP_DAILY', filtered, start='0000', end='9999')
    with open(trades_csv, newline='') as fh:
        theirs = list(csv.DictReader(fh))
    bad = 0
    for a, b in zip(ours, theirs):
        ok = (a['entry_date'] == b['entry_date'] and a['exit_date'] == b['exit_date']
              and a['exit_reason'] == b['reason'] and abs(a['entry_price'] - float(b['entry_price'])) <= tol
              and abs(a['exit_price'] - float(b['exit_price'])) <= tol
              and abs(a['profit'] - float(b['profit'])) <= tol
              and abs(a['decision_price'] - float(b['decision_price'])) <= tol)
        if not ok:
            bad += 1
            if bad == 1:
                print('  first allIn mismatch:', a['entry_date'], b['entry_date'], a['exit_date'], b['exit_date'])
    status = 'MATCH' if bad == 0 and len(ours) == len(theirs) else 'MISMATCH'
    total = sum(t['profit'] for t in ours)
    their_total = sum(float(b['profit']) for b in theirs)
    print(f'allIn {start}..{end}: {status} ({len(ours)} vs {len(theirs)} trades, total {total!r} vs {their_total!r})')
    return status == 'MATCH'


def main():
    if '--allin' in sys.argv:
        k = sys.argv.index('--allin')
        trades_csv, start, end = sys.argv[k + 1:k + 4]
        sys.exit(0 if check_allin(load_sessions(), trades_csv, start, end) else 1)
    do_compare = '--compare' in sys.argv
    sessions = load_sessions()
    os.makedirs(OUT, exist_ok=True)
    summary = {}
    comparisons = []
    for policy, stop_mode in CONFIGS:
        name = f'{policy}__{stop_mode}'
        trades = run(policy, stop_mode, sessions)
        write_trades(os.path.join(OUT, f'{name}.csv'), trades)
        summary[name] = {'trades': len(trades), 'total_profit': sum(t['profit'] for t in trades),
                         'open_at_end': bool(trades and trades[-1]['exit_reason'] == 'open')}
        print(f"{name}: {len(trades)} trades, total {summary[name]['total_profit']:.2f}")
        if do_compare:
            c = compare(name, trades)
            comparisons.append(c)
            print(json.dumps(c, indent=1) if c['first_mismatch'] else f'  MATCH ({c["ours"]} vs {c["theirs"]})')
    with open(os.path.join(OUT, 'summary.json'), 'w') as fh:
        json.dump(summary, fh, indent=1)
    if do_compare:
        with open(os.path.join(OUT, 'comparison.json'), 'w') as fh:
            json.dump(comparisons, fh, indent=1)


if __name__ == '__main__':
    main()
