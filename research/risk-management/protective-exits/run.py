"""Protective exits (SPEC.md section 3): run every configuration on every dataset and write results/.

For each (config, dataset):
1. a deterministic pre-run with the frozen engine produces the trades from which the experiment-specific
   `extra` statistics are computed (protective-exit counts, re-entries, repeated stop-outs, bear windows,
   interrupted baseline winners, divergence episodes, financing);
2. `metrics.run_config` re-runs the same configuration, writes trades/daily CSVs and returns the standard
   record (with matched-exposure control); the two runs are asserted identical.
Then `metrics.write_summary` writes results/summary.json.

Usage: PYTHONDONTWRITEBYTECODE=1 <python> run.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[0] / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, load, run  # noqa: E402
from metrics import BEAR_WINDOWS, RECOVERY_WINDOWS, baseline_result, covered, run_config, window_stats, write_summary  # noqa: E402
from strategies import CONFIGS, PROTECTIVE  # noqa: E402

EXPERIMENT = 'protective_exits'
OUT = HERE / 'results'
BASELINE_SUMMARY = HERE.parents[0] / 'baseline' / 'results' / 'summary.json'
MAJOR_WINNER = 10000.0
REENTRY_SESSIONS = 5


def f(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else float(x)


def d(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else str(x)


def is_protective(trade):
    return str(trade['reason']).startswith(PROTECTIVE)


def with_end(tr, n):
    """Trades with an integer exit index (the open position ends at the last session)."""
    tr = tr.copy()
    tr['exit_idx'] = tr['exit_i'].fillna(n - 1).astype(int)
    tr['entry_i'] = tr['entry_i'].astype(int)
    return tr


def protective_exit_rows(tr, df):
    rows = []
    for k, t in tr[tr.apply(is_protective, axis=1)].iterrows():
        x = int(t['exit_i'])
        rows.append(dict(trade_no=int(k), entry_date=d(t['entry_date']), exit_date=d(t['exit_date']),
                         entry_price=f(t['entry_price']), exit_price=f(t['exit_price']),
                         fill='gap at open' if str(t['reason']).endswith('gap') else 'intraday at level',
                         also=str(t['also']) if isinstance(t['also'], str) else '', sessions_held=int(t['sessions_held']),
                         exit_open=f(df['open'].iloc[x]), exit_high=f(df['high'].iloc[x]), exit_low=f(df['low'].iloc[x]),
                         exit_close=f(df['close'].iloc[x]), return_pct=f(t['exit_price'] / t['entry_price'] - 1),
                         interest=f(t['interest']), profit=f(t['profit'])))
    return rows


def coincident_rows(tr):
    """Exits whose recorded reason is another open trigger but where the protective stop also triggered."""
    m = tr['also'].fillna('').astype(str).str.contains(PROTECTIVE) & ~tr.apply(is_protective, axis=1)
    return [dict(entry_date=d(t['entry_date']), exit_date=d(t['exit_date']), reason=t['reason'], also=t['also'],
                 profit=f(t['profit'])) for _, t in tr[m].iterrows()]


def reentries(tr):
    """Next trade after each protective exit: sessions until re-entry and the re-entry trade's outcome."""
    out = []
    closed = tr.reset_index(drop=True)
    for k in range(len(closed)):
        t = closed.iloc[k]
        if not is_protective(t):
            continue
        nxt = closed.iloc[k + 1] if k + 1 < len(closed) else None
        rec = dict(exit_date=d(t['exit_date']), exit_price=f(t['exit_price']), next_entry_date=None,
                   sessions_to_reentry=None, next_entry_price=None, next_reason=None, next_profit=None)
        if nxt is not None:
            rec.update(next_entry_date=d(nxt['entry_date']), sessions_to_reentry=int(nxt['entry_i'] - t['exit_i']),
                       next_entry_price=f(nxt['entry_price']), next_reason=nxt['reason'], next_profit=f(nxt['profit']))
        out.append(rec)
    within = [r for r in out if r['sessions_to_reentry'] is not None and r['sessions_to_reentry'] <= REENTRY_SESSIONS]
    return dict(
        protective_exits=len(out), reentered_within_5_sessions=len(within),
        reentered_next_session=sum(r['sessions_to_reentry'] == 1 for r in within),
        share_within_5=(len(within) / len(out)) if out else None,
        reentry_below_exit_price=sum(r['next_entry_price'] < r['exit_price'] for r in within),
        pnl_of_reentry_trades_within_5=float(sum(r['next_profit'] for r in within)),
        reentry_trades_won=sum(r['next_profit'] > 0 for r in within),
        reentry_trades_lost=sum(r['next_profit'] < 0 for r in within),
        reentry_trades_protective_again=sum(str(r['next_reason']).startswith(PROTECTIVE) for r in within),
        avg_reentry_vs_exit_pct=float(np.mean([r['next_entry_price'] / r['exit_price'] - 1 for r in within])) if within else None,
        median_reentry_vs_exit_pct=float(np.median([r['next_entry_price'] / r['exit_price'] - 1 for r in within])) if within else None,
        details=out)


