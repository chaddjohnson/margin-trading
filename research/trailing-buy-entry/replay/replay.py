#!/usr/bin/env python3
"""Independent replay of the trailing-buy entry study (standard library only).

Written from research/trailing-buy-entry/STATE_MACHINE.md and src/app/allin-original.ts only; the study
engine's source (src/trailing-buy/) was not read. Runs every configuration in
replay/engine/manifest.json and writes replay/out/<id>_{trades.csv,setups.csv,summary.json} in the
engine's export formats.

Usage: python3 -I replay.py [--maxwait-before-eval] [--out DIR]

--maxwait-before-eval switches the max-wait expiry to the alternative reading of the spec (expire at
the start of session t when t - armSession >= M, before the trough/trigger are evaluated). The default
reading evaluates session t first and expires an unfilled setup at the end of the M-th session after
arming. See REPLAY_REPORT.md.
"""

import calendar
import json
import os
import sys
from decimal import Decimal

REPO = '/Users/chad/development/personal/margin-trading'
HERE = os.path.join(REPO, 'research', 'trailing-buy-entry', 'replay')
ENGINE_DIR = os.path.join(HERE, 'engine')
SECONDS_PER_DAY = 24 * 60 * 60

DEFAULT_OPTIONS = {
    'execution': 'close',
    'restrictedFill': 'A',
    'frozenHigh': 'activation',
    'maxWaitSessions': 0,
    'marginRate': 0.11,
    'investment': 100000,
}


# ----------------------------------------------------------------------------------------------------
# Number formatting identical to JavaScript's Number.prototype.toString (shortest round-trip digits).
# ----------------------------------------------------------------------------------------------------
def js_number(x):
    if isinstance(x, bool):
        return 'true' if x else 'false'
    if isinstance(x, int):
        return str(x)
    if x != x:
        return 'NaN'
    if x == float('inf'):
        return 'Infinity'
    if x == float('-inf'):
        return '-Infinity'
    if x == 0:
        return '0'
    sign = '-' if x < 0 else ''
    d = Decimal(repr(abs(x)))  # repr gives the shortest round-trip digits, as JS does
    digits_tuple, exponent = d.as_tuple().digits, d.as_tuple().exponent
    digits = ''.join(str(v) for v in digits_tuple).rstrip('0') or '0'
    # value = 0.digits * 10^n
    n = len(''.join(str(v) for v in digits_tuple)) + exponent
    k = len(digits)
    if k <= n <= 21:
        s = digits + '0' * (n - k)
    elif 0 < n <= 21:
        s = digits[:n] + '.' + digits[n:]
    elif -6 < n <= 0:
        s = '0.' + '0' * (-n) + digits
    else:
        e = n - 1
        mant = digits[0] + ('.' + digits[1:] if k > 1 else '')
        s = mant + 'e' + ('+' if e >= 0 else '-') + str(abs(e))
    return sign + s


# ----------------------------------------------------------------------------------------------------
# Data and indicators
# ----------------------------------------------------------------------------------------------------
def load_bars(path):
    bars = []
    with open(path) as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            date, o, h, lo, c, v = line.split('|')
            y, m, d = (int(p) for p in date.split('-'))
            bars.append({
                'date': date,
                'time': calendar.timegm((y, m, d, 0, 0, 0)),
                'open': float(o),
                'high': float(h),
                'low': float(lo),
                'close': float(c),
            })
    return bars


def wilder_atr(bars, n):
    """ATR[t] per STATE_MACHINE.md; None where undefined (t < N - 1)."""
    size = len(bars)
    atr = [None] * size
    if n <= 0 or size < n:
        return atr
    tr = []
    for t, bar in enumerate(bars):
        if t == 0:
            tr.append(bar['high'] - bar['low'])
        else:
            prev_close = bars[t - 1]['close']
            tr.append(max(bar['high'] - bar['low'], abs(bar['high'] - prev_close), abs(bar['low'] - prev_close)))
    total = 0.0
    for value in tr[:n]:
        total += value
    atr[n - 1] = total / n
    for t in range(n, size):
        atr[t] = (atr[t - 1] * (n - 1) + tr[t]) / n
    return atr


def reference_high(bars, t, lookback):
    """Highest high of the `lookback` sessions before t (t excluded)."""
    window = bars[max(0, t - lookback):t]
    if not window:
        return float('-inf')
    return max(bar['high'] for bar in window)


