#!/usr/bin/env python3
"""Reconcile the trade ledgers with window V (read-only over sealed records; reporting only).

`results/tables/ledgers.csv` lists the lots *entered* inside each primary cell's window (K = 16, A0, A0r, A4(16)).
Window V is the liquidation-equivalent mark at the window end minus the same at its start, so it also contains the
in-window share of a lot that was already open at the window start (carried in). This script writes, for every
primary nominee-window that has a full-engine row, V at 5 bps, the summed net of the ledgered lots and the residual,
and checks that the residual is non-zero exactly when a lot was carried in. Stdlib only; run from the repository root:

    python3 -I research/d1-wide-library-chronological-selection/scripts/reconcile_ledgers.py

Writes results/tables/ledger-reconciliation.csv and prints a summary. S21 (phase B-sel) has no engine rows by design.
"""

import collections
import csv
import gzip
import json
import os
import sys

STUDY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TABLES = os.path.join(STUDY, 'results', 'tables')
# cell -> (evaluation phase, window index); mirrors src/d1-wide-library-selection/analysis.ts `cells`
CELLS = {
    'A': ('A', 0),
    'B': ('B', 0),
    'S18': ('S18', 0),
    'S19': ('S19', 0),
    'S20': ('S20', 0),
    'S21': ('B-sel', 0),
    'S22': ('S22', 0),
    'T1-later': ('T1-later', 1),
    'T2-later': ('B', 1),
}
PRIMARY_K = '16'


def engine_rows(phase):
    path = os.path.join(STUDY, 'results', 'evaluation', phase, 'engine.jsonl.gz')
    rows = {}
    if not os.path.exists(path):
        return rows
    with gzip.open(path, 'rt') as handle:
        for line in handle:
            if line.strip():
                row = json.loads(line)
                rows[(row['symbol'], row['key'])] = row
    return rows


def main():
    ledger = collections.defaultdict(lambda: [0.0, 0])
    with open(os.path.join(TABLES, 'ledgers.csv'), newline='') as handle:
        for row in csv.DictReader(handle):
            entry = ledger[(row['cell'], row['symbol'], row['grid'])]
            entry[0] += float(row['net'])
            entry[1] += 1

    primary = set()
    with open(os.path.join(TABLES, 'nominees.csv'), newline='') as handle:
        for row in csv.DictReader(handle):
            if row['grid'] and row['K'] in ('-', PRIMARY_K):
                primary.add((row['cell'], row['symbol'], row['grid']))

    engines = {phase: engine_rows(phase) for phase in {phase for phase, _ in CELLS.values()}}
    out = []
    counts = collections.Counter()
    failures = 0
    for cell, symbol, grid in sorted(primary):
        phase, index = CELLS[cell]
        row = engines[phase].get((symbol, grid))
        if row is None:
            counts[('no engine row', cell)] += 1
            continue
        window = row['costs']['5']['windows'][index]
        net, lots = ledger.get((cell, symbol, grid), [0.0, 0])
        residual = window['v'] - net
        carried = bool(window['openAtStart'])
        # the identity: the residual is the carried-in lot's window share, so it is ~0 whenever nothing was carried in
        if not carried and abs(residual) > 1:
            failures += 1
        if lots != window['lotsEntered']:
            failures += 1
        counts[(cell, 'carried-in lot' if carried else 'no carried-in lot')] += 1
        out.append([cell, symbol, grid, round(window['v'], 2), round(net, 2), round(residual, 2),
                    window['openAtStart'], window['lotsEntered']])

    with open(os.path.join(TABLES, 'ledger-reconciliation.csv'), 'w', newline='') as handle:
        writer = csv.writer(handle, lineterminator='\n')
        writer.writerow(['cell', 'symbol', 'grid', 'V5', 'ledgerNet', 'carriedInShare', 'openAtStart', 'lotsEntered'])
        writer.writerows(out)

    for key, value in sorted(counts.items(), key=str):
        print(*key, value, sep='\t')
    print('nominee-windows reconciled', len(out), 'identity failures', failures, sep='\t')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