def repeated_stopouts(tr):
    """Chains of consecutive trades that each ended with a protective exit."""
    flags = [is_protective(t) for _, t in tr.iterrows()]
    chains, k = [], 0
    while k < len(flags):
        if flags[k]:
            j = k
            while j + 1 < len(flags) and flags[j + 1]:
                j += 1
            chains.append((k, j))
            k = j + 1
        else:
            k += 1
    rows = [dict(length=j - i + 1, first_entry=d(tr.iloc[i]['entry_date']), last_exit=d(tr.iloc[j]['exit_date']),
                 total_profit=f(tr.iloc[i:j + 1]['profit'].sum())) for i, j in chains]
    multi = [r for r in rows if r['length'] >= 2]
    return dict(pairs=int(sum(r['length'] - 1 for r in rows)), chains_of_2_or_more=len(multi),
                longest_chain=max((r['length'] for r in rows), default=0), chains=multi)


def bear_windows(res, base, dataset):
    out = {}
    for name, w in BEAR_WINDOWS.items():
        if not covered(res['daily'], w):
            continue
        a, b = (pd.Timestamp(x).date() for x in w)
        v, bb = window_stats(res, w), window_stats(base, w)

        def closed_in(tr):
            c = tr[tr['exit_date'].notna()]
            ed = pd.to_datetime(c['exit_date']).dt.date
            return c[(ed >= a) & (ed <= b)]
        cv, cb = closed_in(res['trades']), closed_in(base['trades'])
        out[name] = dict(
            period_pnl=v['pnl'], baseline_period_pnl=bb['pnl'], max_drawdown=v['max_drawdown'],
            baseline_max_drawdown=bb['max_drawdown'],
            sum_of_losses=f(cv.loc[cv['profit'] < 0, 'profit'].sum()), baseline_sum_of_losses=f(cb.loc[cb['profit'] < 0, 'profit'].sum()),
            sum_of_wins=f(cv.loc[cv['profit'] > 0, 'profit'].sum()), baseline_sum_of_wins=f(cb.loc[cb['profit'] > 0, 'profit'].sum()),
            losing_trades=int((cv['profit'] < 0).sum()), baseline_losing_trades=int((cb['profit'] < 0).sum()),
            avg_loss=f(cv.loc[cv['profit'] < 0, 'profit'].mean()), baseline_avg_loss=f(cb.loc[cb['profit'] < 0, 'profit'].mean()),
            largest_loss=v['largest_loss'], baseline_largest_loss=bb['largest_loss'],
            protective_exits=int(cv.apply(is_protective, axis=1).sum()) if len(cv) else 0,
            interest=v['interest'], baseline_interest=bb['interest'])
    return out


def overlapping(tr, s, x):
    return tr[(tr['entry_i'] <= x) & (tr['exit_idx'] >= s)]