# ----------------------------------------------------------------------------------------------------
# One configuration
# ----------------------------------------------------------------------------------------------------
def run_config(config, maxwait_before_eval=False):
    params = config['params']
    options = dict(DEFAULT_OPTIONS)
    options.update(config.get('options') or {})

    bars = load_bars(os.path.join(REPO, config['dataFile']))
    mode = params['entryMode']  # legacy | fixed | atrSnapshot | atrRolling
    lookback = params['lookback']
    X = params['armTenths'] / 1000
    Y = params['reboundTenths'] / 1000
    K = params['atrMultTenths'] / 10
    atr_period = params['atrPeriod']
    stop_pct = params['stopTenths'] / 1000
    hold_days = params['holdDays']
    material_loss = params['materialLossTenths'] / 1000
    lower_reentry = params['lowerReentryTenths'] / 1000
    retrace = params['retraceTenths'] / 1000

    execution = options['execution']
    variant_b = options['restrictedFill'] == 'B'
    frozen_high_mode = options['frozenHigh']
    max_wait = options['maxWaitSessions'] or 0
    rate = options['marginRate']
    investment = options['investment']

    atr = wilder_atr(bars, atr_period) if mode in ('atrSnapshot', 'atrRolling') else [None] * len(bars)

    def atr_known(t):  # ATR known at session t = ATR[t - 1]
        return atr[t - 1] if t >= 1 else None

    start_time = calendar.timegm(tuple(int(p) for p in config['startDate'].split('-')) + (0, 0, 0))
    end_time = calendar.timegm(tuple(int(p) for p in config['endDate'].split('-')) + (0, 0, 0))
    session_indexes = [i for i, bar in enumerate(bars) if start_time <= bar['time'] <= end_time]
    first, last = session_indexes[0], session_indexes[-1]

    def interest_at(position, time):
        years_held = (time - position['entry_time']) / (365 * SECONDS_PER_DAY)
        return position['investment'] * rate * years_held

    def reset_level(r):
        return r['episode_low'] + retrace * (r['frozen_ref_high'] - r['episode_low'])

    trades = []
    setups = []
    episodes = []
    position = None
    setup = None
    order = None
    restriction = None
    episode = None
    post_entry_high = 0.0
    post_entry_low = 0.0
    stop_price = 0.0
    realized = 0.0
    peak = 0.0
    max_drawdown = 0.0
    cancelled_setups = 0

    def open_position(t, price, decision_t, frozen_ref_high):
        nonlocal position, post_entry_high, post_entry_low, stop_price
        position = {
            'decision_date': bars[decision_t]['date'],
            'entry_date': bars[t]['date'],
            'entry_time': bars[t]['time'],
            'entry_price': price,
            'shares': investment / price,
            'investment': investment,
            'frozen_ref_high': frozen_ref_high,
            'restricted_entry': restriction is not None,
        }
        post_entry_high = price
        post_entry_low = price
        stop_price = post_entry_high * (1 - stop_pct)

    for t in range(first, last + 1):
        bar = bars[t]
        close = bar['close']

        # The original skips the very first bar of its tick list entirely (no decision, no exit, mtm 0).
        if t == 0:
            continue

        ref_high = reference_high(bars, t, lookback)
        signal = (1 - close / ref_high) >= X
        opened_this_session = False

        if order is not None:
            # ---- Block A: a next-open order fills at this session's open; nothing else is decided.
            if isinstance(bar['open'], float) and bar['open'] > 0:
                open_position(t, bar['open'], order['decision_t'], order['frozen_ref_high'])
                opened_this_session = True
                if order['setup'] is not None:
                    order['setup']['fill_date'] = bar['date']
                    order['setup']['fill_price'] = bar['open']
                    order['setup']['outcome'] = 'filled'
                # This session's high and low count as post-entry.
                post_entry_high = max(post_entry_high, bar['high'])
                stop_price = max(stop_price, post_entry_high * (1 - stop_pct))
                post_entry_low = min(post_entry_low, bar['low'])
            elif order['setup'] is not None:
                order['setup']['outcome'] = 'order_invalid_open'
            order = None

        elif position is None:
            # ---- Block B: flat at the start of the session; decide at the close.
            if restriction is not None:
                restriction['episode_low'] = min(restriction['episode_low'], close)

            if restriction is not None and close >= reset_level(restriction):
                # Recovery reset takes precedence: cancel a pending setup, arm/buy nothing.
                if setup is not None:
                    setup['outcome'] = 'cancelled_reset'
                    cancelled_setups += 1
                    setup = None
            else:
                lower_allows = restriction is None or close <= restriction['lower_level']
                buy = False
                frozen_ref_high = None

                if mode == 'legacy':
                    if signal and lower_allows:
                        buy = True
                        frozen_ref_high = ref_high
                elif setup is None:
                    if signal and lower_allows:
                        setup = {
                            'arm_t': t,
                            'arm_date': bar['date'],
                            'arm_close': close,
                            'arm_ref_high': ref_high,
                            'trough': close,
                            'trough_date': bar['date'],
                            'atr_snapshot': atr_known(t),
                            'decision_date': '',
                            'fill_date': '',
                            'fill_price': '',
                            'outcome': '',
                            'blocked_triggers': 0,
                        }
                        setups.append(setup)
                else:
                    expired = False
                    if maxwait_before_eval and max_wait > 0 and t - setup['arm_t'] >= max_wait:
                        expired = True
                    elif close < setup['trough']:
                        setup['trough'] = close
                        setup['trough_date'] = bar['date']
                        if mode == 'atrSnapshot':
                            setup['atr_snapshot'] = atr_known(t)
                    else:
                        if mode == 'fixed':
                            trigger = setup['trough'] * (1 + Y)
                        elif mode == 'atrSnapshot':
                            snap = setup['atr_snapshot']
                            trigger = None if snap is None else setup['trough'] + K * snap
                        elif mode == 'atrRolling':
                            current = atr_known(t)
                            trigger = None if current is None else setup['trough'] + K * current
                        else:
                            raise ValueError(mode)
                        if trigger is not None and close >= trigger:
                            if variant_b and restriction is not None and close > restriction['lower_level']:
                                setup['blocked_triggers'] += 1
                            else:
                                buy = True
                                frozen_ref_high = setup['arm_ref_high'] if frozen_high_mode == 'activation' else ref_high
                    if not maxwait_before_eval and not buy and max_wait > 0 and t - setup['arm_t'] >= max_wait:
                        expired = True
                    if expired:
                        setup['outcome'] = 'expired'
                        setup = None

                if buy:
                    if setup is not None:
                        setup['decision_date'] = bar['date']
                    if execution == 'close':
                        open_position(t, close, t, frozen_ref_high)
                        opened_this_session = True
                        if setup is not None:
                            setup['fill_date'] = bar['date']
                            setup['fill_price'] = close
                            setup['outcome'] = 'filled'
                    elif execution == 'nextOpen':
                        order = {'decision_t': t, 'frozen_ref_high': frozen_ref_high, 'setup': setup}
                    else:
                        raise ValueError(execution)
                    setup = None

        else:
            # ---- Block C: a position was open at the start of the session; the original's exits.
            interest = interest_at(position, bar['time'])

            def profit_at(price):
                return position['shares'] * price - position['investment'] - interest

            is_stop_active = profit_at(stop_price) > 0
            is_stop_triggered_at_open = is_stop_active and bar['open'] <= stop_price
            days_held = (bar['time'] - position['entry_time']) / SECONDS_PER_DAY
            exit_reason = None
            exit_price = None
            if days_held >= hold_days and profit_at(bar['open']) < 0:
                exit_reason, exit_price = 'maximum hold', bar['open']
            elif is_stop_triggered_at_open:
                exit_reason, exit_price = 'trailing stop gap', bar['open']
            elif is_stop_active and bar['low'] <= stop_price:
                exit_reason, exit_price = 'trailing stop', stop_price

            if exit_reason is not None:
                profit = position['shares'] * exit_price - position['investment'] - interest
                realized += profit
                trades.append({
                    'decision_date': position['decision_date'],
                    'entry_date': position['entry_date'],
                    'exit_date': bar['date'],
                    'entry_price': position['entry_price'],
                    'exit_price': exit_price,
                    'reason': exit_reason,
                    'interest': interest,
                    'profit': profit,
                    'restricted_entry': position['restricted_entry'],
                })
                price_return = exit_price / position['entry_price'] - 1
                if price_return <= -material_loss:
                    restriction = {
                        'loss_exit_price': exit_price,
                        'frozen_ref_high': position['frozen_ref_high'],
                        'lower_level': exit_price * (1 - lower_reentry),
                        'episode_low': close,
                    }
                    episode = {'exit_date': bar['date'], 'resolution': ''}
                    episodes.append(episode)
                position = None
            else:
                post_entry_high = max(post_entry_high, bar['high'])
                stop_price = max(stop_price, post_entry_high * (1 - stop_pct))
                post_entry_low = min(post_entry_low, bar['low'])

        # ---- D. Mark to market.
        unrealized = 0
        if position is not None:
            unrealized = position['shares'] * close - position['investment'] - interest_at(position, bar['time'])
        marked = realized + unrealized
        if marked > peak:
            peak = marked
        if peak - marked > max_drawdown:
            max_drawdown = peak - marked

        # ---- E. Restriction resolution (the original's).
        if restriction is not None:
            restriction['episode_low'] = min(restriction['episode_low'], close)
            if opened_this_session:
                episode['resolution'] = 'lower_price_reentry'
                restriction = None
                episode = None
            elif position is None and order is None and close >= reset_level(restriction):
                episode['resolution'] = 'recovery_reset'
                restriction = None
                episode = None

    last_bar = bars[last]
    closed_interest = 0
    for trade in trades:
        closed_interest = closed_interest + trade['interest']
    accrued_interest = 0
    unrealized_profit = 0
    if position is not None:
        accrued_interest = interest_at(position, last_bar['time'])
        unrealized_profit = position['shares'] * last_bar['close'] - position['investment'] - accrued_interest
        trades.append({
            'decision_date': position['decision_date'],
            'entry_date': position['entry_date'],
            'exit_date': '',
            'entry_price': position['entry_price'],
            'exit_price': last_bar['close'],
            'reason': 'open',
            'interest': accrued_interest,
            'profit': unrealized_profit,
            'restricted_entry': position['restricted_entry'],
        })
    if setup is not None:
        setup['outcome'] = 'pending_at_end'
    if order is not None and order['setup'] is not None:
        order['setup']['outcome'] = 'order_unfilled_at_end'

    summary = {
        'netProfit': realized + unrealized_profit,
        'maximumDrawdown': max_drawdown,
        'closedInterest': closed_interest,
        'accruedInterest': accrued_interest,
        'restrictions': len(episodes),
        'lowerPriceReentries': sum(1 for e in episodes if e['resolution'] == 'lower_price_reentry'),
        'recoveryResets': sum(1 for e in episodes if e['resolution'] == 'recovery_reset'),
        'cancelledSetups': cancelled_setups,
    }
    return trades, setups, summary, mode == 'legacy'


