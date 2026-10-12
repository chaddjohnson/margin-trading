"""Validation stage, task 1 — independent replay verification of the standalone Promising candidates.

Model: research/risk-management/lower-price-reentry/verify.py (the verified Phase 1 replay). For each
candidate on all four frozen datasets, the full restriction history is RE-DERIVED using only
  (a) the raw price file (via the frozen engine's `load`, which only parses the CSV),
  (b) the candidate's registered rule definition, re-implemented below from the family source
      (cited per candidate; the framework's decision code is never imported or called), and
  (c) the family's results trades CSV (the trade list is the engine's output being verified).
The replay is then asserted against the family's results events/ and states/ CSVs:
  - every restricted entry satisfied the candidate's level rule (or its registered alt-entry rule) and
    did not fall on a session whose close satisfied the reset (reset priority);
  - every reset satisfied the reset rule, and NO earlier session of the episode satisfied it
    (checked both by the forward scan and by an independent second pass over the episode);
  - frozen values (loss_exit_price, ref_high, losing entry, loss, price return) are correct per episode
    and constant within it (states CSV);
  - every flat, unrestricted, non-exit session with the 10% signal has an entry (the restriction is the
    only source of suppression);
  - trade spans are disjoint and no entry happens on an exit session.
Mismatches are reported as findings (family code is never "fixed" from here).

Candidate rule sources (semantics copied exactly; verified against these files):
  A2_material_05 / A2_material_1  loss-classification/strategies.py  material_trigger(0.005/0.01), fixed3
  D7_tiny_loss_exit_anchor        recovery-opportunities/strategies.py d7_tiny_loss_exit_anchor
  B7_stall                        adaptive-discounts/strategies.py   b7_stall
  B2_inverse                      adaptive-discounts/strategies.py   b2_inverse
  C6_retrace_38                   recovery-resets/strategies.py      retrace_reset(0.38)
  C11_graduated                   recovery-resets/strategies.py      graduated_level (+C1 reset)
  REF_lower3 (anchor)             framework defaults = lower-price-reentry B_lower_3pct

Chronology replayed (framework.py docstring, verified in Phase 1): within session i the entry decision
happens at the close (only flat + 10% signal); evolving episode state (min_close, min_close_i,
sessions_restricted) is updated through session i BEFORE any component runs; reset priority — a close
satisfying the reset never buys that session; the reset is also evaluated on the arming exit session's
own close; an entry clears the restriction; no entry on exit sessions.

Writes results/replay/replay_verification.txt (and raises on the first hard inconsistency).
"""
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
OUT = HERE / 'results' / 'replay'
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


# ---------------------------------------------------------------------------- candidate definitions
# Each candidate: trigger(trade_row) -> bool; level(ep, i, c) -> float evaluated AFTER the episode
# state update through i (ep carries the frozen values + running min_close/min_close_i + any sticky
# flags); reset(ep, i, c) -> bool; alt(ep, i, c) -> bool (entry allowed when c <= level OR alt).

def t_net_loss(tr):          # framework default_trigger (framework.py L57-59)
    return float(tr['profit']) < 0


def t_material(cut):         # loss-classification/strategies.py material_trigger
    def t(tr):
        return float(tr['exit_price']) / float(tr['entry_price']) - 1 <= -cut
    return t


def lv_fixed3(ep, i, c):     # framework fixed_discount(0.03) / loss-classification fixed3
    return ep['exit_price'] * 0.97


def lv_b7_stall(ep, i, c):   # adaptive-discounts/strategies.py b7_stall (L115-118)
    age = i - ep['min_close_i']
    d = 0.03 if age < 20 else 0.03 * max(0.0, 1 - (age - 20) / 60)
    return ep['exit_price'] * (1 - d)


def lv_b2_inverse(ep, i, c):  # adaptive-discounts/strategies.py b2_inverse (L60-62)
    d = min(max(0.03 - 0.5 * abs(ep['price_return']), 0.005), 0.03)
    return ep['exit_price'] * (1 - d)


def lv_c11(ep, i, c):        # recovery-resets/strategies.py graduated_level (L113-118); sticky stage
    if not ep.get('c11_stage2', False) and c >= 1.08 * ep['min_close']:
        ep['c11_stage2'] = True
    return ep['exit_price'] * (1 - (0.015 if ep.get('c11_stage2', False) else 0.03))


