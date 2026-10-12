"""Analysis for experiment 1 (sma_sizing). Run after run.py. Reads results/, writes results/analysis.json and
tmp/tables.md (markdown tables used in SMA_SIZING.md).

Because position size never changes the trade sequence (stop activation and the loss exit depend only on the sign
of P&L), config B's daily mark-to-market P&L is exactly sum_k s_k * c_k(d), where c_k(d) is baseline trade k's
contribution to cumulative P&L on day d and s_k = size_k / $100,000. The decomposition is rebuilt from the baseline
trades and closes and checked against both configs' daily series to 1e-6. It is used only for attribution
(which trades drive the change) and a chance check (are the trades the rule halves special?). No other sizing
rule is evaluated as a candidate.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from tabulate import tabulate  # noqa: E402

from engine import DATASETS, YEAR_SECONDS, Params, load  # noqa: E402

RES = HERE / 'results'
TMP = HERE / 'tmp'
A, B = 'A_baseline', 'B_bearish_sma200_sizing'
RATE = Params().rate
recs = {(r['config'], r['dataset']): r for r in json.load(open(RES / 'summary.json'))}
out, md = {}, []


def h(title):
    md.append(f'\n### {title}\n')


def table(rows, headers):
    md.append(tabulate(rows, headers=headers, tablefmt='github', disable_numparse=True))
    md.append('')


def f0(x):
    return '' if x is None else f'{x:,.0f}'


def f2(x):
    return '' if x is None else f'{x:.2f}'


def pct(x):
    return '' if x is None else f'{100 * x:.0f}%'


# ---------- 3. standard metrics A-C ----------
h('Standard metrics (sections A-C)')
rows_def = [
    ('Net profit', 'net_profit', f0), ('Realized', 'realized_profit', f0), ('Unrealized (open at end)', 'unrealized_profit', f0),
    ('Margin interest', 'margin_interest', f0), ('Closed trades', 'closed_trades', str), ('Winning / losing', None, None),
    ('Win rate', 'win_rate', pct), ('Avg win', 'avg_winning_trade', f0), ('Avg loss', 'avg_losing_trade', f0),
    ('Largest win', 'largest_winning_trade', f0), ('Largest loss', 'largest_losing_trade', f0),
    ('Max drawdown', 'max_drawdown', f0), ('Max DD / $100k', 'max_drawdown_pct_of_100k', pct),
    ('Peak -> trough', None, None), ('Profit / max DD', 'profit_to_drawdown', f2),
    ('Max consecutive losses', 'max_consecutive_losses', str), ('Max bear-episode DD', 'max_bear_episode_drawdown', f0),
    ('Longest underwater (days)', None, None), ('Lowest cumulative P&L', 'min_cumulative_pnl', f0),
    ('Fell below -$100k', 'fell_below_minus_100k', str), ('Worst day', None, None),
    ('Avg borrowed (all sessions)', 'avg_borrowed_all_sessions', f0), ('Avg borrowed (invested)', 'avg_borrowed_while_invested', f0),
    ('% sessions exposed', 'pct_sessions_exposed', pct), ('Max borrowed', 'max_borrowed', f0),
    ('Margin dollar-days ($M-d)', None, None), ('Net per $1M dollar-days', 'net_profit_per_1m_dollar_days', f0),
]
hdr = ['Metric'] + [f'{ds} {c[0]}' for ds in DATASETS for c in (A, B)]
rows = []
for label, key, fmt in rows_def:
    row = [label]
    for ds in DATASETS:
        for c in (A, B):
            m = recs[(c, ds)]['metrics']
            if key:
                row.append(fmt(m[key]))
            elif label.startswith('Winning'):
                row.append(f"{m['winning_trades']} / {m['losing_trades']}")
            elif label.startswith('Peak'):
                row.append(f"{m['mdd_peak_date']} -> {m['mdd_trough_date']}")
            elif label.startswith('Longest'):
                row.append(f"{m['longest_underwater_days']}{'' if m['longest_underwater_recovered'] else ' (not rec.)'}")
            elif label.startswith('Worst'):
                row.append(f"{m['worst_day_mtm_change']:,.0f} ({m['worst_day_date']})")
            elif label.startswith('Margin'):
                row.append(f"{m['margin_dollar_days'] / 1e6:,.1f}")
    rows.append(row)
# split per dataset pair for readability
for k, ds in enumerate(DATASETS):
    h(f'Standard metrics: {ds}')
    table([[r[0], r[1 + 2 * k], r[2 + 2 * k]] for r in rows], ['Metric', 'A_baseline', 'B_sma200_sizing'])

# ---------- 4. matched control ----------
h('Matched-exposure control (B vs a full baseline run at fixed size X with equal dollar-days)')
rows = []
for ds in DATASETS:
    mc = recs[(B, ds)]['matched_control']
    rows.append([ds, f"{mc['exposure_vs_baseline']:.3f}", f0(mc['control_fixed_size']), f0(mc['experiment_profit']), f0(mc['control_profit']),
                 f0(mc['profit_difference']), f0(mc['experiment_max_drawdown']), f0(mc['control_max_drawdown']), f0(mc['drawdown_difference']),
                 f2(mc['experiment_profit_to_drawdown']), f2(mc['control_profit_to_drawdown']), f2(mc['profit_to_drawdown_difference'])])
table(rows, ['Dataset', 'Exposure vs base', 'Control size X', 'B net', 'Control net', 'B - control', 'B max DD', 'Control max DD',
             'B - control DD', 'B P/DD', 'Control P/DD', 'Diff'])

# ---------- 5. bear windows ----------
h('Bear windows: A vs B')
rows = []
for ds in DATASETS:
    for w in recs[(A, ds)]['metrics']['bear_windows']:
        for c in (A, B):
            s = recs[(c, ds)]['metrics']['bear_windows'][w]
            rows.append([ds, w, c[0], f0(s['pnl']), f0(s['max_drawdown']), f0(s['interest']), s['trades_closed'], s['losing_trades'],
                         f0(s['largest_loss']), f0(s['avg_borrowed']), f"{f0(s['pnl_of_trades_entered'])} ({s['trades_entered']})"])
table(rows, ['Dataset', 'Window', 'Cfg', 'Period P&L', 'Max DD in window', 'Interest', 'Trades closed', 'Losing', 'Largest loss',
             'Avg borrowed', 'P&L of trades entered (n)'])

# ---------- 6. recovery windows ----------
h('Recovery windows: absolute and relative to baseline')
rows = []
for ds in DATASETS:
    for w in recs[(A, ds)]['metrics']['recovery_windows']:
        a = recs[(A, ds)]['metrics']['recovery_windows'][w]
        b = recs[(B, ds)]['metrics']['recovery_windows'][w]
        rows.append([ds, w, f0(a['pnl']), f0(b['pnl']), f0(b['pnl'] - a['pnl']), pct(b['pnl'] / a['pnl']) if a['pnl'] else '',
                     f0(a['pnl_of_trades_entered']), f0(b['pnl_of_trades_entered']), f0(b['pnl_of_trades_entered'] - a['pnl_of_trades_entered']),
                     a['trades_entered'], f0(a['avg_borrowed']), f0(b['avg_borrowed'])])
table(rows, ['Dataset', 'Window', 'A period P&L', 'B period P&L', 'B - A', 'B / A', 'A P&L entered', 'B P&L entered', 'B - A (entered)',
             'n entered', 'A avg borrowed', 'B avg borrowed'])

# ---------- per-trade decomposition ----------
decomp = {}
for ds in DATASETS:
    df = load(ds)
    c, t = df['close'].to_numpy(float), df['time'].to_numpy(float)
    n = len(df)
    ta = pd.read_csv(RES / 'trades' / f'{ds}__{A}.csv')
    ent = pd.read_csv(RES / 'entries' / f'{ds}__{B}.csv')
    assert (ent['entry_i'].to_numpy() == ta['entry_i'].to_numpy()).all()
    C = np.zeros((len(ta), n))
    for k, r in ta.iterrows():
        e = int(r['entry_i'])
        x = n if pd.isna(r['exit_i']) else int(r['exit_i'])
        sh = r['investment'] / r['entry_price']
        seg = slice(e, x)
        C[k, seg] = sh * c[seg] - r['investment'] - r['investment'] * RATE * (t[seg] - t[e]) / YEAR_SECONDS
        if x < n:
            C[k, x:] = r['profit']
    da = pd.read_csv(RES / 'daily' / f'{ds}__{A}.csv')
    db = pd.read_csv(RES / 'daily' / f'{ds}__{B}.csv')
    s = (ent['size'] / 100000.0).to_numpy()
    err_a = float(np.abs(C.sum(0) - da['mtm_pnl'].to_numpy()).max())
    err_b = float(np.abs(s @ C - db['mtm_pnl'].to_numpy()).max())
    assert err_a < 1e-6 and err_b < 1e-6, (ds, err_a, err_b)
    ddays = (ta['interest'] * 365 / RATE).to_numpy()  # per-trade margin dollar-days at $100k
    assert abs(ddays.sum() - recs[(A, ds)]['metrics']['margin_dollar_days']) < 1e-3
    decomp[ds] = dict(C=C, s=s, ta=ta, ent=ent, ddays=ddays, dates=df['date'].dt.date.astype(str).to_numpy())
out['decomposition_max_abs_error'] = 'checked < 1e-6 for A and B on every dataset'


def path_stats(C, s):
    m = s @ C
    peak = np.maximum.accumulate(np.r_[0.0, m[1:]])
    dd = peak - m
    return m[-1], dd.max(), int(np.argmax(dd))


# ---------- 7. experiment questions ----------
h('Regime of entries, fallback count')
rows = []
for ds in DATASETS:
    x = recs[(B, ds)]['extra']
    rows.append([ds, x['first_session_with_full_rule'], x['entries'], x['fallback_count'], ', '.join(x['fallback_entry_dates']) or '-',
                 x['bearish_entries'], x['normal_entries'], pct(x['bearish_share_of_all_entries']), pct(x['bearish_share_of_rule_entries']),
                 x['close_below_sma_but_sma_rising'], x['sma_falling_but_close_above']])
table(rows, ['Dataset', 'Rule first available', 'Entries', 'Fallback', 'Fallback dates', 'Bearish ($50k)', 'Normal ($100k)',
             'Bearish % all', 'Bearish % rule-eligible', 'Close<SMA but SMA rising', 'SMA falling but close>=SMA'])

h('Baseline ($100k) trade P&L by regime at entry')
rows, regime_stats = [], {}
for ds in DATASETS:
    d = decomp[ds]
    for reg in ('bearish', 'normal', 'fallback'):
        msk = (d['ent']['regime'] == reg).to_numpy()
        if not msk.any():
            continue
        p = d['ta']['profit'].to_numpy()[msk]
        dd_ = d['ddays'][msk]
        st = dict(n=int(msk.sum()), total=float(p.sum()), mean=float(p.mean()), median=float(np.median(p)),
                  win_rate=float((p > 0).mean()), per_1m_dollar_days=float(p.sum() / (dd_.sum() / 1e6)), dollar_days_share=float(dd_.sum() / d['ddays'].sum()))
        regime_stats[f'{ds}:{reg}'] = st
        rows.append([ds, reg, st['n'], f0(st['total']), f0(st['mean']), f0(st['median']), pct(st['win_rate']), f0(st['per_1m_dollar_days']),
                     pct(st['dollar_days_share'])])
    tot = d['ta']['profit'].sum()
    rows.append([ds, 'all', len(d['ta']), f0(tot), f0(tot / len(d['ta'])), '', '', f0(tot / (d['ddays'].sum() / 1e6)), '100%'])
table(rows, ['Dataset', 'Regime', 'n', 'Total P&L @ $100k', 'Mean', 'Median', 'Win rate', 'P&L per $1M dollar-days', 'Share of dollar-days'])
out['regime_stats'] = regime_stats

h('Bear windows: entries by regime (baseline P&L at $100k of trades entered in the window)')
rows = []
for ds in DATASETS:
    d = decomp[ds]
    ed = pd.to_datetime(d['ent']['date'])
    for w, (a_, b_) in {'2000-2002': ('2000-01-01', '2002-12-31'), '2007-2009': ('2007-01-01', '2009-12-31'), '2022': ('2022-01-01', '2022-12-31')}.items():
        if w not in recs[(A, ds)]['metrics']['bear_windows']:
            continue
        inw = ((ed >= a_) & (ed <= b_)).to_numpy()
        for reg in ('normal', 'bearish', 'fallback'):
            msk = inw & (d['ent']['regime'] == reg).to_numpy()
            if msk.any():
                p = d['ta']['profit'].to_numpy()[msk]
                rows.append([ds, w, reg, int(msk.sum()), f0(p.sum()), int((p < 0).sum()), f0(p.min()), f0((d['s'][msk] * p).sum()),
                             str(d['ent']['date'][msk].iloc[0]), str(d['ent']['date'][msk].iloc[-1])])
table(rows, ['Dataset', 'Window', 'Regime', 'Entries', 'A P&L', 'A losers', 'A worst', 'B P&L', 'First entry', 'Last entry'])

h('Largest baseline winners: size and P&L under B')
rows = []
for ds in DATASETS:
    d = decomp[ds]
    ta, ent = d['ta'], d['ent']
    closed = ta[ta['reason'] != 'open']
    for k in closed.sort_values('profit', ascending=False).head(5).index:
        rows.append([ds, ent.loc[k, 'date'], ta.loc[k, 'exit_date'], ent.loc[k, 'regime'], f0(ent.loc[k, 'size']), f0(ta.loc[k, 'profit']),
                     f0(ent.loc[k, 'profit']), f0(ent.loc[k, 'profit'] - ta.loc[k, 'profit'])])
table(rows, ['Dataset', 'Entry', 'Exit', 'Regime', 'B size', 'A P&L', 'B P&L', 'B - A'])

h('Recovery-window entries: regime and size')
rows = []
from metrics import RECOVERY_WINDOWS  # noqa: E402
for ds in DATASETS:
    d = decomp[ds]
    ed = pd.to_datetime(d['ent']['date'])
    for w in recs[(A, ds)]['metrics']['recovery_windows']:
        a_, b_ = RECOVERY_WINDOWS[w]
        for k in np.flatnonzero(((ed >= a_) & (ed <= b_)).to_numpy()):
            rows.append([ds, w, d['ent'].loc[k, 'date'], d['ta'].loc[k, 'exit_date'] if pd.notna(d['ta'].loc[k, 'exit_date']) else 'open',
                         d['ent'].loc[k, 'regime'], f"{d['ent'].loc[k, 'close']:.2f}", f"{d['ent'].loc[k, 'sma200']:.2f}",
                         f"{d['ent'].loc[k, 'sma200_lag20']:.2f}", f0(d['ent'].loc[k, 'size']), f0(d['ta'].loc[k, 'profit']), f0(d['ent'].loc[k, 'profit'])])
table(rows, ['Dataset', 'Window', 'Entry', 'Exit', 'Regime', 'Close', 'SMA200', 'SMA200[i-20]', 'B size', 'A P&L', 'B P&L'])

# ---------- 8. dependence on few trades ----------
h('Attribution of B - A net profit (each halved trade contributes -0.5 x its baseline P&L)')
rows, dep = [], {}
for ds in DATASETS:
    d = decomp[ds]
    p = d['ta']['profit'].to_numpy()
    delta = (d['s'] - 1) * p
    tot = delta.sum()
    order = np.argsort(-np.abs(delta))
    gains, losses = delta[delta > 0].sum(), delta[delta < 0].sum()
    top_pos = np.argsort(-delta)[:3]
    top_neg = np.argsort(delta)[:3]
    dep[ds] = dict(total=float(tot), from_halved_losers=float(gains), from_halved_winners=float(losses),
                   top_positive=[(d['ent'].loc[k, 'date'], float(delta[k])) for k in top_pos if delta[k] > 0],
                   top_negative=[(d['ent'].loc[k, 'date'], float(delta[k])) for k in top_neg if delta[k] < 0],
                   total_without_largest_positive=float(tot - delta[top_pos[0]]) if delta[top_pos[0]] > 0 else float(tot),
                   total_without_largest_negative=float(tot - delta[top_neg[0]]) if delta[top_neg[0]] < 0 else float(tot))
    rows.append([ds, f0(tot), f0(gains), f0(losses),
                 '; '.join(f"{dt} {v:+,.0f}" for dt, v in dep[ds]['top_positive']),
                 '; '.join(f"{dt} {v:+,.0f}" for dt, v in dep[ds]['top_negative']),
                 f0(dep[ds]['total_without_largest_positive']), f0(dep[ds]['total_without_largest_negative'])])
table(rows, ['Dataset', 'B - A net', 'From halved losers', 'From halved winners', 'Top 3 positive (entry date, delta)',
             'Top 3 negative', 'B - A without largest +', 'B - A without largest -'])
out['net_attribution'] = dep

h('Attribution of B - control net (trade k contributes (s_k - r) x baseline P&L, r = control size / $100k)')
rows = []
for ds in DATASETS:
    d = decomp[ds]
    r = recs[(B, ds)]['matched_control']['control_fixed_size'] / 100000.0
    p = d['ta']['profit'].to_numpy()
    delta = (d['s'] - r) * p
    reg = d['ent']['regime'].to_numpy()
    top = np.argsort(-np.abs(delta))[:5]
    rows.append([ds, f'{r:.3f}', f0(delta.sum()), f0(delta[reg == 'bearish'].sum()), f0(delta[reg != 'bearish'].sum()),
                 '; '.join(f"{d['ent'].loc[k, 'date']} {reg[k][:4]} {delta[k]:+,.0f}" for k in top)])
table(rows, ['Dataset', 'r', 'B - control', 'from bearish trades', 'from $100k trades', 'Top 5 |contribution|'])

h('Drawdown attribution: B max-DD episode, and B max DD if one halved trade were restored to $100k')
rows, dd_dep = [], {}
for ds in DATASETS:
    d = decomp[ds]
    C, s = d['C'], d['s']
    net_b, mdd_b, tr_b = path_stats(C, s)
    m_b = s @ C
    pk_b = int(np.argmax(m_b[:tr_b + 1] >= np.maximum.accumulate(np.r_[0.0, m_b[1:]])[tr_b] - 1e-9))
    contrib_b = s * (C[:, tr_b] - C[:, pk_b])
    contrib_a = C[:, tr_b] - C[:, pk_b]
    worst = np.argsort(contrib_b)[:4]
    restored = []
    for k in np.flatnonzero(s < 1):
        s2 = s.copy()
        s2[k] = 1.0
        restored.append((k, path_stats(C, s2)[1] - mdd_b))
    restored.sort(key=lambda x: -x[1])
    best_down = min(restored, key=lambda x: x[1])
    dd_dep[ds] = dict(b_peak=d['dates'][pk_b], b_trough=d['dates'][tr_b], b_mdd=float(mdd_b),
                      a_change_over_b_episode=float(contrib_a.sum()),
                      worst_trades_in_b_episode=[(d['ent'].loc[k, 'date'], d['ent'].loc[k, 'regime'], float(contrib_b[k])) for k in worst],
                      restore_one_trade_dd_increase=[(d['ent'].loc[k, 'date'], float(v)) for k, v in restored[:3]],
                      restore_one_trade_largest_dd_decrease=(d['ent'].loc[best_down[0], 'date'], float(best_down[1])))
    rows.append([ds, f"{d['dates'][pk_b]} -> {d['dates'][tr_b]}", f0(mdd_b), f0(-contrib_a.sum()),
                 '; '.join(f"{d['ent'].loc[k, 'date']} {d['ent'].loc[k, 'regime'][:4]} {contrib_b[k]:+,.0f}" for k in worst),
                 '; '.join(f"{d['ent'].loc[k, 'date']} +{v:,.0f}" for k, v in restored[:3]),
                 f"{d['ent'].loc[best_down[0], 'date']} {best_down[1]:+,.0f}" if best_down[1] < 0 else 'none'])
table(rows, ['Dataset', 'B peak -> trough', 'B max DD', 'A loss over same dates', 'Largest B contributors (entry, regime, $)',
             'Restore one halved trade to $100k: DD increase (top 3)', 'Restore one: largest DD decrease'])

h('Classification margin of large trades (|baseline P&L| >= $10k): SMA200 20-session slope and close vs SMA200')
rows, marg = [], []
for ds in DATASETS:
    d = decomp[ds]
    ent, p = d['ent'], d['ta']['profit'].to_numpy()
    for k in np.flatnonzero(np.abs(p) >= 10000):
        if ent.loc[k, 'regime'] == 'fallback':
            continue
        slope = ent.loc[k, 'sma200'] / ent.loc[k, 'sma200_lag20'] - 1
        gap = ent.loc[k, 'close'] / ent.loc[k, 'sma200'] - 1
        marg.append(dict(dataset=ds, entry=ent.loc[k, 'date'], regime=ent.loc[k, 'regime'], slope=float(slope), close_vs_sma=float(gap), baseline_profit=float(p[k])))
        rows.append([ds, ent.loc[k, 'date'], ent.loc[k, 'regime'], f'{100 * slope:+.2f}%', f'{100 * gap:+.1f}%', f0(p[k])])
table(rows, ['Dataset', 'Entry', 'Regime', 'SMA200 / SMA200[i-20] - 1', 'Close / SMA200 - 1', 'A P&L'])
out['large_trade_margins'] = marg

h('Share of sessions in the bearish regime (sessions with the rule available) vs share of entries')
rows = []
for ds in DATASETS:
    c = load(ds)['close']
    sma = c.rolling(200).mean()
    lag = sma.shift(20)
    ok = lag.notna()
    bear = (c < sma) & (sma < lag)
    x = recs[(B, ds)]['extra']
    rows.append([ds, int(ok.sum()), int(bear[ok].sum()), pct(bear[ok].mean()), pct(x['bearish_share_of_rule_entries'])])
    out.setdefault('bearish_session_share', {})[ds] = float(bear[ok].mean())
table(rows, ['Dataset', 'Sessions with rule', 'Bearish sessions', 'Bearish % of sessions', 'Bearish % of rule-eligible entries'])
out['drawdown_attribution'] = dd_dep

# ---------- chance check ----------
h('Chance check: is the set of trades B halves special? (same number of halved trades, rule-eligible trades only)')
rng = np.random.default_rng(20261011)
rows, chance = [], {}
for ds in DATASETS:
    d = decomp[ds]
    C, s, ddays, p = d['C'], d['s'], d['ddays'], d['ta']['profit'].to_numpy()
    base_net, base_mdd = p.sum(), path_stats(C, np.ones(len(p)))[1]
    elig = np.flatnonzero((d['ent']['regime'] != 'fallback').to_numpy())
    lab = (s[elig] < 1)

    def score(sv):
        net, mdd, _ = path_stats(C, sv)
        r = (sv * ddays).sum() / ddays.sum()
        return net - r * base_net, mdd / (r * base_mdd)  # profit vs own matched control; DD as a ratio of own control DD

    actual = score(s)

    def null(labels_iter):
        res = []
        for L in labels_iter:
            sv = np.ones(len(p))
            sv[elig[L]] = 0.5
            res.append(score(sv))
        return np.array(res)

    shifts = null(np.roll(lab, k) for k in range(1, len(lab)))
    rand = null(rng.permutation(lab) for _ in range(2000))
    chance[ds] = dict(actual_profit_vs_control=float(actual[0]), actual_dd_ratio_vs_control=float(actual[1]),
                      shift_share_profit_ge=float((shifts[:, 0] >= actual[0]).mean()), shift_share_dd_le=float((shifts[:, 1] <= actual[1]).mean()),
                      random_share_profit_ge=float((rand[:, 0] >= actual[0]).mean()), random_share_dd_le=float((rand[:, 1] <= actual[1]).mean()),
                      n_shifts=len(shifts), n_random=len(rand), halved=int(lab.sum()), eligible=int(len(lab)))
    c_ = chance[ds]
    rows.append([ds, f"{c_['halved']}/{c_['eligible']}", f0(actual[0]), f'{actual[1]:.3f}',
                 f"{100 * c_['shift_share_profit_ge']:.0f}%", f"{100 * c_['shift_share_dd_le']:.0f}%",
                 f"{100 * c_['random_share_profit_ge']:.0f}%", f"{100 * c_['random_share_dd_le']:.0f}%"])
table(rows, ['Dataset', 'Halved / eligible', 'B net - control net', 'B DD / control DD',
             'Circular shifts with >= profit gain', 'Circular shifts with <= DD ratio', 'Random sets with >= profit gain', 'Random sets with <= DD ratio'])
out['chance_check'] = chance

TMP.mkdir(exist_ok=True)
(TMP / 'tables.md').write_text('\n'.join(md))
json.dump(out, open(RES / 'analysis.json', 'w'), indent=1, default=str)
print('\n'.join(md))
