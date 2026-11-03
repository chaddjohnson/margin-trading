"""Q7 — search saturation, dimensionality, fold variability and fidelity calibration (training records only).

Reads the 30 sealed search records and archives and the 30 qualification records (training doors only). Every
configuration compared across fidelities was evaluated on the SAME training door of its own job (rung 1: 16 points;
rung 2: 64; rung 3: 128; confirmation: 3 × 128), so the calibration measures estimation noise and selection
optimism, not out-of-sample behaviour.
"""

import collections
import math

import common as c


def island_rows(track, fold, s):
    rows = []
    union = [i['unionHv'] for i in s['islands']]
    for k, isl in enumerate(s['islands']):
        hv = isl['hvTrajectory']
        final = hv[-1] if hv else 0
        half = hv[len(hv) // 2 - 1] if len(hv) >= 2 else 0
        q3 = hv[(3 * len(hv)) // 4 - 1] if len(hv) >= 4 else 0
        late = (final - q3) / final if final > 0 else float('nan')
        rows.append({'track': track, 'fold': fold, 'island': k, 'generations': isl['generations'],
                     'stop': isl['stop'], 'new': isl['newConfigs'], 'duplicates': isl['duplicates'],
                     'feasible': isl['feasible'], 'islandHv': final, 'halfShare': half / final if final > 0 else float('nan'),
                     'lateGain': late, 'unionHv': union[k],
                     'unionGain': (union[k] / union[k - 1] - 1) if k > 0 and union[k - 1] > 0 else float('nan')})
    return rows


def main():
    jobs = {}
    for fold in c.FOLDS:
        for track in c.TRACKS:
            jobs[(track, fold)] = (c.search(track, fold), c.archive(track, fold), c.qualification(track, fold))

    # ---------- islands, triggers, refinement ----------
    isl = []
    job_rows = []
    for (track, fold), (s, arch, q) in jobs.items():
        rows = island_rows(track, fold, s)
        isl.extend(rows)
        accepted, gains = 0, []
        for ref in s['refinements']:
            path = ref['path']
            base = path[0].get('robust')
            for p in path[1:]:
                if p.get('accepted'):
                    accepted += 1
                    if p.get('robust') is not None and base is not None:
                        gains.append(p['robust'] - base)
                        base = p['robust']
        last_union = rows[-1]['unionGain'] if len(rows) > 1 else float('nan')
        stops = collections.Counter(r['stop'] for r in rows)
        dup = sum(r['duplicates'] for r in rows) / max(1, sum(r['new'] for r in rows))
        r1f = sum(1 for r in arch if r['violation'] == 0)
        job_rows.append([track, fold, 8 * len(c.BOOKS[track]), len(rows), dict(stops), f'{dup:.1%}',
                         f"{last_union:+.1%}" if math.isfinite(last_union) else '—',
                         'fired' if s['triggers']['T1']['islandsRun'] > 4 else '—',
                         f"{statistics_median([r['lateGain'] for r in rows]):.1%}",
                         f"{len(arch):,}", f'{r1f / len(arch):.1%}', accepted,
                         c.money(sum(gains) / len(gains)) if gains else '—', f"{q['pbo']['pbo']:.2f}"])

    # ---------- fidelity calibration (all 30 jobs, training doors) ----------
    pairs = collections.defaultdict(list)  # (lo, hi) -> [(job, lo_rec, hi_rec)]
    for (track, fold), (s, arch, q) in jobs.items():
        y = s['y']
        r1 = {r['id']: r for r in arch}
        r2 = {f['id']: f for f in s['rung2']}
        r3 = {f['id']: f for f in s['rung3']}
        conf = {m['id']: m['evidence']['decisive']['nb'] for m in q['candidates']}
        for cid, f in r2.items():
            if cid in r1:
                a = r1[cid]
                pairs[('r1', 'r2')].append(((track, fold), {'robust': (0.5 * a['r1MedianNet'] + 0.5 * a['r1P10Net']) / y,
                                                          'share': a['r1Share'], 'feasible': a['violation'] == 0},
                                            {'robust': f['nb']['robustPerYear'], 'share': f['nb']['share'],
                                             'feasible': f['violation'] == 0}))
        for cid, f in r3.items():
            if cid in r2:
                g = r2[cid]
                pairs[('r2', 'r3')].append(((track, fold), {'robust': g['nb']['robustPerYear'], 'share': g['nb']['share'],
                                                          'feasible': g['violation'] == 0},
                                            {'robust': f['nb']['robustPerYear'], 'share': f['nb']['share'],
                                             'feasible': f['violation'] == 0}))
        for cid, nb in conf.items():
            if cid in r3:
                f = r3[cid]
                pairs[('r3', 'conf')].append(((track, fold), {'robust': f['nb']['robustPerYear'], 'share': f['nb']['share'],
                                                            'feasible': f['violation'] == 0},
                                              {'robust': nb['robustPerYear'], 'share': nb['share'], 'feasible': None}))

    cal_rows = []
    share_rows = []
    for (lo, hi), items in pairs.items():
        by_job = collections.defaultdict(list)
        for job, a, b in items:
            by_job[job].append((a, b))
        rhos = []
        top_shrink, rest_shrink, all_shrink = [], [], []
        for job, xs in by_job.items():
            if len(xs) >= 3:
                rho = c.spearman([a['robust'] for a, _ in xs], [b['robust'] for _, b in xs])
                if rho is not None:
                    rhos.append(rho)
            ordered = sorted(xs, key=lambda ab: -ab[0]['robust'])
            k = max(1, len(ordered) // 10)
            for i, (a, b) in enumerate(ordered):
                if a['robust'] > 0:
                    rel = b['robust'] / a['robust'] - 1
                    all_shrink.append(rel)
                    (top_shrink if i < k else rest_shrink).append(rel)
        cal_rows.append([f'{lo} → {hi}', len(items), len(by_job), f'{c.median(rhos):+.2f}' if rhos else 'n/a',
                         f'{min(rhos):+.2f} … {max(rhos):+.2f}' if rhos else 'n/a',
                         f'{c.median(all_shrink):+.1%}', f'{c.median(top_shrink):+.1%}' if top_shrink else 'n/a',
                         f'{c.median(rest_shrink):+.1%}' if rest_shrink else 'n/a'])
        # share calibration: P(higher-fidelity share ≥ 0.90 | lower-fidelity share level)
        levels = collections.defaultdict(lambda: [0, 0])
        for _, a, b in items:
            key = f"{a['share'] * (16 if lo == 'r1' else 64 if lo == 'r2' else 128):.0f}/{16 if lo == 'r1' else 64 if lo == 'r2' else 128}" \
                if lo == 'r1' else c.band_of(a['share'])
            levels[key][0] += 1
            levels[key][1] += 1 if b['share'] >= 0.90 else 0
        for key in sorted(levels, key=lambda k: (-float(k.split('/')[0]) if '/' in k else 0, k)):
            n, k_ = levels[key]
            lo_ci, hi_ci = c.clopper_pearson(k_, n)
            share_rows.append([f'{lo} → {hi}', key, n, k_, f'{k_ / n:.1%}', f'{lo_ci:.1%} – {hi_ci:.1%}'])

    # ---------- dimensionality (F24 and all folds) and fold variability of the profit holder ----------
    sel = c.frozen_selection()
    dim_rows = []
    for track in c.TRACKS:
        d = 8 * len(c.BOOKS[track])
        for fold in ['F24']:
            s, arch, q = jobs[(track, fold)]
            r3f = [f for f in s['rung3'] if f['violation'] == 0]
            best = max((f['nb']['robustPerYear'] for f in r3f), default=float('nan'))
            dim_rows.append([track, d, f"{len(arch):,}", f"{sum(1 for r in arch if r['violation'] == 0) / len(arch):.1%}",
                             f"{sum(1 for r in arch if r['r1Share'] >= 0.9) / len(arch):.1%}",
                             f"{sum(1 for f in s['rung2'] if f['violation'] == 0)}/192", f"{len(r3f)}/{len(s['rung3'])}",
                             c.money(best)])
    var_rows = []
    for track in c.TRACKS:
        holders = {}
        for fold in c.FOLDS:
            ranked = [r for r in sel['rankedByFold'][fold] if r['track'] == track and r['role'] == 'profit']
            if ranked:
                holders[fold] = c.books_of_grids(ranked[0]['books'])
        if 'F24' not in holders:
            var_rows.append([track, 'no F24 profit holder'] + [''] * 4)
            continue
        dists = {f: c.linf(holders['F24'], b) for f, b in holders.items() if f != 'F24'}
        best = {fold: max((f['nb']['robustPerYear'] for f in jobs[(track, fold)][0]['rung3'] if f['violation'] == 0),
                          default=float('nan')) for fold in c.FOLDS}
        var_rows.append([track] + [f"{dists[f]:.2f}" if f in dists else '—' for f in ['F19', 'F20', 'F21', 'F23']] +
                        [' / '.join(c.money(best[f]) for f in c.FOLDS)])

    # ---------- write ----------
    stop_total = collections.Counter(r['stop'] for r in isl)
    lines = ['# Search saturation, dimensionality and fidelity calibration (training records only)',
             'Generated by `python3 research/study8-archive-audit/scripts/saturation.py` from the 30 sealed search '
             'records, their rung-1 archives and the 30 qualification records. No search is re-run.',
             '## Per job: islands, triggers, refinement, PBO',
             f"Island stop reasons over all {len(isl)} islands: {dict(stop_total)}. \"Late gain\" = the share of an "
             "island's own final hypervolume added in its last quarter of generations (median over the job's islands); "
             "\"last-island union gain\" = the union feasible hypervolume increase contributed by the job's last island "
             "(T1 fires at ≥ 10%).",
             c.md_table(['track', 'fold', 'd', 'islands', 'stops', 'duplicate proposals', 'last-island union gain', 'T1',
                         'late gain (median)', 'rung-1 archive', 'rung-1 feasible', 'refinement accepted moves',
                         'mean robust gain per accepted move', 'PBO (64 best rung-2)'], job_rows),
             '## Fidelity calibration: the same configurations re-estimated at the next rung (training door of their own job)',
             'Spearman = within-job rank correlation of robust profit/yr between the two fidelities (median and range over '
             'jobs). Change = higher-fidelity ÷ lower-fidelity robust profit − 1, for all pairs, for each job\'s top '
             'decile by the lower-fidelity value (the configurations a selection would pick), and for the rest.',
             c.md_table(['step', 'pairs', 'jobs', 'Spearman (median)', 'Spearman range', 'median change (all)',
                         'median change (top decile)', 'median change (rest)'], cal_rows),
             '## Share calibration: P(next-rung share ≥ 0.90 | this rung\'s share)',
             'Exact (Clopper–Pearson) 90% intervals.',
             c.md_table(['step', 'lower-fidelity share', 'n', 'next share ≥ 0.90', 'rate', '90% interval'], share_rows),
             '## Dimensionality (F24)',
             c.md_table(['track', 'd', 'rung-1 archive', 'rung-1 feasible', 'rung-1 share ≥ 0.90', 'rung-2 feasible',
                         'rung-3 feasible', 'best rung-3 robust/yr'], dim_rows),
             '## Fold variability: L∞ distance of each fold\'s profit holder from the F24 profit holder, and the best '
             'rung-3-feasible robust profit/yr per fold (each on its own training window; not comparable across folds '
             'as levels because windows differ)',
             c.md_table(['track', 'F19', 'F20', 'F21', 'F23', 'best r3 robust/yr F19 / F20 / F21 / F23 / F24'], var_rows),
             '## Inputs', c.inputs_block()]
    c.write('saturation.md', '\n\n'.join(lines))
    c.write_json('saturation.json', {'islands': isl, 'calibration': cal_rows, 'share': share_rows})
    print('saturation: done')


def statistics_median(values):
    v = [x for x in values if isinstance(x, float) and math.isfinite(x)]
    return c.median(v) if v else float('nan')


if __name__ == '__main__':
    main()
