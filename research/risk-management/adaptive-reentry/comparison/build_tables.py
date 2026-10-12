"""Coordinator aggregation: consolidate every family's results/summary.json into one long CSV and the
mechanical parts of the final rankings (brief section 16). Judgment sections are written by hand in
COMPARISON.md; this script only assembles numbers.

Writes: comparison/all_records.csv (one row per experiment x config x dataset) and
comparison/rankings_raw.md (mechanical rankings 1-7 over aggregated per-config rows, diagnostics
excluded from "best" lists but kept in the CSV).
"""
import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FAMILY_DIRS = ['loss-classification', 'adaptive-discounts', 'recovery-resets', 'recovery-opportunities',
               'state-memory', 'execution-feasibility', 'combinations', 'validation']
DATASETS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
# Pure diagnostics / anchors / known-failure probes: kept in the CSV, excluded from "best" rankings.
DIAGNOSTIC = {'C0_none', 'C2_exit_price', 'C3_entry_price', 'E2_entry_only', 'E3_entry_count',
              'B3_entry_anchor_3', 'B3_entry_anchor_5', 'B8_min_entry', 'B10_ref_high_12', 'B10_ref_high_15',
              'B10_deeper_signal', 'G9b_exitreset_guard', 'D1_reset_only_rebound12'}
ANCHORS = {'A_baseline', 'REF_lower3', 'A0_net_loss', 'E1_exit_only', 'C1_frozen95', 'F_lower3', 'lower5', 'lower8'}


def rows():
    for fam in FAMILY_DIRS:
        p = ROOT / fam / 'results' / 'summary.json'
        if not p.exists():
            continue
        for r in json.load(open(p)):
            m, mc = r['metrics'], r.get('matched_control') or {}
            mc3 = r.get('matched_lower3_control') or {}
            x = r.get('extra') or {}
            vs = x.get('vs_reference') or {}
            bears = m.get('bear_windows') or {}
            recs = (x.get('recovery_windows_ext') or m.get('recovery_windows')) or {}
            sm = x.get('state_machine') or {}
            yield dict(
                family=fam, experiment=r['experiment'], config=r['config'], dataset=r['dataset'],
                net=m['net_profit'], mdd=m['max_drawdown'], pdd=m['profit_to_drawdown'],
                closed=m['closed_trades'], wins=m['winning_trades'], losses=m['losing_trades'],
                sum_losing=(m['avg_losing_trade'] or 0) * m['losing_trades'],
                largest_loss=m['largest_losing_trade'], consec=m['max_consecutive_losses'],
                interest=m['margin_interest'], dollar_days=m['margin_dollar_days'],
                pct_exposed=m['pct_sessions_exposed'], underwater=m['longest_underwater_days'],
                avg_borrowed=m['avg_borrowed_all_sessions'], max_borrowed=m['max_borrowed'],
                min_cum_pnl=m['min_cumulative_pnl'], below_100k=m['fell_below_minus_100k'],
                ctrl_dnet=mc.get('profit_difference'), ctrl_ddd=mc.get('drawdown_difference'),
                ctrl3_dnet=mc3.get('profit_difference'), ctrl3_ddd=mc3.get('drawdown_difference'),
                net_vs_baseline=vs.get('net_vs_baseline'), net_vs_lower3=vs.get('net_vs_lower3'),
                mdd_vs_baseline=vs.get('mdd_vs_baseline'), mdd_vs_lower3=vs.get('mdd_vs_lower3'),
                bear_pnl=sum(b['pnl'] for b in bears.values()) if bears else None,
                bear_dd_max=max((b['max_drawdown'] for b in bears.values()), default=None) if bears else None,
                recovery_pnl=sum(w['pnl'] for w in recs.values()) if recs else None,
                blocked=sm.get('blocked_sessions'), reentries=sm.get('lower_price_reentries'),
                alts=sm.get('alt_entries'), resets=sm.get('recovery_resets'), false_resets=sm.get('false_resets'),
                restricted_max=sm.get('sessions_restricted_max'))


