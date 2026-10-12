"""Emit the report's markdown tables from results/summary.json."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
recs = json.load(open(HERE / 'results' / 'summary.json'))
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
by = {(r['dataset'], r['config']): r for r in recs}
configs = list(dict.fromkeys(r['config'] for r in recs))


def f(x):
    return f'{x:,.0f}' if x is not None else 'n/a'


out = []
out.append('### Standard metrics per dataset\n')
out.append('Net profit / max DD / P-to-DD / closed trades (W-L) / blocked signal sessions / '
           'lower-price re-entries / resets (false) / vs baseline net / vs existing-3% net.\n')
for ds in DS:
    out.append(f'\n**{ds}**\n')
    out.append('| Config | Net | Max DD | P/DD | Trades (W/L) | Blocked | Re-entries | Resets (false) | vs base | vs 3% |')
    out.append('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
    for c in configs:
        r = by[(ds, c)]
        m, sm, v = r['metrics'], r['extra']['state_machine'], r['extra']['vs_reference']
        pdd = m['profit_to_drawdown']
        out.append(f"| {c} | {f(m['net_profit'])} | {f(m['max_drawdown'])} | "
                   f"{pdd:.2f} | {m['closed_trades']} ({m['winning_trades']}/{m['losing_trades']}) | "
                   f"{sm['blocked_sessions']} | {sm['lower_price_reentries']} | "
                   f"{sm['recovery_resets']} ({sm['false_resets']}) | {f(v['net_vs_baseline'])} | {f(v['net_vs_lower3'])} |")

out.append('\n### Matched-exposure controls (deltas: net / max DD; positive net good, negative DD good)\n')
out.append('`mBase` = baseline scaled to equal margin dollar-days; `mL3` = existing 3% strategy scaled '
           'likewise (ex-post control, not deployable).\n')
for ds in DS:
    out.append(f'\n**{ds}**\n')
    out.append('| Config | vs matched baseline | vs matched 3% |')
    out.append('|---|---:|---:|')
    for c in configs:
        r = by[(ds, c)]
        mc, ml = r['matched_control'], r['matched_lower3_control']
        out.append(f"| {c} | {f(mc['profit_difference'])} / {f(mc['drawdown_difference'])} | "
                   f"{f(ml['profit_difference'])} / {f(ml['drawdown_difference'])} |")

out.append('\n### Bear windows (P&L / in-window max DD / closed trades (losing))\n')
for ds in DS:
    r0 = by[(ds, configs[0])]
    wins = list(r0['metrics']['bear_windows'])
    out.append(f'\n**{ds}** — windows: {", ".join(wins)}\n')
    out.append('| Config | ' + ' | '.join(wins) + ' |')
    out.append('|---|' + '---:|' * len(wins))
    for c in configs:
        r = by[(ds, c)]
        cells = []
        for w in wins:
            st = r['metrics']['bear_windows'][w]
            cells.append(f"{f(st['pnl'])} / {f(st['max_drawdown'])} / {st['trades_closed']} ({st['losing_trades']})")
        out.append(f'| {c} | ' + ' | '.join(cells) + ' |')

out.append('\n### Recovery windows (P&L; extended set incl. 2026)\n')
for ds in DS:
    r0 = by[(ds, configs[0])]
    wins = list(r0['extra']['recovery_windows_ext'])
    out.append(f'\n**{ds}** — windows: {", ".join(wins)}\n')
    out.append('| Config | ' + ' | '.join(wins) + ' |')
    out.append('|---|' + '---:|' * len(wins))
    for c in configs:
        rw = by[(ds, c)]['extra']['recovery_windows_ext']
        out.append(f'| {c} | ' + ' | '.join(f(rw[w]['pnl']) for w in wins) + ' |')

(HERE / 'tmp' / 'tables.md').write_text('\n'.join(out) + '\n')
print('wrote', HERE / 'tmp' / 'tables.md', len(out), 'lines')
