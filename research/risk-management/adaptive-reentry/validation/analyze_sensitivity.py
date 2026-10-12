"""Task 2 analysis — sensitivity tables from results/summary.json.

Produces results/sensitivity_tables.md with, per grid: net and max DD per dataset per grid point,
the delta vs the candidate's frozen (center) point, and the per-point Σnet across datasets. Also
cross-checks that every CENTER grid point reproduces the family's result trade for trade (the
validation re-implementation equals the family code), and reports every point where a conclusion
flips (sign of the vs-REF_lower3 net delta changes on any dataset).

No optimum is selected here; the tables measure stability only.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
AR = HERE.parent
sys.path.insert(0, str(HERE.parent / 'common'))

from strategies import grid_configs  # noqa: E402

DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
DSS = {'VGT_2005_2015': 'VGT05', 'QQQ_1999_2015': 'QQQ99', 'VGT_2016_2026': 'VGT16', 'QQQ_2016_2026': 'QQQ16'}

CENTER_FAMILY_RESULTS = {  # center validation config -> (family dir, family config)
    'V_A2_cut_050': ('loss-classification', 'A2_material_05'),
    'V_A2_cut_100': ('loss-classification', 'A2_material_1'),
    'V_D7_tiny_2000': ('recovery-opportunities', 'D7_tiny_loss_exit_anchor'),
    'V_B7_stall_a20_d60': ('adaptive-discounts', 'B7_stall'),
    'V_B2_inv_f050_s50': ('adaptive-discounts', 'B2_inverse'),
    'V_C6_retr_38': ('recovery-resets', 'C6_retrace_38'),
    'V_C11_r108_d150': ('recovery-resets', 'C11_graduated'),
}

GRID_CANDIDATE = {'A2_cutoff': ('A2_material_05 / A2_material_1', ['V_A2_cut_050', 'V_A2_cut_100']),
                  'D7_bound': ('D7_tiny_loss_exit_anchor', ['V_D7_tiny_2000']),
                  'B7_age_decay': ('B7_stall', ['V_B7_stall_a20_d60']),
                  'B2_floor_slope': ('B2_inverse', ['V_B2_inv_f050_s50']),
                  'C6_retrace': ('C6_retrace_38', ['V_C6_retr_38']),
                  'C11_rebound_discount': ('C11_graduated', ['V_C11_r108_d150'])}

lines = []


def say(s=''):
    print(s)
    lines.append(s)


def main():
    recs = json.load(open(HERE / 'results' / 'summary.json'))
    recs = [r for r in recs if r['experiment'] == 'validation_sensitivity']
    by = {(r['config'], r['dataset']): r for r in recs}

    # ---- center-point identity cross-check (validation re-implementation == family code) ----
    say('## Center-point cross-check (validation re-implementation vs family results)\n')
    for vcfg, (fam, fcfg) in CENTER_FAMILY_RESULTS.items():
        ok = True
        for ds in DS:
            mine = pd.read_csv(HERE / 'results' / 'trades' / f'{ds}__{vcfg}.csv')
            ref = pd.read_csv(AR / fam / 'results' / 'trades' / f'{ds}__{fcfg}.csv')
            same = len(mine) == len(ref) and \
                (mine['entry_date'].astype(str) == ref['entry_date'].astype(str)).all() and \
                np.allclose(mine['profit'], ref['profit'], atol=1e-6)
            ok &= bool(same)
        say(f'- {vcfg} == {fam}/{fcfg}: {"IDENTICAL on all 4 datasets" if ok else "MISMATCH"}')

    gc = grid_configs()
    info = pd.DataFrame([dict(config=k, grid=g, **p) for k, (_f, g, p) in gc.items()])

    # reference nets (REF_lower3 from the same validation run, for flip detection)
    ref_net = {ds: by[('REF_lower3', ds)]['metrics']['net_profit'] for ds in DS}
    ref_mdd = {ds: by[('REF_lower3', ds)]['metrics']['max_drawdown'] for ds in DS}
    say(f'\nREF_lower3 (anchor) net: ' + '  '.join(f'{DSS[d]} {ref_net[d]:,.0f}/{ref_mdd[d]:,.0f}' for d in DS))

    for grid, gi in info.groupby('grid', sort=False):
        cand, centers = GRID_CANDIDATE[grid]
        say(f'\n## Grid {grid} (candidate: {cand})\n')
        hdr = '| config | params | ' + ' | '.join(f'{DSS[d]} net/DD' for d in DS) + ' | Σnet | Σnet−ΣnetREF |'
        say(hdr)
        say('|' + '---|' * (len(DS) + 4))
        for _, row in gi.iterrows():
            cfg = row['config']
            cells, tot = [], 0.0
            for ds in DS:
                m = by[(cfg, ds)]['metrics']
                cells.append(f"{m['net_profit']:,.0f}/{m['max_drawdown']:,.0f}")
                tot += m['net_profit']
            pr = {k: row[k] for k in gi.columns if k not in ('config', 'grid', 'center') and pd.notna(row[k])}
            mark = ' **(frozen)**' if row['center'] else ''
            say(f'| {cfg}{mark} | {pr} | ' + ' | '.join(cells) +
                f' | {tot:,.0f} | {tot - sum(ref_net.values()):+,.0f} |')
        # flip detection: sign of net-vs-REF per dataset across the grid
        say('')
        for ds in DS:
            signs = {}
            for _, row in gi.iterrows():
                d = by[(row['config'], ds)]['metrics']['net_profit'] - ref_net[ds]
                signs[row['config']] = ('+' if d > 500 else ('-' if d < -500 else '0'))
            uniq = set(signs.values())
            if len(uniq - {'0'}) > 1:
                say(f'- FLIP on {DSS[ds]}: vs-REF sign varies across the grid: '
                    + ', '.join(f'{k.split("V_")[1]}:{v}' for k, v in signs.items()))
    (HERE / 'results' / 'sensitivity_tables.md').write_text('\n'.join(lines) + '\n')
    print(f"\nwrote {HERE / 'results' / 'sensitivity_tables.md'}")


if __name__ == '__main__':
    main()