def main():
    df = pd.DataFrame(rows())
    df.to_csv(HERE / 'all_records.csv', index=False)
    full = df[df['dataset'].isin(DATASETS)]
    # aggregate per (family, config) over the four frozen datasets; require all four present
    counts = full.groupby(['family', 'config'])['dataset'].nunique()
    ok = counts[counts == 4].index
    agg = (full.set_index(['family', 'config']).loc[ok].reset_index()
           .groupby(['family', 'config'])
           .agg(net_sum=('net', 'sum'), mdd_max=('mdd', 'max'), mdd_sum=('mdd', 'sum'),
                pdd_min=('pdd', 'min'),
                ctrl_dnet_sum=('ctrl_dnet', 'sum'), ctrl_ddd_sum=('ctrl_ddd', 'sum'),
                ctrl3_dnet_sum=('ctrl3_dnet', 'sum'), ctrl3_ddd_sum=('ctrl3_ddd', 'sum'),
                beats_l3_net=('net_vs_lower3', lambda s: int((s > 0).sum())),
                beats_l3_dd=('mdd_vs_lower3', lambda s: int((s < 0).sum())),
                bear_pnl_sum=('bear_pnl', 'sum'), recovery_pnl_sum=('recovery_pnl', 'sum'),
                false_resets_sum=('false_resets', 'sum'))
           .reset_index())
    agg['diagnostic'] = agg['config'].isin(DIAGNOSTIC)
    agg['anchor'] = agg['config'].isin(ANCHORS)
    agg.to_csv(HERE / 'aggregated.csv', index=False)
    live = agg[~agg['diagnostic']]
    L = ['# Mechanical ranking inputs (generated by build_tables.py — judgment and caveats live in COMPARISON.md)', '']

    def sec(title, frame, cols, n=12):
        L.append(f'## {title}')
        L.append('')
        L.append(frame.head(n)[['family', 'config'] + cols].to_markdown(index=False, floatfmt=',.0f'))
        L.append('')
    sec('1. Best absolute net profit (sum over the 4 frozen datasets)',
        live.sort_values('net_sum', ascending=False), ['net_sum', 'mdd_max', 'bear_pnl_sum'])
    sec('2. Lowest worst-dataset max drawdown', live.sort_values('mdd_max'), ['mdd_max', 'net_sum'])
    sec('3. Best worst-dataset profit/drawdown', live.sort_values('pdd_min', ascending=False), ['pdd_min', 'net_sum', 'mdd_max'])
    sec('4a. Best vs matched BASELINE control (sum of profit differences)',
        live.sort_values('ctrl_dnet_sum', ascending=False), ['ctrl_dnet_sum', 'ctrl_ddd_sum'])
    sec('4b. Best vs matched EXISTING-3% control (sum of profit differences)',
        live.sort_values('ctrl3_dnet_sum', ascending=False), ['ctrl3_dnet_sum', 'ctrl3_ddd_sum'])
    sec('5. Best bear-market protection (sum of bear-window P&L)',
        live.sort_values('bear_pnl_sum', ascending=False), ['bear_pnl_sum', 'net_sum', 'false_resets_sum'])
    sec('6. Best recovery participation (sum of recovery-window P&L)',
        live.sort_values('recovery_pnl_sum', ascending=False), ['recovery_pnl_sum', 'net_sum'])
    sec('7. Consistency: datasets beating the existing 3% on net / on drawdown',
        live.sort_values(['beats_l3_net', 'beats_l3_dd', 'net_sum'], ascending=False),
        ['beats_l3_net', 'beats_l3_dd', 'net_sum', 'mdd_max'])
    (HERE / 'rankings_raw.md').write_text('\n'.join(L) + '\n')
    print(f'{len(df)} records, {len(agg)} aggregated configs -> all_records.csv, aggregated.csv, rankings_raw.md')


if __name__ == '__main__':
    main()
