"""Q2, Q3, Q4 and the training half of Q6 — F24 TRAINING records only (2016-01-04 → 2024-12-31).

Reads, per track, the sealed F24 search record (rung 1 archive, rung 2, rung 3 incl. refinement endpoints, shortlist),
the F24 qualification record (confirmation 3 × 128 on the training door) and FROZEN_SELECTION.json (roles, ranks).
The F24 test record is read ONLY to label sealed holders as nominated or not (category e); no test-window figure enters
any training comparison here. Nothing is re-evaluated: every number is a field of an archived record.
"""

import collections
import datetime
import math

import common as c

FOLD = 'F24'
RISK = {'Q1', 'Q2', 'Q2b'}
TRAIN_DAYS_FROM_ARMING = (datetime.date(2024, 12, 31) - datetime.date(2017, 6, 15)).days + 1
MARGINS = [0.0, 0.10, 0.20]
TOL = 2e-4  # archive rounding: violation 6 dp, rung-1 p90/median/p10 whole dollars


def short_of(value, floor):
    return max(0, floor - value) / floor if floor > 0 else 0


def r1_parts(row, y, floors):
    ceiling = c.CEILING
    parts = {
        'C1': (row['dd'] - ceiling) / ceiling + 1e-9 if row['dd'] >= ceiling else 0.0,
        'C2share': max(0.0, 0.9 - row['r1Share']) / 0.9,
        'C2p90': (row['r1P90Dd'] - ceiling) / ceiling + 1e-9 if row['r1P90Dd'] >= ceiling else 0.0,
        'C3lots': short_of(row['lots'], floors['lots']),
        'C3episodes': short_of(row['episodes'], floors['episodes']),
        'C5median': max(0.0, 10000 - row['r1MedianNet'] / y) / 10000,
        'C5p10': 0.0 if row['r1P10Net'] > 0 else (max(0.0, -row['r1P10Net']) + 1) / (10000 * floors['y']),
    }
    return parts, row['violation'] - sum(parts.values())


def rec_r1(row, y, floors):
    parts, residual = r1_parts(row, y, floors)
    return {
        'level': 'r1', 'n': 16, 'share': row['r1Share'], 'p90': row['r1P90Dd'], 'worst': None,
        'median': row['r1MedianNet'], 'p10': row['r1P10Net'], 'medianY': row['r1MedianNet'] / y,
        'p10Y': row['r1P10Net'] / y, 'robustY': (0.5 * row['r1MedianNet'] + 0.5 * row['r1P10Net']) / y,
        'centreY': row['net'] / y, 'centreNet': row['net'], 'dd': row['dd'], 'lots': row['lots'],
        'episodes': row['episodes'], 'lotYears': None, 'bookLots': None, 'perCapitalYear': None, 'top1': None,
        'bestYearShare': None, 'heldDays': None, 'refused': None, 'signature': None,
        'violation': row['violation'], 'parts': {k: v for k, v in parts.items() if v > 0},
        'residual': residual if residual > TOL else 0.0, 'mismatch': residual < -TOL
    }


def rec_fit(fit, level):
    ce, nb = fit['centre'], fit['nb']
    return {
        'level': level, 'n': nb['n'], 'share': nb['share'], 'p90': nb['p90Dd'], 'worst': nb['worstDd'],
        'median': nb['medianNet'], 'p10': nb['p10Net'], 'medianY': nb['medianPerYear'], 'p10Y': nb['p10PerYear'],
        'robustY': nb['robustPerYear'], 'centreY': ce['perYear'], 'centreNet': ce['net'], 'dd': ce['dd'],
        'lots': ce['lots'], 'episodes': ce['episodes'], 'lotYears': ce['lotYears'], 'bookLots': ce['bookLots'],
        'perCapitalYear': ce['perCapitalYear'], 'top1': ce['top1Share'], 'bestYearShare': ce['bestYearShare'],
        'heldDays': ce['heldDays'], 'refused': ce['refused'], 'signature': ce['signature'],
        'violation': fit.get('violation'), 'parts': dict(fit.get('parts') or {}), 'residual': 0.0, 'mismatch': False
    }


def risk_ok(r):
    return r['dd'] < c.CEILING and r['share'] >= c.SHARE_MIN and r['p90'] < c.CEILING


def front_ids(recs):
    """Pareto-nondominated set on the study's four objectives (max centre/yr, median/yr, p10/yr; min p90 DD)."""
    pts = sorted((-r['centreY'], -r['medianY'], -r['p10Y'], r['p90'], cid) for cid, r in recs.items())
    front = []
    for p in pts:
        if not any(all(f[i] <= p[i] for i in range(4)) and any(f[i] < p[i] for i in range(4)) for f in front):
            front.append(p)
    return {p[4] for p in front}


def distinct_reps(items, books_of, minimum=0.10):
    reps = []
    for cid in items:
        if all(c.linf(books_of[cid], books_of[o]) >= minimum for o in reps):
            reps.append(cid)
    return reps


def jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a | b else 1.0


def load_track(track, sel, test):
    s = c.search(track, FOLD)
    q = c.qualification(track, FOLD)
    arch = c.archive(track, FOLD)
    y, floors = s['y'], s['floors']
    books = {}
    levels = collections.defaultdict(dict)  # id -> level -> rec
    for row in arch:
        books[row['id']] = c.parse_books(row['books'])
        levels[row['id']]['r1'] = rec_r1(row, y, floors)
    for fit in s['rung2']:
        books[fit['id']] = c.parse_books(fit['books'])
        levels[fit['id']]['r2'] = rec_fit(fit, 'r2')
    for fit in s['rung3']:
        books[fit['id']] = c.parse_books(fit['books'])
        levels[fit['id']]['r3'] = rec_fit(fit, 'r3')
    short = {m['id']: m for m in s['shortlist']}
    for m in s['shortlist']:
        books[m['id']] = c.books_of_grids(m['books'])
        levels[m['id']]['sl'] = rec_fit(m['shortlistFit'], 'sl')  # the values the shortlist used (n 128 or T2-pooled 256)
    qual = {}
    for m in q['candidates']:
        ev = m['evidence']
        r = rec_fit({'centre': ev['centre'], 'nb': ev['decisive']['nb'], 'violation': None, 'parts': {}}, 'conf')
        levels[m['id']]['conf'] = r
        qual[m['id']] = m
    roles = {r['id']: r['role'] for r in sel['roles'] if r['track'] == track and r['fold'] == FOLD}
    ranks = {r['id']: r['rank'] for r in sel['rankedByFold'][FOLD] if r['track'] == track}
    status = {h['id']: h['gates']['status'] for h in test['holders'] if h['track'] == track}
    return {'s': s, 'q': q, 'arch': arch, 'y': y, 'floors': floors, 'books': books, 'levels': levels,
            'short': short, 'qual': qual, 'roles': roles, 'ranks': ranks, 'status': status}


