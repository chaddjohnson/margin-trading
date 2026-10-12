"""Sanity tests for the engine's extension hooks and accounting identities (no experiment logic)."""
import numpy as np

from engine import DATASETS, FixedSize, Strategy, run
from metrics import RECOVERY_WINDOWS, BEAR_WINDOWS, standard_metrics, window_stats


class FarStop(Strategy):  # an extra stop that can never trigger
    def extra_stops(self, e, i):
        return [('never', -1.0)]


class ZeroAdd(Strategy):
    def add_on(self, e, i):
        return 0.0


def key(r):
    t = r['trades']
    return (round(r['net'], 6), round(r['mdd'], 6), tuple(t.entry_i), tuple(t.exit_price.round(8)))


for ds in DATASETS:
    b = run(ds)
    assert key(run(ds, FarStop())) == key(b), ds
    assert key(run(ds, ZeroAdd())) == key(b), ds
    h = run(ds, FixedSize(50000.0))
    assert tuple(h['trades'].entry_i) == tuple(b['trades'].entry_i)
    assert abs(h['net'] - b['net'] / 2) < 1e-6 and abs(h['mdd'] - b['mdd'] / 2) < 1e-6, ds
    assert abs(b['dollar_days'] * 0.11 / 365 - b['interest']) < 1e-6, ds
    full = ('1900-01-01', '2100-12-31')
    d = b['daily']
    w = window_stats(b, (str(d['date'].iloc[0]), str(d['date'].iloc[-1])))
    assert abs(w['interest'] - b['interest']) < 1e-6 and abs(w['pnl'] - b['net']) < 1e-6 and abs(w['max_drawdown'] - b['mdd']) < 1e-6, ds
    m = standard_metrics(b, ds)
    print(ds, 'ok', {k: round(v['pnl']) for k, v in m['bear_windows'].items()}, {k: round(v['pnl']) for k, v in m['recovery_windows'].items()})
print('engine tests passed')
