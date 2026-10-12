"""Family C post-run analysis: builds the report tables from results/ into tmp/analysis.txt.

Covers: per-dataset standard tables (incl. matched controls), bear/recovery windows, false resets
inside 2000-02 per mechanism, V-bottom rescue detail (VGT 2020/2023/2025/2026, QQQ 2003),
C0 opportunity cost, C2/C12_half_repair permissiveness vs baseline, C7 decay-earned reset share,
obsolescence (longest episodes), and dependence-on-few-trades inputs. Read-only over results/.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import load  # noqa: E402

RES = HERE / 'results'
OUT = HERE / 'tmp' / 'analysis.txt'
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
ORDER = ['C0_none', 'C1_frozen95', 'C2_exit_price', 'C3_entry_price', 'C4_rebound_10',
         'C4_rebound_15', 'C4_rebound_20', 'C5_atr_rebound_3', 'C5_atr_rebound_5', 'C6_retrace_38',
         'C6_retrace_50', 'C7_rolling95', 'C8_breakout20', 'C9_base40', 'C10_time_price',
         'C11_graduated', 'C12_sma100', 'C12_signal_gone15', 'C12_vol_crush', 'C12_timeout120',
         'C12_half_repair', 'C12_held_above']

recs = json.load(open(RES / 'summary.json'))
R = {(r['dataset'], r['config']): r for r in recs}
lines = []


def p(s=''):
    lines.append(s)


def f0(x):
    return f'{x:,.0f}' if x is not None and not (isinstance(x, float) and np.isnan(x)) else 'n/a'


# ---------- 1. standard per-dataset tables ----------
for ds in DS:
    p(f'==== {ds} ====')
    p(f"{'config':<20s} {'net':>9s} {'mdd':>8s} {'p/dd':>6s} {'tr':>4s} {'W-L':>7s} {'blk':>5s} "
      f"{'reent':>5s} {'rst':>4s} {'fRst':>4s} {'vsBase':>9s} {'vsL3':>9s} {'mCtlNet':>9s} {'mCtlDD':>8s} "
      f"{'mL3Net':>9s} {'mL3DD':>8s} {'unres':>5s} {'maxEp':>5s} {'fbk':>4s}")
    for cfg in ORDER:
        r = R[(ds, cfg)]
        m, sm = r['metrics'], r['extra']['state_machine']
        vr = r['extra']['vs_reference']
        mc, ml = r['matched_control'], r['matched_lower3_control']
        unres = sm['episodes_by_resolution'].get('unresolved_at_end', 0)
        p(f"{cfg:<20s} {m['net_profit']:>9,.0f} {m['max_drawdown']:>8,.0f} "
          f"{(m['profit_to_drawdown'] if m['profit_to_drawdown'] is not None else float('nan')):>6.2f} "
          f"{m['closed_trades']:>4d} {m['winning_trades']:>3d}-{m['losing_trades']:<3d} "
          f"{sm['blocked_sessions']:>5d} {sm['lower_price_reentries']:>5d} {sm['recovery_resets']:>4d} "
          f"{sm['false_resets']:>4d} {vr['net_vs_baseline']:>9,.0f} {vr['net_vs_lower3']:>9,.0f} "
          f"{mc['profit_difference']:>9,.0f} {mc['drawdown_difference']:>8,.0f} "
          f"{ml['profit_difference']:>9,.0f} {ml['drawdown_difference']:>8,.0f} "
          f"{unres:>5d} {f0(sm['sessions_restricted_max']):>5s} {sm['indicator_fallbacks']:>4d}")
    p()

# ---------- 2. bear windows ----------
p('==== bear windows: window pnl / window maxDD / closed (losing) ====')
for ds, wins in [('QQQ_1999_2015', ['2000-2002', '2007-2009']), ('VGT_2005_2015', ['2007-2009']),
                 ('VGT_2016_2026', ['2022']), ('QQQ_2016_2026', ['2022'])]:
    for w in wins:
        p(f'-- {ds} {w} --')
        for cfg in ORDER:
            b = R[(ds, cfg)]['metrics']['bear_windows'].get(w)
            if b:
                p(f"{cfg:<20s} {b['pnl']:>9,.0f} {b['max_drawdown']:>9,.0f} {b['trades_closed']:>3d} ({b['losing_trades']})")
        p()

# ---------- 3. false resets inside 2000-02 (QQQ_1999_2015) and reset counts in-window ----------
p('==== 2000-2002 (QQQ_1999_2015): resets in window / false resets in window / all-dataset false ====')
for cfg in ORDER:
    ev = pd.read_csv(RES / 'events' / f'QQQ_1999_2015__{cfg}.csv')
    sm = R[('QQQ_1999_2015', cfg)]['extra']['state_machine']
    rs = ev[(ev['resolution'] == 'recovery_reset') & (ev['resolution_date'] >= '2000-01-01')
            & (ev['resolution_date'] <= '2002-12-31')]
    fdates = [d for d in sm['false_reset_dates'] if '2000-01-01' <= d <= '2002-12-31']
    p(f"{cfg:<20s} resets_in_win {len(rs):>3d}  false_in_win {len(fdates):>3d}  "
      f"all_resets {sm['recovery_resets']:>3d}  all_false {sm['false_resets']:>3d}  "
      f"false_in_win_dates {','.join(fdates)}")
p()

# ---------- 4. recovery windows ----------
p('==== recovery windows pnl (extra.recovery_windows_ext) ====')
hdr_done = {}
for ds in DS:
    keys = sorted(R[(ds, 'C1_frozen95')]['extra']['recovery_windows_ext'].keys())
    p(f'-- {ds} --   windows: {keys}')
    for cfg in ORDER:
        rw = R[(ds, cfg)]['extra']['recovery_windows_ext']
        p(f"{cfg:<20s} " + ' '.join(f"{rw[k]['pnl']:>9,.0f}" for k in keys))
    p()

# ---------- 5. C0 opportunity cost ----------
p('==== C0_none diagnostic ====')
for ds in DS:
    r = R[(ds, 'C0_none')]
    sm = r['extra']['state_machine']
    mt = r['extra']['matching']
    ev = pd.read_csv(RES / 'events' / f'{ds}__C0_none.csv')
    un = ev[ev['resolution'] == 'unresolved_at_end']
    mw = mt['major_winners_10k']
    p(f"{ds}: net {r['metrics']['net_profit']:,.0f} vs baseline {r['extra']['vs_reference']['baseline_net']:,.0f} "
      f"(diff {r['extra']['vs_reference']['net_vs_baseline']:,.0f}); episodes {sm['losing_exits_restricted']}, "
      f"unresolved {len(un)}, max episode {f0(sm['sessions_restricted_max'])} sessions, "
      f"restricted total {f0(sm['sessions_restricted_total'])}; baseline entries missed {mt['baseline_entries_missed']}; "
      f"major winners: n {mw['n']}, base pnl {mw['baseline_pnl']:,.0f}, variant window pnl {mw['variant_window_pnl']:,.0f}, "
      f"eliminated {mw['eliminated']}")
    for _, u in un.iterrows():
        p(f"   unresolved: exit {u['exit_date']} loss {u['loss']:,.0f} exit_price {u['loss_exit_price']:.4f} "
          f"blocked {u['blocked_sessions']} min_close {u['min_close_in_episode']:.4f} max_close {u['max_close_in_episode']:.4f} "
          f"min_gap {u['min_gap_to_required']:.4f}")
p()

# ---------- 6. permissiveness: identical-to-baseline share ----------
p('==== permissiveness vs baseline (matching classification counts) ====')
for ds in DS:
    p(f'-- {ds} --')
    for cfg in ORDER:
        mt = R[(ds, cfg)]['extra']['matching']
        match = pd.read_csv(RES / 'matching' / f'{ds}__{cfg}.csv')
        ident = int((match['classification'] == 'identical').sum())
        p(f"{cfg:<20s} baseline_trades {mt['baseline_trades']:>3d} variant {mt['variant_trades']:>3d} "
          f"identical {ident:>3d} missed {mt['baseline_entries_missed']:>3d} delayed {mt['baseline_entries_delayed']:>3d} "
          f"repeated_losers_elim {mt['repeated_losers']['eliminated']:>2d}/{mt['repeated_losers']['n']}")
    p()

# ---------- 7. C7 decay-earned resets ----------
p('==== C7_rolling95: resets earned by rolling-high decay (rolling90 prev high < frozen ref high) ====')
for ds in DS:
    ev = pd.read_csv(RES / 'events' / f'{ds}__C7_rolling95.csv')
    daily = pd.read_csv(RES / 'daily' / f'{ds}__C7_rolling95.csv')
    df = load(ds)
    h = df['high'].to_numpy()
    rh = np.full(len(h), np.nan)
    for i in range(1, len(h)):
        rh[i] = h[max(0, i - 90):i].max()
    dates = daily['date'].astype(str).to_list()
    idx = {d: i for i, d in enumerate(dates)}
    rs = ev[ev['resolution'] == 'recovery_reset']
    n_decay, rows = 0, []
    for _, r in rs.iterrows():
        i = idx[str(r['resolution_date'])]
        decayed = rh[i] < r['ref_high'] - 1e-9
        n_decay += bool(decayed)
        rows.append(f"   {r['resolution_date']}: rolling_high {rh[i]:.4f} vs frozen {r['ref_high']:.4f} "
                    f"{'DECAYED' if decayed else 'intact'} (close {daily['close'][i]:.4f})")
    p(f'{ds}: {n_decay}/{len(rs)} resets decay-earned')
    lines.extend(rows)
p()

# ---------- 8. obsolescence: longest episodes per config ----------
p('==== longest restriction episodes (sessions; resolution) ====')
for ds in DS:
    p(f'-- {ds} --')
    for cfg in ORDER:
        ev = pd.read_csv(RES / 'events' / f'{ds}__{cfg}.csv')
        if not len(ev):
            p(f'{cfg:<20s} no episodes')
            continue
        ev2 = ev.copy()
        # unresolved episodes: sessions_restricted is NaN in the table; use blocked info via max span
        longest = ev2.sort_values('sessions_restricted', ascending=False).head(2)
        parts = [f"{r['exit_date']}->{r['resolution_date']} {r['sessions_restricted']:.0f}s {r['resolution']}"
                 for _, r in longest.iterrows() if not np.isnan(r['sessions_restricted'])]
        unres = ev2[ev2['resolution'] == 'unresolved_at_end']
        for _, u in unres.iterrows():
            parts.append(f"{u['exit_date']}->END unresolved")
        p(f"{cfg:<20s} " + ' | '.join(parts[:3]))
    p()

# ---------- 9. V-bottom rescue detail ----------
p('==== V-bottom episode detail (events rows covering the known misses) ====')
CASES = [('VGT_2016_2026', '2020-02-01', '2020-07-01'), ('VGT_2016_2026', '2022-11-01', '2023-04-01'),
         ('VGT_2016_2026', '2026-01-01', '2026-06-30'), ('VGT_2016_2026', '2025-02-01', '2025-07-01'),
         ('QQQ_1999_2015', '2002-08-01', '2003-12-31')]
for ds, a, b in CASES:
    p(f'-- {ds} episodes with exit_date in [{a}, {b}] --')
    for cfg in ORDER:
        ev = pd.read_csv(RES / 'events' / f'{ds}__{cfg}.csv')
        sel = ev[(ev['exit_date'] >= a) & (ev['exit_date'] <= b)]
        for _, r in sel.iterrows():
            p(f"{cfg:<20s} exit {r['exit_date']} ({r['loss']:,.0f}) -> {r['resolution']} "
              f"{r['resolution_date']} after {r['sessions_restricted'] if not np.isnan(r['sessions_restricted']) else -1:.0f}s; "
              f"reentry {r['reentry_date']} close {r['reentry_close']:.4f} min_gap {r['min_gap_to_required']:.4f}")
    p()

OUT.write_text('\n'.join(lines))
print(f'wrote {OUT} ({len(lines)} lines)')