def category(t, cid):
    lv = t['levels'][cid]
    if cid in t['roles']:
        st = t['status'].get(cid, '?')
        return 'e', f"holder #{t['ranks'].get(cid)} {t['roles'][cid]} (test {st})"
    if cid in t['qual'] and t['qual'][cid]['qualification']['qualified']:
        return 'd', 'qualified, no role'
    if cid in t['short']:
        failed = t['qual'][cid]['qualification']['failed'] if cid in t['qual'] else ['?']
        return 'c', 'shortlisted; failed ' + ','.join(failed)
    if 'r2' in lv or 'r3' in lv:
        return 'b', 'evaluated at ' + ('r3' if 'r3' in lv else 'r2') + ', not shortlisted'
    return 'a', 'rung 1 only'


def best_level(lv):
    for level in ['conf', 'sl', 'r3', 'r2', 'r1']:
        if level in lv:
            return lv[level]
    return None


def fmt_rec(r, ref=None):
    rel = f" ({(r['robustY'] / ref - 1) * 100:+.0f}%)" if ref else ''
    worst = f", worst {c.money(r['worst'])}" if r['worst'] is not None else ''
    return (f"n={r['n']}: share {c.pct(r['share'])} (Wilson LB {c.pct(c.wilson_lower(r['share'], r['n']))}), "
            f"p90 {c.money(r['p90'])}{worst}; centre {c.money(r['centreY'])}/yr, median {c.money(r['medianY'])}/yr, "
            f"p10 {c.money(r['p10Y'])}/yr, robust {c.money(r['robustY'])}/yr{rel}")


