#!/usr/bin/env python3
"""Study 9 tables: CSV/JSON/Markdown tables generated from the sealed records (standard library only, read-only).

Usage (from the repository root):
  python3 research/study9-etf-pool-discovery/scripts/build_tables.py s0|s1|s2|s3|all

It reads results/s0, s1, s2 and s3 and writes results/tables/. It recomputes no strategy quantity: every number is
copied, aggregated or ranked from the sealed records.
"""
import csv
import glob
import json
import os
import statistics
import sys

S = "research/study9-etf-pool-discovery"
R = os.environ.get("STUDY9_RESULTS", f"{S}/results")  # override only for the pre-freeze smoke test
T = f"{R}/tables"


def load(path):
    with open(path) as handle:
        return json.load(handle)


def write_csv(name, header, rows):
    os.makedirs(T, exist_ok=True)
    with open(f"{T}/{name}", "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def write_md(name, lines):
    os.makedirs(T, exist_ok=True)
    with open(f"{T}/{name}", "w") as handle:
        handle.write("\n".join(lines) + "\n")


def money(value, digits=0):
    if value is None or value != value or value in (float("inf"), float("-inf")):
        return "—"
    return f"${value:,.{digits}f}"


def pct(value, digits=1):
    if value is None or value != value:
        return "—"
    return f"{100 * value:.{digits}f}%"


def num(value, digits=2):
    if value is None or value != value:
        return "—"
    return f"{value:.{digits}f}"


# ----- S0 -----


def s0():
    audit = load(f"{R}/s0/symbols.json")
    rows = []
    for r in audit["records"]:
        sparse_training = sum(r["sparseByYear"].values())
        rows.append(
            [
                r["symbol"],
                r["canonical"],
                r["eligible"],
                r["cluster"],
                r["quality"],
                r["firstSession"],
                r["lastSession"],
                r["sessions"],
                r["newSessionsInRefresh"],
                len(r["missingSessions"]),
                len(r["sessionsOnClosedDays"]),
                round(r["coverageMedianTraining"], 4),
                sparse_training,
                r["sparsePost2024"],
                round(r["medianDollarVolumeTraining"]),
                round(r["p10DollarVolumeTraining"]),
                round(r["medianDollarVolumePost2024"]),
                r["medianBarsPerSessionTraining"],
                round(r["lotShareOfMedianMinuteDollarVolume"], 3),
                round(r["flatBarShareTraining"], 4),
                r["zeroVolumeBars"],
                r["staleSessionsTraining"],
                round(r["firstBarAt0930Share"], 4),
                r["extendedHoursBars"],
                r["earlyCloseLateBarDays"],
                ";".join(f"{s['effectiveDate']}x{s['ratio']}" for s in r["splitsRegistered"]),
                len(r["unexplainedSplitSizedTraining"]),
                r["unexplainedSplitSizedPost2024"],
                ";".join(f"{m['date']}x{m['ratio']:.3f}" for m in r["movesBeyond15Training"]),
                "".join("1" if r["rules"][k] else "0" for k in ["D1", "D2", "D3", "D4", "D5"]),
                (r["priorVintage"] or {}).get("prefixMatches"),
                r["file"]["sha256"],
                "; ".join(r["reasons"]),
            ]
        )
    header = [
        "symbol", "canonical", "eligible", "cluster", "quality", "firstSession", "lastSession", "sessions",
        "newSessions", "missingSessions", "closedDaySessions", "coverageMedianTraining", "sparseSessionsTraining",
        "sparseSessionsPost2024", "medianDollarVolumeTraining", "p10DollarVolumeTraining",
        "medianDollarVolumePost2024", "medianBarsPerSessionTraining", "lotShareOfMedianMinuteDollarVolume",
        "flatBarShareTraining", "zeroVolumeBars", "staleSessionsTraining", "firstBarAt0930Share", "extendedHoursBars",
        "earlyCloseLateBarDays", "splitsRegistered", "unexplainedSplitSizedTraining", "unexplainedSplitSizedPost2024",
        "movesBeyond15Training", "rulesD1toD5", "priorVintagePrefixMatches", "refreshedSha256", "reasons",
    ]
    write_csv("s0-symbols.csv", header, rows)
    md = [
        "| Symbol | Eligible | Cluster | Quality | Sessions (+new) | Train coverage | Sparse sessions train / post | Train median $ volume | $100k lot ÷ median bar $ | Splits | Moves > 15% (train) | D1–D5 | Reasons |",
        "|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|",
    ]
    for r in sorted(audit["records"], key=lambda x: (not x["eligible"], x["cluster"], x["symbol"])):
        md.append(
            f"| {r['symbol']} | {'yes' if r['eligible'] else '**no**'} | {r['cluster']} | {r['quality']} | "
            f"{r['sessions']:,} (+{r['newSessionsInRefresh']}) | {pct(r['coverageMedianTraining'])} | "
            f"{sum(r['sparseByYear'].values())} / {r['sparsePost2024']} | {money(r['medianDollarVolumeTraining'] / 1e6, 1)}M | "
            f"{num(r['lotShareOfMedianMinuteDollarVolume'])} | "
            f"{', '.join(s['effectiveDate'] + ' ' + str(s['ratio']) + ':1' for s in r['splitsRegistered']) or '—'} | "
            f"{', '.join(m['date'] + ' ×' + format(m['ratio'], '.3f') for m in r['movesBeyond15Training']) or '—'} | "
            f"{''.join('✓' if r['rules'][k] else '✗' for k in ['D1', 'D2', 'D3', 'D4', 'D5'])} | {'; '.join(r['reasons']) or '—'} |"
        )
    write_md("s0-symbols.md", md)
    print(f"s0: {len(rows)} symbols → {T}/s0-symbols.csv, s0-symbols.md")


# ----- S1 -----


def spearman(a, b):
    def ranks(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        out = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                out[order[k]] = (i + j) / 2
            i = j + 1
        return out

    if len(a) < 3:
        return None
    ra, rb = ranks(a), ranks(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    num_ = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    da = sum((x - ma) ** 2 for x in ra) ** 0.5
    db = sum((y - mb) ** 2 for y in rb) ** 0.5
    return num_ / (da * db) if da and db else None


def s1_records():
    audit = load(f"{R}/s0/symbols.json")
    return audit, {s: load(f"{R}/s1/etf/{s}.json") for s in audit["eligible"]}


def s1():
    audit, recs = s1_records()
    meta = {r["symbol"]: r for r in audit["records"]}
    vec_rows, etf_rows = [], []
    shrink, spear = [], []
    for s, rec in recs.items():
        y = rec["y"]
        for v in rec["vectors"]:
            c, f16, fin = v["centre"], v["nb16"], v["final"]
            vec_rows.append([
                s, v["index"], v["half"], v["id"], v["rank"], v["plausible"], round(c["perYear"], 2), round(c["dd"], 2),
                c["lots"], c["episodes"], round(c["occupancy"], 4), round(c["perCapitalYear"], 2),
                f16["n"], round(f16["share"], 4), round(f16["medianPerYear"], 2), round(f16["p10PerYear"], 2),
                round(f16["robustPerYear"], 2), round(f16["p90Dd"], 2), round(f16["violation"], 4),
                v.get("nb64", {}).get("robustPerYear"), v.get("nb64", {}).get("share"),
                fin["n"], round(fin["share"], 4), round(fin["robustPerYear"], 2), round(fin["violation"], 4),
                round(c["periods"].get("EARLY", 0), 2), round(c["periods"].get("LATE", 0), 2),
                round(c["periods"].get("M2020", 0), 2),
                ";".join(f"{k}={round(val, 3)}" for k, val in fin["parts"].items()),
            ])
        top = [v for v in rec["vectors"] if "nb64" in v]
        if top:
            r16 = [v["nb16"]["robustPerYear"] for v in top]
            r64 = [v["nb64"]["robustPerYear"] for v in top]
            shrink.extend([b - a for a, b in zip(r16, r64)])
            sp = spearman(r16, r64)
            if sp is not None:
                spear.append(sp)
        sm = rec["summary"]
        best = sm["best"]
        bc, bf = best["centre"], best["final"]
        etf_rows.append([
            s, meta[s]["cluster"], meta[s]["quality"], sm["plausible"], sm["feasible16"], sm["feasibleFinal"],
            round(sm["breadth"], 4), round(sm["medianCentrePerYear"], 2), best["id"], best["half"],
            bf["n"], round(bf["share"], 4), round(bf["robustPerYear"], 2), round(bf["medianPerYear"], 2),
            round(bf["p10PerYear"], 2), round(bf["p90Dd"], 2), round(bf["violation"], 4),
            round(bc["perYear"], 2), round(bc["dd"], 2), bc["lots"], bc["episodes"], round(bc["occupancy"], 4),
            round(bc["perCapitalYear"], 2), bc["top1Share"], round(bc["bestYear"] / bc["net"], 4) if bc["net"] > 0 else None,
            bc["bestYearKey"], round(bc["periods"].get("M2020", 0) / bc["net"], 4) if bc["net"] > 0 else None,
            round(bc["periods"].get("EARLY", 0), 2), round(bc["periods"].get("LATE", 0), 2),
            None if sm["earlyLateSpearman"] is None else round(sm["earlyLateSpearman"], 3),
            (sm["earlyPick"] or {}).get("id"), (sm["earlyPick"] or {}).get("lateRobust"),
            "|".join(m["id"] for m in rec["menu"]["A"] + rec["menu"]["B"]),
            sum(1 for m in rec["menu"]["A"] + rec["menu"]["B"] if not m["plausible"]),
            rec["compute"]["seconds"], rec["compute"]["points"],
        ])
    write_csv("s1-vectors.csv", [
        "symbol", "index", "half", "id", "rank", "plausible", "centrePerYear", "centreDd", "lots", "episodes", "occupancy",
        "perCapitalYear", "nb16N", "nb16Share", "nb16MedianPerYear", "nb16P10PerYear", "nb16RobustPerYear", "nb16P90Dd",
        "nb16Violation", "nb64RobustPerYear", "nb64Share", "finalN", "finalShare", "finalRobustPerYear", "finalViolation",
        "centreEarly", "centreLate", "centreM2020", "finalViolatedParts",
    ], vec_rows)
    write_csv("s1-etf-summary.csv", [
        "symbol", "cluster", "quality", "plausibleVectors", "feasible16", "feasibleFinal", "breadth",
        "medianCentrePerYearAll64", "bestId", "bestHalf", "bestN", "bestShare", "bestRobustPerYear", "bestMedianPerYear",
        "bestP10PerYear", "bestP90Dd", "bestViolation", "bestCentrePerYear", "bestCentreDd", "bestLots", "bestEpisodes",
        "bestOccupancy", "bestPerCapitalYear", "bestTop1Share", "bestYearShare", "bestYearKey", "bestM2020Share",
        "bestCentreEarly", "bestCentreLate", "earlyLateSpearman64", "earlyPickId", "earlyPickLateRobust", "menu",
        "menuNotPlausible", "seconds", "points",
    ], etf_rows)
    wf = []
    for sym, rec in recs.items():
        for w in rec["summary"]["walkForward"]:
            wf.append([sym, w["fold"], w["next"], None if w["spearman"] is None else round(w["spearman"], 3), w["pick"], round(w["pickNext"], 2), round(w["pickNextPercentile"], 3), round(w["medianNext"], 2)])
    write_csv("s1-walkforward.csv", ["symbol", "fold", "nextYear", "spearman64", "pickId", "pickNextRobust", "pickNextPercentile", "medianNextRobust"], wf)
    feasible_any = [r for r in etf_rows if r[5] > 0]
    plausible_any = [r for r in etf_rows if r[3] > 0]
    write_md("s1-funnel.md", [
        f"- eligible ETFs: {len(etf_rows)}",
        f"- ≥ 1 plausible vector (DD < $35k, net > 0, ≥ 2 lots): {len(plausible_any)}",
        f"- ≥ 1 Study 8-feasible vector at 16 points: {sum(1 for r in etf_rows if r[4] > 0)}",
        f"- ≥ 1 Study 8-feasible vector at the final precision (80 points for the top 8): {len(feasible_any)}",
        f"- vectors measured: {len(vec_rows)} (64 per ETF); neighbourhood points: {sum(r[-1] for r in etf_rows)}",
        f"- 16 → 64-point robust/yr change on the top 8 per ETF: median {money(statistics.median(shrink)) if shrink else '—'}, "
        f"mean {money(statistics.mean(shrink)) if shrink else '—'} (n = {len(shrink)})",
        f"- Spearman(16-point, 64-point robust/yr) among each ETF's top 8: median {num(statistics.median(spear)) if spear else '—'} "
        f"over {len(spear)} ETFs",
    ])
    print(f"s1: {len(etf_rows)} ETFs, {len(vec_rows)} vectors → {T}/s1-*.csv")


# ----- S2 -----


def s2():
    rec = load(f"{R}/s2/s2.json")
    audit = load(f"{R}/s0/symbols.json")
    meta = {r["symbol"]: r for r in audit["records"]}
    symbols = audit["eligible"]
    keys = ["alpha", "beta", "gamma1", "gamma2", "gamma3", "gamma4"]
    write_csv("s2-assignments.csv", ["symbol"] + keys, [[sym] + [rec["assignments"][k][sym]["id"] for k in keys] for sym in symbols])
    st = rec["standalone"]
    write_csv("s2-standalone.csv", ["symbol", "assignment", "net", "dd", "ddDaily", "lots", "episodes", "decisions", "occupancy", "interest", "costs"],
              [[sym, k, round(st[k][sym]["net"], 2), round(st[k][sym]["dd"], 2), round(st[k][sym]["ddDaily"], 2), st[k][sym]["lots"], st[k][sym]["episodes"], st[k][sym]["decisions"], round(st[k][sym]["occupancy"], 4), round(st[k][sym]["interest"], 2), round(st[k][sym]["costs"], 2)] for k in ["alpha", "beta"] for sym in symbols])
    cols = ["a", "b", "returnCorr"] + [f"{k}{m}" for k in ["alpha", "beta"] for m in ["DecA", "DecB", "MatchAB", "MatchBA", "MatchMin", "Offset", "CollideAB", "CollideBA", "EquityCorr"]]
    write_csv("s2-pairs.csv", cols, [[p.get(c) for c in cols] for p in rec["pairs"]])
    top = sorted([p for p in rec["pairs"] if p.get("alphaMatchMin") is not None and min(p["alphaDecA"], p["alphaDecB"]) >= 4],
                 key=lambda p: (-(p["alphaMatchMin"] or 0), p["a"], p["b"]))[:30]
    md = ["| Pair | ρ (daily returns) | α match min (A→B / B→A) | β match min | α collision A→B / B→A | α equity ρ | α offset (sessions) |", "|---|---:|---:|---:|---:|---:|---:|"]
    for p in top:
        md.append(f"| {p['a']}–{p['b']} | {num(p['returnCorr'])} | {num(p['alphaMatchMin'])} ({num(p['alphaMatchAB'])} / {num(p['alphaMatchBA'])}) | {num(p['betaMatchMin'])} | {num(p['alphaCollideAB'])} / {num(p['alphaCollideBA'])} | {num(p['alphaEquityCorr'])} | {num(p['alphaOffset'], 1)} |")
    write_md("s2-pairs-top.md", md)
    corr = sorted([p for p in rec["pairs"] if p["returnCorr"] is not None], key=lambda p: -p["returnCorr"])[:25]
    write_md("s2-pairs-corr.md", ["| Pair | ρ | α match min | β match min |", "|---|---:|---:|---:|"] + [f"| {p['a']}–{p['b']} | {num(p['returnCorr'])} | {num(p['alphaMatchMin'])} | {num(p['betaMatchMin'])} |" for p in corr])
    groups = [g for g in rec["groups"] if len(g["members"]) > 1]
    write_md("s2-groups.md", ["Complete-linkage opportunity-source groups (one repository cluster, ≤ 3 members):", "", "| Group | Members |", "|---|---|"]
             + [f"| {g['id']} | {', '.join(g['members'])} |" for g in groups]
             + ["", "Single-linkage components (reported only): " + ("; ".join(f"{c['size']}: {', '.join(c['members'])}" for c in rec["components"]) or "none"),
                "", f"Duplicate edges: {len(rec['duplicateEdges'])}; merges refused: " + (", ".join(f"{m['a']}–{m['b']} ({m['reason']})" for m in rec["rejectedMerges"]) or "none"),
                "", f"Direct proxies: VGT → {', '.join(rec['directProxies']['VGT']) or 'none'}; GDX → {', '.join(rec['directProxies']['GDX']) or 'none'}.",
                "", "Forbidden per family: " + "; ".join(f"{f}: {', '.join(v) or 'none'}" for f, v in rec["forbidden"].items()),
                "", "Redundant-proxy decisions: " + ("; ".join(f"{f}: " + ", ".join(f"{c} {d}" for c, d in v.items()) for f, v in rec["redundantDecisions"].items() if v) or "none")])
    for k in ["alpha", "beta"]:
        ev = rec["events"][k]
        write_csv(f"s2-events-{k}.csv", ["symbol", "decisions", "families", "marketWideShare", "soloFamilies", "independentEvents"],
                  [[sym, v["decisions"], v["families"], v["marketWideShare"], v["soloFamilies"], v["independentEvents"]] for sym, v in ev["perSymbol"].items()])
    ev = rec["events"]["alpha"]
    write_md("s2-events-alpha.md", [f"Decisions {ev['decisions']}; families {ev['clusters']}; market-wide (≥ 10 ETFs) {len(ev['marketWide'])} holding {ev['inMarketWide']} decisions ({pct(ev['inMarketWide'] / ev['decisions'])}); solo families {ev['solo']}.", "", "| Family | First | Last | ETFs | Decisions |", "|---|---|---|---:|---:|"] +
             [f"| {c['id']} | {c['first']} | {c['last']} | {c['etfs']} | {c['decisions']} |" for c in ev["marketWide"]])
    cont = rec["contention"]
    ccols = list(cont[0].keys())
    write_csv("s2-contention.csv", ccols, [[c[k] for k in ccols] for c in cont])
    lines = []
    for policy in rec["anchorPolicies"]:
        rows = [c for c in cont if c["policy"] == policy["key"]]
        by = {}
        for c in rows:
            by.setdefault(c["candidate"], []).append(c)
        agg = []
        for cand, cs in by.items():
            agg.append((statistics.mean(c["deltaNetPerYear"] for c in cs), cand, cs))
        agg.sort(key=lambda x: (-x[0], x[1]))
        pos = sum(1 for a in agg if a[0] > 0)
        base = {c["assignment"]: (c["baseNet"], c["baseDd"], c["baseLots"]) for c in rows}
        lines += [f"### Policy {policy['key']} ({' + '.join(policy['books'])}; family {policy['family']})", "",
                  f"Anchor alone: α net {money(base['alpha'][0])}, DD {money(base['alpha'][1])}, {base['alpha'][2]} lots; β net {money(base['beta'][0])}, DD {money(base['beta'][1])}, {base['beta'][2]} lots. "
                  f"Candidates with a positive mean marginal Δnet/yr: {pos} of {len(agg)}. Median candidate idle-entry share {pct(statistics.median([c['candidateIdleShare'] for c in rows if c['candidateIdleShare'] is not None]))}.", "",
                  "| Candidate | Mean Δnet/yr | Δnet/yr α / β | ΔDD α / β | Cand. lots α / β | Cand. refused α / β | Displaced anchor lots α / β | Idle-entry share α | Idle standalone net α |",
                  "|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
        for mean, cand, cs in agg[:15]:
            a = next(c for c in cs if c["assignment"] == "alpha")
            b = next(c for c in cs if c["assignment"] == "beta")
            lines.append(f"| {cand} | {money(mean)} | {money(a['deltaNetPerYear'])} / {money(b['deltaNetPerYear'])} | {money(a['deltaDd'])} / {money(b['deltaDd'])} | {a['candidateLots']} / {b['candidateLots']} | {a['candidateRefused']} / {b['candidateRefused']} | {a['displacedAnchorLots']} / {b['displacedAnchorLots']} | {pct(a['candidateIdleShare'])} | {money(a['candidateIdleStandaloneNet'])} |")
        lines.append("")
    write_md("s2-contention-summary.md", lines)
    cl = rec["candidateLists"]
    lines = ["| Family | Seeds | Primary (risk-flagged in italics) | Exploratory |", "|---|---|---|---|"]
    for fam in ["V", "G", "VG", "N"]:
        c = cl[fam]
        prim = ", ".join(f"*{x}*" if x in c["riskFlagged"] else x for x in c["primary"])
        lines.append(f"| {fam} | {', '.join(c['seeds']) or '—'} | {prim} | {', '.join(c['exploratory'])} |")
    lines += ["", "| Family | Candidate | Role | Mean marginal Δnet/yr | Risk OK | S1 opportunity | Distinctness | Group | Cluster |", "|---|---|---|---:|---|---:|---:|---|---|"]
    for fam in ["V", "G", "VG", "N"]:
        c = cl[fam]
        for x, info in c["scores"].items():
            role = "seed" if x in c["seeds"] else "primary" if x in c["primary"] else "exploratory"
            lines.append(f"| {fam} | {x} | {role} | {money(info['marginalNetPerYear'])} | {info['riskOk']} | {money(info['opportunity'])} | {num(info['distinctness'])} | {info['group']} | {info['cluster']} |")
    lines += ["", f"N seeds: {', '.join(rec['seeds'])}.", "", "Protected list (best ETF per cluster): " + ", ".join(f"{p['symbol']} ({p['cluster']})" for p in rec["protectedList"]) + ".", "",
              "Weak but distinct: " + (", ".join(f"{w['symbol']} ({w['cluster']}, distinctness {num(w['distinctFromVG'])}, market-wide share {pct(w['marketWideShare'])})" for w in rec["weakDistinct"]) or "none") + "."]
    write_md("s2-candidates.md", lines)
    print(f"s2: {len(rec['pairs'])} pairs, {len(cont)} contention rows → {T}/s2-*")


# ----- S3 -----

STRATA = [(f, k) for k in [2, 3, 4, 5] for f in ["V", "G", "VG", "N"]]
PARTS = ["V", "G", "VG", "N", "C"]


def best_eval(p):
    return next(e for e in p["evals"] if e["assignment"] == p["best"])


def s3():
    strata = {(f, k): load(f"{R}/s3/screen/{f}{k}.json") for f, k in STRATA}
    mids = [m for part in PARTS for m in load(f"{R}/s3/mid-{part}.json")["mids"]]
    high = [h for part in PARTS for h in load(f"{R}/s3/high-{part}.json")["highs"]]
    nom = load(f"{R}/s3/nominations.json")
    rows = []
    for (f, k), st in strata.items():
        for i, p in enumerate(st["proposals"]):
            e = best_eval(p)
            a = next(x for x in p["evals"] if x["assignment"] == "alpha")
            loo = p["loo"]["perBook"]
            rows.append([f, k, i + 1, p["id"], p["stream"], p.get("parent"), ";".join(p["proxyMembers"]), p["uniqueAssignments"],
                         p["feasibleAssignments"], p["best"], round(p["bestRobustPerYear"], 2), round(p["medianRobustPerYear"], 2),
                         round(e["centre"]["perYear"], 2), round(e["centre"]["dd"], 2), e["centre"]["lots"], e["centre"]["episodes"],
                         round(e["centre"]["occupancy"], 4), round(e["centre"]["interest"], 2), round(e["centre"]["costs"], 2), e["centre"]["refused"],
                         e["fit"]["n"], round(e["fit"]["share"], 4), round(e["fit"]["medianPerYear"], 2), round(e["fit"]["p10PerYear"], 2),
                         round(e["fit"]["p90Dd"], 2), round(e["fit"]["violation"], 4), round(e["fit"]["earlyRobustPerYear"], 2), round(e["fit"]["lateRobustPerYear"], 2),
                         round(a["fit"]["robustPerYear"], 2), round(a["fit"]["violation"], 4),
                         ";".join(f"{s_}:{v.get('lots')}/{v.get('episodes')}/{round(v.get('deltaPerYear', 0))}/{v.get('displacedOthersLots', 0)}/{v.get('refused')}" for s_, v in loo.items()),
                         ";".join(f"{x['assignment']}:{round(x['fit']['robustPerYear'])}:{round(x['fit']['violation'], 3)}" + (f"=dup({x['duplicateOf']})" if x.get("duplicateOf") else "") for x in p["evals"])])
    write_csv("s3-proposals.csv", ["family", "size", "screenRank", "pool", "stream", "parent", "proxyMembers", "uniqueAssignments", "feasibleAssignments",
                                   "bestAssignment", "bestRobustPerYear", "medianRobustPerYearUnique", "bestCentrePerYear", "bestCentreDd", "bestLots", "bestEpisodes",
                                   "bestOccupancy", "bestInterest", "bestCosts", "bestRefused", "nb16N", "nb16Share", "nb16MedianPerYear", "nb16P10PerYear", "nb16P90Dd",
                                   "bestViolation", "bestEarlyRobustPerYear", "bestLateRobustPerYear", "alphaRobustPerYear", "alphaViolation",
                                   "leaveOneOut(book:lots/episodes/ΔnetPerYear/displacedOthersLots/refused)", "allAssignments"], rows)
    diag = {(d["family"], d["size"]): d for d in nom["diagnostics"]}
    md = ["| Stratum | Valid pools | Plan | Proposals (by stream) | Null pools | Rejected candidate children (all parents) | Feasible | Best screen pool | Best robust/yr (16 pts, best of ≤ 9) | PBO nb / centre | TD2 ρ best / α | Replays |",
          "|---|---:|---|---|---:|---|---:|---|---:|---|---|---:|"]
    for (f, k), st in strata.items():
        d = diag[(f, k)]
        bp = st["proposals"][0]
        md.append(f"| {f}{k} | {st['validPools']:,} | {st['plan']} | {len(st['proposals'])} ({', '.join(f'{a} {b}' for a, b in st['counts'].items())}) | {sum(1 for x in st['nullPools'] if x['source'] == 'null')} | "
                  f"{', '.join(f'{a} {b}' for a, b in st['rejectedChildren'].items()) or '—'} | {d['feasibleProposals']} | {bp['id']} | {money(bp['bestRobustPerYear'])} | "
                  f"{num(d['pbo'])} / {num(d['pboCentre'])}{' (lower bound)' if d['pboNote'] else ''} | {num(d['td2SpearmanBest'])} / {num(d['td2SpearmanAlpha'])} | {st['compute']['replays']:,} |")
    write_md("s3-strata.md", md)
    td = ["TD3: Spearman of the fold-end neighbourhood robust attribution with the next year's, across the stratum's proposals. The α column is the clean walk-forward (no pool-level choice uses later data); the best-assignment column is not (its choice saw 2017–2024).", "", "| Stratum | " + " | ".join(f"{a}→{b} ρ (best / α clean)" for a, b in [("F19", "2020"), ("F20", "2021"), ("F21", "2022"), ("F22", "2023"), ("F23", "2024")]) + " | top-10 lift mean (best) |", "|---|---|---|---|---|---|---:|"]
    for (f, k), st in strata.items():
        d = diag[(f, k)]
        td.append(f"| {f}{k} | " + " | ".join(f"{num(x['spearman'])} / {num(y['spearman'])}" for x, y in zip(d["td3Best"], d["td3Alpha"])) + f" | {money(statistics.mean([x['topLift'] for x in d['td3Best']]))} |")
    write_md("s3-td3.md", td)
    hrows = []
    for h in high:
        c, d = h["centre"], h["decisive"]
        sub = h.get("subsets") or {}
        comp = h["complementarity"]
        hrows.append([h.get("kind"), h.get("pool") or h.get("key"), h.get("key"), h.get("family"), h.get("size"), h.get("stream"), h.get("assignment"), h["id"],
                      round(c["perYear"], 2), round(c["dd"], 2), round(c["ddDaily"], 2), c["lots"], c["episodes"], round(c["occupancy"], 4), round(c["interest"], 2), round(c["costs"], 2), c["refused"],
                      d["n"], round(d["share"], 4), round(d["wilsonLower"], 4), h["band"], h["bandUncertain"], round(d["medianPerYear"], 2), round(d["p10PerYear"], 2), round(d["robustPerYear"], 2), round(d["p90Dd"], 2),
                      round(d["violation"], 4), ";".join(f"{a}={round(b, 3)}" for a, b in d["parts"].items()), h["q7"], ";".join(f"{a}:{round(b['net'])}/{round(b['dd'])}" for a, b in h["stress"].items()),
                      h["q8"]["pass"], None if h["q2b"] is None else h["q2b"]["pass"], comp["i1Pass"], comp["i2Pass"], comp["pass"],
                      ";".join(f"{a}:{round(b['marginPerYear'])}" for a, b in comp["i1"].items()),
                      h["concentration"]["bestYearShare"], h["concentration"]["top1Share"], h["concentration"]["m2020Share"], h["concentration"]["r2022Share"], h["concentration"]["marketWideEventShare"],
                      round(d["earlyRobustPerYear"], 2), round(d["lateRobustPerYear"], 2), h["timeSplit"]["bothHalvesPositive"], round(d["ex2020RobustPerYear"], 2),
                      ";".join(f"{a}:{round(b)}" for a, b in (sub.get("shapley") or {}).items()), ";".join(f"{a}:{round(b['deltaPerYear'])}/{round(b['deltaDd'])}" for a, b in (sub.get("leaveOneOut") or {}).items()),
                      ";".join(f"{a}:{b['lots']}/{b['episodes']}" for a, b in h["loo"]["perBook"].items())])
    write_csv("s3-high.csv", ["kind", "pool", "key", "family", "size", "stream", "assignment", "configId", "centrePerYear", "centreDd", "centreDdDaily", "lots", "episodes", "occupancy", "interest", "costs", "refused",
                              "n", "share", "wilsonLower", "band", "bandUncertain", "medianPerYear", "p10PerYear", "robustPerYear", "p90Dd", "violation", "violatedParts", "q7", "stresses", "q8", "q2b",
                              "i1", "i2", "complementary", "i1MarginsPerYear", "bestYearShare", "top1Share", "m2020Share", "r2022Share", "marketWideEventShare", "earlyRobustPerYear", "lateRobustPerYear",
                              "bothHalvesPositive", "ex2020RobustPerYear", "shapleyPerYear", "leaveOneOutPerYearDd", "bookLotsEpisodes"], hrows)
    screen_by = {p["id"]: p for st in strata.values() for p in st["proposals"]}
    mid_by = {m["id"]: m for m in mids}
    fid = []
    for h in high:
        if h.get("kind") != "proposal":
            continue
        p = screen_by[h["pool"]]
        m = mid_by[h["pool"]]
        mb = next(a for a in m["assignments"] if a["assignment"] == m["best"])
        fid.append([h["family"], h["size"], h["pool"], h["stream"], round(p["bestRobustPerYear"], 2), round(mb["nb64"]["robustPerYear"], 2), round(mb["pooled80"]["robustPerYear"], 2),
                    round(h["decisive"]["robustPerYear"], 2), round(best_eval(p)["fit"]["share"], 4), round(mb["nb64"]["share"], 4), round(h["decisive"]["share"], 4)])
    write_csv("s3-fidelity.csv", ["family", "size", "pool", "stream", "robust16BestOf9", "robust64Independent", "robust80Pooled", "robust384Decisive", "share16", "share64", "share384"], fid)
    if fid:
        sh64 = [r[5] - r[4] for r in fid]
        sh384 = [r[7] - r[4] for r in fid]
        write_md("s3-fidelity.md", [f"- high-precision proposals: {len(fid)}",
                                     f"- robust/yr change 16 (best of ≤ 9, selected) → 64 (independent): median {money(statistics.median(sh64))}, mean {money(statistics.mean(sh64))}",
                                     f"- robust/yr change 16 → 384 (decisive, independent): median {money(statistics.median(sh384))}, mean {money(statistics.mean(sh384))}",
                                     f"- share of pools whose 384-point robust/yr is below their 16-point value: {pct(sum(1 for x in sh384 if x < 0) / len(sh384))}"])
    write_csv("s3-vs-null.csv", ["pool", "independent64RobustPerYear", "nullN", "percentile", "nullMedianIndependent64", "source"],
              [[x["pool"], round(x["independent64"], 2), x["nullN"], round(x["percentile"], 3), round(x["nullMedian"], 2), x["source"]] for x in nom["nullStanding"]])
    srows = []
    for h in high:
        for sub, v in ((h.get("subsets") or {}).get("value") or {}).items():
            srows.append([h.get("kind"), h.get("pool") or h.get("key"), sub or "(empty)", round(v["perYear"], 2), round(v["dd"], 2), v["lots"]])
    write_csv("s3-subsets.csv", ["kind", "pool", "subset", "netPerYear", "minuteDd", "lots"], srows)
    hi_by = {h.get("pool"): h for h in high if h.get("kind") == "proposal"}
    null_by = {x["pool"]: x for x in nom["nullStanding"]}
    lines = ["| Stratum | Slot | Pool | Stream | Decisive robust/yr | Median / p10 per yr | Share (n) | Band | p90 DD | Centre net/yr | Centre DD | Min I1 margin/yr | Null pct (64-pt) | Non-dominated |",
             "|---|---|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---|"]
    for n_ in nom["nominations"]:
        h = hi_by[n_["pool"]]
        lines.append(f"| {n_['family']}{n_['size']} | {n_['slot']} | {n_['pool']} | {n_['stream']} | {money(n_['robustPerYear'])} | {money(h['decisive']['medianPerYear'])} / {money(h['decisive']['p10PerYear'])} | "
                     f"{pct(n_['share'])} ({h['decisive']['n']}; WLB {pct(n_['wilsonLower'])}) | {n_['band']}{' (uncertain)' if n_['bandUncertain'] else ''} | {money(n_['p90Dd'])} | {money(n_['centrePerYear'])} | {money(n_['centreDd'])} | "
                     f"{money(n_['minMarginPerYear'])} | {pct(null_by[n_['pool']]['percentile'])} | {'yes' if n_['nonDominated'] else 'no'} |")
    write_md("s3-nominations.md", lines + ["", f"Families with no nomination (declared negative): {', '.join(nom['negativeFamilies']) or 'none'}."])
    write_md("s3-queue.md", ["| Stratum | Pool | Stream | Robust/yr | Share | p90 DD | Centre DD | Violation | Q7 | Complementary | Reasons |", "|---|---|---|---:|---:|---:|---:|---:|---|---|---|"] + [
        f"| {q['family']}{q['size']} | {q['pool']} | {q['stream']} | {money(q['robustPerYear'])} | {pct(q['share'])} | {money(q['p90Dd'])} | {money(q['centreDd'])} | {num(q['violation'], 3)} | {q['q7']} | {q['complementarity']} | {'; '.join(q['reasons'])} |" for q in nom["queue"]])
    write_md("s3-track-sets.md", ["| Stratum | Pool | Robust/yr | Share | Feasible | Complementary |", "|---|---|---:|---:|---|---|"] + [
        f"| {t['family']}{t['size']} | {t['pool']} | {money(t['robustPerYear'])} | {pct(t['share'])} | {t['feasible']} | {t['complementarity']} |" for t in nom["trackSetControls"]])
    for b in ["batchA", "batchB"]:
        write_md(f"s3-{b}.md", ["| # | Pool | Stratum | Stream | Robust/yr | Share | Band | p90 DD | Centre net/yr | Centre DD |", "|---:|---|---|---|---:|---:|---|---:|---:|---:|"] + [
            f"| {i + 1} | {x['pool']} | {x['family']}{x['size']} | {x['stream']} | {money(x['robustPerYear'])} | {pct(x['share'])} | {x['band']} | {money(x['p90Dd'])} | {money(x['centrePerYear'])} | {money(x['centreDd'])} |" for i, x in enumerate(nom[b])]
            + ([f"", nom["batchBNote"]] if b == "batchB" and nom["batchBNote"] else []))
    comp = ["| Kind | Configuration | Centre net/yr | Centre DD | Lots | Robust/yr (decisive) | Median / p10 per yr | Share (n) | Band | p90 DD | Q7 | Complementary | EARLY / LATE robust per yr |", "|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|---|---|"]
    for h in high:
        if h.get("kind") in ("incumbent", "reference"):
            c, d = h["centre"], h["decisive"]
            comp.append(f"| {h['kind']} | {h.get('key')} {h.get('note', '')} | {money(c['perYear'])} | {money(c['dd'])} | {c['lots']} | {money(d['robustPerYear'])} | {money(d['medianPerYear'])} / {money(d['p10PerYear'])} | {pct(d['share'])} ({d['n']}) | {h['band']} | {money(d['p90Dd'])} | {h['q7']} | {h['complementarity']['pass'] if h['size'] > 1 else '—'} | {money(d['earlyRobustPerYear'])} / {money(d['lateRobustPerYear'])} |")
    write_md("s3-comparators.md", comp)
    s2rec = load(f"{R}/s2/s2.json")
    inv = ["| Family | 5-book nominee | Robust/yr | Positive-marginal S2 candidates not in it | Weakest member by Shapley |", "|---|---|---:|---|---|"]
    for n_ in [x for x in nom["nominations"] if x["size"] == 5]:
        cl = s2rec["candidateLists"][n_["family"]]
        extra = [c for c, info in cl["scores"].items() if c not in n_["members"] and (info.get("marginalNetPerYear") or 0) > 0]
        h = hi_by[n_["pool"]]
        sh = (h.get("subsets") or {}).get("shapley", {})
        weakest = min(sh.items(), key=lambda kv: kv[1]) if sh else None
        inv.append(f"| {n_['family']} | {n_['pool']} | {money(n_['robustPerYear'])} | {', '.join(extra) or 'none'} | {weakest[0] + ' ' + money(weakest[1]) if weakest else '—'} |")
    write_md("s3-expansion-inventory.md", inv)
    print(f"s3: {len(rows)} proposals, {len(high)} high records, {len(nom['nominations'])} nominations → {T}/s3-*")

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    for name, fn in [("s0", s0), ("s1", s1), ("s2", s2), ("s3", s3)]:
        if which in (name, "all"):
            fn()