# ----------------------------------------------------------------------------------------------------
# Output
# ----------------------------------------------------------------------------------------------------
TRADE_COLUMNS = ['decision_date', 'entry_date', 'exit_date', 'entry_price', 'exit_price', 'reason', 'interest',
                 'profit', 'restricted_entry']
SETUP_COLUMNS = ['arm_date', 'arm_close', 'trough', 'trough_date', 'decision_date', 'fill_date', 'fill_price',
                 'outcome', 'blocked_triggers']


def cell(value):
    if isinstance(value, str):
        return value
    return js_number(value)


def write_outputs(out_dir, config_id, trades, setups, summary, is_legacy):
    os.makedirs(out_dir, exist_ok=True)
    lines = [','.join(TRADE_COLUMNS)]
    for trade in trades:
        lines.append(','.join(cell(trade[c]) for c in TRADE_COLUMNS))
    with open(os.path.join(out_dir, f'{config_id}_trades.csv'), 'w') as handle:
        handle.write('\n'.join(lines) + '\n')

    with open(os.path.join(out_dir, f'{config_id}_setups.csv'), 'w') as handle:
        if not is_legacy:
            lines = [','.join(SETUP_COLUMNS)]
            for setup in setups:
                lines.append(','.join(cell(setup[c]) for c in SETUP_COLUMNS))
            handle.write('\n'.join(lines) + '\n')

    body = ',\n'.join(f' {json.dumps(k)}: {js_number(v)}' for k, v in summary.items())
    with open(os.path.join(out_dir, f'{config_id}_summary.json'), 'w') as handle:
        handle.write('{\n' + body + '\n}\n')


def main(argv):
    maxwait_before_eval = '--maxwait-before-eval' in argv
    out_dir = os.path.join(HERE, 'out')
    if '--out' in argv:
        out_dir = os.path.abspath(argv[argv.index('--out') + 1])
    with open(os.path.join(ENGINE_DIR, 'manifest.json')) as handle:
        manifest = json.load(handle)
    for config in manifest:
        trades, setups, summary, is_legacy = run_config(config, maxwait_before_eval)
        write_outputs(out_dir, config['id'], trades, setups, summary, is_legacy)
        print(f"{config['id']:32s} trades {len(trades):3d}  setups {len(setups):3d}  "
              f"net {summary['netProfit']:14.4f}  maxDD {summary['maximumDrawdown']:12.4f}")
    print(f'Wrote {len(manifest)} configurations to {out_dir}')


if __name__ == '__main__':
    main(sys.argv[1:])