def main():
    sel = c.frozen_selection()
    test = c.test_record(FOLD)
    tracks = {track: load_track(track, sel, test) for track in c.TRACKS}
    out = {}

    # ---------- reference: the best sealed holder per track (and overall) at each fidelity ----------
    refs = {}
    for track, t in tracks.items():
        for level in ['r1', 'r2', 'r3', 'conf']:
            hs = [(t['levels'][h][level]['robustY'], h) for h in t['roles'] if level in t['levels'][h]]
            refs[(track, level)] = max(hs) if hs else None
    for level in ['r1', 'r2', 'r3', 'conf']:
        cand = [refs[(tr, level)] + (tr,) for tr in c.TRACKS if refs[(tr, level)]]
        refs[('all', level)] = max(cand) if cand else None

    # ---------- Q2: risk-feasible configurations more profitable than the selected ones, per fidelity ----------
    over_rows = []
    over_csv = []
    examples = {}
    for track, t in tracks.items():
        examples[track] = []
        for level in ['r1', 'r2', 'r3', 'conf']:
            ref = refs[(track, level)]
            if not ref:
                continue
            ref_rec = t['levels'][ref[1]][level]
            counts = collections.Counter()
            for cid, lv in t['levels'].items():
                if level not in lv or cid in t['roles']:
                    continue
                r = lv[level]
                if not risk_ok(r):
                    continue
                cat, _ = category(t, cid)
                band = c.band_of(r['share'])
                counts[('risk-feasible', cat)] += 1
                for m in MARGINS:
                    if r['robustY'] >= (1 + m) * ref_rec['robustY']:
                        counts[(f'robust+{m:.0%}', cat)] += 1
                        counts[(f'robust+{m:.0%}', band)] += 1
                    if all(r[k] >= (1 + m) * ref_rec[k] for k in ['centreY', 'medianY', 'p10Y']):
                        counts[(f'all3+{m:.0%}', cat)] += 1
                        counts[(f'all3+{m:.0%}', band)] += 1
                if r['robustY'] >= 1.10 * ref_rec['robustY']:
                    over_csv.append([track, level, cid, cat, band, r['n'], round(r['share'], 4),
                                     round(c.wilson_lower(r['share'], r['n']), 4), round(r['p90']), round(r['centreY']),
                                     round(r['medianY']), round(r['p10Y']), round(r['robustY']),
                                     round(r['robustY'] / ref_rec['robustY'] - 1, 4), r['violation'],
                                     ';'.join(f'{k}={v:.3g}' for k, v in sorted(r['parts'].items())),
                                     round(r['residual'], 4)])
            over_rows.append((track, level, ref, ref_rec, counts))

        # examples: distinct, highest-fidelity (≥ r2) risk-feasible configurations ≥ +10% robust over the track ref
        pool = []
        for cid, lv in t['levels'].items():
            if cid in t['roles']:
                continue
            r = best_level(lv)
            if r['level'] in ('r1',) or not risk_ok(r):
                continue
            ref = refs[(track, 'conf' if r['level'] == 'conf' else ('r3' if r['level'] in ('r3', 'sl') else 'r2'))]
            if not ref:
                continue
            ref_rec = t['levels'][ref[1]]['conf' if r['level'] == 'conf' else ('r3' if r['level'] in ('r3', 'sl') else 'r2')]
            pool.append((-r['robustY'], cid, r, ref_rec))
        pool.sort()
        reps = distinct_reps([p[1] for p in pool], t['books'])
        examples[track] = [(cid, next(p for p in pool if p[1] == cid)) for cid in reps[:5]]

    # ---------- why each r3 / r2 configuration did not advance (exclusion reasons) ----------
    reasons = {}
    for track, t in tracks.items():
        s = t['s']
        shortlisted = list(t['short'])
        sig_of_short = {t['levels'][m]['sl']['signature']: m for m in shortlisted}
        t2 = set(s['triggers']['T2']['rescored'])
        r3ids = [f['id'] for f in s['rung3']]
        r2ids = [f['id'] for f in s['rung2']]
        for cid in r3ids:
            if cid in t['short']:
                continue
            r = t['levels'][cid]['r3']
            if r['violation'] and r['violation'] > 0:
                why = 'infeasible at rung 3 (' + ', '.join(sorted(r['parts'])) + ')'
            elif r['signature'] in sig_of_short:
                why = f"same funded-ledger signature as shortlisted {sig_of_short[r['signature']][:22]}…"
            else:
                d, near = min((c.linf(t['books'][cid], t['books'][m]), m) for m in shortlisted)
                if d < 0.10:
                    why = f"within L∞ {d:.3f} < 0.10 of shortlisted {t['short'][near]['pick']} pick"
                else:
                    why = 'not reached: the six picks were filled (profit/robust/balanced/centre/front order)'
                if cid in t2:
                    why += '; T2-rescored (pooled 256-point value not retained)'
            reasons[(track, cid)] = why
        for cid in r2ids:
            if cid in t['levels'] and 'r3' in t['levels'][cid]:
                continue
            r = t['levels'][cid]['r2']
            if r['violation'] and r['violation'] > 0:
                reasons[(track, cid)] = 'infeasible at rung 2 (' + ', '.join(sorted(r['parts'])) + ')'
            else:
                d = min(c.linf(t['books'][cid], t['books'][o]) for o in r3ids)
                reasons[(track, cid)] = ('within L∞ {:.3f} < 0.03 of a rung-3 pick'.format(d) if d < 0.03 else
                                         'below the top 48 of the constrained-domination order (fronts, crowding)')

    # ---------- rung-1 decomposition and front membership (F24 archives) ----------
    r1_rows = []
    r1_detail = {}
    for track, t in tracks.items():
        r1 = {cid: lv['r1'] for cid, lv in t['levels'].items() if 'r1' in lv}
        feas = {cid: r for cid, r in r1.items() if r['violation'] == 0}
        front = front_ids(feas)
        promoted = {cid for cid, lv in t['levels'].items() if 'r2' in lv}
        mism = sum(1 for r in r1.values() if r['mismatch'])
        fails = collections.Counter()
        for r in r1.values():
            if r['violation'] == 0:
                continue
            keys = set(r['parts'])
            if r['residual'] > 0:
                keys.add('other (C3 lot-years / C4 / C6 / C7)')
            for k in keys:
                fails[k] += 1
            if keys == {'other (C3 lot-years / C4 / C6 / C7)'}:
                fails['ONLY other (non-risk, not stored)'] += 1
            if not ({'C1', 'C2share', 'C2p90'} & keys):
                fails['risk-feasible but infeasible'] += 1
        front_not_promoted = front - promoted
        # risk-feasible r1 configs excluded only by unstored non-risk constraints, ranked by r1 robust/yr
        nonrisk_only = sorted(((r['robustY'], cid) for cid, r in r1.items()
                               if r['violation'] > 0 and not r['parts'] and r['residual'] > 0), reverse=True)
        ref = refs[(track, 'r1')]
        promoted_robust = sorted((r1[cid]['robustY'] for cid in promoted if cid in r1), reverse=True)
        r1_detail[track] = {'front': len(front), 'frontPromoted': len(front & promoted), 'frontNotPromoted':
                            len(front_not_promoted), 'mismatch': mism, 'fails': dict(fails),
                            'nonriskOnlyTop': nonrisk_only[:3]}
        r1_rows.append([track, f"{len(r1):,}", f"{len(feas):,}", f"{len(front):,}", len(front & promoted),
                        f"{len(front_not_promoted):,}", fails['C1'], fails['C2share'], fails['C2p90'],
                        fails['C3lots'], fails['C3episodes'], fails['C5median'], fails['C5p10'],
                        fails['other (C3 lot-years / C4 / C6 / C7)'], fails['ONLY other (non-risk, not stored)'],
                        fails['risk-feasible but infeasible'], mism])
        # how many feasible, unpromoted r1 configs beat the promoted set's best / the best holder at r1
        best_prom = promoted_robust[0] if promoted_robust else float('nan')
        unprom = [r for cid, r in feas.items() if cid not in promoted]
        r1_detail[track]['unpromotedAbovePromotedBest'] = sum(1 for r in unprom if r['robustY'] > best_prom)
        r1_detail[track]['unpromotedAboveHolder'] = (sum(1 for r in unprom if ref and r['robustY'] > ref[0]))
        r1_detail[track]['promotedBest'] = best_prom
        r1_detail[track]['holderR1'] = ref

    # ---------- rung-1-only leads (category a) above the best holder's own rung-1 value ----------
    leads = {}
    for track, t in tracks.items():
        ref = refs[(track, 'r1')]
        if not ref:
            leads[track] = (None, [], 0, 0, 0, float('nan'))
            continue
        promoted = [cid for cid, lv in t['levels'].items() if 'r2' in lv]
        rows = sorted(((-lv['r1']['robustY'], cid) for cid, lv in t['levels'].items()
                       if 'r1' in lv and 'r2' not in lv and 'r3' not in lv and risk_ok(lv['r1'])
                       and lv['r1']['robustY'] > ref[0]))
        reps = distinct_reps([cid for _, cid in rows], t['books'])
        out_rows = []
        for cid in reps[:5]:
            r = t['levels'][cid]['r1']
            d, near = min((c.linf(t['books'][cid], t['books'][o]), o) for o in promoted)
            if r['violation'] == 0:
                why = 'feasible; not in the 192 promoted (constrained rank, crowding, L∞ ≥ 0.02)'
            else:
                why = 'infeasible: ' + ', '.join(sorted(r['parts']) + (['other (C3 lot-years/C4/C6/C7)'] if r['residual'] > 0 else []))
            out_rows.append((cid, r, d, why))
        feas_n = sum(1 for _, cid in rows if t['levels'][cid]['r1']['violation'] == 0)
        full = [t['levels'][cid]['r1']['robustY'] / ref[0] - 1 for _, cid in rows if t['levels'][cid]['r1']['share'] == 1.0]
        leads[track] = (ref, out_rows, len(rows), feas_n, len(full), max(full) if full else float('nan'))

    # ---------- Q3 funnel ----------
    funnel_rows = []
    funnel_csv = []
    for track, t in tracks.items():
        lv = t['levels']
        s = t['s']
        r1 = {cid: x['r1'] for cid, x in lv.items() if 'r1' in x}
        r2 = {cid: x['r2'] for cid, x in lv.items() if 'r2' in x}
        r3 = {cid: x['r3'] for cid, x in lv.items() if 'r3' in x}
        sl = list(t['short'])
        qualified = [cid for cid in sl if cid in t['qual'] and t['qual'][cid]['qualification']['qualified']]
        holders = list(t['roles'])
        nominees = [h for h in holders if t['status'].get(h) in ('pass', 'ambiguous')]

        def best(recs, ids):
            vals = [recs[i]['robustY'] for i in ids if i in recs]
            return max(vals) if vals else float('nan')

        def best_risk(recs, ids):
            vals = [recs[i]['robustY'] for i in ids if i in recs and risk_ok(recs[i])]
            return max(vals) if vals else float('nan')

        r1f = [i for i, r in r1.items() if r['violation'] == 0]
        r1_risk = [i for i, r in r1.items() if risk_ok(r)]
        stages = [
            ('rung-1 archive (16 pt)', len(r1), best(r1, r1), best_risk(r1, r1)),
            ('rung-1 feasible (C1–C7, 16 pt)', len(r1f), best(r1, r1f), best_risk(r1, r1f)),
            ('promoted to rung 2 (64 pt)', len(r2), best(r2, r2), best_risk(r2, r2)),
            ('rung-2 feasible', sum(1 for r in r2.values() if r['violation'] == 0),
             best(r2, [i for i, r in r2.items() if r['violation'] == 0]), float('nan')),
            ('rung 3 incl. refinement (128 pt)', len(r3), best(r3, r3), best_risk(r3, r3)),
            ('rung-3 feasible', sum(1 for r in r3.values() if r['violation'] == 0),
             best(r3, [i for i, r in r3.items() if r['violation'] == 0]), float('nan')),
            ('shortlist (6; feasible picks)', sum(1 for i in sl if t['short'][i]['pick'] != 'infeasible on training'),
             best(r3, [i for i in sl if t['short'][i]['pick'] != 'infeasible on training']), float('nan')),
            ('qualified (confirmation 384 pt)', len(qualified), best({i: lv[i]['conf'] for i in qualified}, qualified),
             float('nan')),
            ('role holders', len(holders), best({i: lv[i]['conf'] for i in holders}, holders), float('nan')),
            ('sealed nominations (test pass/ambiguous)', len(nominees), best({i: lv[i]['conf'] for i in nominees}, nominees),
             float('nan')),
        ]
        for name, n, b, br in stages:
            funnel_csv.append([track, name, n, round(b) if math.isfinite(b) else '', round(br) if math.isfinite(br) else ''])
        funnel_rows.append((track, stages, r1_detail[track]))

    # ---------- shortlist → qualification → roles (c, d) ----------
    gate_rows = []
    role_rows = []
    for track, t in tracks.items():
        holders = list(t['roles'])
        for cid in t['short']:
            m = t['qual'].get(cid)
            conf = t['levels'][cid].get('conf')
            q = m['qualification'] if m else None
            failed = q['failed'] if q else ['(no record)']
            kinds = sorted({'risk' if g in RISK else ('stress' if g == 'Q7' else 'non-risk') for g in failed}) if failed else []
            sel_pooled = t['short'][cid]['selection']['pooled']['nb']
            gate_rows.append([track, t['short'][cid]['rank'], t['short'][cid]['pick'], cid,
                              'yes' if q and q['qualified'] else 'no', ','.join(failed) or '—', '/'.join(kinds) or '—',
                              c.pct(conf['share']) if conf else 'n/a', c.money(conf['p90']) if conf else 'n/a',
                              c.money(conf['robustY']) if conf else 'n/a', c.money(sel_pooled['robustPerYear']),
                              t['roles'].get(cid, '—')])
            if q and q['qualified'] and cid not in t['roles']:
                d = min(c.linf(t['books'][cid], t['books'][h]) for h in holders)
                jac = max(jaccard(m['ledger'], t['qual'][h]['ledger']) for h in holders)
                extras = sum(1 for h in holders if t['roles'][h] == 'extra')
                if d < 0.10:
                    why = f'within L∞ {d:.3f} < 0.10 of a holder'
                elif jac >= 0.5:
                    why = f'ledger Jaccard {jac:.2f} ≥ 0.5 with a holder (extra-role distinctness)'
                elif extras >= 2:
                    why = 'extra-role cap (2) reached'
                else:
                    why = 'not first in any role order (profit/robust/balanced) and not an extra in shortlist order'
                role_rows.append([track, t['short'][cid]['rank'], cid, c.money(sel_pooled['robustPerYear']),
                                  f'{d:.3f}', f'{jac:.2f}', why])

    # ---------- Q4 frontier per track and band (≥ 64-point records; distinct regions) ----------
    frontier_rows = []
    frontier_csv = []
    conservative = {}
    regions = {}
    for track, t in tracks.items():
        cand = []
        for cid, lv in t['levels'].items():
            r = best_level(lv)
            if r['level'] == 'r1' or not risk_ok(r):
                continue
            cand.append((cid, r))
        # regions: greedy representatives in robust order at L∞ ≥ 0.10 over all risk-feasible ≥ 64-point records;
        # each configuration belongs to the first representative within L∞ < 0.10 (R1 = the highest robust profit)
        order = [cid for _, cid in sorted((-r['robustY'], cid) for cid, r in cand)]
        reps = distinct_reps(order, t['books'])
        for cid in order:
            k = next(i for i, rep in enumerate(reps) if rep == cid or c.linf(t['books'][cid], t['books'][rep]) < 0.10)
            regions[(track, cid)] = f'R{k + 1}'
        regions[(track, '#count')] = len(reps)
        for name, lo, hi in c.BANDS:
            inband = sorted(((-r['robustY'], cid) for cid, r in cand if lo <= r['share'] < hi))
            seen = set()
            reps = []
            for _, cid in inband:
                if regions[(track, cid)] not in seen:
                    seen.add(regions[(track, cid)])
                    reps.append(cid)
            reps = reps[:3]
            for cid in reps:
                r = best_level(t['levels'][cid])
                cat, label = category(t, cid)
                frontier_rows.append((track, name, cid, cat, label, r, reasons.get((track, cid), '')))
                frontier_csv.append([track, name, cid, cat, label, r['level'], r['n'], round(r['share'], 4),
                                     round(c.wilson_lower(r['share'], r['n']), 4), round(r['p90']),
                                     round(r['worst']) if r['worst'] is not None else '', round(r['centreY']),
                                     round(r['medianY']), round(r['p10Y']), round(r['robustY']), round(r['dd']),
                                     r['lots'], r['episodes'], r['lotYears'], r['top1'],
                                     round(r['bestYearShare'], 4) if r['bestYearShare'] is not None else '',
                                     round(r['perCapitalYear']) if r['perCapitalYear'] else '',
                                     round(r['heldDays'] / TRAIN_DAYS_FROM_ARMING, 4) if r['heldDays'] else '',
                                     r['refused'], r['violation'],
                                     ';'.join(sorted(r['parts'])) if r['parts'] else '',
                                     c.near_bound_count(t['books'][cid]), vector_text(t['books'][cid]),
                                     config_ref(t, track, cid)])
        # conservative alternatives: Pareto-efficient on (robust ↑, share ↑, p90 ↓) among violation-free ≥64-pt
        # records, keeping those with share ≥ 0.98 and p90 below the track's profit-ranked holder's
        feas = [(cid, r) for cid, r in cand
                if (t['qual'][cid]['qualification']['qualified'] if r['level'] == 'conf' else r['violation'] == 0)]
        eff = []
        for cid, r in feas:
            dominated = any(o['robustY'] >= r['robustY'] and o['share'] >= r['share'] and o['p90'] <= r['p90'] and
                            (o['robustY'] > r['robustY'] or o['share'] > r['share'] or o['p90'] < r['p90'])
                            for _, o in feas)
            if not dominated:
                eff.append((cid, r))
        conservative[track] = sorted(eff, key=lambda x: -x[1]['robustY'])

    # ---------- Q6 training: the frontier at minimum shares 0.90 / 0.93 / 0.95 / 0.98 ----------
    sens_rows = []
    for track, t in tracks.items():
        for level, label in [('r3', 'rung 3 (128 pt; all r3 incl. refinement)'), ('conf', 'confirmation (384 pt; shortlist)')]:
            recs = [(cid, lv[level]) for cid, lv in t['levels'].items() if level in lv]
            if level == 'r3':
                recs = [(cid, r) for cid, r in recs if r['violation'] == 0]
            else:
                recs = [(cid, r) for cid, r in recs if t['qual'][cid]['qualification']['qualified']]
            base = None
            for thr in [0.90, 0.93, 0.95, 0.98]:
                sub = [r for _, r in recs if r['share'] >= thr]
                if not sub:
                    sens_rows.append([track, label, f'{thr:.2f}', 0, '—', '—', '—', '—', '—', '—'])
                    continue
                top = max(sub, key=lambda r: r['robustY'])
                base = base or top['robustY']
                sens_rows.append([track, label, f'{thr:.2f}', len(sub), c.money(top['robustY']),
                                  pct_of(top['robustY'], base), c.money(top['medianY']), c.money(top['p10Y']),
                                  c.money(top['centreY']), c.money(min(r['p90'] for r in sub))])

    # ---------- robust-profit formula sensitivity (report-only): would the profit pick change? ----------
    formula_rows = []
    weights = [('0.5·median + 0.5·p10 (sealed)', 0.5, 0.5, 0), ('median only', 1, 0, 0), ('p10 only', 0, 1, 0),
               ('0.75·median + 0.25·p10', 0.75, 0.25, 0), ('centre net only', 0, 0, 1)]
    for track, t in tracks.items():
        recs = {cid: lv['r3'] for cid, lv in t['levels'].items() if 'r3' in lv and lv['r3']['violation'] == 0}
        if not recs:
            continue
        for name, wm, wp, wc in weights:
            top = max(recs, key=lambda cid: (wm * recs[cid]['medianY'] + wp * recs[cid]['p10Y'] + wc * recs[cid]['centreY'],
                                             -recs[cid]['p90']))
            r = recs[top]
            pk = t['short'][top]['pick'] if top in t['short'] else '—'
            formula_rows.append([track, name, top, pk, t['roles'].get(top, '—'), c.pct(r['share']), c.money(r['p90']),
                                 c.money(r['robustY'])])

    # ---------- write ----------
    write_reports(tracks, refs, over_rows, examples, reasons, r1_rows, r1_detail, funnel_rows, gate_rows, role_rows,
                  frontier_rows, conservative, sens_rows, formula_rows, regions, leads)
    c.write_csv('f24-overlooked-candidates.csv',
                ['track', 'fidelity', 'id', 'category', 'band', 'n', 'share', 'wilsonLower', 'p90Dd', 'centrePerYear',
                 'medianPerYear', 'p10PerYear', 'robustPerYear', 'robustVsBestHolder', 'violation', 'parts',
                 'r1ResidualOtherConstraints'], over_csv)
    c.write_csv('f24-funnel.csv', ['track', 'stage', 'count', 'bestRobustPerYear', 'bestRiskFeasibleRobustPerYear'],
                funnel_csv)
    c.write_csv('f24-frontier.csv',
                ['track', 'band', 'id', 'category', 'label', 'fidelity', 'n', 'share', 'wilsonLower', 'p90Dd', 'worstDd',
                 'centrePerYear', 'medianPerYear', 'p10PerYear', 'robustPerYear', 'centreDd', 'lots', 'episodes',
                 'lotYears', 'top1Share', 'bestYearShare', 'perCapitalYear', 'occupancy', 'refused', 'violation',
                 'violatedParts', 'nearBoundCoordinates', 'vector', 'configReference'], frontier_csv)
    print('frontier: done')


