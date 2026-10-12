"""Framework calibration gate + smoke tests. Must pass before any Phase 2 family runs.

1. Calibration: AdaptiveStrategy with restrict=False equals the frozen baseline, and with all-default
   components equals lower-price-reentry B_lower_3pct, trade for trade, on all four datasets (this is
   runner.references' gate, exercised here for every dataset).
2. State-log equivalence: REF_lower3's state log matches the frozen lower-price-reentry states CSV row
   for row (dates, states, reason kinds, frozen values).
3. Smoke: a no-reset config (C0 shape), a volatility-scaled discount with fallback, an alt-entry path
   and a scaled size all run with internally consistent counters and episode bookkeeping.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, run  # noqa: E402

from analysis import events_table, states_table  # noqa: E402
from framework import AdaptiveStrategy, fixed_discount, no_reset, ref_lower3  # noqa: E402
from runner import LPR_RES, references  # noqa: E402

KIND_MAP = ['losing_exit', 'profitable_exit', 'normal_entry', 'lower_price_reentry', 'recovery_reset',
            'entry_blocked', 'restricted']


def kind(reason):
    for k in KIND_MAP:
        if str(reason).startswith(k):
            return k
    return str(reason)


def main():
    for ds in DATASETS:
        references(ds)  # trade-level calibration gate for baseline and REF_lower3
        print(f'{ds}: calibration PASS')
        strat = ref_lower3()
        res = run(ds, strat)
        mine = states_table(strat)
        ref = pd.read_csv(LPR_RES / 'states' / f'{ds}__B_lower_3pct.csv')
        assert len(mine) == len(ref), f'{ds}: state rows {len(mine)} vs {len(ref)}'
        assert (mine['date'].astype(str) == ref['date'].astype(str)).all()
        assert (mine['prev_state'] == ref['prev_state']).all() and (mine['new_state'] == ref['new_state']).all()
        assert (mine['reason'].map(kind) == ref['reason'].map(kind)).all(), f'{ds}: reason kinds differ'
        for a, b in [('loss_exit_price', 'loss_exit_price'), ('ref_high', 'ref_high')]:
            x, y = mine[a].astype(float), ref[b].astype(float)
            assert ((x.isna() == y.isna()) & (x.fillna(0).sub(y.fillna(0)).abs() < 1e-9)).all(), f'{ds}: {a} differs'
        ev = events_table(strat, res)
        sm = strat.counters
        assert sm['lower_price_reentries'] == (ev['resolution'] == 'lower_price_reentry').sum()
        assert sm['recovery_resets'] == (ev['resolution'] == 'recovery_reset').sum()
        print(f'{ds}: state log equivalence PASS ({len(mine)} rows, {len(ev)} episodes)')

    # Smoke tests on one dataset.
    ds = 'VGT_2016_2026'
    c0 = run(ds, AdaptiveStrategy('smoke_no_reset', reset=no_reset))
    assert c0['net'] is not None

    def vol_scaled(ctx, st, i):
        natr = ctx.ind.natr(14)[i]
        if np.isnan(natr):
            ctx.counters['indicator_fallbacks'] += 1
            return st.exit_price * 0.97
        k = min(max(2.0 * natr, 0.01), 0.10)
        return st.exit_price * (1 - k)
    v = AdaptiveStrategy('smoke_vol', required_level=vol_scaled)
    rv = run(ds, v)
    assert rv['net'] is not None and len(v.events) > 0

    def alt(ctx, st, i):
        return st.sessions_restricted >= 40 and ctx.e.c[i] >= 1.05 * st.min_close
    a = AdaptiveStrategy('smoke_alt', alt_entry=alt)
    ra = run(ds, a)
    eva = events_table(a, ra)
    assert a.counters['alt_entries'] == (eva['resolution'] == 'alt_entry').sum()

    half = run(ds, ref_lower3(size=50000.0))
    full = run(ds, ref_lower3())
    assert np.isclose(half['net'], full['net'] / 2, atol=1e-6) and np.isclose(half['mdd'], full['mdd'] / 2, atol=1e-6)
    assert (half['trades']['entry_date'].astype(str) == full['trades']['entry_date'].astype(str)).all()
    print('smoke tests PASS (no-reset, vol-scaled fallback, alt-entry bookkeeping, size invariance)')
    print('SELFTEST PASS')


if __name__ == '__main__':
    main()
