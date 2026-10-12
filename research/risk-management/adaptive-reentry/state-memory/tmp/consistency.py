"""Counter/episode consistency across all 20 runs + independent E5 streak replay from trades files."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parents[1]
RES = HERE / 'results'
recs = json.load(open(RES / 'summary.json'))
fails = 0

for r in recs:
    ds, cf = r['dataset'], r['config']
    sm = r['extra']['state_machine']
    ev = pd.read_csv(RES / 'events' / f'{ds}__{cf}.csv')
    res = ev['resolution'].value_counts().to_dict()
    checks = [
        ('episodes == losing_exits_restricted', len(ev) == sm['losing_exits_restricted']),
        ('lower_price_reentries == episodes resolved by reentry',
         res.get('lower_price_reentry', 0) == sm['lower_price_reentries']),
        ('recovery_resets == episodes resolved by reset', res.get('recovery_reset', 0) == sm['recovery_resets']),
        ('blocked counter == sum(events.blocked_sessions) - reset_priority blocks',
         sm['blocked_sessions'] + sm['reset_priority_blocks'] == int(ev['blocked_sessions'].sum())),
        ('no alt entries', sm['alt_entries'] == 0),
        ('no indicator fallbacks', sm['indicator_fallbacks'] == 0),
        ('every resolved reentry at/below its level',
         bool((ev.loc[ev['entry_path'] == 'lower_price', 'reentry_close']
               <= ev.loc[ev['entry_path'] == 'lower_price', 'required_level_at_entry'] + 1e-9).all())),
    ]
    for label, okc in checks:
        if not okc:
            fails += 1
            print(f'FAIL {ds} {cf}: {label}')

# E5 independent replay of the trigger from trades + events alone
for ds in ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']:
    tr = pd.read_csv(RES / 'trades' / f'{ds}__E5_no_small_rearm.csv')
    ev = pd.read_csv(RES / 'events' / f'{ds}__E5_no_small_rearm.csv')
    armed_dates = set(ev['exit_date'])
    reset_dates = sorted(ev.loc[ev['resolution'] == 'recovery_reset', 'resolution_date'])
    streak = None
    problems = 0
    for _, t in tr.iterrows():
        if not isinstance(t['exit_date'], str) or t['reason'] == 'open':
            continue
        # a recovery reset between the previous exit and this exit clears the streak
        if streak is not None and any(d <= t['exit_date'] for d in reset_dates):
            reset_dates = [d for d in reset_dates if d > t['exit_date']]
            streak = None
        if t['profit'] >= 0:
            streak = None
            continue
        if streak is None:
            streak = float(t['entry_price'])
        should_arm = float(t['exit_price']) / streak - 1 <= -0.02
        did_arm = t['exit_date'] in armed_dates
        if should_arm != did_arm:
            problems += 1
            print(f"FAIL E5 replay {ds} {t['exit_date']}: should_arm={should_arm} did_arm={did_arm} "
                  f"streak={streak} exit={t['exit_price']}")
    fails += problems
    print(f'E5 replay {ds}: {len(tr)} trades, armed {len(armed_dates)}, replay mismatches {problems}')

print(f'\nconsistency: {"ALL OK" if fails == 0 else f"{fails} FAILURES"} across {len(recs)} runs')