def interrupted_winners(vt, bt):
    """Baseline trades with profit >= $10k during whose holding span [entry, exit] the variant had a protective exit."""
    prot = vt[vt.apply(is_protective, axis=1)]
    out = []
    for _, t in bt[bt['profit'] >= MAJOR_WINNER].iterrows():
        s, x = int(t['entry_i']), int(t['exit_idx'])
        hits = prot[(prot['exit_idx'] >= s) & (prot['exit_idx'] <= x)]
        if hits.empty:
            continue
        ov = overlapping(vt, s, x)
        out.append(dict(
            baseline_entry=d(t['entry_date']), baseline_exit=d(t['exit_date']) if t['reason'] != 'open' else 'open',
            baseline_profit=f(t['profit']), protective_exit_dates=[d(z) for z in hits['exit_date']],
            missed_baseline_entry=bool((hits['exit_idx'] == s).any()),
            variant_trades=[dict(entry=d(z['entry_date']), exit=d(z['exit_date']) if z['reason'] != 'open' else 'open',
                                 reason=z['reason'], profit=f(z['profit'])) for _, z in ov.iterrows()],
            variant_overlapping_profit=f(ov['profit'].sum()),
            difference=f(ov['profit'].sum() - t['profit'])))
    return out


def major_winners(vt, bt, n):
    """Every baseline trade with profit >= $10k: identical in the variant, interrupted by a protective exit inside
    its span, or displaced (the variant's sequence differed for an earlier reason). Overlapping variant P&L is not
    additive across rows (one variant trade can overlap two baseline trades)."""
    key = lambda t: (int(t['entry_i']), int(t['exit_idx']), round(float(t['exit_price']), 10))  # noqa: E731
    vkeys = {key(t) for _, t in vt.iterrows()}
    prot = vt[vt.apply(is_protective, axis=1)]
    out = []
    for _, t in bt[bt['profit'] >= MAJOR_WINNER].iterrows():
        s, x = int(t['entry_i']), int(t['exit_idx'])
        ov = overlapping(vt, s, x)
        if key(t) in vkeys:
            status = 'identical'
        elif ((prot['exit_idx'] >= s) & (prot['exit_idx'] <= x)).any():
            status = 'interrupted'
        else:
            status = 'displaced'
        out.append(dict(baseline_entry=d(t['entry_date']), baseline_exit=d(t['exit_date']) if t['reason'] != 'open' else 'open',
                        baseline_profit=f(t['profit']), status=status, variant_overlapping_profit=f(ov['profit'].sum()),
                        variant_trades=[f"{z['entry_date']}..{z['exit_date'] if z['reason'] != 'open' else 'open'} {z['reason']} {z['profit']:,.0f}" for _, z in ov.iterrows()],
                        difference=f(ov['profit'].sum() - t['profit'])))
    return out


def cut_trades(vt, bt):
    """For each protective exit, the baseline trade open on that session (if any) and how it eventually ended."""
    rows = []
    for _, z in vt[vt.apply(is_protective, axis=1)].iterrows():
        k = int(z['exit_idx'])
        b = bt[(bt['entry_i'] < k) & (bt['exit_idx'] >= k)]
        if b.empty:
            rows.append(dict(exit_date=d(z['exit_date']), baseline_trade=None, baseline_profit=None))
        else:
            b = b.iloc[0]
            rows.append(dict(exit_date=d(z['exit_date']), baseline_trade=f"{b['entry_date']}..{b['exit_date'] if b['reason'] != 'open' else 'open'}",
                             baseline_reason=b['reason'], baseline_profit=f(b['profit'])))
    held = [r for r in rows if r['baseline_profit'] is not None]
    return dict(protective_exits=len(rows), baseline_flat_at_exit=len(rows) - len(held),
                baseline_trade_later_won=sum(r['baseline_profit'] > 0 for r in held),
                baseline_trade_later_won_10k=sum(r['baseline_profit'] >= MAJOR_WINNER for r in held),
                baseline_trade_later_lost=sum(r['baseline_profit'] < 0 for r in held), details=rows)