def vector_text(books):
    """'VGT X 23.4 Y 0.9 stop 7.9 hold 15 L 71 buf 2.0 P 9.9 W 121 | …' (percentages in points)."""
    out = []
    for symbol, v in books.items():
        out.append(f'{symbol} X {v[0] / 10:.1f} Y {v[1] / 10:.1f} stop {v[2] / 10:.1f} hold {v[3]} L {v[4]} '
                   f'buf {v[5] / 10:.1f} P {v[6] / 10:.1f} W {v[7]}')
    return ' | '.join(out)


def config_ref(t, track, cid):
    """The sealed research configuration of a shortlist member (written only for F24 shortlist members)."""
    if cid in t['short']:
        return f"config/research-pools/study8-expanded-regime-d1/S8-{track}-F24-{t['short'][cid]['rank']}.json"
    return 'none (archive record only)'


REASON_KEYS = ['infeasible at rung 3', 'same funded-ledger signature', 'within L∞', 'not reached',
               'infeasible at rung 2', 'below the top 48']


def reason_key(text):
    key = next((k for k in REASON_KEYS if text.startswith(k)), text)
    if key == 'within L∞':
        key = 'within L∞ 0.10 of a shortlisted pick' if '0.10' in text else 'within L∞ 0.03 of a rung-3 pick'
    return key + (' [T2-rescored]' if 'T2-rescored' in text else '')


