#!/usr/bin/env python3
"""Read-only arithmetic behind AUDIT_REPORT.md §5 / §10 and STAGED_STOP_DESIGN_OPTIONS.md §1.9 and §3.

It reads only committed research tables. It runs no engine, opens no market data and evaluates no strategy.

Run from the repository root:
    python3 -I research/vg-l0-trailing-stop-audit/analysis/giveback_tables.py
"""
import csv
import json
import statistics as st
import sys
from collections import defaultdict

TRADES = 'research/vg-l0-risk-metrics/results/tables/trades.csv'
GAPS = 'research/vg-l0-risk-metrics/results/tables/gaps-through-stop.csv'
LEDGERS = 'research/vg-l0-full-joint/results/diagnostics/ledgers.json'

# Trailing distances of both comparators (FROZEN_SELECTION.json: D1 tenths 61 / 73; Growth 5.7 %).
TAU = {'D1:GDX': 0.061, 'D1:VGT': 0.073, 'G:VGT': 0.057}
C, N, RATE = 0.0005, 100_000.0, 0.11  # 5 bps per side, $100,000, 11 % simple interest


def f(x):
    return float(x)


def activation_gain(tau, days):
    """H/e − 1 at which q·H(1 − τ) − N − I > 0 starts to hold (ExitManager 'net' rule)."""
    return (1 + C) * (1 + RATE * days / 365) / (1 - tau) - 1


def main():
    rows = list(csv.DictReader(open(TRADES)))
    gaps = list(csv.DictReader(open(GAPS)))

    print('## Implied activation gain of the net-profit stop (percent of the raw fill)')
    for b, t in TAU.items():
        print(b, {d: round(100 * activation_gain(t, d), 4) for d in (0, 1, 30, 120, 300)})

    for subj in ('New L0', 'N/original'):
        R = [r for r in rows if r['subject'] == subj]
        print(f'\n## {subj}: {len(R)} lots, net {sum(f(r["net"]) for r in R):,.2f}')
        by = defaultdict(list)
        for r in R:
            by[r['book']].append(r)
        tot_gb = tot_struct = 0.0
        for b in sorted(by):
            L = by[b]
            win = [r for r in L if f(r['net']) > 0 and r['open'] != 'true']
            gb = sum(f(r['givebackToExit']) for r in win)
            struct = sum(TAU[b] * (N + f(r['peakProfit'])) for r in win)
            ratio = st.median(f(r['givebackToExit']) / (N + f(r['peakProfit'])) for r in win)
            reasons = defaultdict(int)
            for r in L:
                reasons[r['reason']] += 1
            armed_losers = [
                r for r in L if (f(r['net']) <= 0 or r['open'] == 'true') and f(r['peakProfit']) >= activation_gain(TAU[b], 0) * N
            ]
            tot_gb += gb
            tot_struct += struct
            print(
                f'{b}: lots {len(L)}, winners {sum(f(r["net"]) > 0 for r in L)}, losers {sum(f(r["net"]) <= 0 and r["open"] != "true" for r in L)}, '
                f'open {sum(r["open"] == "true" for r in L)}, net {sum(f(r["net"]) for r in L):,.2f}, '
                f'peak sum {sum(f(r["peakProfit"]) for r in L):,.2f}, giveback-to-exit (closed winners) {gb:,.2f}, '
                f'tau*(N+peak) {struct:,.0f}, median ratio {ratio:.4f} (tau {TAU[b]}), reasons {dict(reasons)}, '
                f'losing/open lots with peak above the day-0 activation: {len(armed_losers)}'
            )
        print(f'total giveback-to-exit {tot_gb:,.2f}; total tau*(N+peak) {tot_struct:,.0f}')
        W = [r for r in R if f(r['net']) > 0 and r['open'] != 'true']
        interim = [r['id'] for r in W if f(r['maxGivebackAboveBreakeven']) > f(r['givebackToExit']) + 1]
        print(f'winners {len(W)}; with an interim decline larger than the final giveback: {len(interim)} -> lots {interim}')
        print(f'winners with peak >= $30k: {sum(f(r["peakProfit"]) >= 30000 for r in W)}; >= $40k: {sum(f(r["peakProfit"]) >= 40000 for r in W)}')
        seen, beyond = set(), 0.0
        for g in gaps:
            if g['subject'] == subj and g['lot'] not in seen:
                seen.add(g['lot'])
                beyond += f(g['beyondLevelDollars'])
        dup = sum(g['subject'] == subj for g in gaps) - len(seen)
        print(f'gap / open-through beyond-level cost: ${beyond:,.2f} over {len(seen)} lots (duplicate rows ignored: {dup})')

    print('\n## New L0 FULL ledger: implied post-entry high of stop-level exits (exit raw / (1 - tau))')
    led = json.load(open(LEDGERS))['subjects']['control: New L0']
    gap_lots = {g['lot'] for g in gaps if g['subject'] == 'New L0'}
    for lot in led['lots']:
        ex = lot['exits'][-1] if lot['exits'] else None
        if ex and ex['reason'] == 'trailing stop' and str(lot['lot']) not in gap_lots:
            H = ex['raw'] / (1 - TAU[lot['book']])
            print(
                f"#{lot['lot']} {lot['book']} {lot['entry']}->{ex['date']} fill {lot['entryRaw']} exit {ex['raw']:.6g} "
                f"H {H:.4f} (+{100 * (H / lot['entryRaw'] - 1):.2f}%) exit gain {100 * (ex['raw'] / lot['entryRaw'] - 1):.2f}% net {lot['net']}"
            )

    print('\n## Design examples (hypothetical prices, e = 100)')
    e = 100.0

    def net(level, days):
        return N / (e * (1 + C)) * level * (1 - C) - N - N * RATE * days / 365

    print('E1 tiny gain: H 102 -> L1', round(102 * (1 - 0.073), 3))
    print('E2 large winner, 120 d: L1 148.32 net', round(net(160 * 0.927, 120), 2), '| L2 153.60 net', round(net(160 * 0.96, 120), 2))
    print('E3 interim exit 124.80 at day 60: net', round(net(130 * 0.96, 60), 2), 'difference vs E2 stage 1', round(net(130 * 0.96, 60) - net(160 * 0.927, 120), 2))
    print('E4 placement: H 121 -> L2', round(121 * 0.96, 2))
    print('E5 lapse, 300 d: interest', round(N * RATE * 300 / 365, 2), 'L2', round(110.5 * 0.97, 3), 'net at L2', round(net(110.5 * 0.97, 300), 2))
    print('lot #11 check: 340.74 * 0.927 =', round(340.74 * 0.927, 3), '; 4% stage-2 level', round(340.74 * 0.96, 3))
    print('\n## S3 retained-profit floor: distance below H (percent) and the gain ceiling where it binds (tau 7.3 %)')
    for rho in (0.5, 0.7, 0.8):
        d = {g: round(100 * (1 - rho) * g / (1 + g), 2) for g in (0.02, 0.05, 0.10, 0.20, 0.40, 0.60)}
        print('rho', rho, d, 'binds for g <', round(100 * 0.073 / ((1 - rho) - 0.073), 1), '%')
    return 0


if __name__ == '__main__':
    sys.exit(main())
