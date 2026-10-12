"""Verification: A_baseline reproduces the frozen baseline exactly, and the confirmation mechanics are spot-checked.

1. For every dataset, the A_baseline record's `metrics` and `matched_control` equal baseline/results/summary.json
   exactly (after the same JSON serialisation), and its trades/daily CSVs are byte-identical to the baseline's.
2. Independent re-check of each variant: a separate, minimal replay re-derives, from the price file alone, which
   sessions should have been allowed or blocked and confirms every variant entry and every blocked signal session.
3. Spot checks: for the first three blocked entries of each config on each dataset (and specific examples), print
   the closes from the losing exit to the eventual entry, the 10% signal, and the confirmation state per session.
Writes results/verification.txt.
"""
import filecmp
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'baseline'
sys.path.insert(0, str(BASE))
sys.path.insert(0, str(HERE))

from engine import DATASETS, Params, load  # noqa: E402

from strategies import RULES  # noqa: E402

OUT = HERE / 'results'
lines = []


def say(*a):
    s = ' '.join(str(x) for x in a)
    print(s)
    lines.append(s)


def check_baseline():
    ours = {(r['config'], r['dataset']): r for r in json.load(open(OUT / 'summary.json'))}
    theirs = {r['dataset']: r for r in json.load(open(BASE / 'results' / 'summary.json'))}
    ok = True
    for ds in DATASETS:
        a = ours[('A_baseline', ds)]
        same_m = a['metrics'] == theirs[ds]['metrics']
        same_c = a['matched_control'] == theirs[ds]['matched_control']
        same_t = filecmp.cmp(OUT / 'trades' / f'{ds}__A_baseline.csv', BASE / 'results' / 'trades' / f'{ds}__baseline.csv', shallow=False)
        same_d = filecmp.cmp(OUT / 'daily' / f'{ds}__A_baseline.csv', BASE / 'results' / 'daily' / f'{ds}__baseline.csv', shallow=False)
        ok &= same_m and same_c and same_t and same_d
        say(f'{ds}: metrics identical={same_m} matched_control identical={same_c} trades CSV identical={same_t} '
            f'daily CSV identical={same_d}  net {a["metrics"]["net_profit"]:,.2f} vs {theirs[ds]["metrics"]["net_profit"]:,.2f}, '
            f'mdd {a["metrics"]["max_drawdown"]:,.2f} vs {theirs[ds]["metrics"]["max_drawdown"]:,.2f}')
    say('A_baseline reproduces baseline/results/summary.json exactly:', ok)
    return ok


def signal(df):
    h, c = df['high'].to_numpy(), df['close'].to_numpy()
    w, t = Params().window, Params().target
    s = np.zeros(len(df), bool)
    for i in range(1, len(df)):
        s[i] = 1 - c[i] / h[max(0, i - w):i].max() >= t
    return s


def independent_replay(ds, cfg, df, sig):
    """Re-derive allowed/blocked sessions from the variant's own trade list and the price file."""
    tr = pd.read_csv(OUT / 'trades' / f'{ds}__{cfg}.csv')
    c = df['close'].to_numpy()
    rule = RULES[cfg]
    n = len(df)
    entries = set(tr['entry_i'].astype(int))
    held = np.zeros(n, bool)  # holding at the start of session i (before the entry decision)
    exit_at = {}
    for _, t in tr.iterrows():
        end = int(t['exit_i']) if not np.isnan(t['exit_i']) else n
        held[int(t['entry_i']) + 1:min(end, n - 1) + 1] = True
        if not np.isnan(t['exit_i']):
            exit_at[int(t['exit_i'])] = t['profit']
    pending, x, latched = False, None, False
    blocked, problems = [], []
    for i in range(1, n):
        if i in exit_at:  # position exited this session; no entry possible this session
            pending, x, latched = (exit_at[i] < 0), i, False
            continue
        if held[i]:
            continue
        if pending and not latched and i > x and rule(c, x, i):
            latched = True
        if sig[i]:
            allowed = (not pending) or latched
            if allowed and i not in entries:
                problems.append(('should have entered', i))
            if not allowed:
                blocked.append(i)
                if i in entries:
                    problems.append(('entered while unconfirmed', i))
        elif i in entries:
            problems.append(('entered without the 10% signal', i))
        if i in entries:
            pending, latched = False, False
    ev = pd.read_csv(OUT / 'events' / f'{ds}__{cfg}.csv').fillna('')
    eng_blocked = [d for s in ev['blocked_dates'] for d in (s.split(';') if s else [])]
    dates = df['date'].dt.date.astype(str).to_numpy()
    same = eng_blocked == [dates[b] for b in blocked]
    return problems, same, len(blocked)