def divergence_episodes(vt, bt, df):
    """Exact decomposition of the net-profit difference into episodes where the trade sequences differ.

    Trades identical in both runs (same entry index, exit index and exit price) cancel. The remaining trades
    of both runs are grouped into connected components of overlapping holding spans [entry, exit]. Outside
    these components the two runs hold identical positions, so the sum of (variant - baseline) profit over the
    episodes equals the difference in net profit.
    """
    key = lambda t: (int(t['entry_i']), int(t['exit_idx']), round(float(t['exit_price']), 10))  # noqa: E731
    bkeys = {key(t) for _, t in bt.iterrows()}
    vkeys = {key(t) for _, t in vt.iterrows()}
    items = [('V', t) for _, t in vt.iterrows() if key(t) not in bkeys] + [('B', t) for _, t in bt.iterrows() if key(t) not in vkeys]
    items.sort(key=lambda it: (int(it[1]['entry_i']), int(it[1]['exit_idx'])))
    episodes, cur, cur_end = [], [], -1
    for it in items:
        s, x = int(it[1]['entry_i']), int(it[1]['exit_idx'])
        if cur and s > cur_end:
            episodes.append(cur)
            cur, cur_end = [], -1
        cur.append(it)
        cur_end = max(cur_end, x)
    if cur:
        episodes.append(cur)
    rows = []
    for ep in episodes:
        vp = sum(float(t['profit']) for w, t in ep if w == 'V')
        bp = sum(float(t['profit']) for w, t in ep if w == 'B')
        last = max(int(t['exit_idx']) for _, t in ep)
        # Both runs were in the same state before the episode, so its first variant and first baseline trades
        # share the entry session. First-trade effect: the protective exit vs the baseline's outcome of that same
        # entry. Sequence effect: everything after (re-entries vs the rest of the baseline's trades).
        fv = min((t for w, t in ep if w == 'V'), key=lambda t: int(t['entry_i']))
        fb = min((t for w, t in ep if w == 'B'), key=lambda t: int(t['entry_i']))
        assert int(fv['entry_i']) == int(fb['entry_i'])
        first = float(fv['profit']) - float(fb['profit'])
        rows.append(dict(start=d(min(t['entry_date'] for _, t in ep)), end=d(df['date'].iloc[last].date()),
                         ends_open=any(t['reason'] == 'open' for _, t in ep),
                         variant_trades=sum(w == 'V' for w, _ in ep), baseline_trades=sum(w == 'B' for w, _ in ep),
                         variant_protective_exits=sum(w == 'V' and is_protective(t) for w, t in ep),
                         variant_profit=vp, baseline_profit=bp, delta=vp - bp,
                         first_trade_reason=fv['reason'], first_trade_variant_profit=float(fv['profit']),
                         first_trade_baseline_profit=float(fb['profit']), first_trade_effect=first, sequence_effect=vp - bp - first,
                         baseline_trade_list=[f"{t['entry_date']}..{t['exit_date'] if t['reason'] != 'open' else 'open'} {t['reason']} {t['profit']:,.0f}" for w, t in ep if w == 'B'],
                         variant_trade_list=[f"{t['entry_date']}..{t['exit_date'] if t['reason'] != 'open' else 'open'} {t['reason']} {t['profit']:,.0f}" for w, t in ep if w == 'V']))
    rows.sort(key=lambda r: r['delta'])
    return rows


