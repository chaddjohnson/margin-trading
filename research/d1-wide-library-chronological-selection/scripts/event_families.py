#!/usr/bin/env python3
"""By-event-family export (read-only over sealed records; reporting only; descriptive).

For every window with event attribution (A, B, S18, S19, S20, S22, T1-later; S21 and T2-later have none, see
DIP_EVENT_CAPTURE_AND_TAIL_RISK.md) and every eligible catalog family of each ETF, writes one row per primary
nominee (A0/A0r and the K = 16 arms of nominees.csv, A4(16) in T1-later; A1n is not exported) with what that nominee did in the family: entries, dip entries,
decline-phase entries, whether it was dip-captured and the attributed net at 5 bps. The catalogs and captures are the
sealed evaluations' (`results/evaluation/<phase>/EVALUATION.json` catalogs, `engine.jsonl.gz` captures); the nominees
are `results/tables/nominees.csv`. Stdlib only; run from the repository root:

    python3 -I research/d1-wide-library-chronological-selection/scripts/event_families.py

Writes results/tables/event-families.csv and prints, per window, pool and arm, the dip-captured families shared with
the pool's baseline nominee and those captured by only one of them (summed over ETFs; correlated ETFs share episodes).
"""

import collections
import csv
import gzip
import json
import os

STUDY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TABLES = os.path.join(STUDY, 'results', 'tables')
# cell -> (evaluation phase, window start); mirrors src/d1-wide-library-selection/analysis.ts `cells` for the cells
# whose phase capture window starts at the cell's window start
CELLS = {
    'A': ('A', '2020-06-30'),
    'B': ('B', '2021-12-31'),
    'S18': ('S18', '2018-12-31'),
    'S19': ('S19', '2019-12-31'),
    'S20': ('S20', '2020-12-31'),
    'S22': ('S22', '2022-12-30'),
    'T1-later': ('T1-later', '2021-12-31'),
}
PRIMARY_K = '16'


def load(phase):
    evaluation = json.load(open(os.path.join(STUDY, 'results', 'evaluation', phase, 'EVALUATION.json')))
    rows = {}
    with gzip.open(os.path.join(STUDY, 'results', 'evaluation', phase, 'engine.jsonl.gz'), 'rt') as handle:
        for line in handle:
            if line.strip():
                row = json.loads(line)
                rows[(row['symbol'], row['key'])] = row
    return evaluation, rows


def main():
    slots = collections.defaultdict(list)
    with open(os.path.join(TABLES, 'nominees.csv'), newline='') as handle:
        for row in csv.DictReader(handle):
            if row['cell'] in CELLS and row['grid'] and row['K'] in ('-', PRIMARY_K):
                slots[(row['cell'], row['symbol'])].append((row['pool'], row['arm'], row['grid']))

    out = []
    captured = collections.defaultdict(set)  # (cell, pool, arm) -> {(symbol, family)}
    for cell, (phase, start) in CELLS.items():
        evaluation, engine = load(phase)
        assert evaluation['captureStart'] == start, (cell, evaluation['captureStart'])
        for symbol, catalog in sorted(evaluation['catalogs'][start].items()):
            for family in catalog['families']:
                if not family['eligible']:
                    continue
                for pool, arm, grid in sorted(slots.get((cell, symbol), [])):
                    captures = [c for c in engine[(symbol, grid)]['capture']['captures'] if c['family'] == family['id']]
                    dip = any(c['dipCaptured'] for c in captures)
                    if dip:
                        captured[(cell, pool, arm)].add((symbol, family['id']))
                    out.append([
                        cell, symbol, family['id'], int(family['major']), round(family['depth'], 4),
                        family['firstPeakDate'], family['lastEndDate'], pool, arm, grid,
                        sum(c['entries'] for c in captures), sum(c['dipEntries'] for c in captures),
                        sum(c['declineEntries'] for c in captures), int(dip),
                        round(sum(c['net'] for c in captures), 2),
                    ])

    with open(os.path.join(TABLES, 'event-families.csv'), 'w', newline='') as handle:
        writer = csv.writer(handle, lineterminator='\n')
        writer.writerow(['cell', 'symbol', 'family', 'major', 'depth', 'firstPeak', 'lastEnd', 'pool', 'arm', 'grid',
                         'entries', 'dipEntries', 'declineEntries', 'dipCaptured', 'net5'])
        writer.writerows(out)

    print('cell', 'pool', 'arm', 'captured', 'both', 'arm only', 'baseline only', sep='\t')
    for (cell, pool, arm), families in sorted(captured.items()):
        base = captured.get((cell, pool, 'A0' if pool == 'ARCH' else 'A0r'), set())
        print(cell, pool, arm, len(families), len(families & base), len(families - base), len(base - families),
              sep='\t')
    print('rows', len(out), sep='\t')


if __name__ == '__main__':
    main()
