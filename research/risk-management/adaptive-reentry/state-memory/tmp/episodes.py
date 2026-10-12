"""Episode-level digging for the report: E1 vs E2 anchoring, key failure episodes, E3/E4/E5 behaviour."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parents[1]
RES = HERE / 'results'
pd.set_option('display.width', 250)
pd.set_option('display.max_columns', 50)


def ev(ds, cf):
    return pd.read_csv(RES / 'events' / f'{ds}__{cf}.csv')


def tr(ds, cf):
    return pd.read_csv(RES / 'trades' / f'{ds}__{cf}.csv')


def show_ev(ds, cf, a, b, cols=None):
    e = ev(ds, cf)
    e = e[(e['exit_date'] >= a) & (e['exit_date'] <= b)]
    cols = cols or ['exit_date', 'loss', 'loss_exit_price', 'losing_entry_price', 'price_return', 'ref_high',
                    'resolution', 'resolution_date', 'sessions_restricted', 'reentry_date', 'reentry_close',
                    'required_level_at_entry', 'min_close_in_episode', 'min_gap_to_required']
    print(f'\n### events {ds} {cf} [{a}..{b}]')
    print(e[cols].to_string(index=False))


def show_tr(ds, cf, a, b):
    t = tr(ds, cf)
    t = t[(t['entry_date'] >= a) & (t['entry_date'] <= b)]
    print(f'\n### trades {ds} {cf} [{a}..{b}]')
    print(t[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'reason', 'profit']].to_string(index=False))


S = sys.argv[1] if len(sys.argv) > 1 else 'all'

if S in ('all', 'anchor'):
    # E1 vs E2: deep-loss episodes where the anchors diverge most (QQQ 2000-02, 2008)
    for cf in ['E1_exit_only', 'E2_entry_only']:
        show_ev('QQQ_1999_2015', cf, '2000-01-01', '2002-12-31')
    for cf in ['E1_exit_only', 'E2_entry_only']:
        show_tr('QQQ_1999_2015', cf, '2000-03-01', '2002-12-31')

if S in ('all', '2008'):
    for cf in ['E1_exit_only', 'E2_entry_only', 'E4_cum_loss']:
        show_ev('QQQ_1999_2015', cf, '2007-06-01', '2009-12-31')
        show_tr('QQQ_1999_2015', cf, '2007-06-01', '2009-12-31')

if S in ('all', '2023'):
    for cf in ['E1_exit_only', 'E2_entry_only', 'E4_cum_loss', 'E5_no_small_rearm']:
        show_ev('VGT_2016_2026', cf, '2022-01-01', '2023-12-31')
        show_tr('VGT_2016_2026', cf, '2022-06-01', '2023-12-31')

if S in ('all', 'e3'):
    # E3 ladder episodes with n_failed >= 2 need the states log to see levels; events show resolution
    st = pd.read_csv(RES / 'states' / f'QQQ_1999_2015__E3_entry_count.csv')
    seg = st[(st['date'] >= '2001-01-01') & (st['date'] <= '2001-12-31')]
    print('\n### states QQQ E3 2001 (ladder levels)')
    print(seg[seg['reason'].str.contains('losing_exit|reentry|reset|blocked', na=False) | seg['entry_executed']]
          [['date', 'prev_state', 'new_state', 'reason', 'required_level', 'close', 'n_failed']].to_string(index=False))

if S in ('all', 'e5'):
    st = pd.read_csv(RES / 'states' / f'VGT_2016_2026__E5_no_small_rearm.csv')
    seg = st[st['reason'].str.contains('loss_not_restricted|losing_exit', na=False)]
    print('\n### E5 VGT_2016_2026: armed vs declined losses')
    print(seg[['date', 'reason', 'close', 'n_failed']].to_string(index=False))
    st = pd.read_csv(RES / 'states' / f'QQQ_2016_2026__E5_no_small_rearm.csv')
    seg = st[st['reason'].str.contains('loss_not_restricted|losing_exit', na=False)]
    print('\n### E5 QQQ_2016_2026: armed vs declined losses')
    print(seg[['date', 'reason', 'close', 'n_failed']].to_string(index=False))

if S in ('all', '2025'):
    for cf in ['E1_exit_only', 'E2_entry_only', 'E5_no_small_rearm']:
        show_ev('QQQ_2016_2026', cf, '2024-06-01', '2025-12-31')
        show_tr('QQQ_2016_2026', cf, '2024-06-01', '2025-12-31')