def compute_extra(config, res, base, df, dataset):
    n = len(df)
    vt, bt = with_end(res['trades'], n), with_end(base['trades'], n)
    vclosed = vt[vt['reason'] != 'open']
    prot = protective_exit_rows(vclosed, df)
    losses = [r['profit'] for r in prot]
    eps = divergence_episodes(vt, bt, df)
    delta = res['net'] - base['net']
    eps_sum = float(sum(e['delta'] for e in eps))
    assert abs(eps_sum - delta) < 1e-6, (config, dataset, eps_sum, delta)
    return dict(
        protective_exits=dict(
            count=len(prot), gap_fills_at_open=sum(r['fill'] == 'gap at open' for r in prot),
            intraday_fills_at_level=sum(r['fill'] == 'intraday at level' for r in prot),
            winners=sum(p > 0 for p in losses), total_pnl=float(sum(losses)),
            avg_pnl=float(np.mean(losses)) if losses else None, largest_loss=float(min(losses)) if losses else None,
            avg_return_pct=float(np.mean([r['return_pct'] for r in prot])) if prot else None,
            avg_sessions_held=float(np.mean([r['sessions_held'] for r in prot])) if prot else None,
            details=prot),
        coincident_protective_triggers=coincident_rows(vclosed),
        exit_reasons={k: int(v) for k, v in vclosed['reason'].value_counts().items()},
        reentry=reentries(vt),
        repeated_stopouts=repeated_stopouts(vt.reset_index(drop=True)),
        bear_windows=bear_windows(res, base, dataset),
        interrupted_major_winners=interrupted_winners(vt, bt),
        all_major_baseline_winners=major_winners(vt, bt, n),
        cut_baseline_trades=cut_trades(vt, bt),
        divergence=dict(net_difference_vs_baseline=float(delta), episodes=len(eps), sum_of_episode_deltas=eps_sum,
                        episodes_better=sum(e['delta'] > 0 for e in eps), episodes_worse=sum(e['delta'] < 0 for e in eps),
                        sum_first_trade_effect=float(sum(e['first_trade_effect'] for e in eps)),
                        sum_sequence_effect=float(sum(e['sequence_effect'] for e in eps)),
                        first_trades_protective=sum(str(e['first_trade_reason']).startswith(PROTECTIVE) for e in eps),
                        first_trade_stop_saved=sum(e['first_trade_effect'] > 0 for e in eps),
                        first_trade_stop_cost=sum(e['first_trade_effect'] < 0 for e in eps),
                        episode_list=eps),
        financing=dict(net_profit=res['net'], interest=res['interest'], gross_before_interest=res['net'] + res['interest'],
                       max_drawdown=res['mdd'], baseline_net_profit=base['net'], baseline_interest=base['interest'],
                       baseline_gross_before_interest=base['net'] + base['interest'], baseline_max_drawdown=base['mdd'],
                       net_difference=res['net'] - base['net'], interest_difference=res['interest'] - base['interest'],
                       drawdown_difference=res['mdd'] - base['mdd']),
    )


def same(a, b):
    ka = (a['net'], a['mdd'], tuple(a['trades']['entry_i']), tuple(a['trades']['exit_price']))
    kb = (b['net'], b['mdd'], tuple(b['trades']['entry_i']), tuple(b['trades']['exit_price']))
    return ka == kb


def main():
    baseline_summary = {r['dataset']: r for r in json.load(open(BASELINE_SUMMARY))}
    records = []
    for config, make in CONFIGS.items():
        for ds in DATASETS:
            df = load(ds)
            base = baseline_result(ds)
            pre = run(ds, make())
            extra = compute_extra(config, pre, base, df, ds)
            rec, res = run_config(EXPERIMENT, config, make(), ds, OUT, extra=extra)
            assert same(pre, res), (config, ds)
            m, mc, pe = rec['metrics'], rec['matched_control'], rec['extra']['protective_exits']
            print(f"{config:38s} {ds}: net {m['net_profit']:>10,.0f} mdd {m['max_drawdown']:>9,.0f} p/dd {m['profit_to_drawdown']:>5.2f} "
                  f"| ctrl {mc['control_fixed_size']:>8,.0f} net {mc['control_profit']:>10,.0f} mdd {mc['control_max_drawdown']:>9,.0f} "
                  f"| prot exits {pe['count']}")
            records.append(rec)
    write_summary(records, OUT)
    # Verification: A_baseline must reproduce the frozen baseline record exactly (after identical JSON serialisation).
    mine = {r['dataset']: r for r in json.load(open(OUT / 'summary.json')) if r['config'] == 'A_baseline'}
    ver = {}
    for ds, ref in baseline_summary.items():
        ver[ds] = dict(metrics_identical=mine[ds]['metrics'] == ref['metrics'],
                       matched_control_identical=mine[ds]['matched_control'] == ref['matched_control'],
                       trades_csv_identical=(OUT / 'trades' / f'{ds}__A_baseline.csv').read_bytes()
                       == (BASELINE_SUMMARY.parent / 'trades' / f'{ds}__baseline.csv').read_bytes(),
                       daily_csv_identical=(OUT / 'daily' / f'{ds}__A_baseline.csv').read_bytes()
                       == (BASELINE_SUMMARY.parent / 'daily' / f'{ds}__baseline.csv').read_bytes())
        print(f'A_baseline {ds} vs frozen baseline: {ver[ds]}')
    json.dump(ver, open(OUT / 'baseline_reproduction.json', 'w'), indent=1)
    assert all(all(v.values()) for v in ver.values()), 'A_baseline does not reproduce the frozen baseline'


if __name__ == '__main__':
    main()