def pct_of(x, base):
    return f'{x / base * 100:.0f}%' if base else '—'


def write_reports(tracks, refs, over_rows, examples, reasons, r1_rows, r1_detail, funnel_rows, gate_rows, role_rows,
                  frontier_rows, conservative, sens_rows, formula_rows, regions, leads):
    level_name = {'r1': 'rung 1 (16 pt)', 'r2': 'rung 2 (64 pt)', 'r3': 'rung 3 (128 pt)', 'conf': 'confirmation (384 pt)'}

    # overlooked
    lines = ['# F24 training-only: risk-feasible configurations more profitable than the sealed holders',
             'Generated by `python3 research/study8-archive-audit/scripts/frontier.py`. **Training window only '
             '(2016-01-04 → 2024-12-31; arming 2017-06-15).** "Risk-feasible" = centre minute DD < $35,000, '
             'neighbourhood share ≥ 0.90 and p90 DD < $35,000 at the record\'s own fidelity (the original C1/C2 risk '
             'constraints; C3–C7 not required). The reference is the best sealed F24 role holder of the same track at '
             'the same fidelity (same seed family, common random numbers within a job). Categories: (a) rung 1 only; '
             '(b) evaluated at rung 2/3 but not shortlisted; (c) shortlisted, failed qualification; (d) qualified, no '
             'role; holders (e) are the reference and are excluded from the counts.',
             '## Reference holders (best robust profit/yr among the track\'s sealed F24 role holders)']
    ref_tab = []
    for track in c.TRACKS:
        row = [track]
        for level in ['r1', 'r2', 'r3', 'conf']:
            ref = refs[(track, level)]
            row.append(f"{c.money(ref[0])} ({ref[1][:24]}…)" if ref else 'n/a (holder not in this record)')
        ref_tab.append(row)
    lines.append(c.md_table(['track', 'rung 1 (16)', 'rung 2 (64)', 'rung 3 (128)', 'confirmation (384)'], ref_tab))
    lines.append('## Category sizes (every retained F24 configuration, any risk status)')
    tab = []
    for track in c.TRACKS:
        t = tracks[track]
        k = collections.Counter(category(t, cid)[0] for cid in t['levels'])
        nom = sum(1 for h in t['roles'] if t['status'].get(h) in ('pass', 'ambiguous'))
        tab.append([track, len(t['levels']), k['a'], k['b'], k['c'], k['d'], k['e'], nom])
    tot = [sum(r[i] for r in tab) for i in range(1, 8)]
    tab.append(['all'] + tot)
    lines.append(c.md_table(['track', 'configurations', 'a: rung 1 only', 'b: rung 2/3, not shortlisted',
                             'c: shortlisted, not qualified', 'd: qualified, no role', 'e: role holders',
                             'of which nominated'], tab))
    lines.append('## Violated constraint parts among infeasible rung-2 and rung-3 records (F24; counts of records)')
    tab = []
    for track in c.TRACKS:
        t = tracks[track]
        k = collections.Counter()
        only = collections.Counter()
        for cid, lv in t['levels'].items():
            for level in ('r2', 'r3'):
                if level in lv and lv[level]['violation']:
                    parts = set(lv[level]['parts'])
                    for p in parts:
                        k[p] += 1
                    if len(parts) == 1:
                        only[next(iter(parts))] += 1
        tab.append([track, '; '.join(f'{p} {n}' for p, n in sorted(k.items())) or '—',
                    '; '.join(f'{p} {n}' for p, n in sorted(only.items())) or '—'])
    lines.append(c.md_table(['track', 'records violating each part', 'records violating only that part'], tab))
    lines.append('## Counts by fidelity, category and share band')
    tab = []
    for track, level, ref, ref_rec, k in over_rows:
        tab.append([track, level_name[level], k[('risk-feasible', 'a')], k[('risk-feasible', 'b')],
                    k[('risk-feasible', 'c')], k[('risk-feasible', 'd')],
                    ' / '.join(str(k[(f'robust+{m:.0%}', 'a')] + k[(f'robust+{m:.0%}', 'b')] + k[(f'robust+{m:.0%}', 'c')] +
                                   k[(f'robust+{m:.0%}', 'd')]) for m in MARGINS),
                    ' / '.join(str(k[(f'all3+{m:.0%}', 'a')] + k[(f'all3+{m:.0%}', 'b')] + k[(f'all3+{m:.0%}', 'c')] +
                                   k[(f'all3+{m:.0%}', 'd')]) for m in MARGINS),
                    ' / '.join(str(k[('robust+10%', b[0])]) for b in c.BANDS),
                    'a {} · b {} · c {} · d {}'.format(*(k[('robust+10%', x)] for x in 'abcd'))])
    lines.append(c.md_table(['track', 'fidelity', 'risk-feasible non-holders: a', 'b', 'c', 'd',
                             'robust/yr ≥ ref +0% / +10% / +20%', 'centre, median AND p10 ≥ ref +0% / +10% / +20%',
                             '+10% robust by band 90–93 / 93–95 / 95–98 / 98–100', '+10% robust by category'], tab))
    lines.append('At rung 1 (n = 16) a share can only be 15/16 = 93.75% or 16/16 = 100% among risk-feasible values '
                 f'(Wilson one-sided 95% lower bounds {c.pct(c.wilson_lower(15 / 16, 16))} and '
                 f'{c.pct(c.wilson_lower(1.0, 16))}): **no 16-point record can establish ≥ 90%**. '
                 'Rung-1 counts are leads, not robust candidates.')
    lines.append('## The five highest robust-profit risk-feasible non-holders per track (≥ 64-point records, each at its '
                 'highest retained fidelity; L∞ ≥ 0.10 apart), with the gap to the best holder at the same fidelity')
    for track in c.TRACKS:
        t = tracks[track]
        if not examples[track]:
            lines.append(f'- **{track}:** none.')
            continue
        for cid, (_, _, r, ref_rec) in examples[track]:
            cat, label = category(t, cid)
            lines.append(f"- **{track}** `{cid}` [{cat}: {label}] — {fmt_rec(r, ref_rec['robustY'])}; centre DD "
                         f"{c.money(r['dd'])}; lots {r['lots']}, episodes {r['episodes']}; "
                         f"{'violated: ' + ', '.join(sorted(r['parts'])) if r['parts'] else 'no violated constraint'}"
                         f"{'; why not advanced: ' + reasons[(track, cid)] if (track, cid) in reasons else ''}.")
    lines.append('## Inputs')
    lines.append(c.inputs_block())
    c.write('f24-overlooked.md', '\n\n'.join(lines))

    # funnel + rung-1 decomposition + gates + roles
    lines = ['# F24 training-only selection funnel, exclusion reasons and gates',
             'Generated by `frontier.py`. Robust profit/yr = (½·median + ½·p10) ÷ y, y = 7.536 training years, at each '
             'stage\'s own fidelity (rung 1: 16 points; rung 2: 64; rung 3: 128; confirmation: 3 × 128). Values at '
             'different fidelities are different estimates and are not directly comparable; within a stage they share '
             'common random numbers.']
    for track, stages, det in funnel_rows:
        lines.append(f'## {track}')
        lines.append(c.md_table(['stage', 'count', 'best robust/yr', 'best risk-feasible robust/yr'],
                                [[n, f'{k:,}', c.money(b), c.money(br)] for n, k, b, br in stages]))
        hr = det['holderR1']
        lines.append(
            f"Rung 1: the feasible Pareto front (four objectives, 16-point values) has {det['front']:,} members; "
            f"{det['frontPromoted']} were promoted and {det['frontNotPromoted']:,} were not (rung 2 takes 192 by "
            f"constrained rank with crowding and L∞ ≥ 0.02). Feasible but unpromoted configurations above the best "
            f"promoted rung-1 robust profit ({c.money(det['promotedBest'])}/yr): {det['unpromotedAbovePromotedBest']}; "
            f"above the best holder's rung-1 value ({c.money(hr[0]) + '/yr' if hr else 'n/a — no holder has a rung-1 record'}): "
            f"{det['unpromotedAboveHolder'] if hr else 'n/a'}.")
    lines.append('## Rung-1-only leads (category a): risk-feasible at 16 points and above the best holder\'s own '
                 '16-point robust profit — leads only, not robust candidates')
    tab = []
    for track in c.TRACKS:
        ref, rows, total, feas_n, _, _ = leads[track]
        for cid, r, d, why in rows:
            tab.append([track, total, f'`{cid}`', f"{r['share'] * 16:.0f}/16", c.money(r['p90']), c.money(r['centreY']),
                        c.money(r['medianY']), c.money(r['p10Y']), c.money(r['robustY']),
                        f"{(r['robustY'] / ref[0] - 1) * 100:+.1f}%", f'{d:.3f}', why])
        if not rows:
            tab.append([track, total, '—', '', '', '', '', '', '', '', '', 'none' if ref else 'no holder has a rung-1 record'])
    lines.append(c.md_table(['track', 'leads', 'feasible (not promoted)', 'infeasible (non-risk constraints)',
                             'with share 16/16', 'largest excess among 16/16 leads'],
                            [[tr, leads[tr][2], leads[tr][3], leads[tr][2] - leads[tr][3], leads[tr][4],
                              f'{leads[tr][5]:+.1%}' if leads[tr][4] else '—'] for tr in c.TRACKS]))
    lines.append(c.md_table(['track', 'leads (all)', 'id (≤ 5 distinct shown)', 'share', 'p90 DD', 'centre/yr',
                             'median/yr', 'p10/yr', 'robust/yr', 'vs holder (16 pt)', 'L∞ to nearest promoted',
                             'status'], tab))
    lines.append('## Rung-1 constraint decomposition (counts of infeasible archive rows by violated part)')
    lines.append('C1, C2, C3 lots/episodes and C5 are recomputed from the archive columns; "other" is the remainder of '
                 'the sealed violation, i.e. C3 lot-years, C4 per-book lots, C6 capital efficiency or C7 concentration '
                 '(their inputs are not in the archive, so they cannot be told apart). A row counts once per part.')
    lines.append(c.md_table(['track', 'archive', 'feasible', 'front', 'front promoted', 'front not promoted', 'C1',
                             'C2 share', 'C2 p90', 'C3 lots', 'C3 episodes', 'C5 median', 'C5 p10', 'other',
                             'only other', 'risk-feasible but infeasible', 'recomputation mismatches'], r1_rows))
    lines.append('## Shortlist members: qualification gates (confirmation evidence, training door)')
    lines.append(c.md_table(['track', 'order', 'pick', 'id', 'qualified', 'failed gates', 'kind', 'conf share',
                             'conf p90', 'conf robust/yr', 'selection robust/yr', 'role'], gate_rows))
    lines.append('## Opportunity cost of the shortlist step (rung 3, 128 points, same seed family)')
    tab = []
    for track in c.TRACKS:
        t = tracks[track]
        r3 = [(cid, lv['r3']) for cid, lv in t['levels'].items() if 'r3' in lv and lv['r3']['violation'] == 0]
        inside = [r['robustY'] for cid, r in r3 if cid in t['short']]
        outside = sorted(((r['robustY'], cid) for cid, r in r3 if cid not in t['short']), reverse=True)
        if inside and outside:
            b, o = max(inside), outside[0]
            tab.append([track, c.money(b), f'`{o[1]}`', c.money(o[0]), f'{o[0] / b - 1:+.1%}', len(outside)])
    lines.append(c.md_table(['track', 'best shortlisted (r3 robust/yr)', 'best rung-3-feasible not shortlisted',
                             'its r3 robust/yr', 'difference', 'r3-feasible not shortlisted'], tab))
    lines.append('## Qualified members without a role (category d)')
    lines.append(c.md_table(['track', 'order', 'id', 'selection robust/yr', 'L∞ to nearest holder',
                             'max ledger Jaccard with holders', 'deduced reason'], role_rows) if role_rows else 'None.')
    lines.append('## Why rung-3 configurations were not shortlisted, and rung-2 ones not promoted (F24)')
    tab = []
    for track in c.TRACKS:
        k = collections.Counter(reason_key(v) for (tr, _), v in reasons.items() if tr == track)
        tab.append([track, '; '.join(f'{n} × {why}' for why, n in sorted(k.items(), key=lambda x: -x[1]))])
    lines.append(c.md_table(['track', 'reasons (counts)'], tab))
    lines.append('## Robust-profit formula sensitivity (report-only): the top rung-3-feasible configuration by each '
                 'scoring rule')
    lines.append(c.md_table(['track', 'rule', 'top id', 'shortlist pick', 'role', 'r3 share', 'r3 p90', 'r3 robust/yr'],
                            formula_rows))
    c.write('f24-funnel.md', '\n\n'.join(lines))

    # frontier
    lines = ['# F24 training-only profit–robustness frontier by share band',
             'Generated by `frontier.py`. Per track and share band, the three highest robust-profit risk-feasible '
             'configurations that are at least L∞ 0.10 apart (the shortlist\'s distinctness), from records with ≥ 64 '
             'points (rung 2, rung 3, shortlist or confirmation; each at its highest retained fidelity). Rung-1-only '
             'configurations are excluded (16 points cannot establish a share). Share precision: Wilson one-sided 95% '
             'lower bound; p90 DD precision: the neighbourhood\'s worst DD is an upper confidence bound for the true '
             'p90 at 1 − 0.9ⁿ (99.88% at n = 64; > 99.99% at n ≥ 128). Occupancy = held calendar days ÷ '
             f'{TRAIN_DAYS_FROM_ARMING} days from arming to 2024-12-31; contention = refused signals.']
    for track in c.TRACKS:
        lines.append(f'## {track}')
        tab = []
        for tr, band, cid, cat, label, r, why in frontier_rows:
            if tr != track:
                continue
            tab.append([band, regions[(track, cid)], f'`{cid}`', f'{cat}: {label}', r['level'], r['n'],
                        f"{c.pct(r['share'])} [{c.pct(c.wilson_lower(r['share'], r['n']))}]",
                        f"{c.money(r['p90'])} [{c.money(r['worst'])}]", c.money(r['centreY']), c.money(r['medianY']),
                        c.money(r['p10Y']), c.money(r['robustY']), c.money(r['dd']), f"{r['lots']}/{r['episodes']}",
                        c.pct(r['top1']) if r['top1'] is not None else 'n/a',
                        c.pct(r['bestYearShare']) if r['bestYearShare'] is not None else 'n/a',
                        c.money(r['perCapitalYear']),
                        c.pct(r['heldDays'] / TRAIN_DAYS_FROM_ARMING) if r['heldDays'] else 'n/a', r['refused'],
                        ', '.join(sorted(r['parts'])) or '—', why or '—'])
        lines.append(f"{regions[(track, '#count')]} distinct regions (L∞ ≥ 0.10 representatives) among risk-feasible "
                     "≥ 64-point records; R1 holds the highest robust profit. At most one row per region per band.")
        lines.append(c.md_table(['band', 'region', 'id', 'category', 'record', 'n', 'share [Wilson LB]', 'p90 DD [worst]',
                                 'centre/yr', 'median/yr', 'p10/yr', 'robust/yr', 'centre DD', 'lots/episodes',
                                 'top lot', 'best year', 'net per capital-year', 'occupancy', 'refused',
                                 'violated', 'why not advanced'], tab) if tab else 'No risk-feasible ≥ 64-point record.')
        eff = conservative[track]
        lines.append('Efficient set on (robust/yr ↑, share ↑, p90 ↓) among violation-free ≥ 64-point records '
                     f'({len(eff)} configurations; highest robust first, at most 8 shown):')
        lines.append(c.md_table(['region', 'id', 'category', 'record', 'share', 'p90 DD', 'robust/yr', 'centre/yr', 'lots'],
                                [[regions.get((track, cid), '—'), f'`{cid}`', ': '.join(category(tracks[track], cid)), r['level'], c.pct(r['share']),
                                  c.money(r['p90']), c.money(r['robustY']), c.money(r['centreY']), r['lots']]
                                 for cid, r in eff[:8]]))
    lines.append('## Vectors and configuration references of the rows above')
    seen = set()
    vec = []
    for tr, band, cid, cat, label, r, why in frontier_rows:
        if (tr, cid) in seen:
            continue
        seen.add((tr, cid))
        vec.append([tr, f'`{cid}`', vector_text(tracks[tr]['books'][cid]), config_ref(tracks[tr], tr, cid)])
    lines.append(c.md_table(['track', 'id', 'vector (X/Y/stop/buffer/P in %, hold sessions, L/W sessions/minutes)',
                             'configuration'], vec))
    c.write('f24-frontier.md', '\n\n'.join(lines))

    lines = ['# F24 training-only share-threshold sensitivity (report-only; no gate is changed)',
             'Generated by `frontier.py`. For each minimum share, the best robust profit among configurations feasible '
             'under every other sealed constraint (rung 3: violation 0 at 128 points; confirmation: qualified '
             'shortlist members), and its percentage of the 0.90 best. Not a probability of future safety.',
             c.md_table(['track', 'record', 'min share', 'count', 'best robust/yr', '% of 0.90 best', 'its median/yr',
                         'its p10/yr', 'its centre/yr', 'lowest p90 DD in set'], sens_rows)]
    c.write('f24-share-threshold.md', '\n\n'.join(lines))


if __name__ == '__main__':
    main()
