"""Coordinator cross-check: independent re-implementations of all ten experimental configurations, written
from SPEC.md without reading any agent's code. Compares net profit, max drawdown, closed trades and margin
dollar-days with each agent's results/summary.json. Writes comparison/independent_verification.json."""

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'baseline'))
from engine import DATASETS, Strategy, run  # noqa: E402


class SMA(Strategy):
    def entry_size(self, e, i):
        if i < 219:
            return 100000.0
        c = e.c
        sma = c[i - 199:i + 1].mean()
        sma_prev = c[i - 219:i - 19].mean()
        return 50000.0 if (c[i] < sma and sma < sma_prev) else 100000.0


class Breaker(Strategy):
    def entry_size(self, e, i):
        dd = e.dd_prev
        return 100000.0 if dd < 10000 else 75000.0 if dd < 20000 else 50000.0 if dd < 30000 else 25000.0


class Protective(Strategy):
    def __init__(self, pct, window=None):
        self.pct, self.window = pct, window

    def extra_stops(self, e, i):
        p = e.pos
        k = i - p.entry_i
        if self.window is not None and not (1 <= k <= self.window):
            return []
        return [('protective stop', p.entry_price * (1 - self.pct))]


class Recovery(Strategy):
    def __init__(self, kind):
        self.kind = kind
        self.exit_i = None  # set after a losing exit; None means no confirmation needed

    def on_exit(self, e, i, trade):
        self.exit_i = i if trade['profit'] < 0 else None

    def entry_allowed(self, e, i):
        x = self.exit_i
        if x is None:
            return True
        c = e.c
        ok = False
        if self.kind == 'two_closes':
            ok = any(c[j] > c[j - 1] and c[j - 1] > c[j - 2] for j in range(x + 2, i + 1))
        elif self.kind == 'sma10':
            ok = any(j >= 9 and c[j] > c[j - 9:j + 1].mean() for j in range(x + 1, i + 1))
        elif self.kind == 'pct3':
            ok = any(c[j] >= 1.03 * c[x:j + 1].min() for j in range(x + 1, i + 1))
        if ok:
            self.exit_i = None  # latched until the next entry
        return ok


class Staged(Strategy):
    def __init__(self, kind):
        self.kind = kind

    def entry_size(self, e, i):
        return 50000.0

    def add_on(self, e, i):
        p = e.pos
        if len(p.lots) > 1:
            return 0.0
        c, k = e.c, p.entry_i
        if self.kind == 'two_closes':
            ok = i >= k + 2 and c[i] > c[i - 1] and c[i - 1] > c[i - 2]
        else:
            ok = i > k and c[i] >= 1.03 * p.entry_price
        return 50000.0 if ok else 0.0


CONFIGS = {
    ('sma-sizing', 'B_bearish_sma200_sizing'): SMA,
    ('circuit-breaker', 'B_drawdown_tiers'): Breaker,
    ('protective-exits', 'B_protective_stop_8pct'): lambda: Protective(0.08),
    ('protective-exits', 'C_protective_stop_10pct'): lambda: Protective(0.10),
    ('protective-exits', 'D_early_deterioration_5pct_5sessions'): lambda: Protective(0.05, 5),
    ('recovery-reentry', 'B_two_positive_closes'): lambda: Recovery('two_closes'),
    ('recovery-reentry', 'C_close_above_sma10'): lambda: Recovery('sma10'),
    ('recovery-reentry', 'D_recovery_3pct_from_low'): lambda: Recovery('pct3'),
    ('staged-entries', 'B_staged_two_positive_closes'): lambda: Staged('two_closes'),
    ('staged-entries', 'C_staged_3pct_recovery'): lambda: Staged('pct3'),
}

if __name__ == '__main__':
    out, ok_all = [], True
    for (exp_dir, cfg), make in CONFIGS.items():
        summ_path = ROOT / exp_dir / 'results' / 'summary.json'
        agent = {(r['config'], r['dataset']): r for r in json.load(open(summ_path))} if summ_path.exists() else {}
        for ds in DATASETS:
            r = run(ds, make())
            mine = dict(net=r['net'], mdd=r['mdd'], closed=r['closed'], dollar_days=r['dollar_days'])
            a = agent.get((cfg, ds))
            theirs = None if a is None else dict(net=a['metrics']['net_profit'], mdd=a['metrics']['max_drawdown'],
                                                   closed=a['metrics']['closed_trades'], dollar_days=a['metrics']['margin_dollar_days'])
            match = theirs is not None and all(abs(mine[k] - theirs[k]) < 0.5 for k in mine)
            ok_all &= match
            out.append(dict(experiment=exp_dir, config=cfg, dataset=ds, independent=mine, agent=theirs, match=match))
            print(f"{exp_dir:17s} {cfg:38s} {ds:14s} net {mine['net']:>11,.0f} mdd {mine['mdd']:>9,.0f} closed {mine['closed']:>4} "
                  f"{'MATCH' if match else ('NO AGENT RESULT' if theirs is None else 'MISMATCH agent net %s mdd %s' % (round(theirs['net']), round(theirs['mdd'])))}")
    json.dump(out, open(Path(__file__).parent / 'independent_verification.json', 'w'), indent=1, default=float)
    print('ALL MATCH' if ok_all else 'SOME MISMATCHES OR MISSING')
