"""Isolated Limit-on-Close (LOC) execution simulation for the production allIn.ts strategy.

Nothing in src/ or in any other research directory is imported or modified. The production loop
(src/app/allIn.ts, strategy 'lower3' = material-loss 0.5% / 3% lower-price re-entry / 38% retrace reset)
is re-implemented here faithfully, with the entry step replaced by an LOC model that is switched on
piecewise so every difference from the idealized "fill at the signal close" model can be isolated.

Variants (all share the identical exit engine, interest, mark-to-market and drawdown logic):

  ideal          reference reproduction: entry at the close when the close satisfies the conditions,
                 fractional shares, investment exactly $100,000. Must reproduce
                 results/python/trades/<dataset>__new.csv and results/ts/<case>/trades.csv trade for trade.
  loc_frac       LOC fill model: a buy LOC with the KNOWABLE limit is "submitted" before every close while
                 flat; it fills at the close iff close <= limit (the limit already encodes the reset-level
                 cap, see knowable_limit()). Fractional shares, $100,000. Expected to be identical to
                 `ideal` -- that identity is the proof that the limit formula reproduces the entry rule.
  loc_whole      loc_frac + whole-share sizing: shares = floor(100000 / limit); investment = shares * close.
  loc_whole_b    loc_whole + fill uncertainty at the boundary: a close within 0.05% below the limit
                 (close > limit * (1 - 0.0005)) is treated as a MISSED fill (no entry that session).
  loc_whole_c    loc_frac + alternative sizing floor(100000 / close) (illustrative only: the close is not
                 known when the order is entered, so this sizing is not implementable as a single LOC).
  loc_nocap      loc_frac WITHOUT the reset-level cap on the limit (limit = min(0.9 H, 0.97 lossExit)). Shows
                 what an LOC that ignores the reset priority would have done (wrong fills on reset sessions).

Prices are the adjusted prices of the data files; whole-share effects are therefore expressed in adjusted
price units (see LOC_FEASIBILITY.md for the real-price bound).

Run:  <python with pandas+numpy> loc_simulation.py        (writes ./results/)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
RESULTS = HERE / 'results'
REF_PY = HERE.parent / 'results' / 'python' / 'trades'
REF_TS = HERE.parent / 'results' / 'ts'

SECONDS_PER_DAY = 24 * 60 * 60
YEAR_SECONDS = 365 * SECONDS_PER_DAY

# Production parameters (src/app/allIn.ts)
WINDOW = 90
TARGET = 0.10
TRAIL = 0.08
MAX_HOLD_DAYS = 15
RATE = 0.11
SIZE = 100000.0
MATERIAL = 0.005
LOWER = 0.03
RETRACE = 0.38
BOUNDARY_MISS = 0.0005  # variant b: a close within 0.05% below the limit is treated as a missed fill

DATASETS = {
    'VGT_2016_2026': dict(file='data/VGT/VGT-2016-2026.csv', end=None, ts='VGT_2016_2026'),
    'VGT_2016_2025': dict(file='data/VGT/VGT-2016-2026.csv', end='2025-12-31', ts='VGT_2016_2025'),
    'VGT_2005_2015': dict(file='data/VGT/VGT-2004-2015.csv', end=None, ts='VGT_2005_2015'),
    'QQQ_1999_2015': dict(file='data/QQQ/QQQ-1999-2015.csv', end=None, ts='QQQ_1999_2015'),
    'QQQ_2016_2026': dict(file='data/QQQ/QQQ-2016-2026.csv', end=None, ts='QQQ_2016_2026'),
}

VARIANTS = {
    'ideal': dict(loc=False, sizing='fraction', boundary_miss=0.0, reset_cap=True),
    'loc_frac': dict(loc=True, sizing='fraction', boundary_miss=0.0, reset_cap=True),
    'loc_whole': dict(loc=True, sizing='limit', boundary_miss=0.0, reset_cap=True),
    'loc_whole_b': dict(loc=True, sizing='limit', boundary_miss=BOUNDARY_MISS, reset_cap=True),
    'loc_whole_c': dict(loc=True, sizing='close', boundary_miss=0.0, reset_cap=True),
    'loc_nocap': dict(loc=True, sizing='fraction', boundary_miss=0.0, reset_cap=False),
}


def load(spec):
    df = pd.read_csv(REPO / spec['file'], sep='|', header=None, names=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'])
    if spec['end'] is not None:
        df = df[df['date'] <= spec['end']]
    df = df.reset_index(drop=True)
    df['time'] = (df['date'] - pd.Timestamp('1970-01-01')) // pd.Timedelta(seconds=1)
    return df


def knowable_limit(recent_high, restriction, reset_cap=True):
    """The buy-LOC limit that can be computed BEFORE session i's close.

    normal:     0.90 * H   (H = highest high of sessions i-90..i-1)
    restricted: min(0.90 * H, 0.97 * lossExit) and, because a close at or above the reset level resets
                instead of buying, the limit must sit strictly below resetLevel_prev =
                episodeLow_prev + 0.38 * (refHigh - episodeLow_prev) (episode low through session i-1).
    Returns (limit, cap_binding, reset_level_prev, raw_entry_level). The cap is modelled as a strict
    inequality: the simulation fills iff close <= raw level AND close < reset_level_prev; in practice the
    operator submits limit = min(raw level, reset_level_prev - one tick).
    """
    raw = TARGET_LIMIT * recent_high
    if restriction is None:
        return raw, False, float('nan'), raw
    raw = min(raw, restriction['lower_level'])
    reset_prev = restriction['episode_low'] + RETRACE * (restriction['ref_high'] - restriction['episode_low'])
    cap_binding = reset_prev <= raw
    if reset_cap and cap_binding:
        return math.nextafter(reset_prev, -math.inf), True, reset_prev, raw  # "just below" the reset level
    return raw, cap_binding, reset_prev, raw


TARGET_LIMIT = 1 - TARGET


def simulate(df, variant):
    cfg = VARIANTS[variant]
    o, h, l, c, t = (df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low', 'close', 'time'])
    dates = df['date'].dt.strftime('%Y-%m-%d').tolist()
    n = len(df)

    pos = None  # dict(entry_i, entry_time, entry_price, shares, investment, post_high, post_low, stop, ref_high)
    trades = []
    realized = 0.0
    peak = 0.0
    peak_i = 0
    mdd = 0.0
    mdd_peak_i = 0
    mdd_trough_i = 0
    restriction = None  # dict(loss_exit_price, ref_high, lower_level, episode_low)
    episodes = []
    orders = []  # one row per session an LOC would be submitted (flat at the session start)
    daily = np.zeros(n)
    borrowed = np.zeros(n)

    def interest(p, ts):
        return p['investment'] * RATE * ((ts - p['entry_time']) / YEAR_SECONDS)

    for i in range(n):
        if i == 0:
            continue
        recent_high = h[max(0, i - WINDOW):i].max()
        pct = 1 - c[i] / recent_high
        signal = pct >= TARGET
        prior = pos
        flat = prior is None
        entry_blocked = False

        if flat:
            if cfg['loc']:
                limit, cap_binding, reset_prev, raw = knowable_limit(recent_high, restriction, cfg['reset_cap'])
                fills = c[i] <= limit
                boundary = fills and c[i] > limit * (1 - cfg['boundary_miss'])
                would_fill_ideal = fills
                if boundary:
                    fills = False
                orders.append(dict(i=i, date=dates[i], restricted=restriction is not None, recent_high=recent_high,
                                   raw_entry_level=raw, reset_level_prev=reset_prev, cap_binding=cap_binding,
                                   limit=limit, close=c[i], fills=fills, boundary_miss=boundary,
                                   close_vs_limit=c[i] / limit - 1))
                buy = fills
            else:
                # production rule, written exactly as allIn.ts evaluates it
                buy = signal
                if buy and restriction is not None:
                    ep_low = min(restriction['episode_low'], c[i])
                    reset_level = ep_low + RETRACE * (restriction['ref_high'] - ep_low)
                    if c[i] >= reset_level or c[i] > restriction['lower_level']:
                        buy = False
                        entry_blocked = True
            if buy:
                if cfg['sizing'] == 'fraction':
                    shares = SIZE / c[i]
                    investment = SIZE
                elif cfg['sizing'] == 'limit':
                    shares = math.floor(SIZE / limit)
                    investment = shares * c[i]
                elif cfg['sizing'] == 'close':
                    shares = math.floor(SIZE / c[i])
                    investment = shares * c[i]
                else:
                    raise ValueError(cfg['sizing'])
                pos = dict(entry_i=i, entry_time=t[i], entry_price=c[i], shares=shares, investment=investment,
                           post_high=c[i], post_low=c[i], stop=c[i] * (1 - TRAIL), ref_high=recent_high,
                           limit=(limit if cfg['loc'] else float('nan')))

        if prior is not None:
            p = prior
            accrued = interest(p, t[i])

            def profit_at(price, p=p, accrued=accrued):
                return p['shares'] * price - p['investment'] - accrued

            stop_active = profit_at(p['stop']) > 0
            stop_at_open = stop_active and o[i] <= p['stop']
            days_held = (t[i] - p['entry_time']) / SECONDS_PER_DAY
            exit = None
            if days_held >= MAX_HOLD_DAYS and profit_at(o[i]) < 0:
                exit = ('maximum hold', o[i])
            elif stop_at_open:
                exit = ('trailing stop gap', o[i])
            elif stop_active and l[i] <= p['stop']:
                exit = ('trailing stop', p['stop'])
            if exit:
                reason, price = exit
                profit = profit_at(price)
                realized += profit
                price_return = price / p['entry_price'] - 1
                trades.append(dict(entry_index=p['entry_i'], exit_index=i, entry_date=dates[p['entry_i']], exit_date=dates[i],
                                   entry_price=p['entry_price'], exit_price=price, reason=reason, investment=p['investment'],
                                   shares=p['shares'], interest=accrued, profit=profit, price_return=price_return,
                                   limit=p['limit'], restricted_entry=p.get('restricted_entry', False)))
                pos = None
                if price_return <= -MATERIAL:
                    restriction = dict(loss_exit_price=price, ref_high=p['ref_high'], lower_level=price * (1 - LOWER),
                                       episode_low=c[i])
                    episodes.append(dict(exit_index=i, exit_date=dates[i], exit_reason=reason, loss=profit,
                                         price_return=price_return, loss_exit_price=price, ref_high=p['ref_high'],
                                         resolution='', resolution_date=''))
            else:
                p['post_high'] = max(p['post_high'], h[i])
                p['stop'] = max(p['stop'], p['post_high'] * (1 - TRAIL))
                p['post_low'] = min(p['post_low'], l[i])

        marked = realized
        if pos is not None:
            marked += pos['shares'] * c[i] - pos['investment'] - interest(pos, t[i])
            borrowed[i] = pos['investment']
        daily[i] = marked
        if marked > peak:
            peak = marked
            peak_i = i
        if peak - marked > mdd:
            mdd = peak - marked
            mdd_peak_i = peak_i
            mdd_trough_i = i

        # End of session: restriction resolution (identical to allIn.ts)
        if restriction is not None:
            restriction['episode_low'] = min(restriction['episode_low'], c[i])
            reset_level = restriction['episode_low'] + RETRACE * (restriction['ref_high'] - restriction['episode_low'])
            if pos is not None and pos['entry_i'] == i:
                pos['restricted_entry'] = True
                episodes[-1].update(resolution='lower_price_reentry', resolution_date=dates[i])
                restriction = None
            elif pos is None and c[i] >= reset_level:
                episodes[-1].update(resolution='recovery_reset', resolution_date=dates[i])
                restriction = None
            elif i == n - 1:
                episodes[-1].update(resolution='unresolved_at_end', resolution_date=dates[i])

    last = n - 1
    unrealized = 0.0
    if pos is not None:
        accrued = interest(pos, t[last])
        unrealized = pos['shares'] * c[last] - pos['investment'] - accrued
        trades.append(dict(entry_index=pos['entry_i'], exit_index=None, entry_date=dates[pos['entry_i']], exit_date='',
                           entry_price=pos['entry_price'], exit_price=c[last], reason='open', investment=pos['investment'],
                           shares=pos['shares'], interest=accrued, profit=unrealized, price_return=c[last] / pos['entry_price'] - 1,
                           limit=pos['limit'], restricted_entry=pos.get('restricted_entry', False)))
    tr = pd.DataFrame(trades)
    summary = dict(variant=variant, sessions=n, first_date=dates[0], last_date=dates[last],
                   closed_trades=int((tr['reason'] != 'open').sum()) if len(tr) else 0, open_at_end=pos is not None,
                   entries=len(tr), realized=realized, unrealized=unrealized, net=realized + unrealized,
                   interest=float(tr['interest'].sum()) if len(tr) else 0.0, max_drawdown=mdd,
                   mdd_peak_date=dates[mdd_peak_i], mdd_trough_date=dates[mdd_trough_i],
                   total_invested=float(tr['investment'].sum()) if len(tr) else 0.0,
                   restrictions=len(episodes),
                   lower_price_reentries=sum(e['resolution'] == 'lower_price_reentry' for e in episodes),
                   recovery_resets=sum(e['resolution'] == 'recovery_reset' for e in episodes))
    return dict(trades=tr, summary=summary, orders=pd.DataFrame(orders), episodes=pd.DataFrame(episodes),
                daily=pd.DataFrame(dict(date=dates, close=c, borrowed=borrowed, mtm_pnl=daily)))


def compare_trades(a, b, tol=1e-6):
    """Trade-for-trade comparison on entry/exit index, prices, shares, investment and profit."""
    if len(a) != len(b):
        return False, f'{len(a)} vs {len(b)} trades'
    for k_a, k_b in [('entry_index', 'entry_i'), ('exit_index', 'exit_i'), ('entry_price', 'entry_price'),
                     ('exit_price', 'exit_price'), ('shares', 'shares'), ('investment', 'investment'),
                     ('interest', 'interest'), ('profit', 'profit')]:
        va = pd.to_numeric(a[k_a], errors='coerce').to_numpy(dtype=float)
        vb = pd.to_numeric(b[k_b], errors='coerce').to_numpy(dtype=float)
        both_nan = np.isnan(va) & np.isnan(vb)
        diff = np.abs(va - vb)
        bad = ~both_nan & ~(diff <= tol * np.maximum(1.0, np.abs(vb)))
        if bad.any():
            j = int(np.argmax(bad))
            return False, f'{k_a} differs at trade {j}: {va[j]} vs {vb[j]}'
    return True, 'identical'


def main():
    RESULTS.mkdir(parents=True, exist_ok=True)
    out = {}
    for ds, spec in DATASETS.items():
        df = load(spec)
        out[ds] = {}
        for variant in VARIANTS:
            res = simulate(df, variant)
            out[ds][variant] = res
            tag = f'{ds}__{variant}'
            res['trades'].to_csv(RESULTS / f'{tag}__trades.csv', index=False)
            if variant != 'ideal':
                res['orders'].to_csv(RESULTS / f'{tag}__orders.csv', index=False)
    # verification
    verification = {}
    for ds, spec in DATASETS.items():
        ideal = out[ds]['ideal']['trades']
        checks = {}
        py = REF_PY / f'{ds}__new.csv'
        if py.exists():
            ref = pd.read_csv(py)
            ok, msg = compare_trades(ideal, ref)
            checks['python_reference_new'] = dict(file=str(py.relative_to(REPO)), identical=ok, detail=msg)
        ts = REF_TS / spec['ts'] / 'trades.csv'
        if ts.exists():
            ref = pd.read_csv(ts).rename(columns={'entry_index': 'entry_i', 'exit_index': 'exit_i'})
            ok, msg = compare_trades(ideal, ref)
            checks['ts_production_run'] = dict(file=str(ts.relative_to(REPO)), identical=ok, detail=msg)
        ok, msg = compare_trades(out[ds]['loc_frac']['trades'].rename(columns={}),
                                 ideal.rename(columns={'entry_index': 'entry_i', 'exit_index': 'exit_i'}))
        checks['loc_frac_equals_ideal'] = dict(identical=ok, detail=msg)
        verification[ds] = checks
    # summary table
    rows = []
    for ds in DATASETS:
        base = out[ds]['ideal']['summary']
        for variant in VARIANTS:
            s = dict(dataset=ds, **out[ds][variant]['summary'])
            s['net_vs_ideal'] = s['net'] - base['net']
            s['mdd_vs_ideal'] = s['max_drawdown'] - base['max_drawdown']
            s['entries_vs_ideal'] = s['entries'] - base['entries']
            rows.append(s)
    summary = pd.DataFrame(rows)
    summary.to_csv(RESULTS / 'summary.csv', index=False)
    # entry eligibility differences: sessions where any variant's entry set differs from ideal
    diffs = []
    for ds in DATASETS:
        ideal_entries = set(out[ds]['ideal']['trades']['entry_index'])
        for variant in VARIANTS:
            if variant == 'ideal':
                continue
            ent = set(out[ds][variant]['trades']['entry_index'])
            orders = out[ds][variant]['orders'].set_index('i')
            ideal_dates = dict(zip(out[ds]['ideal']['trades']['entry_index'], out[ds]['ideal']['trades']['entry_date']))
            for i in sorted(ideal_entries - ent):
                if i in orders.index:
                    row = orders.loc[i]
                    kind = 'ideal entry missed at the boundary' if row['boundary_miss'] else 'ideal entry not filled'
                    diffs.append(dict(dataset=ds, variant=variant, index=i, date=row['date'], kind=kind,
                                      close=row['close'], limit=row['limit'], close_vs_limit=row['close_vs_limit'],
                                      boundary_miss=bool(row['boundary_miss'])))
                else:
                    diffs.append(dict(dataset=ds, variant=variant, index=i, date=ideal_dates[i],
                                      kind='ideal entry absent: variant held a different position (sequence diverged)',
                                      close=float('nan'), limit=float('nan'), close_vs_limit=float('nan'), boundary_miss=''))
            for i in sorted(ent - ideal_entries):
                row = orders.loc[i]
                diffs.append(dict(dataset=ds, variant=variant, index=i, date=row['date'],
                                  kind='extra entry (sequence diverged after a missed fill)',
                                  close=row['close'], limit=row['limit'], close_vs_limit=row['close_vs_limit'],
                                  boundary_miss=bool(row['boundary_miss'])))
    pd.DataFrame(diffs).to_csv(RESULTS / 'entry_differences.csv', index=False)
    # whole-share sizing per entry (on the ideal entry set, using the knowable limit of the loc_frac run)
    sizing = []
    for ds in DATASETS:
        orders = out[ds]['loc_frac']['orders']
        for _, r in orders[orders['fills']].iterrows():
            lim, cl = r['limit'], r['close']
            s_lim = math.floor(SIZE / lim)
            s_cl = math.floor(SIZE / cl)
            sizing.append(dict(dataset=ds, index=int(r['i']), date=r['date'], restricted=bool(r['restricted']),
                               limit=lim, close=cl, close_vs_limit=r['close_vs_limit'],
                               shares_floor_limit=s_lim, invested_floor_limit=s_lim * cl,
                               shortfall_floor_limit=SIZE - s_lim * cl, shortfall_pct_floor_limit=(SIZE - s_lim * cl) / SIZE,
                               shares_floor_close=s_cl, invested_floor_close=s_cl * cl,
                               shortfall_floor_close=SIZE - s_cl * cl, shortfall_pct_floor_close=(SIZE - s_cl * cl) / SIZE,
                               cap_binding=bool(r['cap_binding'])))
    sz = pd.DataFrame(sizing)
    sz['gap_pct'] = 1 - sz['close'] / sz['limit']  # under-investment caused by sizing at the limit, not the close
    sz['rounding_pct_floor_limit'] = sz['shortfall_pct_floor_limit'] - sz['gap_pct']
    sz.to_csv(RESULTS / 'whole_share_sizing.csv', index=False)
    sizing_stats = {}
    for ds, g in sz.groupby('dataset'):
        sizing_stats[ds] = dict(entries=int(len(g)),
                                shortfall_floor_limit=dict(mean_pct=float(g['shortfall_pct_floor_limit'].mean()),
                                                           median_pct=float(g['shortfall_pct_floor_limit'].median()),
                                                           max_pct=float(g['shortfall_pct_floor_limit'].max()),
                                                           total_dollars=float(g['shortfall_floor_limit'].sum())),
                                of_which_limit_to_close_gap=dict(mean_pct=float(g['gap_pct'].mean()), max_pct=float(g['gap_pct'].max())),
                                of_which_whole_share_rounding=dict(mean_pct=float(g['rounding_pct_floor_limit'].mean()),
                                                                   max_pct=float(g['rounding_pct_floor_limit'].max())),
                                shortfall_floor_close=dict(mean_pct=float(g['shortfall_pct_floor_close'].mean()),
                                                           max_pct=float(g['shortfall_pct_floor_close'].max()),
                                                           total_dollars=float(g['shortfall_floor_close'].sum())),
                                entries_within_0_05pct_of_limit=int((g['close_vs_limit'] > -BOUNDARY_MISS).sum()),
                                entries_within_0_5pct_of_limit=int((g['close_vs_limit'] > -0.005).sum()),
                                closest_close_vs_limit=float(g['close_vs_limit'].max()),
                                mean_adjusted_close=float(g['close'].mean()))
    with open(RESULTS / 'sizing_stats.json', 'w') as f:
        json.dump(sizing_stats, f, indent=1)
    print(json.dumps(sizing_stats, indent=1))
    with open(RESULTS / 'verification.json', 'w') as f:
        json.dump(verification, f, indent=1)
    with open(RESULTS / 'summary.json', 'w') as f:
        json.dump(rows, f, indent=1, default=str)
    pd.set_option('display.width', 250)
    print(summary[['dataset', 'variant', 'entries', 'closed_trades', 'net', 'max_drawdown', 'interest', 'total_invested',
                   'net_vs_ideal', 'mdd_vs_ideal', 'entries_vs_ideal']].to_string(index=False))
    print(json.dumps(verification, indent=1))
    d = pd.DataFrame(diffs)
    print(d.to_string(index=False) if len(d) else 'no entry differences')


if __name__ == '__main__':
    main()
