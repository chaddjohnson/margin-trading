"""Reproduce the circuit-breaker experiment (SPEC.md section 2) on all four datasets.

For each (config, dataset):
  1. a pre-run with the frozen engine computes the experiment-specific `extra` data (tiers, entries, recovery sizes,
     trap spells, drawdown episodes, continuity and scaling checks);
  2. metrics.run_config runs the same configuration again with a fresh strategy instance (standard metrics, matched
     control, trades and daily CSVs) and receives `extra`; the two runs are asserted identical.
Then metrics.write_summary writes results/summary.json. Additional per-session tier series and entry logs are written
to results/tiers/ and results/entries/.

Usage: PYTHONDONTWRITEBYTECODE=1 <python> run.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
sys.path.insert(0, str(HERE))

from engine import DATASETS, YEAR_SECONDS, Params, load, run  # noqa: E402
from metrics import RECOVERY_WINDOWS, covered, run_config, write_summary  # noqa: E402
from strategies import CONFIGS, TIER_SIZES, tier_size  # noqa: E402

EXPERIMENT = 'circuit_breaker'
OUT = HERE / 'results'
BASELINE_SUMMARY = HERE.parent / 'baseline' / 'results' / 'summary.json'
RATE = Params().rate
REDUCED = (50000.0, 25000.0)  # the "low exposure" tiers of question 5
TIER_LABEL = {100000.0: '$100k (dd < $10k)', 75000.0: '$75k ($10k <= dd < $20k)',
              50000.0: '$50k ($20k <= dd < $30k)', 25000.0: '$25k (dd >= $30k)'}


def d(x):
    return str(pd.Timestamp(x).date())


# ---------------------------------------------------------------------------------------------------------------
# Independent checks
# ---------------------------------------------------------------------------------------------------------------

def continuity_check(res, df):
    """Rebuild the daily mark-to-market P&L independently from the trade list and prices; compare with the engine.

    mtm_k = sum(profit of trades with exit_i <= k) + (shares * close_k - investment - accrued interest to k) for the
    position open at close k. A realized loss therefore enters the series only through the price path it took; on an
    exit session the change is shares*(exit - previous close) minus one more step of interest, never the whole
    realized loss again. We test: (a) max |engine - rebuilt|; (b) on every exit session, the daily change equals
    shares*(exit_price - prev_close) - interest(prev close -> exit) (+ the marked value of a same-session entry, which
    cannot happen in this engine); (c) the series ends at net profit; (d) sum of daily changes equals net profit; (e)
    when flat, mtm equals cumulative realized P&L; (f) the naive alternative (adding realized P&L on top of a series
    that already marked the position) would differ from the engine series by the cumulative realized P&L.
    """
    tr, daily = res['trades'], res['daily']
    c, t = df['close'].to_numpy(float), df['time'].to_numpy(float)
    n = len(df)
    rebuilt = np.zeros(n)
    realized_cum = np.zeros(n)
    for _, r in tr.iterrows():
        e_i = int(r['entry_i'])
        x_i = n if pd.isna(r['exit_i']) else int(r['exit_i'])
        k = np.arange(e_i, min(x_i, n))
        rebuilt[k] += r['shares'] * c[k] - r['investment'] - r['investment'] * RATE * (t[k] - t[e_i]) / YEAR_SECONDS
        if x_i < n:
            rebuilt[x_i:] += r['profit']
            realized_cum[x_i:] += r['profit']
    mtm = daily['mtm_pnl'].to_numpy()
    exit_rows = []
    for _, r in tr[tr['reason'] != 'open'].iterrows():
        x = int(r['exit_i'])
        e_i = int(r['entry_i'])
        prev_close = c[x - 1]
        expected = r['shares'] * (r['exit_price'] - prev_close) - r['investment'] * RATE * (t[x] - t[x - 1]) / YEAR_SECONDS
        if e_i == x - 1:  # entered at the previous close: the previous mark already includes entry (value 0)
            pass
        exit_rows.append(dict(exit_i=x, change=mtm[x] - mtm[x - 1], expected=expected, realized=r['profit']))
    ex = pd.DataFrame(exit_rows)
    flat = daily['borrowed'].to_numpy() == 0
    return dict(
        max_abs_diff_engine_vs_rebuilt=float(np.abs(mtm - rebuilt).max()),
        exit_sessions=int(len(ex)),
        max_abs_diff_exit_day_change_vs_price_move=float((ex['change'] - ex['expected']).abs().max()) if len(ex) else 0.0,
        final_mtm_minus_net=float(mtm[-1] - res['net']),
        sum_daily_changes_minus_net=float(np.diff(mtm).sum() + mtm[0] - res['net']),
        max_abs_diff_flat_mtm_vs_cum_realized=float(np.abs(mtm[flat] - realized_cum[flat]).max()),
        naive_double_count_final_error=float(realized_cum[-1]),  # what adding realized P&L again would add at the end
        exit_day_change_sum=float(ex['change'].sum()) if len(ex) else 0.0,
        realized_sum=float(ex['realized'].sum()) if len(ex) else 0.0,
    )


def scaling_check(res_b, res_a):
    """Size never changes the trade sequence (stop activation and the loss exit depend only on the sign of P&L,
    which is scale-invariant), so each B trade should be the A trade scaled by size/$100k."""
    a, b = res_a['trades'], res_b['trades']
    same = len(a) == len(b) and (a['entry_i'].to_numpy() == b['entry_i'].to_numpy()).all() and \
        (a['exit_i'].fillna(-1).to_numpy() == b['exit_i'].fillna(-1).to_numpy()).all() and \
        np.allclose(a['exit_price'].to_numpy(), b['exit_price'].to_numpy(), rtol=0, atol=1e-12)
    err = float(np.abs(b['profit'].to_numpy() - a['profit'].to_numpy() * b['investment'].to_numpy() / 100000.0).max()) \
        if same else None
    return dict(identical_entry_exit_sequence=bool(same), max_abs_profit_scaling_error=err)


def tier_check(res, entries, config):
    """B: recompute each entry's tier from the written daily series (drawdown at the close of session entry_i - 1).
    A: every entry must be $100,000 (the tier rule is not applied)."""
    dd = res['daily']['drawdown'].to_numpy()
    tr = res['trades']
    bad = []
    for _, r in tr.iterrows():
        i = int(r['entry_i'])
        want = tier_size(dd[i - 1]) if config == 'B_drawdown_tiers' else 100000.0
        if abs(want - r['investment']) > 1e-9:
            bad.append(int(i))
    logged = all(abs(x['prior_dd'] - dd[x['entry_i'] - 1]) < 1e-9 for x in entries)
    # The strategy is flat during an entry session (no entry on an exit session; the new position is marked at its own
    # entry close with zero interest), so the closing drawdown of the entry session equals the prior session's: using
    # e.dd_prev loses no information.
    lag = float(max(abs(dd[int(i)] - dd[int(i) - 1]) for i in tr['entry_i'])) if len(tr) else 0.0
    return dict(entries_checked=int(len(tr)), entries_with_wrong_tier=bad, logged_dd_matches_daily=bool(logged),
                max_abs_dd_change_prior_close_to_entry_close=lag)


# ---------------------------------------------------------------------------------------------------------------
# Experiment-specific statistics
# ---------------------------------------------------------------------------------------------------------------

def decision_tiers(daily):
    """Tier a decision at session i would use: implied by the drawdown at the close of session i-1 (i = 1..n-1)."""
    dd = daily['drawdown'].to_numpy()
    tiers = np.array([tier_size(x) for x in dd[:-1]])
    return tiers  # index j corresponds to session j+1


def tier_time(daily):
    tiers = decision_tiers(daily)
    inv = daily['borrowed'].to_numpy()[1:]
    out = {}
    for s in TIER_SIZES:
        m = tiers == s
        out[f'{s:.0f}'] = dict(label=TIER_LABEL[s], sessions=int(m.sum()), pct=float(m.mean()),
                               sessions_invested=int((m & (inv > 0)).sum()))
    return out


def spells(daily, member):
    """Maximal runs of decision sessions whose tier is in `member`."""
    tiers = decision_tiers(daily)
    dates = pd.to_datetime(daily['date'])
    n = len(daily)
    runs, k = [], 0
    while k < len(tiers):
        if tiers[k] in member:
            j = k
            while j + 1 < len(tiers) and tiers[j + 1] in member:
                j += 1
            first_s, last_s = k + 1, j + 1  # session indices
            exited = last_s < n - 1
            end_s = last_s + 1 if exited else n - 1  # first session back above, or data end
            runs.append(dict(first_session=d(dates.iloc[first_s]), last_session=d(dates.iloc[last_s]),
                             first_session_out=d(dates.iloc[end_s]) if exited else None, exited=bool(exited),
                             sessions=int(last_s - first_s + 1),
                             calendar_days=int((dates.iloc[end_s] - dates.iloc[first_s]).days),
                             deepest_tier=float(min(tiers[k:j + 1])),
                             max_drawdown_in_spell=float(daily['drawdown'].iloc[first_s - 1:last_s].max())))
            k = j + 1
        else:
            k += 1
    return runs


def spell_summary(daily):
    out = {}
    for key, member in (('reduced_50k_25k', REDUCED), ('tier_25k', (25000.0,)), ('any_reduced_75k_or_less', (75000.0, 50000.0, 25000.0))):
        rs = spells(daily, member)
        longest = max(rs, key=lambda r: r['sessions']) if rs else None
        out[key] = dict(n_spells=len(rs), total_sessions=int(sum(r['sessions'] for r in rs)), longest=longest,
                        all_exited=bool(all(r['exited'] for r in rs)), spells=rs)
    tiers = decision_tiers(daily)
    out['tier_at_data_end'] = float(tier_size(daily['drawdown'].iloc[-1]))
    out['first_session_in_reduced_50k_25k'] = None
    idx = np.flatnonzero(np.isin(tiers, REDUCED))
    if len(idx):
        out['first_session_in_reduced_50k_25k'] = d(daily['date'].iloc[idx[0] + 1])
        later = tiers[idx[0]:]
        out['returns_to_100k_after_first_reduced'] = bool((later == 100000.0).any())
    return out


def drawdown_episodes(daily, min_depth=10000.0):
    """Underwater episodes (peak -> first close regaining it) whose depth reached at least min_depth."""
    mtm, peak, dd = (daily[k].to_numpy() for k in ('mtm_pnl', 'peak_pnl', 'drawdown'))
    dates = pd.to_datetime(daily['date'])
    n = len(daily)
    eps, k = [], 1
    while k < n:
        if dd[k] > 1e-9:
            start = k - 1  # session that set the peak
            j = k
            while j + 1 < n and dd[j + 1] > 1e-9:
                j += 1
            rec = j + 1 if j + 1 < n else None
            trough = start + 1 + int(np.argmax(dd[start + 1:j + 1]))
            depth = float(dd[trough])
            if depth >= min_depth:
                after = np.flatnonzero(dd[trough:] < 10000.0)
                full = trough + int(after[0]) if len(after) else None
                eps.append(dict(peak_date=d(dates.iloc[start]), peak_pnl=float(peak[trough]), trough_date=d(dates.iloc[trough]),
                                depth=depth, trough_pnl=float(mtm[trough]),
                                recovery_date=d(dates.iloc[rec]) if rec is not None else None, recovered=rec is not None,
                                peak_to_trough_days=int((dates.iloc[trough] - dates.iloc[start]).days),
                                trough_to_recovery_days=int((dates.iloc[rec if rec is not None else n - 1] - dates.iloc[trough]).days),
                                peak_to_recovery_days=int((dates.iloc[rec if rec is not None else n - 1] - dates.iloc[start]).days),
                                back_below_10k_dd_date=d(dates.iloc[full]) if full is not None else None,
                                trough_to_back_below_10k_days=int((dates.iloc[full] - dates.iloc[trough]).days) if full is not None else None))
            k = j + 1
        else:
            k += 1
    return eps


def trades_overlapping(tr, a, b):
    en = pd.to_datetime(tr['entry_date']).dt.date
    ex = pd.to_datetime(tr['exit_date']).dt.date
    open_mask = tr['exit_date'].isna()
    return tr[(en <= b) & (open_mask | (ex >= a))]


def recovery_sizes(res, res_a):
    tr, tra = res['trades'], res_a['trades']
    out = {}
    for key, w in RECOVERY_WINDOWS.items():
        if not covered(res['daily'], w):
            continue
        a, b = (pd.Timestamp(x).date() for x in w)
        held = trades_overlapping(tr, a, b)
        rows = []
        for idx, r in held.iterrows():
            ra = tra.loc[idx]
            rows.append(dict(entry_date=str(r['entry_date']), exit_date=None if pd.isna(r['exit_date']) else str(r['exit_date']),
                             entered_in_window=bool(a <= pd.Timestamp(r['entry_date']).date() <= b), size=float(r['investment']),
                             profit=float(r['profit']), baseline_profit=float(ra['profit']),
                             foregone_vs_baseline=float(r['profit'] - ra['profit'])))
        dly = res['daily']
        m = (dly['date'] >= a) & (dly['date'] <= b)
        bor = dly.loc[m, 'borrowed']
        out[key] = dict(window=f'{a}..{b}', positions=rows,
                        sizes_of_entries_in_window=[x['size'] for x in rows if x['entered_in_window']],
                        avg_borrowed_while_invested=float(bor[bor > 0].mean()) if (bor > 0).any() else 0.0,
                        drawdown_at_window_start=float(dly['drawdown'].to_numpy()[np.flatnonzero(m.to_numpy())[0] - 1]))
    return out


def attribution(res_b, res_a, top=6):
    a, b = res_a['trades'], res_b['trades']
    df = pd.DataFrame(dict(entry_date=b['entry_date'].astype(str), exit_date=b['exit_date'].astype(str), size=b['investment'],
                           profit_b=b['profit'], profit_a=a['profit']))
    df['delta'] = df['profit_b'] - df['profit_a']
    pos, neg = df.sort_values('delta', ascending=False), df.sort_values('delta')
    return dict(total_delta=float(df['delta'].sum()),
                delta_from_losing_baseline_trades=float(df.loc[df['profit_a'] < 0, 'delta'].sum()),
                delta_from_winning_baseline_trades=float(df.loc[df['profit_a'] > 0, 'delta'].sum()),
                reduced_trades=int((df['size'] < 100000).sum()),
                largest_gains=pos.head(top).to_dict('records'), largest_costs=neg.head(top).to_dict('records'))


def entries_per_tier(res, res_a, tiers=None):
    """Entries grouped by tier: B's actual size, or (for A) the tier its drawdown implied (`tiers`). `baseline_pnl` is the
    same trades' P&L at the baseline's $100k, i.e. per-$100k profitability of entries taken in each tier."""
    tr, tra = res['trades'], res_a['trades']
    group = tr['investment'].to_numpy() if tiers is None else np.asarray(tiers)
    out = {}
    for s in TIER_SIZES:
        m = np.abs(group - s) < 1e-6
        closed = m & (tr['reason'] != 'open').to_numpy()
        prof = tr['profit'].to_numpy()
        out[f'{s:.0f}'] = dict(entries=int(m.sum()), closed=int(closed.sum()), wins=int((closed & (prof > 0)).sum()),
                               losses=int((closed & (prof < 0)).sum()), pnl_including_open=float(prof[m].sum()),
                               baseline_pnl=float(tra['profit'].to_numpy()[m].sum()))
    return out


def losing_streaks(res):
    """Consecutive losing closed trades: the longest streak (by count) and the costliest streak (by dollars)."""
    tr = res['trades']
    tr = tr[tr['reason'] != 'open'].reset_index(drop=True)
    streaks, cur = [], []
    for k, r in tr.iterrows():
        if r['profit'] < 0:
            cur.append(k)
        elif cur:
            streaks.append(cur)
            cur = []
    if cur:
        streaks.append(cur)

    def desc(st):
        return dict(n=len(st), first_entry=str(tr.loc[st[0], 'entry_date']), last_exit=str(tr.loc[st[-1], 'exit_date']),
                    total_loss=float(tr.loc[st, 'profit'].sum()), sizes=[float(tr.loc[j, 'investment']) for j in st])
    if not streaks:
        return dict(longest=None, costliest=None)
    longest = max(streaks, key=lambda st: (len(st), -tr.loc[st, 'profit'].sum()))
    costliest = min(streaks, key=lambda st: tr.loc[st, 'profit'].sum())
    return dict(longest=desc(longest), costliest=desc(costliest))


def max_dd_by_size_held(res):
    """Split the max-drawdown path (peak session -> trough session) into the daily mark-to-market changes made while
    each position size was held at the previous close (0 = flat; exit-session changes count under the size held)."""
    dly = res['daily']
    dates = dly['date'].astype(str).to_numpy()
    pk = int(np.flatnonzero(dates == res['mdd_peak'])[0])
    tg = int(np.flatnonzero(dates == res['mdd_trough'])[0])
    chg = np.diff(dly['mtm_pnl'].to_numpy())[pk:tg]  # change from close k to close k+1, k = pk..tg-1
    held = dly['borrowed'].to_numpy()[pk:tg]  # size held at close k (carried into session k+1)
    out = {}
    for s in sorted(set(held.tolist()), reverse=True):
        m = held == s
        out[f'{s:.0f}'] = dict(sessions=int(m.sum()), mtm_change=float(chg[m].sum()))
    return dict(peak=res['mdd_peak'], trough=res['mdd_trough'], total=float(chg.sum()), by_size_held=out)


def build_extra(config, res, strat, res_a, df):
    tr = res['trades']
    ent = pd.DataFrame(strat.entries)
    ent['exit_date'] = [None if pd.isna(x) else str(x) for x in tr['exit_date']]
    ent['reason'] = tr['reason'].to_numpy()
    ent['profit'] = tr['profit'].to_numpy()
    ent['baseline_profit'] = res_a['trades']['profit'].to_numpy()
    closedd = np.array([strat.close_dd[i] for i in range(1, len(df))])
    extra = dict(
        sizing_rule_applied=config == 'B_drawdown_tiers',
        note=('B: entry size from the drawdown at the close of the previous session (engine e.dd_prev).' if config != 'A_baseline'
              else 'A: fixed $100k. Tier statistics are the tiers its own drawdown WOULD imply (informational only).'),
        tiers={TIER_LABEL[s]: s for s in TIER_SIZES},
        tier_time=tier_time(res['daily']),
        entries_per_tier=entries_per_tier(res, res_a) if config != 'A_baseline' else None,
        implied_entries_per_tier=entries_per_tier(res, res_a, ent['implied_tier'].to_numpy()),
        trap_spells=spell_summary(res['daily']),
        drawdown_episodes_ge_10k=drawdown_episodes(res['daily']),
        recovery_window_positions=recovery_sizes(res, res_a),
        attribution_vs_baseline=attribution(res, res_a),
        losing_streaks=losing_streaks(res),
        max_dd_by_size_held=max_dd_by_size_held(res),
        checks=dict(continuity=continuity_check(res, df), scaling_vs_A=scaling_check(res, res_a), tier=tier_check(res, strat.entries, config),
                    on_session_end_dd_matches_daily=float(np.abs(closedd - res['daily']['drawdown'].to_numpy()[1:]).max())),
        entries=ent.to_dict('records'),
    )
    return extra, ent


def main():
    for sub in ('tiers', 'entries'):
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    records = []
    base_results = {}
    for ds in DATASETS:
        df = load(ds)
        for config, cls in CONFIGS.items():
            pre_strat = cls()
            pre = run(df, pre_strat)
            if config == 'A_baseline':
                base_results[ds] = pre
            extra, ent = build_extra(config, pre, pre_strat, base_results[ds], df)
            strat = cls()
            rec, res = run_config(EXPERIMENT, config, strat, ds, OUT, extra=extra)
            assert res['net'] == pre['net'] and res['mdd'] == pre['mdd'], (ds, config)
            assert res['trades'].drop(columns='lots').equals(pre['trades'].drop(columns='lots')), (ds, config)
            assert strat.entries == pre_strat.entries, (ds, config)
            records.append(rec)
            ent.to_csv(OUT / 'entries' / f'{ds}__{config}.csv', index=False)
            dly = res['daily'].copy()
            dly['decision_tier_next_session'] = [tier_size(x) for x in dly['drawdown']]
            dly['size_held'] = dly['borrowed']
            dly[['date', 'mtm_pnl', 'peak_pnl', 'drawdown', 'decision_tier_next_session', 'size_held']].to_csv(
                OUT / 'tiers' / f'{ds}__{config}.csv', index=False)
            m, mc = rec['metrics'], rec['matched_control']
            print(f"{ds:14s} {config:17s} net {m['net_profit']:>10,.0f} mdd {m['max_drawdown']:>9,.0f} "
                  f"p/dd {m['profit_to_drawdown'] or float('nan'):6.2f} exp {mc['exposure_vs_baseline']:.3f} "
                  f"ctrl net {mc['control_profit']:>10,.0f} ctrl mdd {mc['control_max_drawdown']:>9,.0f}")
    write_summary(records, OUT)

    # A_baseline must reproduce the frozen baseline exactly (standard metrics and matched control).
    frozen = {r['dataset']: r for r in json.load(open(BASELINE_SUMMARY))}
    mine = json.load(open(OUT / 'summary.json'))
    for r in mine:
        if r['config'] == 'A_baseline':
            f = frozen[r['dataset']]
            assert r['metrics'] == f['metrics'], f"metrics differ for {r['dataset']}"
            assert r['matched_control'] == f['matched_control'], f"matched control differs for {r['dataset']}"
    for ds in DATASETS:
        a = pd.read_csv(OUT / 'trades' / f'{ds}__A_baseline.csv')
        b = pd.read_csv(HERE.parent / 'baseline' / 'results' / 'trades' / f'{ds}__baseline.csv')
        assert a.equals(b), f'trades differ for {ds}'
        a = pd.read_csv(OUT / 'daily' / f'{ds}__A_baseline.csv')
        b = pd.read_csv(HERE.parent / 'baseline' / 'results' / 'daily' / f'{ds}__baseline.csv')
        assert a.equals(b), f'daily differs for {ds}'
    print('A_baseline reproduces baseline/results (summary metrics, matched control, trades, daily): exact match')


if __name__ == '__main__':
    main()
