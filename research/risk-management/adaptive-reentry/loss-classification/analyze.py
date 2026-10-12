"""Family A post-run analysis. Reads results/ written by run.py; writes tables to tmp/analysis.txt.
No metric re-implementation: summary.json / events / matching CSVs are the source of truth."""
import json
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
RES = HERE / 'results'
DATASETS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CONFIGS = ['A0_net_loss', 'A1_price_loss_only', 'A2_material_05', 'A2_material_1', 'A2_material_2',
           'A2_material_3', 'A3_bands_a', 'A3_bands_b', 'A4_proportional_05', 'A4_proportional_10']

records = json.load(open(RES / 'summary.json'))
rec = {(r['dataset'], r['config']): r for r in records}
out = []


def p(*a):
    s = ' '.join(str(x) for x in a)
    out.append(s)
    print(s)


def ev(ds, cfg):
    return pd.read_csv(RES / 'events' / f'{ds}__{cfg}.csv')


def mt(ds, cfg):
    return pd.read_csv(RES / 'matching' / f'{ds}__{cfg}.csv')


# ---- 1. financing-only losses under A0, per dataset, and the majors they blocked ----
p('=' * 100)
p('1. FINANCING-ONLY LOSSES (net loss, exit_price >= entry_price) UNDER A0')
p('=' * 100)
for ds in DATASETS:
    e = ev(ds, 'A0_net_loss')
    fo = e[e['loss_exit_price'] >= e['losing_entry_price']]
    p(f'\n{ds}: {len(fo)} financing-only restriction(s) of {len(e)} episodes')
    if len(fo):
        p(fo[['exit_date', 'exit_reason', 'loss', 'losing_entry_price', 'loss_exit_price',
              'price_return', 'resolution', 'resolution_date', 'sessions_restricted',
              'blocked_sessions', 'min_gap_to_required']].to_string(index=False))
        # baseline trades blocked during each financing-only episode
        m = mt(ds, 'A0_net_loss')
        for _, r in fo.iterrows():
            end = r['resolution_date'] if isinstance(r['resolution_date'], str) and r['resolution_date'] else '9999'
            blk = m[(m['b_entry_date'] >= r['exit_date']) & (m['b_entry_date'] <= end)
                    & (m['classification'] != 'identical')]
            for _, b in blk.iterrows():
                p(f"   blocked/delayed baseline trade: entry {b['b_entry_date']} exit {b['b_exit_date']} "
                  f"P&L {b['b_profit']:+,.0f}  class={b['classification']} reason={b['reason_at_entry']} "
                  f"window_diff={b['window_diff']:+,.0f}")

# ---- 2. the VGT 2023-01 episode across configs ----
p('\n' + '=' * 100)
p('2. VGT 2023-01 EPISODE (the -$143 loss) ACROSS CONFIGS')
p('=' * 100)
tr0 = pd.read_csv(RES / 'trades' / 'VGT_2016_2026__A0_net_loss.csv')
t143 = tr0[(tr0['exit_date'] == '2023-01-03')]
p('\nA0 trade exiting 2023-01-03:')
p(t143[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'reason', 'interest', 'profit']].to_string(index=False))
for cfg in CONFIGS:
    e = ev('VGT_2016_2026', cfg)
    epi = e[(e['exit_date'] >= '2022-10-01') & (e['exit_date'] <= '2023-01-31')]
    p(f'\n{cfg}: episodes arming 2022-10-01..2023-01-31:')
    p(epi[['exit_date', 'loss', 'price_return', 'resolution', 'resolution_date', 'blocked_sessions',
           'min_gap_to_required']].to_string(index=False) if len(epi) else '   (none)')
    m = mt('VGT_2016_2026', cfg)
    jan = m[(m['b_entry_date'] >= '2023-01-01') & (m['b_entry_date'] <= '2023-02-28')]
    if len(jan):
        p('   baseline Jan-Feb 2023 trades: ' + '; '.join(
            f"{r['b_entry_date']} {r['b_profit']:+,.0f} -> {r['classification']} ({r['reason_at_entry']}), wdiff {r['window_diff']:+,.0f}"
            for _, r in jan.iterrows()))