def rs_frozen95(ep, i, c):   # framework frozen_high_reset(0.95)
    return c >= 0.95 * ep['ref_high']


def rs_retrace38(ep, i, c):  # recovery-resets/strategies.py retrace_reset(0.38) (L85-89)
    return c >= ep['min_close'] + 0.38 * (ep['ref_high'] - ep['min_close'])


def alt_d7_tiny(ep, i, c):   # recovery-opportunities/strategies.py d7_tiny_loss_exit_anchor (L186-192)
    return abs(ep['loss']) < 2000.0 and c <= ep['exit_price']


CANDIDATES = {
    # name: (family results dir, trigger, level, reset, alt, level is state-dependent per-session)
    'REF_lower3': ('recovery-opportunities', t_net_loss, lv_fixed3, rs_frozen95, None),
    'A2_material_05': ('loss-classification', t_material(0.005), lv_fixed3, rs_frozen95, None),
    'A2_material_1': ('loss-classification', t_material(0.01), lv_fixed3, rs_frozen95, None),
    'D7_tiny_loss_exit_anchor': ('recovery-opportunities', t_net_loss, lv_fixed3, rs_frozen95, alt_d7_tiny),
    'B7_stall': ('adaptive-discounts', t_net_loss, lv_b7_stall, rs_frozen95, None),
    'B2_inverse': ('adaptive-discounts', t_net_loss, lv_b2_inverse, rs_frozen95, None),
    'C6_retrace_38': ('recovery-resets', t_net_loss, lv_fixed3, rs_retrace38, None),
    'C11_graduated': ('recovery-resets', t_net_loss, lv_c11, rs_frozen95, None),
}


# ---------------------------------------------------------------------------- the replay

def replay(ds, cfg, df, resdir, trigger, level_fn, reset_fn, alt_fn):
    c = df['close'].to_numpy(float)
    h = df['high'].to_numpy(float)
    dates = df['date'].dt.date.astype(str).to_numpy()
    n = len(df)
    tr = pd.read_csv(resdir / 'trades' / f'{ds}__{cfg}.csv')
    ent = tr['entry_i'].astype(int).to_numpy()
    ex = tr['exit_i'].to_numpy(float)
    end = np.where(np.isnan(ex), n - 1, ex).astype(int)
    # spans disjoint, no entry on an exit session
    check((ent[1:] > end[:-1]).all(), f'{ds} {cfg}: trade spans disjoint / no entry on an exit session')
    held = np.zeros(n, bool)          # position existed at the START of the session
    exit_sess = np.zeros(n, bool)
    for k in range(len(tr)):
        held[ent[k] + 1:end[k] + 1] = True
        if not np.isnan(ex[k]):
            exit_sess[end[k]] = True
    entry_at = {int(e): k for k, e in enumerate(ent)}
    exit_at = {int(end[k]): k for k in range(len(tr)) if not np.isnan(ex[k])}

    episodes = []      # dicts: frozen values + resolution + blocked lists
    ep = None          # active episode state

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
                if c[i] <= lv + 1e-9:
                    ep['resolution'], ep['res_i'], ep['path'], ep['lv_at_entry'] = 'lower_price_reentry', i, 'lower_price', lv
                else:
                    check(alt_fn is not None and alt_fn(ep, i, c[i]),
                          f'{ds} {cfg}: restricted entry {dates[i]} close {c[i]:.4f} > level {lv:.4f} '
                          f'and no alt-entry rule satisfied')
                    ep['resolution'], ep['res_i'], ep['path'], ep['lv_at_entry'] = 'alt_entry', i, 'alt', lv
                ep = None
        elif not held[i] and not exit_sess[i]:
            if ep is not None:
                upd(i)
                if signal:  # entry gate ran: reset priority first, then the level / alt path
                    if reset_fn(ep, i, c[i]):
                        ep['blocked'].append(i)  # reset-priority block (framework counts it in blocked_is)
                        ep['resolution'], ep['res_i'] = 'recovery_reset', i
                        ep = None
                        continue
                    lv = level_fn(ep, i, c[i])
                    check(c[i] > lv + 1e-9, f'{ds} {cfg}: {dates[i]} close {c[i]:.4f} <= level {lv:.4f} '
                                            f'with the signal but no entry')
                    check(not (alt_fn is not None and alt_fn(ep, i, c[i])),
                          f'{ds} {cfg}: {dates[i]} alt-entry rule satisfied but no entry')
                    ep['blocked'].append(i)
                    ep['blocked_plain'].append(i)
                else:
                    if reset_fn(ep, i, c[i]):
                        ep['resolution'], ep['res_i'] = 'recovery_reset', i
                        ep = None
                        continue
                    level_fn(ep, i, c[i])  # framework evaluates the level when logging (C11 stage latch)
            elif signal:
                raise AssertionError(f'{ds} {cfg}: {dates[i]} flat, unrestricted, signal, not an exit '
                                     f'session — an entry was required but none occurred')
        if i in exit_at:
            k = exit_at[i]
            if trigger(tr.loc[k]):
                check(ep is None, f'{ds} {cfg}: overlapping restriction at {dates[i]}')
                pe = int(tr.loc[k, 'entry_i'])
                ep = dict(exit_i=i, exit_price=float(tr.loc[k, 'exit_price']),
                          entry_price=float(tr.loc[k, 'entry_price']), loss=float(tr.loc[k, 'profit']),
                          price_return=float(tr.loc[k, 'exit_price']) / float(tr.loc[k, 'entry_price']) - 1,
                          ref_high=float(h[max(0, pe - PRM.window):pe].max()),
                          min_close=float(c[i]), min_close_i=i, blocked=[], blocked_plain=[],
                          resolution=None, res_i=None, path='', lv_at_entry=np.nan)
                episodes.append(ep)
                # the reset is evaluated on the arming exit session's own close (no entry possible)
                if reset_fn(ep, i, c[i]):
                    ep['resolution'], ep['res_i'] = 'recovery_reset', i
                    ep = None
                else:
                    level_fn(ep, i, c[i])  # session-end level evaluation (C11 stage latch)
            else:
                check(float(tr.loc[k, 'profit']) >= 0 or cfg.startswith(('A2',)),
                      f'{ds} {cfg}: losing trade at {dates[i]} declined by a non-A2 trigger')
    if ep is not None:
        ep['resolution'], ep['res_i'] = 'unresolved_at_end', n - 1
    return episodes, dates, c, h