def state_table(df, sig, x, until, cfg):
    c, dates = df['close'].to_numpy(), df['date'].dt.date.astype(str).to_numpy()
    rule = RULES[cfg]
    rows, latched = [], False
    for j in range(max(x - 2, 0), until + 1):
        r = c[j] / c[j - 1] - 1
        extra = ''
        if cfg.startswith('C'):
            extra = f'SMA10 {c[j - 9:j + 1].mean():.4f}'
        if cfg.startswith('D') and j >= x:
            lo = c[x:j + 1].min()
            extra = f'low(x..j) {lo:.4f} close/low {c[j] / lo:.4f}'
        if j > x and not latched and rule(c, x, j):
            latched = True
        tag = 'EXIT(loss)' if j == x else ''
        rows.append(f'    {dates[j]}  close {c[j]:9.4f}  ret {r:+7.2%}  signal {"Y" if sig[j] else "-"}  '
                    f'{extra:38s} latched {"Y" if (latched and j > x) else "-"} {tag}')
    return rows


def spot_checks(ds, cfg, df, sig, max_events=3):
    ev = pd.read_csv(OUT / 'events' / f'{ds}__{cfg}.csv').fillna('')
    dates = df['date'].dt.date.astype(str).to_numpy()
    pos = {d: k for k, d in enumerate(dates)}
    blocked_ev = ev[ev['first_signal_blocked'] == True]  # noqa: E712
    for _, e in blocked_ev.head(max_events).iterrows():
        x = pos[e['exit_date']]
        until = pos[e['entry_date']] if e['entry_date'] else min(pos[e['blocked_dates'].split(';')[-1]] + 1, len(df) - 1)
        say(f'  [{ds} {cfg}] losing exit {e["exit_date"]} (loss {e["loss"]:,.0f}); first signal {e["first_signal_date"]}; '
            f'blocked {e["blocked_signal_sessions"]} signal session(s): {e["blocked_dates"]}; confirmed {e["confirm_date"] or "never"}; '
            f'entry {e["entry_date"] or "none"}'
            + (f' at {e["entry_close"]:.4f} ({e["entry_vs_first_signal_close"]:+.2%} vs first-signal close)' if e['entry_date'] else ''))
        for r in state_table(df, sig, x, until, cfg)[-25:]:
            say(r)


def main():
    ok = check_baseline()
    say('')
    say('Independent replay of the confirmation logic (from trades + prices only):')
    for ds in DATASETS:
        df = load(ds)
        sig = signal(df)
        for cfg in RULES:
            problems, same, nb = independent_replay(ds, cfg, df, sig)
            say(f'  {ds} {cfg}: problems={problems[:3]} blocked sessions={nb} engine-recorded blocked list identical={same}')
            ok &= (not problems) and same
    say('')
    say('Spot checks (first three losing exits whose first post-exit signal was blocked, per config and dataset):')
    for ds in DATASETS:
        df = load(ds)
        sig = signal(df)
        for cfg in RULES:
            spot_checks(ds, cfg, df, sig)
    say('')
    say('ALL CHECKS PASSED' if ok else 'CHECK FAILURES')
    (OUT / 'verification.txt').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