# ---- 3. summary table ----
p('\n' + '=' * 100)
p('3. STANDARD METRICS PER CONFIG/DATASET')
p('=' * 100)
for ds in DATASETS:
    p(f'\n{ds}  (baseline net/mdd: '
      f"{rec[(ds, 'A0_net_loss')]['extra']['vs_reference']['baseline_net']:,.0f}/"
      f"{rec[(ds, 'A0_net_loss')]['extra']['vs_reference']['baseline_mdd']:,.0f})")
    hdr = f"{'config':22s} {'net':>9s} {'mdd':>8s} {'p/dd':>6s} {'tr':>3s} {'W-L':>7s} {'blk':>4s} {'reent':>5s} {'rst':>3s} {'fRst':>4s} {'vsBase':>8s} {'vsL3':>8s} {'mCtlP':>8s} {'mCtlDD':>8s} {'mL3P':>8s} {'mL3DD':>8s}"
    p(hdr)
    for cfg in CONFIGS:
        r = rec[(ds, cfg)]
        m, x = r['metrics'], r['extra']
        sm = x['state_machine']
        mc, ml = r['matched_control'], r['matched_lower3_control']
        p(f"{cfg:22s} {m['net_profit']:>9,.0f} {m['max_drawdown']:>8,.0f} "
          f"{(m['profit_to_drawdown'] or float('nan')):>6.2f} {m['closed_trades']:>3d} "
          f"{m['winning_trades']:>3d}-{m['losing_trades']:<3d} {sm['blocked_sessions']:>4d} "
          f"{sm['lower_price_reentries']:>5d} {sm['recovery_resets']:>3d} {sm['false_resets']:>4d} "
          f"{x['vs_reference']['net_vs_baseline']:>+8,.0f} {x['vs_reference']['net_vs_lower3']:>+8,.0f} "
          f"{mc['profit_difference']:>+8,.0f} {mc['drawdown_difference']:>+8,.0f} "
          f"{ml['profit_difference']:>+8,.0f} {ml['drawdown_difference']:>+8,.0f}")

# ---- 4. bear windows ----
p('\n' + '=' * 100)
p('4. BEAR WINDOWS (pnl / in-window max DD / closed trades (losing) / largest loss)')
p('=' * 100)
for ds in DATASETS:
    bws = rec[(ds, 'A0_net_loss')]['metrics']['bear_windows'].keys()
    for bw in bws:
        p(f'\n{ds} {bw}:')
        for cfg in CONFIGS:
            b = rec[(ds, cfg)]['metrics']['bear_windows'][bw]
            p(f"   {cfg:22s} pnl {b['pnl']:>+9,.0f}  dd {b['max_drawdown']:>8,.0f}  "
              f"tr {b['trades_closed']:>2d} ({b['losing_trades']:>2d})  worst {b['largest_loss']:>+8,.0f}")

# ---- 5. recovery windows (ext incl 2026) ----
p('\n' + '=' * 100)
p('5. RECOVERY WINDOWS pnl (ext. incl 2026)')
p('=' * 100)
for ds in DATASETS:
    keys = list(rec[(ds, 'A0_net_loss')]['extra']['recovery_windows_ext'].keys())
    p(f"\n{ds}: {'config':22s} " + ' '.join(f'{k:>9s}' for k in keys))
    for cfg in CONFIGS:
        rw = rec[(ds, cfg)]['extra']['recovery_windows_ext']
        p(f"{'':16s}{cfg:22s} " + ' '.join(f"{rw[k]['pnl']:>+9,.0f}" for k in keys))

# ---- 6. repeated losers / rebound winners / major winners from matching ----
p('\n' + '=' * 100)
p('6. MATCHING AGGREGATES (repeated losers; rebound winners; major winners >= $10k)')
p('=' * 100)
for ds in DATASETS:
    p(f'\n{ds}:')
    for cfg in CONFIGS:
        mm = rec[(ds, cfg)]['extra']['matching']
        rl, rw, mj = mm['repeated_losers'], mm['rebound_winners'], mm['major_winners_10k']
        p(f"   {cfg:22s} repLosers n={rl['n']:>2d} bP&L {rl['baseline_pnl']:>+9,.0f} vWin {rl['variant_window_pnl']:>+9,.0f} elim {rl['eliminated']:>2d} | "
          f"rebWin n={rw['n']:>2d} bP&L {rw['baseline_pnl']:>+9,.0f} vWin {rw['variant_window_pnl']:>+9,.0f} elim {rw['eliminated']:>2d} | "
          f"maj n={mj['n']:>2d} elim {mj['eliminated']:>2d} later {mj['later']:>2d}")

# ---- 7. triggers declined per config ----
p('\n' + '=' * 100)
p('7. TRIGGERS DECLINED (losses that did NOT arm) AND EPISODE COUNTS')
p('=' * 100)
for ds in DATASETS:
    p(f'\n{ds}:')
    for cfg in CONFIGS:
        sm = rec[(ds, cfg)]['extra']['state_machine']
        p(f"   {cfg:22s} armed {sm['losing_exits_restricted']:>3d}  declined {sm['triggers_declined']:>3d}  "
          f"byRes {sm['episodes_by_resolution']}  near-miss majors: {rec[(ds, cfg)]['extra']['near_miss_blocked_winners']}")

(HERE / 'tmp').mkdir(exist_ok=True)
(HERE / 'tmp' / 'analysis.txt').write_text('\n'.join(out) + '\n')
print('\nwritten tmp/analysis.txt')