def second_pass_reset_check(ds, cfg, episodes, c, h, dates, reset_fn):
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
    fam, trigger, level_fn, reset_fn, alt_fn = CANDIDATES[cfg]
    resdir = AR / fam / 'results'
    episodes, dates, c, h = replay(ds, cfg, df, resdir, trigger, level_fn, reset_fn, alt_fn)
    second_pass_reset_check(ds, cfg, episodes, c, h, dates, reset_fn)
    ev = pd.read_csv(resdir / 'events' / f'{ds}__{cfg}.csv')
    st = pd.read_csv(resdir / 'states' / f'{ds}__{cfg}.csv')
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
        if ep['resolution'] in ('lower_price_reentry', 'alt_entry'):
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
    # frozen values constant within each logged episode
    ep_id = (st['prev_state'].eq('NORMAL') & st['new_state'].eq('RESTRICTED')).cumsum()
    in_ep = st['new_state'].eq('RESTRICTED') | st['prev_state'].eq('RESTRICTED')
    for _, g in st[in_ep].groupby(ep_id[in_ep]):
        check(g['loss_exit_price'].nunique() == 1 and g['ref_high'].nunique() == 1,
              f'{ds} {cfg}: frozen values changed within the episode starting {g["date"].iloc[0]}')
    res_counts = {}
    for ep in episodes:
        res_counts[ep['resolution']] = res_counts.get(ep['resolution'], 0) + 1
    say(f'  {ds:14s} {cfg:26s} OK — {len(episodes):3d} episodes {res_counts}, '
        f'{sum(len(ep["blocked_plain"]) for ep in episodes):4d} blocked signal sessions')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    say('Independent replay verification — standalone Promising candidates '
        '(rules re-implemented from family sources; framework decision code not used)')
    for ds in DATASETS:
        df = load(ds)
        say(f'\n== {ds} ==')
        for cfg in CANDIDATES:
            verify(ds, cfg, df)
    say(f'\nALL {n_checks} CHECKS PASSED — no mismatches between the independent replay and the '
        f'family results for any candidate on any dataset.')
    (OUT / 'replay_verification.txt').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    try:
        main()
    except AssertionError:
        (OUT / 'replay_verification.txt').write_text('\n'.join(lines) + '\nFINDINGS:\n' + '\n'.join(findings) + '\n')
        raise
