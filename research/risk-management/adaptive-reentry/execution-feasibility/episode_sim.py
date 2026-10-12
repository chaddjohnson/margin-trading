"""Family F single-trade counterfactuals for the known missed episodes.

Holding the ANCHOR run's history fixed (its restriction episode, frozen loss-exit price, frozen level),
ask: during that episode exactly as the anchor experienced it, would a resting limit at the frozen level
have filled (EXECUTION-MODEL CHANGE as documented in variant_sim.py: fill at the level when low <= L,
at the open when open < L; order resting only from the session after arming, and only when
L <= 0.90 x prev-90-session high), and what would THAT ONE TRADE have earned under the engine's exact
exit rules (8% profit-conditional trailing stop with the entry session's own high excluded, 15-day
max-hold loss exit at the open, 11%/yr simple interest, $100k position)?

This isolates the episode verdict from full-sequence path divergence (see variant_sim.py, where a fill in
an EARLIER episode changes every later restriction). The single trade is simulated in isolation on the
raw bars; no same-session close information places the order; fills never happen at session lows.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import Params, load  # noqa: E402

PRM = Params()
SECONDS_PER_DAY = 86400.0
YEAR_SECONDS = 365 * SECONDS_PER_DAY
DIP_FRACTION = 0.90

# The known missed episodes (ADAPTIVE_SPEC / lower-price-reentry REPORT) plus the two fills that moved an
# EXISTING anchor entry to a different date/price (shown for the price-impact comparison).
EPISODES = [
    # dataset, config, pct, episode exit date (anchor events CSV), window end for the fill search
    ('VGT_2016_2026', 'lower5', 0.05, '2020-03-16', 'VGT 2020-03/04 (C missed close-level by 1.0%)'),
    ('VGT_2016_2026', 'lower8', 0.08, '2020-03-16', 'VGT 2020-03/04 (D missed by 4.1% close / 0.9% low)'),
    ('VGT_2016_2026', 'REF_lower3', 0.03, '2022-11-03', 'VGT 2023-01 (B missed close-level by 1.6%)'),
    ('VGT_2016_2026', 'lower5', 0.05, '2023-01-03', 'VGT 2023-01 (C missed close-level by 1.6%)'),
    ('VGT_2016_2026', 'lower8', 0.08, '2022-10-14', 'VGT 2023-01 (D, episode armed 2022-10-14)'),
    ('VGT_2016_2026', 'lower8', 0.08, '2026-02-05', 'VGT 2026-03 (D missed close-level by 1.5%)'),
    ('QQQ_1999_2015', 'REF_lower3', 0.03, '2002-10-08', 'QQQ 2003 basing (B, episode armed 2002-10-08)'),
    ('QQQ_1999_2015', 'lower5', 0.05, '2002-12-27', 'QQQ 2003 basing (C; engine itself re-entered 2003-02-07)'),
    ('QQQ_1999_2015', 'lower8', 0.08, '2002-12-27', 'QQQ 2003 basing (D, episode armed 2002-12-27)'),
    # context rows: episodes the anchor resolved anyway, where the limit changes date/price
    ('VGT_2016_2026', 'REF_lower3', 0.03, '2020-03-16', 'VGT 2020 (B did NOT miss; limit fills 2 sessions earlier)'),
    ('VGT_2016_2026', 'lower5', 0.05, '2026-02-05', 'VGT 2026 (C did NOT miss; limit fills 1 session earlier, higher)'),
]


def roll_high_prev(h, window=PRM.window):
    out = np.full(len(h), np.nan)
    for i in range(1, len(h)):
        out[i] = h[max(0, i - window):i].max()
    return out


def single_trade(df, entry_i, entry_price):
    """Engine-exact forward simulation of one $100k trade from an intraday fill at session entry_i."""
    o, h, l, c, t = (df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low', 'close', 'time'])
    inv = PRM.base_size
    shares = inv / entry_price
    post_high = entry_price                      # entry session's own high excluded (see module docstring)
    stop = entry_price * (1 - PRM.trail)
    t0 = t[entry_i]
    for i in range(entry_i + 1, len(df)):
        accrued = inv * PRM.rate * (t[i] - t0) / YEAR_SECONDS

        def profit_at(price):
            return shares * price - inv - accrued

        stop_active = profit_at(stop) > 0
        days_held = (t[i] - t0) / SECONDS_PER_DAY
        if days_held >= PRM.loss_exit_days and profit_at(o[i]) < 0:
            px, reason = o[i], 'maximum hold'
        elif stop_active and o[i] <= stop:
            px, reason = o[i], 'trailing stop gap'
        elif stop_active and l[i] <= stop:
            px, reason = stop, 'trailing stop'
        else:
            post_high = max(post_high, h[i])
            stop = max(stop, post_high * (1 - PRM.trail))
            continue
        return dict(exit_date=str(df['date'].iloc[i].date()), exit_price=px, reason=reason,
                    profit=profit_at(px), interest=accrued, sessions_held=i - entry_i)
    i = len(df) - 1
    accrued = inv * PRM.rate * (t[i] - t0) / YEAR_SECONDS
    return dict(exit_date='open_at_end', exit_price=c[i], reason='open',
                profit=shares * c[i] - inv - accrued, interest=accrued, sessions_held=i - entry_i)


def chain_replay():
    """Mid-stream replay of each named episode: seed variant_sim.simulate with the anchor's frozen episode
    state at the arming exit and run to the horizon, with and without the limit execution model. The
    limit=False replay must reproduce the anchor's own trades over the window (asserted), so the
    limit=True chain differs ONLY through the execution model — no earlier-path divergence."""
    import variant_sim

    chains = [
        # dataset, config, pct, exit_date, horizon date
        ('VGT_2016_2026', 'lower5', 0.05, '2020-03-16', '2020-12-31', 'VGT 2020 C'),
        ('VGT_2016_2026', 'REF_lower3', 0.03, '2020-03-16', '2020-12-31', 'VGT 2020 B (context: anchor did not miss)'),
        ('QQQ_1999_2015', 'lower5', 0.05, '2002-12-27', '2003-12-31', 'QQQ 2003 C'),
        ('VGT_2016_2026', 'lower5', 0.05, '2026-02-05', None, 'VGT 2026 C (context: anchor did not miss)'),
    ]
    all_rows = []
    frames = {}
    for ds, cfg, pct, exit_date, horizon, label in chains:
        if ds not in frames:
            frames[ds] = load(ds)
        df = frames[ds]
        ev = pd.read_csv(HERE / 'results' / 'events' / f'{ds}__{cfg}.csv')
        epi = ev[ev['exit_date'] == exit_date].iloc[0]
        exit_i = int(df.index[df['date'].astype(str).str.startswith(exit_date)][0])
        end_i = int(df.index[df['date'].astype(str) <= horizon][-1]) if horizon else len(df) - 1
        init_st = dict(exit_i=exit_i, exit_price=float(epi['loss_exit_price']), ref_high=float(epi['ref_high']),
                       level=float(epi['loss_exit_price']) * (1 - pct), exit_date=exit_date)
        res_off = variant_sim.simulate(df, pct, limit=False, start_i=exit_i + 1, init_st=dict(init_st), end_i=end_i)
        res_on = variant_sim.simulate(df, pct, limit=True, start_i=exit_i + 1, init_st=dict(init_st), end_i=end_i)
        # sanity: the limit-off replay must equal the anchor's trades in the window
        anchor = pd.read_csv(HERE / 'results' / 'trades' / f'{ds}__{cfg}.csv')
        a = anchor[(anchor['entry_date'] > exit_date)]
        if horizon:
            a = a[a['entry_date'] <= horizon]
        off = res_off['trades']
        assert len(off) == len(a), (label, len(off), len(a))
        if len(off):
            assert (off['entry_date'].to_numpy() == a['entry_date'].astype(str).to_numpy()).all(), label
            assert np.allclose(off['entry_price'], a['entry_price'], atol=1e-6), label
        for model, res in [('anchor_replay', res_off), ('limit', res_on)]:
            for _, tr in res['trades'].iterrows():
                all_rows.append(dict(label=label, dataset=ds, config=cfg, model=model, **tr.to_dict()))
        net_off = res_off['trades']['profit'].sum() if len(res_off['trades']) else 0.0
        net_on = res_on['trades']['profit'].sum() if len(res_on['trades']) else 0.0
        print(f"{label:45s} window net: anchor {net_off:>10,.0f}  limit-model {net_on:>10,.0f}  "
              f"delta {net_on - net_off:>+10,.0f}")
    out = pd.DataFrame(all_rows)
    out.to_csv(HERE / 'results' / 'diagnostic' / 'known_episodes_chain.csv', index=False)
    return out


def main():
    rows = []
    frames = {}
    for ds, cfg, pct, exit_date, label in EPISODES:
        if ds not in frames:
            frames[ds] = load(ds)
        df = frames[ds]
        ev = pd.read_csv(HERE / 'results' / 'events' / f'{ds}__{cfg}.csv')
        epi = ev[ev['exit_date'] == exit_date].iloc[0]
        L = float(epi['loss_exit_price']) * (1 - pct)
        exit_i = int(df.index[df['date'].astype(str).str.startswith(exit_date)][0])
        end_date = epi['resolution_date'] if isinstance(epi['resolution_date'], str) and epi['resolution_date'] else None
        end_i = int(df.index[df['date'].astype(str).str.startswith(end_date)][0]) if end_date else len(df) - 1
        o, h, l = (df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low'])
        rhp = roll_high_prev(h)
        fill_i = fill_px = None
        gate_ok = True
        min_low, min_low_i = np.inf, None
        for i in range(exit_i + 1, end_i + 1):
            if l[i] < min_low:
                min_low, min_low_i = l[i], i
            if L > DIP_FRACTION * rhp[i]:
                gate_ok = False
                continue
            if o[i] < L:
                fill_i, fill_px, how = i, o[i], 'gap_fill_open'
                break
            if l[i] <= L:
                fill_i, fill_px, how = i, L, 'limit_fill'
                break
        base = dict(label=label, dataset=ds, config=cfg, episode_exit=exit_date,
                    loss_exit_price=float(epi['loss_exit_price']), level=L,
                    anchor_resolution=epi['resolution'], anchor_resolution_date=epi['resolution_date'],
                    episode_min_low=min_low, min_low_date=str(df['date'].iloc[min_low_i].date()),
                    low_gap_to_level=min_low / L - 1)
        if fill_i is None:
            rows.append(dict(base, fill='NO FILL', fill_date='', fill_price=np.nan,
                             survives_s999=False, trade_exit='', trade_reason='', trade_profit=np.nan))
            continue
        survives = (o[fill_i] < L) or (l[fill_i] <= L * 0.999)
        tr = single_trade(df, fill_i, fill_px)
        rows.append(dict(base, fill=how, fill_date=str(df['date'].iloc[fill_i].date()), fill_price=fill_px,
                         survives_s999=survives, trade_exit=tr['exit_date'], trade_reason=tr['reason'],
                         trade_profit=tr['profit'], trade_interest=tr['interest'],
                         trade_sessions=tr['sessions_held'], trade_exit_price=tr['exit_price']))
    out = pd.DataFrame(rows)
    outdir = HERE / 'results' / 'diagnostic'
    out.to_csv(outdir / 'known_episodes.csv', index=False)
    pd.set_option('display.width', 300)
    print(out[['label', 'config', 'level', 'episode_min_low', 'low_gap_to_level', 'fill', 'fill_date',
               'fill_price', 'survives_s999', 'trade_exit', 'trade_reason', 'trade_profit']].to_string(index=False))


if __name__ == '__main__':
    main()
    print()
    chain = chain_replay()
    pd.set_option('display.width', 300)
    print()
    print(chain[['label', 'model', 'entry_date', 'entry_price', 'entry_path', 'exit_date', 'exit_price',
                 'reason', 'profit']].to_string(index=False))
