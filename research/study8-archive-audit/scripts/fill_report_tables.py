"""Fills the {{PLACEHOLDER}} tables of the audit's report files from the generated outputs (no hand-copied numbers).

Run after run_all.py, from the repository root:  python3 -B research/study8-archive-audit/scripts/fill_report_tables.py
Each placeholder is replaced once; re-running on a filled report is a no-op. Reads only outputs/ and writes only the
report .md files of research/study8-archive-audit/.
"""

import csv
import os
import re

import common as c


def section(md, start, stop=None):
    text = open(os.path.join(c.OUT, md)).read()
    i = text.index(start)
    j = text.index(stop, i + len(start)) if stop else len(text)
    return text[i:j].strip()


def table_after(md, heading):
    """The first markdown table after a heading line."""
    text = open(os.path.join(c.OUT, md)).read()
    i = text.index(heading)
    lines = text[i:].splitlines()
    out, started = [], False
    for line in lines[1:]:
        if line.startswith('|'):
            out.append(line)
            started = True
        elif started:
            break
    return '\n'.join(out)


def frontier_tables():
    rows = list(csv.DictReader(open(os.path.join(c.OUT, 'f24-frontier.csv'))))
    parts = []
    for track in c.TRACKS:
        tab = []
        for r in rows:
            if r['track'] != track:
                continue
            tab.append([r['band'], f"`{r['id']}`", f"{r['category']}: {r['label']}", r['n'],
                        f"{float(r['share']):.1%} [{float(r['wilsonLower']):.1%}]",
                        f"{c.money(float(r['p90Dd']))} [{c.money(float(r['worstDd'])) if r['worstDd'] else 'n/a'}]",
                        c.money(float(r['robustPerYear'])), c.money(float(r['centrePerYear'])),
                        c.money(float(r['centreDd'])), f"{r['lots']}/{r['episodes']}",
                        f"{float(r['top1Share']):.0%}" if r['top1Share'] else 'n/a',
                        f"{float(r['bestYearShare']):.0%}" if r['bestYearShare'] else 'n/a',
                        c.money(float(r['perCapitalYear'])) if r['perCapitalYear'] else 'n/a',
                        f"{float(r['occupancy']):.0%}" if r['occupancy'] else 'n/a', r['refused']])
        parts.append(f'### {track}\n\n' + (c.md_table(
            ['band', 'id', 'category', 'n', 'share [Wilson LB]', 'p90 DD [worst]', 'robust/yr', 'centre/yr',
             'centre DD', 'lots/episodes', 'top lot', 'best year', 'net/capital-yr', 'occupancy', 'refused'], tab)
            if tab else 'No risk-feasible ≥ 64-point record.'))
    return '\n\n'.join(parts)


def funnel_table():
    rows = list(csv.DictReader(open(os.path.join(c.OUT, 'f24-funnel.csv'))))
    stages = []
    for r in rows:
        if r['stage'] not in stages:
            stages.append(r['stage'])
    out = []
    for stage in stages:
        cells = [stage]
        for track in c.TRACKS:
            r = next(x for x in rows if x['track'] == track and x['stage'] == stage)
            best = c.money(float(r['bestRobustPerYear'])) if r['bestRobustPerYear'] else '—'
            cells.append(f"{int(r['count']):,} · {best}")
        out.append(cells)
    return c.md_table(['stage (count · best robust/yr at that fidelity)'] + c.TRACKS, out)


FILLS = {
    'PROFIT_ROBUSTNESS_FRONTIER.md': {
        'CALIBRATION': lambda: table_after('saturation.md', '## Fidelity calibration') + '\n\n' +
        table_after('saturation.md', '## Share calibration'),
        'REFERENCES': lambda: table_after('f24-overlooked.md', '## Reference holders'),
        'COUNTS': lambda: table_after('f24-overlooked.md', '## Counts by fidelity'),
        'FRONTIER': frontier_tables,
        'THRESHOLD': lambda: table_after('f24-share-threshold.md', '# F24 training-only share-threshold'),
    },
    'VALIDATION_PERSISTENCE_AUDIT.md': {
        'F24BANDS': lambda: table_after('persistence.md', '### F24 (test'),
        'POOL2324': lambda: table_after('persistence.md', '### F23 + F24'),
        'POOL1921': lambda: table_after('persistence.md', '### F19–F21'),
        'CORR': lambda: table_after('persistence.md', '## Rank correlations'),
        'F24THR': lambda: table_after('persistence.md', '## F24 report-only threshold view'),
    },
    'OPTIMIZER_SELECTION_AUDIT.md': {
        'FUNNEL': funnel_table,
        'CAPCOST': lambda: '**Opportunity cost of the shortlist step** (rung 3, 128 points, same seed family):\n\n' +
        table_after('f24-funnel.md', '## Opportunity cost of the shortlist step'),
        'R1DECOMP': lambda: table_after('f24-funnel.md', '## Rung-1 constraint decomposition'),
        'GATES': lambda: table_after('f24-funnel.md', '## Shortlist members: qualification gates'),
        'JOBS': lambda: table_after('saturation.md', '## Per job'),
        'DIM': lambda: '**Dimensionality (F24):**\n\n' + table_after('saturation.md', '## Dimensionality (F24)'),
        'FOLDVAR': lambda: ("**Fold variability:** L∞ distance of each fold's profit holder from the F24 profit holder, "
                            'and the best rung-3-feasible robust profit/yr per fold (each on its own training window):'
                            '\n\n' + table_after('saturation.md', '## Fold variability')),
    },
}


def check():
    """Every embedded table must equal what the current outputs would produce (exit 1 otherwise)."""
    stale = []
    for name, fills in FILLS.items():
        text = open(os.path.join(c.AUDIT, name)).read()
        for key, make in fills.items():
            if '{{' + key + '}}' in text or make() not in text:
                stale.append(f'{name} {key}')
    if stale:
        print('STALE or unfilled tables: ' + ', '.join(stale))
        raise SystemExit(1)
    print(f'check: all {sum(len(f) for f in FILLS.values())} embedded tables equal the current outputs')


def main():
    if '--check' in __import__('sys').argv:
        return check()
    for name, fills in FILLS.items():
        path = os.path.join(c.AUDIT, name)
        text = open(path).read()
        for key, make in fills.items():
            token = '{{' + key + '}}'
            if token in text:
                text = text.replace(token, make())
        left = re.findall(r'\{\{[A-Z_]+\}\}', text)
        with open(path, 'w', newline='\n') as f:
            f.write(text)
        print(f'{name}: filled; placeholders left: {left or "none"}')


if __name__ == '__main__':
    main()
