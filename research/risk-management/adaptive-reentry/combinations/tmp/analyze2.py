"""Family G analysis pass 2: trade-level divergences, A2-vs-D7 episode classification, guard binding."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parents[1]
RES = HERE / 'results'
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
from engine import DATASETS, load  # noqa: E402

DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']

pd.set_option('display.width', 250)


def tr(ds, c):
    return pd.read_csv(RES / 'trades' / f'{ds}__{c}.csv')


def ev(ds, c):
    return pd.read_csv(RES / 'events' / f'{ds}__{c}.csv')


def diverge(ds, a, b, n=14):
    ta, tb = tr(ds, a), tr(ds, b)
    ka = ta[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].copy()
    kb = tb[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].copy()
    m = min(len(ka), len(kb))
    first = None
    for j in range(m):
        if ka.loc[j, 'entry_date'] != kb.loc[j, 'entry_date'] or abs(ka.loc[j, 'profit'] - kb.loc[j, 'profit']) > 1e-6:
            first = j
            break
    if first is None:
        first = m
    print(f'\n### {ds}: {a} vs {b} — first divergence at trade #{first}')
    lo = max(0, first - 2)
    print(f'--- {a} trades {lo}..{first + n} ---')
    print(ka.iloc[lo:first + n].to_string())
    print(f'--- {b} trades {lo}..{first + n} ---')
    print(kb.iloc[lo:first + n].to_string())
    print(f'cum profit {a}: {ka["profit"].sum():,.0f}   {b}: {kb["profit"].sum():,.0f}')


# 1) G4 vs G_A2m1 on QQQ-old: the stall contribution
diverge('QQQ_1999_2015', 'G4_A2m1_stall', 'G_A2m1')

# 2) G2 vs G_D7tiny on QQQ-new
diverge('QQQ_2016_2026', 'G2_tiny_stall', 'G_D7tiny')

# 3) G3 vs legs on QQQ-new (DD blowout)
diverge('QQQ_2016_2026', 'G3_tiny_retrace', 'G_D7tiny')
diverge('QQQ_2016_2026', 'G3_tiny_retrace', 'G_C6r38', n=10)

# 4) G7 vs G_D7tiny on VGT-old and QQQ-old (interference)
diverge('VGT_2005_2015', 'G7_tiny_grad', 'G_D7tiny', n=8)
diverge('QQQ_1999_2015', 'G7_tiny_grad', 'G_D7tiny', n=8)

# 5) G10 vs G_B2inv on VGT-new (lost edge)
diverge('VGT_2016_2026', 'G10_bimodal', 'G_B2inv', n=8)

# 6) G8 2000-02: worse than both? window pnl G8 -19,395 vs A2m1 -17,559, C6r38 -12,184
diverge('QQQ_1999_2015', 'G8_A2m1_retrace', 'G_C6r38', n=8)
