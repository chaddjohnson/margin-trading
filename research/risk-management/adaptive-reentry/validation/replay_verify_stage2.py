"""Validation stage 2, task 1 — independent replay verification of the two promising Family-G
combinations (G8_A2m1_retrace, G4_A2m1_stall) on all four frozen datasets.

Model: validation/replay_verify.py (stage 1), itself modeled on lower-price-reentry/verify.py.
For each candidate the full restriction history is RE-DERIVED using only
  (a) the raw price file (engine.load parses the CSV; no decision code),
  (b) the registered rule definitions, re-implemented below from the cited family sources
      (framework/combination decision code is never imported or called),
  (c) combinations/results trades CSVs (the engine output being verified).
The replay is asserted against combinations/results events/ and states/ CSVs:
  - every restricted entry satisfied the level rule and did not fall on a session whose close
    satisfied the reset (reset priority);
  - every reset satisfied the reset rule and NO earlier session of the episode satisfied it
    (forward scan + independent second pass recomputing min_close from scratch);
  - frozen values (loss exit, losing entry, ref high, loss, price return) correct at arming and
    constant within each episode;
  - completeness: every flat, unrestricted, non-exit session with the 10% signal has an entry;
  - trade spans disjoint; no entry on an exit session;
  - declined-trigger correctness: every losing trade that leaves NO episode has price return
    > -1% (and every one at or below -1% arms), matching the family events log episode-for-episode.

Rule sources (semantics re-implemented, not imported):
  material trigger (-1%)   loss-classification/strategies.py material_trigger(0.01)
  fixed 3% level           framework default / loss-classification fixed3
  b7_stall level (20, 60)  adaptive-discounts/strategies.py b7_stall
  retrace_reset(0.38)      recovery-resets/strategies.py retrace_reset
  frozen-high 95% reset    framework frozen_high_reset(0.95)

Writes results/stage2/replay_verification.txt (and raises on the first hard inconsistency)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
AR = HERE.parent
sys.path.insert(0, str(AR.parents[0] / 'baseline'))

from engine import DATASETS, Params, load  # noqa: E402  (data loading + fixed params only)

PRM = Params()
RESDIR = AR / 'combinations' / 'results'
OUT = HERE / 'results' / 'stage2'
lines = []
n_checks = 0
findings = []


def say(s=''):
    print(s)
    lines.append(s)


def check(ok, msg):
    global n_checks
    n_checks += 1
    if not ok:
        findings.append(msg)
        say(f'  FAIL  {msg}')
        raise AssertionError(msg)


# ------------------------------------------------------------------- rule re-implementations

MATERIAL_CUT = 0.01


def t_material(tr):
    """loss-classification/strategies.py material_trigger(0.01)."""
    return float(tr['exit_price']) / float(tr['entry_price']) - 1 <= -MATERIAL_CUT


def lv_fixed3(ep, i, c):
    """framework fixed_discount(0.03)."""
    return ep['exit_price'] * 0.97


def lv_b7_stall(ep, i, c):
    """adaptive-discounts/strategies.py b7_stall (fresh_age 20, decay 60)."""
    age = i - ep['min_close_i']
    d = 0.03 if age < 20 else 0.03 * max(0.0, 1 - (age - 20) / 60)
    return ep['exit_price'] * (1 - d)


def rs_frozen95(ep, i, c):
    """framework frozen_high_reset(0.95)."""
    return c >= 0.95 * ep['ref_high']


def rs_retrace38(ep, i, c):
    """recovery-resets/strategies.py retrace_reset(0.38)."""
    return c >= ep['min_close'] + 0.38 * (ep['ref_high'] - ep['min_close'])


CANDIDATES = {
    'G8_A2m1_retrace': (t_material, lv_fixed3, rs_retrace38),
    'G4_A2m1_stall': (t_material, lv_b7_stall, rs_frozen95),
}


# ------------------------------------------------------------------- the replay

def replay(ds, cfg, df, trigger, level_fn, reset_fn):
    c = df['close'].to_numpy(float)
    h = df['high'].to_numpy(float)
    dates = df['date'].dt.date.astype(str).to_numpy()
    n = len(df)
    tr = pd.read_csv(RESDIR / 'trades' / f'{ds}__{cfg}.csv')
    ent = tr['entry_i'].astype(int).to_numpy()
    ex = tr['exit_i'].to_numpy(float)
    end = np.where(np.isnan(ex), n - 1, ex).astype(int)
    check((ent[1:] > end[:-1]).all(), f'{ds} {cfg}: trade spans disjoint / no entry on an exit session')
    held = np.zeros(n, bool)
    exit_sess = np.zeros(n, bool)
    for k in range(len(tr)):
        held[ent[k] + 1:end[k] + 1] = True
        if not np.isnan(ex[k]):
            exit_sess[end[k]] = True
    entry_at = {int(e): k for k, e in enumerate(ent)}
    exit_at = {int(end[k]): k for k in range(len(tr)) if not np.isnan(ex[k])}

    episodes = []
    declined = []     # losing trades the material trigger left without an episode
    ep = None

    def upd(i):
        if c[i] < ep['min_close']:
            ep['min_close'], ep['min_close_i'] = c[i], i

    for i in range(1, n):
        recent = h[max(0, i - PRM.window):i].max()
        signal = 1 - c[i] / recent >= PRM.target
        if i in entry_at:
            check(bool(signal), f'{ds} {cfg}: entry {dates[i]} has the 10% signal')
            check(not held[i], f'{ds} {cfg}: entry {dates[i]} while flat')
            if ep is not None:
                upd(i)
                check(not reset_fn(ep, i, c[i]),
                      f'{ds} {cfg}: entry {dates[i]} on a session whose close satisfies the reset '
                      f'(reset priority violated)')
                lv = level_fn(ep, i, c[i])
                check(c[i] <= lv + 1e-9,
                      f'{ds} {cfg}: restricted entry {dates[i]} close {c[i]:.4f} > level {lv:.4f}')
                ep['resolution'], ep['res_i'], ep['path'], ep['lv_at_entry'] = 'lower_price_reentry', i, 'lower_price', lv
                ep = None
        elif not held[i] and not exit_sess[i]:
            if ep is not None:
                upd(i)
                if signal:
                    if reset_fn(ep, i, c[i]):
                        ep['blocked'].append(i)
                        ep['resolution'], ep['res_i'] = 'recovery_reset', i
                        ep = None
                        continue
                    lv = level_fn(ep, i, c[i])
                    check(c[i] > lv + 1e-9, f'{ds} {cfg}: {dates[i]} close {c[i]:.4f} <= level {lv:.4f} '
                                            f'with the signal but no entry')
                    ep['blocked'].append(i)
                    ep['blocked_plain'].append(i)
                else:
                    if reset_fn(ep, i, c[i]):
                        ep['resolution'], ep['res_i'] = 'recovery_reset', i
                        ep = None
                        continue
            elif signal:
                raise AssertionError(f'{ds} {cfg}: {dates[i]} flat, unrestricted, signal, not an exit '
                                     f'session — an entry was required but none occurred '
                                     f'(completeness violated)')
        if i in exit_at:
            k = exit_at[i]
            pr = float(tr.loc[k, 'exit_price']) / float(tr.loc[k, 'entry_price']) - 1
            if trigger(tr.loc[k]):
                check(ep is None, f'{ds} {cfg}: overlapping restriction at {dates[i]}')
                check(pr <= -MATERIAL_CUT, f'{ds} {cfg}: episode armed at {dates[i]} with price return '
                                           f'{pr:+.4%} above the -1% cutoff')
                pe = int(tr.loc[k, 'entry_i'])
                ep = dict(exit_i=i, exit_price=float(tr.loc[k, 'exit_price']),
                          entry_price=float(tr.loc[k, 'entry_price']), loss=float(tr.loc[k, 'profit']),
                          price_return=pr,
                          ref_high=float(h[max(0, pe - PRM.window):pe].max()),
                          min_close=float(c[i]), min_close_i=i, blocked=[], blocked_plain=[],
                          resolution=None, res_i=None, path='', lv_at_entry=np.nan)
                episodes.append(ep)
                if reset_fn(ep, i, c[i]):
                    ep['resolution'], ep['res_i'] = 'recovery_reset', i
                    ep = None
            else:
                # declined-trigger correctness: a loss left without an episode must be > -1%
                if float(tr.loc[k, 'profit']) < 0:
                    check(pr > -MATERIAL_CUT,
                          f'{ds} {cfg}: losing trade at {dates[i]} (price return {pr:+.4%}) declined '
                          f'although at or below the -1% cutoff')
                    declined.append((dates[i], pr, float(tr.loc[k, 'profit'])))
    if ep is not None:
        ep['resolution'], ep['res_i'] = 'unresolved_at_end', n - 1
    return episodes, declined, dates, c, h


def second_pass_reset_check(ds, cfg, episodes, c, dates, reset_fn):
    """Independent re-scan: within each episode no session strictly before the resolution satisfied
    the reset (recomputing running min_close from scratch)."""
    for ep in episodes:
        probe = dict(ep, min_close=c[ep['exit_i']], min_close_i=ep['exit_i'])
        for j in range(ep['exit_i'], ep['res_i']):
            if c[j] < probe['min_close']:
                probe['min_close'], probe['min_close_i'] = c[j], j
            if j == ep['exit_i'] and ep['resolution'] == 'recovery_reset' and ep['res_i'] == j:
                continue
            check(not reset_fn(probe, j, c[j]),
                  f'{ds} {cfg}: episode {dates[ep["exit_i"]]} — reset condition already true at '
                  f'{dates[j]}, before the recorded resolution {dates[ep["res_i"]]}')


def verify(ds, cfg, df):
    trigger, level_fn, reset_fn = CANDIDATES[cfg]
    episodes, declined, dates, c, h = replay(ds, cfg, df, trigger, level_fn, reset_fn)
    second_pass_reset_check(ds, cfg, episodes, c, dates, reset_fn)
    ev = pd.read_csv(RESDIR / 'events' / f'{ds}__{cfg}.csv')
    st = pd.read_csv(RESDIR / 'states' / f'{ds}__{cfg}.csv')
    check(len(ev) == len(episodes), f'{ds} {cfg}: {len(episodes)} replayed episodes vs {len(ev)} logged')
    for k, ep in enumerate(episodes):
        row = ev.iloc[k]
        check(row['exit_date'] == dates[ep['exit_i']], f'{ds} {cfg}: episode {k} start '
              f'{dates[ep["exit_i"]]} vs logged {row["exit_date"]}')
        check(row['resolution'] == ep['resolution'] and row['resolution_date'] == dates[ep['res_i']],
              f'{ds} {cfg}: episode {row["exit_date"]} resolution {ep["resolution"]} {dates[ep["res_i"]]}'
              f' vs logged {row["resolution"]} {row["resolution_date"]}')
        for col, key in [('loss_exit_price', 'exit_price'), ('ref_high', 'ref_high'),
                         ('losing_entry_price', 'entry_price'), ('loss', 'loss'),
                         ('price_return', 'price_return')]:
            check(abs(float(row[col]) - ep[key]) < 1e-9 * max(1.0, abs(ep[key])),
                  f'{ds} {cfg}: episode {row["exit_date"]} frozen {col}: replay {ep[key]} vs logged {row[col]}')
        check(int(row['blocked_sessions']) == len(ep['blocked']),
              f'{ds} {cfg}: episode {row["exit_date"]} blocked {len(ep["blocked"])} vs logged {row["blocked_sessions"]}')
        if ep['resolution'] == 'lower_price_reentry':
            check(row['entry_path'] == ep['path'], f'{ds} {cfg}: episode {row["exit_date"]} entry path '
                                                   f'{ep["path"]} vs logged {row["entry_path"]}')
            if not np.isnan(ep['lv_at_entry']):
                check(abs(float(row['required_level_at_entry']) - ep['lv_at_entry']) < 1e-9 * ep['lv_at_entry'],
                      f'{ds} {cfg}: episode {row["exit_date"]} level at entry {ep["lv_at_entry"]} vs '
                      f'logged {row["required_level_at_entry"]}')
    # blocked sessions vs the states log ('entry_blocked' excludes reset-priority blocks)
    logged_blocked = set(st.loc[st['reason'].astype(str).str.startswith('entry_blocked'), 'date'])
    mine = {dates[b] for ep in episodes for b in ep['blocked_plain']}
    check(logged_blocked == mine,
          f'{ds} {cfg}: blocked sessions differ (replay {len(mine)}, log {len(logged_blocked)}; '
          f'sym diff {sorted(logged_blocked ^ mine)[:6]})')
    # declined-trigger correctness vs the states log (loss_not_restricted lines)
    logged_declined = set(st.loc[st['reason'].astype(str).str.startswith('loss_not_restricted'), 'date'])
    mine_declined = {d for d, _pr, _p in declined}
    check(logged_declined == mine_declined,
          f'{ds} {cfg}: declined-trigger sessions differ (replay {len(mine_declined)}, log '
          f'{len(logged_declined)}; sym diff {sorted(logged_declined ^ mine_declined)[:6]})')
    # frozen values constant within each logged episode
    ep_id = (st['prev_state'].eq('NORMAL') & st['new_state'].eq('RESTRICTED')).cumsum()
    in_ep = st['new_state'].eq('RESTRICTED') | st['prev_state'].eq('RESTRICTED')
    for _, g in st[in_ep].groupby(ep_id[in_ep]):
        check(g['loss_exit_price'].nunique() == 1 and g['ref_high'].nunique() == 1,
              f'{ds} {cfg}: frozen values changed within the episode starting {g["date"].iloc[0]}')
    res_counts = {}
    for ep in episodes:
        res_counts[ep['resolution']] = res_counts.get(ep['resolution'], 0) + 1
    say(f'  {ds:14s} {cfg:18s} OK — {len(episodes):3d} episodes {res_counts}, '
        f'{len(declined):2d} declined losses (all > -1%), '
        f'{sum(len(ep["blocked_plain"]) for ep in episodes):4d} blocked signal sessions')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    say('Validation stage 2 — independent replay verification of G8_A2m1_retrace and G4_A2m1_stall')
    say('(rules re-implemented from the cited family sources; framework/combination decision code '
        'not used; inputs: raw prices + combinations/results trades CSVs)')
    for ds in DATASETS:
        df = load(ds)
        say(f'\n== {ds} ==')
        for cfg in CANDIDATES:
            verify(ds, cfg, df)
    say(f'\nALL {n_checks} CHECKS PASSED — no mismatches between the independent replay and the '
        f'combinations results for either candidate on any dataset.')
    (OUT / 'replay_verification.txt').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    try:
        main()
    except AssertionError:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / 'replay_verification.txt').write_text('\n'.join(lines) + '\nFINDINGS:\n' + '\n'.join(findings) + '\n')
        raise
