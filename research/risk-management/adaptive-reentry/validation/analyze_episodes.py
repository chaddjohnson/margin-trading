"""Task 4 — episode-level consistency and multiple-testing accounting; also condenses the task-3
fresh-instrument transfer results (with the matched-exposure controls).

Episodes are MARKET events, not datasets: VGT and QQQ (and SPY/XLK/IWM/QLD/SOXX/VOOG) all lived
through the same 2008, 2020, 2022 etc., so per-episode columns across instruments are CORRELATED
replications of one observation, and the honest unit of evidence is the episode, not the
(dataset x candidate) cell. Windows are the frozen definitions (metrics.py / analysis.py):
2000-02 and 2007-09 and 2022 bear windows; 2020/2023/2025 recovery windows; 2026 extended window
(truncated at 2026-09-08 for the Stooq instruments). Classification vs REF_lower3 window P&L:
improve (> +$2k), harm (< -$2k), else neutral; a '.' column means the window is not covered.

Writes results/episode_consistency.md.
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
AR = HERE.parent

CANDS = ['A2_material_05', 'A2_material_1', 'D7_tiny_loss_exit_anchor', 'B7_stall', 'B2_inverse',
         'C6_retrace_38', 'C11_graduated']
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
FRESH = ['QLD', 'SOXX', 'VOOG', 'SPY', 'XLK', 'IWM']
EPISODES = ['2000-2002', '2007-2009', '2020', '2022', '2023', '2025', '2026']
NEUTRAL = 2000.0

lines = []


def say(s=''):
    print(s)
    lines.append(s)


def windows_of(rec):
    """{episode: window pnl} from a summary record (frozen-run or fresh-run shapes)."""
    m = rec['metrics']
    out = {}
    for k, w in m.get('bear_windows', {}).items():
        out[k] = w['pnl']
    rw = dict(m.get('recovery_windows', {}))
    rw.update(rec.get('recovery_windows_ext') or rec.get('extra', {}).get('recovery_windows_ext') or {})
    for k, w in rw.items():
        out[k.replace('_truncated', '')] = w['pnl']
    return out


def mark(delta):
    if delta is None:
        return '.'
    if delta > NEUTRAL:
        return f'+{delta / 1000:,.1f}k'
    if delta < -NEUTRAL:
        return f'{delta / 1000:,.1f}k'
    return f'~({delta / 1000:+,.1f}k)'


def cls(delta):
    if delta is None:
        return None
    return 'improve' if delta > NEUTRAL else ('harm' if delta < -NEUTRAL else 'neutral')


def main():
    val = json.load(open(HERE / 'results' / 'summary.json'))
    frozen = {(r['config'], r['dataset']): r for r in val}
    fresh = {(r['config'], r['instrument']): r for r in json.load(open(HERE / 'results' / 'fresh' / 'summary.json'))}

    ref_w = {ds: windows_of(frozen[('REF_lower3', ds)]) for ds in DS}
    ref_wf = {it: windows_of(fresh[('REF_lower3', it)]) for it in FRESH}

    say('# Episode-level consistency vs REF_lower3 (window P&L deltas)\n')
    say('Columns are instruments; each row is ONE market episode. VGT/QQQ/SPY/XLK/IWM/QLD/SOXX/VOOG '
        'columns within a row are correlated replications of the same event, not independent '
        'evidence. 2007-2009 includes the 2009 recovery; 2020/2023/2025/2026 are the frozen '
        'recovery windows; 2026 is truncated at 2026-09-08 for SPY/XLK/IWM.\n')
    verdicts = {}
    for cand in CANDS:
        say(f'\n## {cand}\n')
        cols = [('VGT05', ref_w['VGT_2005_2015'], windows_of(frozen[(cand, 'VGT_2005_2015')])),
                ('QQQ99', ref_w['QQQ_1999_2015'], windows_of(frozen[(cand, 'QQQ_1999_2015')])),
                ('VGT16', ref_w['VGT_2016_2026'], windows_of(frozen[(cand, 'VGT_2016_2026')])),
                ('QQQ16', ref_w['QQQ_2016_2026'], windows_of(frozen[(cand, 'QQQ_2016_2026')]))]
        cols += [(it, ref_wf[it], windows_of(fresh[(cand, it)])) for it in FRESH]
        say('| episode | ' + ' | '.join(c[0] for c in cols) + ' | episode verdict |')
        say('|' + '---|' * (len(cols) + 2))
        ep_verd = {}
        for ep in EPISODES:
            cells, classes = [], []
            for _name, refw, cw in cols:
                if ep in refw and ep in cw:
                    d = cw[ep] - refw[ep]
                    cells.append(mark(d))
                    classes.append(cls(d))
                else:
                    cells.append('.')
            if not classes:
                verdict = 'not covered'
            else:
                imp, harm = classes.count('improve'), classes.count('harm')
                if imp and not harm:
                    verdict = 'improve'
                elif harm and not imp:
                    verdict = 'harm'
                elif not imp and not harm:
                    verdict = 'neutral'
                else:
                    verdict = f'MIXED ({imp}+ / {harm}-)'
            ep_verd[ep] = verdict
            say(f'| {ep} | ' + ' | '.join(cells) + f' | {verdict} |')
        verdicts[cand] = ep_verd
        covered = [v for v in ep_verd.values() if v != 'not covered']
        say(f'\nIndependent episodes covered: {len(covered)}; improve: '
            f'{sum(v == "improve" for v in covered)}, harm: {sum(v == "harm" for v in covered)}, '
            f'neutral: {sum(v == "neutral" for v in covered)}, mixed: '
            f'{sum(v.startswith("MIXED") for v in covered)}')

    # ---- fresh-instrument transfer table (task 3 condensed) ----
    say('\n\n# Fresh-instrument transfer (unchanged parameters)\n')
    say('| instrument | baseline net/DD | REF_lower3 net/DD | lower3 vs matched-exposure baseline '
        '(net / DD) | best candidate vs lower3 | worst candidate vs lower3 |')
    say('|---|---|---|---|---|---|')
    for it in FRESH:
        b = fresh[('baseline', it)]['metrics']
        l3 = fresh[('REF_lower3', it)]
        mc = l3['matched_control']
        deltas = {c: fresh[(c, it)]['vs_reference']['net_vs_lower3'] for c in CANDS}
        best = max(deltas, key=deltas.get)
        worst = min(deltas, key=deltas.get)
        say(f"| {it} | {b['net_profit']:,.0f}/{b['max_drawdown']:,.0f} "
            f"| {l3['metrics']['net_profit']:,.0f}/{l3['metrics']['max_drawdown']:,.0f} "
            f"| {mc['profit_difference']:+,.0f} / {mc['drawdown_difference']:+,.0f} "
            f"| {best} {deltas[best]:+,.0f} | {worst} {deltas[worst]:+,.0f} |")

    say('\n\n## Candidate net vs REF_lower3 per fresh instrument (positive = candidate better)\n')
    say('| candidate | ' + ' | '.join(FRESH) + ' | #improve/#harm (of 6) |')
    say('|---|' + '---|' * (len(FRESH) + 1))
    for c in CANDS:
        cells, imp, harm = [], 0, 0
        for it in FRESH:
            d = fresh[(c, it)]['vs_reference']['net_vs_lower3']
            cells.append(f'{d:+,.0f}')
            imp += d > NEUTRAL
            harm += d < -NEUTRAL
        say(f'| {c} | ' + ' | '.join(cells) + f' | {imp}/{harm} |')

    say('\n\n## Candidate vs its own matched-exposure baseline control per fresh instrument '
        '(net diff / DD diff; negative DD diff = candidate has smaller drawdown)\n')
    say('| candidate | ' + ' | '.join(FRESH) + ' |')
    say('|---|' + '---|' * len(FRESH))
    for c in ['REF_lower3'] + CANDS:
        cells = []
        for it in FRESH:
            mc = fresh[(c, it)]['matched_control']
            cells.append(f"{mc['profit_difference']:+,.0f} / {mc['drawdown_difference']:+,.0f}")
        say(f'| {c} | ' + ' | '.join(cells) + ' |')

    # ---- multiple-testing tally ----
    say('\n\n# Multiple-testing accounting\n')
    total = 0
    fams = ['loss-classification', 'adaptive-discounts', 'recovery-resets', 'recovery-opportunities',
            'state-memory', 'execution-feasibility', 'validation']
    say('| registry | configurations |')
    say('|---|---|')
    for fam in fams:
        p = (AR / fam / 'registry.jsonl') if fam != 'validation' else (HERE / 'registry.jsonl')
        n = len([ln for ln in p.read_text().splitlines() if ln.strip()])
        total += n
        say(f'| {fam} | {n} |')
    say(f'| **total** | **{total}** |')
    (HERE / 'results' / 'episode_consistency.md').write_text('\n'.join(lines) + '\n')
    print(f"\nwrote {HERE / 'results' / 'episode_consistency.md'}")


if __name__ == '__main__':
    main()
