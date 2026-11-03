#!/usr/bin/env python3
"""Writes EXPERIMENT_MATRIX.json (Stage 1c): every constant of PROTOCOL.md and one row per structural cell.

Run from the repository root: python3 -I research/study3-vgt-momentum-stage1c/scripts/make_matrix.py
The code (src/study3-vgt-momentum-stage1c/context.ts, catalog.ts) is tested against this file.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'EXPERIMENT_MATRIX.json')


def d(name, lo, hi, q, default):
    return {'name': name, 'lo': lo, 'hi': hi, 'q': q, 'default': default}


# Stage 1 entry families (src/study3-vgt-momentum/signals.ts), unchanged.
ENTRIES = {
    'E01': {'kind': 'level', 'role': 'peak proximity (250-session high)', 'mandatory': False,
            'dims': [d('d_in', 0, 0.08, 0.001, 0.02), d('d_gap', 0.01, 0.2, 0.001, 0.08)]},
    'E02': {'kind': 'level', 'role': 'financing-hurdle drift', 'mandatory': True,
            'dims': [d('N', 20, 250, 1, 126), d('a_in', 0, 0.6, 0.001, 0.2), d('a_gap', 0, 0.5, 0.001, 0.2)]},
    'E03': {'kind': 'level', 'role': 'directional efficiency', 'mandatory': True,
            'dims': [d('N', 10, 120, 1, 30), d('e_in', 0.05, 0.6, 0.01, 0.3), d('e_gap', 0, 0.6, 0.01, 0.3)]},
    'E04': {'kind': 'level', 'role': 'CUSUM drift', 'mandatory': True,
            'dims': [d('kappa', 0, 0.5, 0.01, 0.25), d('h_in', 1, 8, 0.1, 4), d('h_out', 1, 8, 0.1, 4)]},
    'E05': {'kind': 'event', 'role': 'rising floor', 'mandatory': True,
            'dims': [d('theta', 0.02, 0.15, 0.001, 0.05), d('b', 0, 0.03, 0.001, 0.005)]},
    'E06': {'kind': 'level', 'role': 'calm advance', 'mandatory': True,
            'dims': [d('v_in', 0.08, 0.4, 0.001, 0.2), d('v_gap', 0.02, 0.4, 0.001, 0.15), d('N', 20, 250, 1, 50)]},
    'E07': {'kind': 'event', 'role': 'breakout acceptance', 'mandatory': False,
            'dims': [d('N', 10, 250, 1, 50), d('A', 0, 10, 1, 3)]},
    'E08': {'kind': 'event', 'role': 'compression -> expansion', 'mandatory': True,
            'dims': [d('N', 10, 60, 1, 20), d('c', 0.03, 0.15, 0.001, 0.08)]},
    'E09': {'kind': 'intraday', 'role': 'upward trailing buy (lowest-low reference)', 'mandatory': False,
            'dims': [d('Y', 0.005, 0.08, 0.001, 0.03)]},
    'E10': {'kind': 'intraday', 'role': 'breakout trailing buy (highest-high reference)', 'mandatory': False,
            'dims': [d('Yb', 0, 0.03, 0.001, 0)]},
    'E11': {'kind': 'event', 'role': 'durable permission / renewable campaign', 'mandatory': True,
            'dims': [d('D', 0.05, 0.3, 0.001, 0.15), d('n', 2, 30, 1, 5)]},
    'E12': {'kind': 'event', 'role': 'shallow-pullback continuation', 'mandatory': False,
            'dims': [d('u', 0.05, 0.5, 0.001, 0.2), d('p', 0.02, 0.12, 0.001, 0.05)]},
}

# Stage 1b exit boxes (src/study3-vgt-momentum-stage1b/catalog.ts) without `own`, plus XN (new in Stage 1c).
EXITS = {
    'XF': {'source': 'Stage 1b XF (Stage 1 TPL / CX1 family)', 'contracts': ['rep', 'or'],
           'dims': [d('h', 0.02, 0.2, 0.001, 0.08), d('t', 0.03, 0.35, 0.001, 0.1), d('ref', 0, 1, 1, 0)]},
    'XF-T': {'source': 'Stage 1b XF-T (tight trail box; D1-magnitude unconditional trail)', 'contracts': ['rep', 'or'],
             'dims': [d('h', 0.02, 0.2, 0.001, 0.08), d('t', 0.03, 0.12, 0.001, 0.08), d('ref', 0, 1, 1, 0)]},
    'XV': {'source': 'Stage 1b XV (Stage 1 X2)', 'contracts': ['rep', 'or'],
           'dims': [d('k', 1, 8, 0.1, 3), d('n', 5, 60, 1, 20), d('dmin', 0.02, 0.1, 0.001, 0.04),
                    d('dgap', 0.02, 0.3, 0.001, 0.11), d('h', 0.03, 0.2, 0.001, 0.08)]},
    'XS': {'source': 'Stage 1b XS (Stage 1 X3, armed)', 'contracts': ['rep', 'or'],
           'dims': [d('theta', 0.02, 0.15, 0.001, 0.05), d('b', 0, 0.03, 0.001, 0.005), d('h', 0.03, 0.2, 0.001, 0.1)]},
    'XT': {'source': 'Stage 1b XT (Stage 1 X4 two-layer + profit ratchet)', 'contracts': ['rep', 'or'],
           'dims': [d('h', 0.05, 0.25, 0.001, 0.15), d('N', 5, 120, 1, 50), d('g', 0.03, 0.6, 0.001, 0.2),
                    d('t2', 0.03, 0.25, 0.001, 0.1), d('rat', 0, 1, 1, 1)]},
    'XRP': {'source': 'Stage 1b XRP (Stage 1 X5a staged profit retention)', 'contracts': ['rep', 'or'],
            'dims': [d('h', 0.03, 0.2, 0.001, 0.08), d('a', 0.03, 0.6, 0.001, 0.15), d('rho', 0.2, 0.9, 0.01, 0.5)]},
    'XRD': {'source': 'Stage 1b XRD (dollar giveback)', 'contracts': ['rep', 'or'],
            'dims': [d('h', 0.03, 0.2, 0.001, 0.08), d('A', 2000, 80000, 500, 20000), d('G', 5000, 60000, 500, 15000)]},
    'XD': {'source': 'Stage 1b XD (Stage 1 X8AND/X8OR; mode 0 OR, 1 AND, 2 AND above SMA200)', 'contracts': ['rep', 'or'],
           'dims': [d('p', 0.03, 0.25, 0.001, 0.1), d('N', 5, 120, 1, 20), d('mode', 0, 2, 1, 1),
                    d('cat', 0.08, 0.3, 0.001, 0.15)]},
    'XP': {'source': 'Stage 1b XP (financing-aware stall)', 'contracts': ['rep', 'or'],
           'dims': [d('T', 5, 120, 1, 20), d('m', -0.05, 0.05, 0.001, 0.01), d('d', 0, 0.1, 0.001, 0),
                    d('h', 0.03, 0.2, 0.001, 0.08)]},
    'XO': {'source': 'Stage 1b XO (Stage 1 OX: own OUT + catastrophic)', 'contracts': ['ret'],
           'dims': [d('cat', 0.08, 0.35, 0.001, 0.15), d('c', 1, 5, 1, 1)]},
    'XE': {'source': 'Stage 1b XE (invented 1: exposure-scaled trail)', 'contracts': ['rep', 'or'],
           'dims': [d('t0', 0.06, 0.35, 0.001, 0.2), d('gamma', 0, 2, 0.01, 1), d('tmin', 0.02, 0.1, 0.001, 0.05),
                    d('h', 0.03, 0.2, 0.001, 0.08)]},
    'XU': {'source': 'Stage 1b XU (invented 2: stale high)', 'contracts': ['rep', 'or'],
           'dims': [d('U', 5, 120, 1, 30), d('d', 0, 0.15, 0.001, 0.05), d('h', 0.03, 0.2, 0.001, 0.08)]},
    'XN': {'source': 'new in Stage 1c: D1 primary profit-conditional 7.3% trail from Hh (Stage 1b B-D1N) + hard stop',
           'contracts': ['rep', 'or'],
           'dims': [d('t', 0.03, 0.15, 0.001, 0.073), d('h', 0.05, 0.4, 0.001, 0.4)]},
}

RULES = {
    'A': {'name': 'maximum losing hold (calendar days, open check, next-trade fill)',
          'dims': [d('N', 3, 60, 1, 15)], 'references': [{'N': 15, 'index': 9000}, {'N': 8, 'index': 9001}]},
    'B': {'name': 'post-loss cooldown (trading sessions, discard)', 'dims': [d('C', 1, 60, 1, 10)]},
    'C': {'name': 'post-material-loss recovery level (gross raw loss >= X; decision price >= exit (1+Y))',
          'dims': [d('X', 0.005, 0.15, 0.001, 0.05), d('Y', 0, 0.2, 0.001, 0.05)]},
}

MASKS = ['000', '100', '010', '001', '110', '101', '011', '111']
EXIT_ORDER = ['XF', 'XF-T', 'XV', 'XS', 'XT', 'XRP', 'XRD', 'XD', 'XP', 'XO', 'XE', 'XU', 'XN']


def rule_dims(mask):
    out = []
    for bit, rule in zip(mask, 'ABC'):
        if bit == '1':
            out += [dict(x, name=f'{rule.lower()}.{x["name"]}') for x in RULES[rule]['dims']]
    return out


def main():
    cells = []
    index = 0
    for entry, e in ENTRIES.items():
        for exit_ in EXIT_ORDER:
            x = EXITS[exit_]
            for contract in x['contracts']:
                for mask in MASKS:
                    dims = ([dict(v, name=f'e.{v["name"]}') for v in e['dims']]
                            + [dict(v, name=f'x.{v["name"]}') for v in x['dims']] + rule_dims(mask))
                    key = f'{entry}|{exit_}|{contract}|{mask}'
                    first = 256 + 1 + (1 if mask[0] == '1' else 0) + 4 * 17
                    cells.append({
                        'index': index,
                        'key': key,
                        'entry': entry,
                        'exit': exit_,
                        'contract': contract,
                        'mask': mask,
                        'dims': [v['name'] for v in dims],
                        'dimensions': len(dims),
                        'seedLabel': f'study3c|<history>|{entry}|{exit_}|{contract}|global',
                        'firstPassPlanned': first,
                        'provenance': {'entry': 'Stage 1 signals.ts (unchanged)', 'exit': x['source'],
                                       'rules': 'Stage 1c (ENGINE_CONTRACT.md §11)' if mask != '000' else 'none'},
                        'status': 'eligible',
                    })
                    index += 1

    first_pass = sum(c['firstPassPlanned'] for c in cells)
    matrix = {
        'study': 'study3c-vgt-momentum-d1-protection-matrix-v1',
        'version': '1.1',
        'generatedBy': 'research/study3-vgt-momentum-stage1c/scripts/make_matrix.py',
        'symbol': 'VGT',
        'data': {'file': 'data/VGT/data.csv', 'firstSession': '2016-01-04', 'firstDecisionClose': '2017-01-03',
                 'cap': '2023-12-29', 'forbiddenFrom': '2024-01-01', 'barCeilingUtc': '2023-12-30T00:00:00Z'},
        'account': {'principal': 100000, 'rate': 0.11, 'costBps': 5, 'financing': 'net', 'sizing': 'Z0',
                    'reentry': 'R3F', 'ddReference': 35000, 'rodFloor': 10000},
        'histories': {
            'A': {'developmentEnd': '2019-12-31', 'window': ['2019-12-31', '2020-12-31']},
            'B': {'developmentEnd': '2020-12-31', 'window': ['2020-12-31', '2021-12-31']},
            'C': {'developmentEnd': '2021-12-31', 'window': ['2021-12-31', '2022-12-30']},
            'D': {'developmentEnd': '2022-12-30', 'window': ['2022-12-30', '2023-12-29']},
            'H': {'developmentEnd': '2023-12-29', 'window': None},
        },
        'pathStart': '2019-12-31',
        'entries': ENTRIES,
        'exits': EXITS,
        'exitOrder': EXIT_ORDER,
        'rules': RULES,
        'masks': MASKS,
        'search': {
            'feasibility': {'maxMinuteDd': 35000, 'minClosedTrades': 6, 'minCampaigns': 3, 'minYearsHeld': 3,
                            'minLongShare': 0.2},
            'firstPass': {'global': 256, 'centers': {'byNet': 2, 'byRod': 2}, 'joint': 16, 'jointRadius': 0.1},
            'deep': {'global': 1792, 'globalFrom': 256, 'localSeeds': {'byNet': 2, 'byRod': 2}, 'localPerSeed': 64,
                     'localRadius': 0.1, 'shortlist': {'byNet': 4, 'byRod': 4}, 'joint': 32, 'jointRadius': 0.1,
                     'pairs': {'perMask': 3, 'net': 4, 'capPerEntry': 2, 'capPerExit': 2}},
            'widening': {'edge': 0.05, 'extend': 0.5,
                         'ruleLimits': {'a.N': [1, 120], 'b.C': [1, 120], 'c.X': [0.001, 0.3], 'c.Y': [0, 0.4]}},
            'fixedParent': {'global': 64, 'centers': {'byNet': 1, 'byRod': 1}, 'joint': 32, 'jointRadius': 0.1},
            'championFeasibility': 0.75,
            'tenBps': 10,
            'indices': {'reference': 9000, 'referenceN8': 9001, 'local': 4000, 'fixedParent': 6000,
                        'joint': '1e6 + 1000 * center + j'},
            # deep cell: Sobol continuation + local + up to 8 new shortlist centers × 33 + up to 4 first-pass centers
            # completed from J17 to J33 (32 draws each in the worst case: a widened box can re-clamp the shared draws)
            'caps': {'firstPass': first_pass, 'deepCellsMax': 8 * (8 * 3 + 4), 'deepPerCell': 1792 + 4 * 64 + 8 * 33 + 4 * 32,
                     'fixedParentPerMask': 64 + 2 + 2 * 33,
                     'perHistory': first_pass + 8 * (8 * 3 + 4) * (1792 + 4 * 64 + 8 * 33 + 4 * 32) + 7 * (64 + 2 + 2 * 33),
                     'total': 5 * (first_pass + 8 * (8 * 3 + 4) * (1792 + 4 * 64 + 8 * 33 + 4 * 32) + 7 * (64 + 2 + 2 * 33))},
        },
        'streams': {
            'note': 'every random stream runs over the pair dimension list (entry dims, exit dims, a.N, b.C, c.X, c.Y); '
                    'a cell uses its active dimensions only',
            'global': 'Sobol, seed sha256("study3c|<history>|<entry>|<exit>|<contract>|global"), points 0-255 first pass, 256-2047 deep',
            'local': 'Sobol, seed sha256("study3c|<history>|<entry>|<exit>|<contract>|local|<k>"), k = 0..3 (the k-th seed of distinctBest(2, 2))',
            'joint': 'mulberry32(seed sha256("study3c|<history>|<entry>|<exit>|<contract>|joint|<centerIndex>")): per draw one uniform per pair dimension in order; J17 = draws 0-15, J33 = draws 0-31',
            'fixedParent': 'Sobol over the four rule slots, seed sha256("study3c|<history>|<entry>|<exit>|<contract>|FP|global"); joint draws "…|FP|joint|<centerIndex>"',
            'nulls': 'mulberry32(seed sha256("study3c|null|<kind>|<j>")): one uniform per fold in order A, B, C, D, index = floor(u * pool size)',
            'J128': 'mulberry32(seed sha256("study3c|<policyId>|J128")): per draw one uniform per searched dimension in order',
            'missingBars': 'seed sha256("study3c|missing|<rate>")',
            'poison': 'seed sha256("study3c|poison|<date>") (parity) and "study3c|poison|evaluate|<date>" (evaluate)',
            'parity': 'mulberry32(seed sha256("study3c|parity"))'},
        'nulls': {'paths': 128, 'seedLabel': 'study3c|null|<kind>|<j>', 'kinds': ['deep', 'firstPass']},
        'neighbourhoods': {'oatStepFraction': 0.05, 'oatSteps': [-2, -1, 1, 2], 'jointDraws': 128, 'jointRadius': 0.1},
        'stresses': {'costs': [0, 2, 10], 'rates': [0.08, 0.14], 'stopSlippageBps': [10, 25, 50],
                     'entrySlippageBps': [10, 25], 'openSlippageBps': [50], 'delayMinutes': [1, 5],
                     'missingBars': [0.01, 0.05], 'losingHoldFill': ['open']},
        'rubric': {'positiveWindow': 2000, 'sumMin': 20000, 'positiveWindowsMin': 3, 'minWindow': -15000,
                   'windowDd': 35000, 'chainDd': 35000, 'excessSumMin': 10000, 'excessWindow': 2000,
                   'excessWindowsMin': 2, 'controlMargin': 5000, 'controls': ['C-SMA', 'C-DON', 'C-TSM', 'C-STOP'],
                   'perturbedShareMin': 0.75, 'perturbedMedianShare': 0.5, 'stressSumMin': 10000,
                   'stresses': ['cost10', 'rate14', 'stop25', 'open50', 'delay1'],
                   'flatTolerance2022': -2000, 'nearMissBand': 0.1, 'pairedPerturbedShare': 0.75,
                   'minOwnExits': 6, 'minFirstEntries': 4, 'minFirstEntryWindows': 3, 'minWindowsWithPosition': 3,
                   'minLongShare': 0.2, 'protection2022Margin': 5000, 'trendRetention': 0.75,
                   'winnerMargin': 5000, 'givebackShareMax': 0.5, 'givebackPeakMin': 5000,
                   'protectionValueMargin': 5000},
        'cellCount': len(cells),
        'cells': cells,
    }

    with open(OUT, 'w') as f:
        json.dump(matrix, f, indent=1)
        f.write('\n')

    print(f'{len(cells)} cells, first pass {first_pass}, cap per history {matrix["search"]["caps"]["perHistory"]}')


if __name__ == '__main__':
    main()
