"""Q1 — what was searched and what is retained, per track × fold × stage (read-only; writes outputs/inventory.*)."""

import collections
import os

import common as c


def main():
    sel = c.frozen_selection()
    roles = collections.Counter((r['track'], r['fold']) for r in sel['roles'])
    tests = {fold: c.test_record(fold) for fold in c.FOLDS}
    rows = []
    totals = collections.Counter()
    checks = []

    for fold in c.FOLDS:
        members = {(m['track'], m['id']): m for m in tests[fold]['members']}
        for track in c.TRACKS:
            s = c.search(track, fold)
            q = c.qualification(track, fold)
            arch = c.archive(track, fold)
            k = s['counts']
            ids = {r['id'] for r in arch}
            r1f = sum(1 for r in arch if r['violation'] == 0)
            r2_flag = sum(r['r2'] for r in arch)
            r3_flag = sum(r['r3'] for r in arch)
            r2_ids = {r['id'] for r in s['rung2']}
            r3_ids = {r['id'] for r in s['rung3']}
            refine_new = sorted(r3_ids - r2_ids)
            accepted = sum(1 for ref in s['refinements'] for p in ref['path'][1:] if p.get('accepted'))
            moves = sum(p.get('moves', 0) for ref in s['refinements'] for p in ref['path'][1:])
            short = s['shortlist']
            short_feasible = sum(1 for m in short if m['pick'] != 'infeasible on training')
            qualified = sum(1 for m in q['candidates'] if m['qualification']['qualified'])
            marginal = sum(1 for m in q['candidates'] if m['qualification']['qualified'] and m['qualification']['marginal'])
            tested = [members[(track, m['id'])] for m in short if (track, m['id']) in members]
            status = collections.Counter(m['gates']['status'] for m in tested)

            # internal consistency of the retained records with the sealed counts
            checks.append((f'{track}/{fold}', len(arch) == k['archive'] == len(ids), r1f == k['r1Feasible'],
                           r2_flag == k['r2'] == len(r2_ids), sum(1 for r in s['rung2'] if r['violation'] == 0) == k['r2Feasible'],
                           len(s['rung3']) == k['r3'], sum(1 for r in s['rung3'] if r['violation'] == 0) == k['r3Feasible'],
                           len(tested) == len(short)))
            row = {
                'track': track, 'fold': fold, 'd': 8 * len(c.BOOKS[track]), 'y': s['y'],
                'screen': k['screen'], 'screenPlausible': k['screenPlausible'], 'promoted': k['promoted'],
                'islands': k['islandsRun'], 'archive': len(arch), 'r1Feasible': r1f,
                'r2': len(r2_ids), 'r2Feasible': k['r2Feasible'], 'r3': len(s['rung3']), 'r3Feasible': k['r3Feasible'],
                'r3FromRefinement': len(refine_new), 'refineStarts': len(s['refinements']),
                'refineMoves': moves, 'refineAccepted': accepted,
                'T1': s['triggers']['T1']['islandsRun'] > 4, 'T2': s['triggers']['T2']['fired'],
                'T2rescored': len(s['triggers']['T2']['rescored']), 'T3': s['triggers']['T3']['fired'],
                'shortlist': len(short), 'shortlistFeasible': short_feasible, 'qualified': qualified,
                'marginal': marginal, 'roles': roles[(track, fold)], 'tested': len(tested),
                'testPass': status['pass'], 'testAmbiguous': status['ambiguous'], 'testFail': status['fail'],
                'points': s['stats']['points'], 'seconds': s['seconds']
            }
            rows.append(row)
            for key in ['screen', 'archive', 'r1Feasible', 'r2', 'r3', 'shortlist', 'qualified', 'roles', 'tested',
                        'points']:
                totals[(fold, key)] += row[key]
                totals[('all', key)] += row[key]

    cache = os.path.join(c.S8, 'results', 'cache')
    gaps = {
        'pointCacheDirectory': {'path': c.rel(cache), 'exists': os.path.exists(cache)},
        'archiveColumns': sorted(c.archive('VG', 'F24')[0].keys())
    }
    c.write_json('inventory.json', {'rows': rows, 'totals': {f'{a}:{b}': v for (a, b), v in sorted(totals.items())},
                                    'consistency': checks, 'gaps': gaps, 'inputs': c.INPUTS})

    headers = ['track', 'fold', 'd', 'screen', 'plausible', 'promoted', 'islands', 'rung-1 archive', 'r1 feasible',
               'r2 (n=64)', 'r2 feasible', 'r3 (n=128)', 'r3 feasible', 'r3 from refinement', 'refine accepted / moves',
               'T1', 'T2 (rescored)', 'shortlist (feasible)', 'qualified (marginal)', 'role holders',
               'tested: pass / ambiguous / fail', 'fresh points']
    table = []
    for r in rows:
        table.append([r['track'], r['fold'], r['d'], f"{r['screen']:,}", f"{r['screenPlausible']:,}", f"{r['promoted']:,}",
                      r['islands'], f"{r['archive']:,}", f"{r['r1Feasible']:,}", r['r2'], r['r2Feasible'], r['r3'],
                      r['r3Feasible'], r['r3FromRefinement'], f"{r['refineAccepted']} / {r['refineMoves']:,}",
                      'fired' if r['T1'] else '—', f"{'fired' if r['T2'] else '—'} ({r['T2rescored']})",
                      f"{r['shortlist']} ({r['shortlistFeasible']})", f"{r['qualified']} ({r['marginal']})", r['roles'],
                      f"{r['testPass']} / {r['testAmbiguous']} / {r['testFail']}", f"{r['points']:,}"])
    fold_rows = [[fold, f"{totals[(fold, 'archive')]:,}", f"{totals[(fold, 'r1Feasible')]:,}", totals[(fold, 'r2')],
                  totals[(fold, 'r3')], totals[(fold, 'shortlist')], totals[(fold, 'qualified')], totals[(fold, 'roles')],
                  totals[(fold, 'tested')], f"{totals[(fold, 'points')]:,}"] for fold in c.FOLDS + ['all']]
    ok = all(all(x for x in ch[1:]) for ch in checks)
    text = '\n\n'.join([
        '# Inventory (generated by `python3 research/study8-archive-audit/scripts/inventory.py`)',
        'Per track × fold, from `results/search/<T>/<F>/search.json`, `search-archive.csv.gz`, '
        '`results/qualify/<T>/<F>/qualification.json`, `FROZEN_SELECTION.json` `roles` and `results/test/<F>/test.json`. '
        'Counts of the retained records were re-derived and compared with the sealed `counts` fields: '
        + ('**all consistent**.' if ok else '**INCONSISTENT — see inventory.json `consistency`**.'),
        c.md_table(headers, table),
        '## Totals by fold',
        c.md_table(['fold', 'rung-1 archive', 'r1 feasible', 'r2', 'r3', 'shortlist', 'qualified', 'role holders',
                    'sealed-tested members', 'fresh points'], fold_rows),
        f"Point cache directory `{gaps['pointCacheDirectory']['path']}` exists: **{gaps['pointCacheDirectory']['exists']}**.",
        '## Inputs', c.inputs_block()])
    c.write('inventory.md', text)
    print(f"inventory: {len(rows)} jobs; archive total {totals[('all', 'archive')]:,}; points {totals[('all', 'points')]:,}; consistent {ok}")


if __name__ == '__main__':
    main()
