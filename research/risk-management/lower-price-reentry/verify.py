"""Verification for lower-price re-entry with recovery reset. Run after run.py; writes results/verification.txt.

1. Baseline reproduction: results/trades/<ds>__A_baseline.csv must equal baseline/results/trades/<ds>__baseline.csv
   column for column, and net / max drawdown / interest / trade count must match baseline/results/summary.json.

2. Independent state-machine replay: using ONLY the raw price file, the variant's trade list and the two fixed
   thresholds (never the strategy's internals), re-derive the full restriction history:
   - a restriction starts at every losing exit (profit < 0), with loss_exit_price = the trade's exit price and
     ref_high = max(high[entry_i-90 .. entry_i-1]) of the losing trade;
   - scanning forward from the exit session (inclusive), the first session with close >= 0.95 x ref_high ends
     it (reset), unless a lower-price re-entry ends it first;
   - every entry made while a replayed restriction is active must satisfy close <= loss_exit_price x (1 - thr)
     and close < the reset level (reset priority);
   - every session where the variant is flat, the 10% signal is present, it is not an exit session and NO
     replayed restriction is active must contain an entry (the rule is the only source of suppression);
   - trade spans are disjoint and no entry happens on an exit session.
   The replayed episodes (start, frozen values, resolution kind and session) must match results/events/*.csv,
   the replayed blocked sessions must match the states log, and the frozen values must be constant per episode.

3. Spot checks: prints concrete episodes (dates, prices, thresholds, outcomes) for the report.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, Params, load  # noqa: E402

from strategies import CONFIGS, RESET_FRACTION  # noqa: E402

OUT = HERE / 'results'
BASE = HERE.parent / 'baseline' / 'results'
PRM = Params()
lines = []
n_checks = 0


def say(s=''):
    print(s)
    lines.append(s)


def check(ok, msg):
    global n_checks
    n_checks += 1
    if not ok:
        say(f'  FAIL  {msg}')
        raise AssertionError(msg)


def verify_baseline(ds):
    mine = pd.read_csv(OUT / 'trades' / f'{ds}__A_baseline.csv')
    ref = pd.read_csv(BASE / 'trades' / f'{ds}__baseline.csv')
    pd.testing.assert_frame_equal(mine, ref, check_exact=True)
    sm = json.load(open(OUT / 'summary.json'))
    rec = next(r for r in sm if r['dataset'] == ds and r['config'] == 'A_baseline')
    brec = next(r for r in json.load(open(BASE / 'summary.json')) if r['dataset'] == ds)['metrics']
    m = rec['metrics']
    for key in ['net_profit', 'max_drawdown', 'margin_interest', 'closed_trades']:
        check(abs(float(m[key]) - float(brec[key])) < 1e-6, f'{ds} A_baseline {key}: {m[key]} vs {brec[key]}')
    say(f'  {ds}: A_baseline identical to the frozen baseline '
        f"({len(mine)} trades, net {m['net_profit']:,.0f}, mdd {m['max_drawdown']:,.0f})")


def replay(ds, cfg, thr, df):
    c, h = df['close'].to_numpy(float), df['high'].to_numpy(float)
    dates = df['date'].dt.date.astype(str).to_numpy()
    n = len(df)
    tr = pd.read_csv(OUT / 'trades' / f'{ds}__{cfg}.csv')
    ent = tr['entry_i'].astype(int).to_numpy()
    ex = tr['exit_i'].to_numpy(float)
    end = np.where(np.isnan(ex), n - 1, ex).astype(int)
    check((ent[1:] > end[:-1]).all(), f'{ds} {cfg}: trade spans disjoint, no entry on an exit session')
    held = np.zeros(n, bool)  # a position existed at the START of the session (before the close decision)
    exit_sess = np.zeros(n, bool)
    for k in range(len(tr)):
        held[ent[k] + 1:end[k] + 1] = True
        if not np.isnan(ex[k]):
            exit_sess[end[k]] = True
    entry_at = {int(e): k for k, e in enumerate(ent)}
    exit_at = {int(end[k]): k for k in range(len(tr)) if not np.isnan(ex[k])}
    episodes, blocked = [], []
    restricted, lo_px, rh = False, None, None
    for i in range(1, n):
        recent = h[max(0, i - PRM.window):i].max()
        signal = 1 - c[i] / recent >= PRM.target
        if i in entry_at:
            check(bool(signal), f'{ds} {cfg}: entry {dates[i]} has the 10% signal')
            check(not held[i], f'{ds} {cfg}: entry {dates[i]} while flat')
            if restricted:
                lower = lo_px * (1 - thr)
                check(c[i] <= lower + 1e-9 and c[i] < RESET_FRACTION * rh,
                      f'{ds} {cfg}: restricted entry {dates[i]} close {c[i]:.4f} vs lower {lower:.4f} '
                      f'/ reset {RESET_FRACTION * rh:.4f}')
                episodes[-1].append(('reentry', i))
                restricted = False
        elif not held[i] and not exit_sess[i]:
            if restricted:
                if c[i] >= RESET_FRACTION * rh:
                    episodes[-1].append(('reset', i))
                    restricted = False
                elif signal:
                    blocked.append(i)
            elif signal:
                raise AssertionError(f'{ds} {cfg}: {dates[i]} flat, unrestricted, signal, no exit — no entry')
        if i in exit_at:
            k = exit_at[i]
            if float(tr.loc[k, 'profit']) < 0:
                check(not restricted, f'{ds} {cfg}: no overlapping restrictions at {dates[i]}')
                lo_px = float(tr.loc[k, 'exit_price'])
                pe = int(tr.loc[k, 'entry_i'])
                rh = h[max(0, pe - PRM.window):pe].max()
                restricted = True
                episodes.append([('loss_exit', i, lo_px, rh)])
                if c[i] >= RESET_FRACTION * rh:  # reset on the exit session's own close
                    episodes[-1].append(('reset', i))
                    restricted = False
    if restricted:
        episodes[-1].append(('unresolved', n - 1))
    return episodes, blocked, dates


def verify_variant(ds, cfg, thr, df):
    episodes, blocked, dates = replay(ds, cfg, thr, df)
    ev = pd.read_csv(OUT / 'events' / f'{ds}__{cfg}.csv')
    st = pd.read_csv(OUT / 'states' / f'{ds}__{cfg}.csv')
    check(len(ev) == len(episodes), f'{ds} {cfg}: {len(episodes)} replayed episodes vs {len(ev)} logged')
    kinds = {'reentry': 'lower_price_reentry', 'reset': 'recovery_reset', 'unresolved': 'unresolved_at_end'}
    for k, epi in enumerate(episodes):
        start, res = epi[0], epi[1]
        row = ev.iloc[k]
        check(row['exit_date'] == dates[start[1]] and row['resolution'] == kinds[res[0]]
              and row['resolution_date'] == dates[res[1]]
              and abs(row['loss_exit_price'] - start[2]) < 1e-9 and abs(row['ref_high'] - start[3]) < 1e-9,
              f"{ds} {cfg}: episode {dates[start[1]]} -> {kinds[res[0]]} {dates[res[1]]} vs logged "
              f"{row['exit_date']} -> {row['resolution']} {row['resolution_date']}")
    logged_blocked = set(st.loc[st['reason'].str.startswith('entry_blocked'), 'date'])
    check(logged_blocked == {dates[b] for b in blocked},
          f'{ds} {cfg}: blocked sessions differ (replay {len(blocked)}, log {len(logged_blocked)})')
    ep_id = (st['prev_state'].eq('NORMAL') & st['new_state'].eq('RESTRICTED')).cumsum()
    in_ep = st['new_state'].eq('RESTRICTED') | st['prev_state'].eq('RESTRICTED')
    for _, g in st[in_ep].groupby(ep_id[in_ep]):
        check(g['loss_exit_price'].nunique() == 1 and g['ref_high'].nunique() == 1,
              f"{ds} {cfg}: frozen values changed within the episode starting {g['date'].iloc[0]}")
    resets = st[st['reason'] == 'recovery_reset']
    check(bool((resets['close'] >= resets['recovery_reset_threshold'] - 1e-9).all()),
          f'{ds} {cfg}: every logged reset has close >= the reset threshold')
    say(f'  {ds} {cfg}: OK — {len(episodes)} episodes '
        f"({(ev['resolution'] == 'lower_price_reentry').sum()} re-entries, "
        f"{(ev['resolution'] == 'recovery_reset').sum()} resets, "
        f"{(ev['resolution'] == 'unresolved_at_end').sum()} unresolved), {len(blocked)} blocked signal sessions")


def spot_checks():
    say('\n== 3. Spot checks (concrete episodes) ==')
    cols = ['exit_date', 'loss', 'loss_exit_price', 'ref_high', 'lower_level', 'reset_level',
            'resolution', 'resolution_date', 'sessions_restricted', 'blocked_sessions',
            'reentry_close', 'reentry_vs_loss_exit']
    for ds, cfg in [('QQQ_1999_2015', 'C_lower_5pct'), ('VGT_2016_2026', 'C_lower_5pct'),
                    ('VGT_2016_2026', 'D_lower_8pct'), ('QQQ_2016_2026', 'B_lower_3pct')]:
        ev = pd.read_csv(OUT / 'events' / f'{ds}__{cfg}.csv')
        say(f'\n{ds} {cfg}: first 3 episodes plus the 2 longest')
        sel = pd.concat([ev.head(3), ev.nlargest(2, 'sessions_restricted')]).drop_duplicates(subset='exit_date')
        say(sel[cols].round(4).to_string(index=False))


def main():
    say('== 1. Baseline reproduction ==')
    for ds in DATASETS:
        verify_baseline(ds)
    say('\n== 2. Independent state-machine replay ==')
    for ds in DATASETS:
        df = load(ds)
        for cfg, cls in CONFIGS.items():
            if cfg != 'A_baseline':
                verify_variant(ds, cfg, cls.threshold, df)
    spot_checks()
    say(f'\nALL {n_checks} CHECKS PASSED')
    (OUT / 'verification.txt').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
