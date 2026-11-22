// RES-A 1.0.0 — the generated tables (results/TABLES.md) and the cross-cutoff summary (results/summary.json), read only
// from results/analysis-C21.json, results/analysis-C24.json and the replay records. Evaluates nothing.
//   node --experimental-transform-types tools/vg-l0-risk-envelope-sensitivity/tables.ts
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonGz, resultsDir, utc, writeJson } from './common.ts';
import { policyKeys, policyTable } from './policies.ts';

type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cuts = ['C21', 'C24'] as const;
const A: Record<string, J> = Object.fromEntries(cuts.map((c) => [c, readJson<J>(path.join(resultsDir, `analysis-${c}.json`))]));
const $ = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${x < 0 ? '−' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`);
const n = (x: number | null | undefined) => (x === null || x === undefined ? '—' : x.toLocaleString('en-US'));
const p = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${x.toFixed(1)} %`);
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const out: string[] = [
  '# RES-A 1.0.0 — generated tables',
  '',
  `Generated ${utc()} by \`tools/vg-l0-risk-envelope-sensitivity/tables.ts\` from \`results/analysis-C2x.json\`. Dollars rounded for display only; every decision compared unrounded record values. "Scope" = unique centres with no error, net > 0, both families funded and a valid envelope. Retrospective, exploratory: the 30 % / 35 % levels were proposed after the pilot's outcome was known.`,
  ''
];

out.push('## 1. Policies', '', table(['Policy', 'id', 'DD / C0', 'PL / funded principal', 'BD / C0', 'Neighbourhood statistic', 'Role'], policyTable().map((x) => [x.key, `\`${x.id}\``, `${x.pct.dd} %`, x.pct.pl === null ? '—' : `${x.pct.pl} %`, x.pct.bd === null ? '—' : `${x.pct.bd} %`, x.instrument === 'nl0' ? 'cents p90 DD (CTRL)' : 'unrounded p90 (EXP)', x.role])), '');

out.push('## 2. Population inventory', '');
out.push(
  table(
    ['Item', ...cuts],
    [
      ['archive rows (unique evaluation keys, centres + neighbours)', ...cuts.map((c) => n(A[c]!.inventory.archivedRows))],
      ['centre requests replayed (both arms, with repeats)', ...cuts.map((c) => n(A[c]!.inventory.requests.lanes.centre))],
      ['neighbour requests replayed (both arms, with repeats)', ...cuts.map((c) => n(A[c]!.inventory.requests.lanes.neighbour))],
      ['fresh evaluations in the replays', ...cuts.map((c) => n(A[c]!.inventory.compute.fresh))],
      ['unique centres (cfgId)', ...cuts.map((c) => n(A[c]!.inventory.uniqueCentres))],
      ['  requested by CTRL / EXP / both', ...cuts.map((c) => `${n(A[c]!.inventory.bySource.CTRL)} / ${n(A[c]!.inventory.bySource.EXP)} / ${n(A[c]!.inventory.bySource.both)}`)],
      ['  unique funded-lot ledgers', ...cuts.map((c) => n(A[c]!.inventory.uniqueLedgers))],
      ['  excluded: net ≤ 0 / a family unfunded / error / no envelope', ...cuts.map((c) => { const e = A[c]!.inventory.excluded; return `${n(e.netNonPositive)} / ${n(e.familyUnfunded)} / ${n(e.error)} / ${n(e.missingEnvelope)}`; })],
      ['**scope** (profitable, funded, complete risk record)', ...cuts.map((c) => `**${n(A[c]!.inventory.scope)}** (${n(A[c]!.inventory.scopeLedgers)} ledgers)`)],
      ...['screen only', 'rung 1', 'refinement move', 'rung 2', 'rung 3 / endpoint', 'shortlist'].map((s) => [`  scope by highest stage: ${s}`, ...cuts.map((c) => n(A[c]!.inventory.byHighestStage[s] ?? 0))]),
      ['measured rung neighbourhoods r1 (16) / refine (16) / r2 (64) / r3 (128)', ...cuts.map((c) => { const m = A[c]!.inventory.measuredRungs; return `${n(m.r1)} / ${n(m.refine)} / ${n(m.r2)} / ${n(m.r3)}`; })],
      ['neighbour draws read for them', ...cuts.map((c) => n(A[c]!.inventory.neighbourDrawsRead))],
      ['shortlist members (common population) / qualification members (+2 benchmarks)', ...cuts.map((c) => `${A[c]!.inventory.shortlistMembers} / ${A[c]!.inventory.qualificationMembers}`)],
      ['G1 gap-filled rung-3 configurations (CPU)', ...cuts.map((c) => n(A[c]!.inventory.g1?.configurations))],
      ['G2 attributed centres (CPU)', ...cuts.map((c) => n(A[c]!.inventory.g2?.centres))]
    ]
  ),
  ''
);

out.push('## 3. Centre eligibility (scope) — pass counts and centre-net distribution of the passing set', '');
for (const c of cuts) {
  const g = A[c]!.centre.groups.find((x: J) => x.group === 'all');

  out.push(`### ${c}`, '', table(['Policy', 'Pass', 'Share', 'Max net', 'p90 net', 'Median net', 'Top-10 mean', '≥ $200k'], policyKeys.map((k) => [k, n(g[k].pass), p(g[k].sharePct), $(g[k].net.max), $(g[k].net.p90), $(g[k].net.median), $(g[k].net.top10Mean), n(g[k].atLeast200k)])), '');
}

out.push('## 4. Centre overlap against P0 and P2 (scope)', '');
for (const c of cuts)
  for (const ref of ['P0', 'P2']) {
    const m = A[c]!.centre[`overlapVs${ref}`];

    out.push(`### ${c} vs ${ref}`, '', table(['Policy', 'both', `${ref} only`, 'alternative only', 'neither'], (Object.entries(m) as [string, J][]).map(([k, v]) => [k, n(v.both), n(v.refOnly), n(v.altOnly), n(v.neither)])), '');
  }

out.push('## 5. Centre pass counts by group (P0 / P1 / P2 / P3 / P4 | P5 / P6 / P7 / P8)', '');
for (const c of cuts)
  out.push(`### ${c}`, '', table(['Group', 'Scope', 'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'], A[c]!.centre.groups.map((g: J) => [g.group, n(g.centres), ...policyKeys.map((k) => n(g[k].pass))])), '');

out.push('## 6. Failure combinations and binding metric (scope; failing centres)', '');
for (const c of cuts) {
  const rows: (string | number)[][] = [];

  for (const k of policyKeys) {
    const r = A[c]!.centre.reasons[k];

    for (const [m, b] of Object.entries(r.binding) as [string, J][]) rows.push([k, m, n(b.count), n(b.within1k), n(b.within2500), n(b.within5k), $(b.excess.median), $(b.excess.p90)]);
  }
  out.push(`### ${c} — binding metric (largest dollar excess) and distance`, '', table(['Policy', 'Binding', 'Centres', '≤ $1k over', '≤ $2.5k over', '≤ $5k over', 'Median excess', 'p90 excess'], rows), '');
  out.push(`### ${c} — failing-metric combinations`, '', table(['Policy', 'Combinations (count)'], policyKeys.map((k) => [k, Object.entries(A[c]!.centre.reasons[k].combinations).sort((a: J, b: J) => b[1] - a[1]).map(([x, y]) => `${x} ${n(y as number)}`).join('; ')])), '');
}

out.push('## 7. Transitions between policies (scope)', '');
for (const c of cuts)
  out.push(
    `### ${c}`,
    '',
    table(
      ['Set', 'Centres', 'Max net', 'p90 net', 'BD bands ≤25k / (25,30] / (30,35] / >35k', 'PL > 25k', 'Highest stage ≥ rung 2', 'Bounded / open', 'Giveback-dominated (G2)'],
      (Object.entries(A[c]!.centre.transitions) as [string, J][]).map(([k, v]) => [
        k,
        n(v.count),
        $(v.net.max),
        $(v.net.p90),
        ['≤ 25k', '(25k, 30k]', '(30k, 35k]', '> 35k'].map((b) => n(v.bdBands[b] ?? 0)).join(' / '),
        n(v.plOver25k),
        n((v.byStage['rung 2'] ?? 0) + (v.byStage['rung 3 / endpoint'] ?? 0) + (v.byStage.shortlist ?? 0)),
        `${n(v.bounded)} / ${n(v.openEnded)}`,
        v.giveback?.centres !== undefined ? `${n(v.giveback.givebackDominated)} of ${n(v.giveback.centres)} (U ${p(v.giveback.meanSharesPct.unbankedGiveback)}, E ${p(v.giveback.meanSharesPct.bankedErosion)}, F ${p(v.giveback.meanSharesPct.capitalLoss)})` : (v.giveback?.status ?? '—')
      ])
    ),
    ''
  );

out.push('## 8. Top centres of the key transitions (net, DD, PL, BD; highest stage)', '');
for (const c of cuts)
  for (const k of ['admitted by P1 not P0 (DD 35→40 % alone)', 'rescued by BD 30 % (P3 ∧ ¬P2)', 'rescued by BD 35 % over 30 % (P4 ∧ ¬P3)', 'PL binds alone at BD 30 % (P7 ∧ ¬P3)', 'P0 members P3 excludes (P0 ∧ ¬P3)']) {
    const v = A[c]!.centre.transitions[k];

    out.push(`### ${c}: ${k}`, '', table(['id', 'Net', 'DD', 'PL liq', 'BD liq', 'Stage', 'Origin', 'Growth'], v.top.slice(0, 5).map((x: J) => [`\`${x.id}\``, $(x.net), $(x.dd), $(x.plL), $(x.bdL), x.stage, x.origin, x.growth])), '');
  }

out.push('## 9. Search-stage (rung) feasibility under each policy (scope centres with a measured neighbourhood)', '');
for (const c of cuts)
  out.push(
    `### ${c}`,
    '',
    table(['Rung (draws)', 'Rows', ...policyKeys.map((k) => `${k} feasible / best net`)], ['r1', 'refine', 'r2', 'r3'].map((r) => { const s = A[c]!.rungs.summary[r]; return [`${r} (${s.draws})`, n(s.rows), ...policyKeys.map((k) => `${n(s[k].feasible)} / ${$(s[k].bestNet)}`)]; })),
    '',
    `Unmeasured gap (rung 1, centre-first: a policy admits the centre, neither arm measured its 16 neighbours): ${policyKeys.map((k) => `${k} ${n(A[c]!.rungs.gap.r1[k].unmeasured)} (max net ${$(A[c]!.rungs.gap.r1[k].unmeasuredNet.max)})`).join('; ')}.`,
    ''
  );

out.push('## 10. Qualification of the common population (24 shortlisted members; Q1–Q6 per policy)', '');
for (const c of cuts) {
  const s = A[c]!.qualification.summary;

  out.push(`### ${c}`, '', table(['Policy', 'Centre pass (Q1, Q2, Q6)', 'Q3 pass', 'Q5 pass', 'Qualified', 'Best qualified centre net', 'Median qualified net'], policyKeys.map((k) => [k, n(s[k].centrePass), n(s[k].q3Pass), n(s[k].q5Pass), `${s[k].qualified} / ${s[k].members}`, $(s[k].qualifiedNet.max), $(s[k].qualifiedNet.median)])), '');
}

out.push('## 11. Members whose qualification flips between policies (common population)', '');
for (const c of cuts)
  for (const [k, rows] of Object.entries(A[c]!.qualification.flips) as [string, J[]][]) {
    if (!rows.length) {
      out.push(`- ${c} ${k}: none`);
      continue;
    }

    const [a, b] = k.split('→');

    out.push(`- ${c} ${k}: ${rows.map((r) => `\`${r.member}\` (${$(r.centreNet)}; ${a}: ${r[a!]}; ${b}: ${r[b!]})`).join('; ')}`);
  }
out.push('');

out.push('## 12. Confirmation-neighbourhood risk of every member (384 draws; dollars; Wilson 95 % in %)', '');
for (const c of cuts) {
  const rows = fs.readFileSync(path.join(resultsDir, `neighbourhood-${c}.csv`), 'utf8').trim().split('\n');
  const head = rows[0]!.split(',');
  const parse = (l: string) => { const out2: string[] = []; let cur = ''; let q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out2.push(cur); cur = ''; } else cur += ch; } out2.push(cur); return Object.fromEntries(head.map((h, i) => [h, out2[i]!])); };
  const recs = rows.slice(1).map(parse);

  out.push(
    `### ${c}`,
    '',
    table(
      ['Member', 'DD p50 / p90 / p95 / worst / w10', 'PL liq p90 / worst', 'BD liq p50 / p90 / p95 / worst / w10', 'DD > 35k / > 40k', 'BD > 25k / 30k / 35k (mean excess)'],
      recs.map((r) => [
        r.member!.replace(/^(CTRL|EXP) /, '$1 '),
        [r.ddP50, r.ddP90, r.ddP95, r.ddWorst, r.ddWorst10Mean].map((x) => $(Number(x))).join(' / '),
        `${$(Number(r.plLiqP90))} / ${$(Number(r.plLiqWorst))}`,
        [r.bdLiqP50, r.bdLiqP90, r.bdLiqP95, r.bdLiqWorst, r.bdLiqWorst10Mean].map((x) => $(Number(x))).join(' / '),
        `${r.breachDd35} / ${r.breachDd40}`,
        `${r.breachBd25} (${$(Number(r.breachBd25MeanExcess))}) / ${r.breachBd30} (${$(Number(r.breachBd30MeanExcess))}) / ${r.breachBd35} (${$(Number(r.breachBd35MeanExcess))})`
      ])
    ),
    ''
  );
}

out.push('## 13. Counterfactual selectors (NL0 P0 rule and RA1-original, frozen; labelled counterfactual)', '');
for (const c of cuts)
  for (const pop of ['common', 'CTRL', 'EXP']) {
    const S = A[c]!.selectors[pop];

    out.push(
      `### ${c} — ${pop === 'common' ? 'common population (24)' : `${pop} population (12)`}`,
      '',
      table(['Policy', 'Qualified', 'P0 rule primary', 'net / DD / BD liq', 'next interval (sealed)', 'RA1-original primary', 'net'], policyKeys.map((k) => {
        const s = S[k];
        const iv = s.P0?.interval;

        return [k, `${s.qualified} / ${s.members}`, s.P0 ? `\`${s.P0.label}\`` : 'none', s.P0 ? `${$(s.P0.centreNet)} / ${$(s.P0.centreDd)} / ${$(s.P0.bdLiq)}` : '—', iv ? (iv.status === 'not evaluated' ? 'not evaluated' : `${$(iv.net)} (DD ${$(iv.dd)})`) : '—', s.RA1 ? `\`${s.RA1.label}\`` : 'none', s.RA1 ? $(s.RA1.centreNet) : '—'];
      })),
      ''
    );
  }

out.push('## 14. Attribution of the pilot difference (best qualified centre net by the P0 rule)', '');
out.push(
  table(
    ['Quantity', ...cuts],
    [
      ['pilot Δ = EXP population @ P2 − CTRL population @ P0', ...cuts.map((c) => $(A[c]!.attribution.pilotDelta))],
      ['order A: constraint on CTRL vectors (CTRL @ P2 − CTRL @ P0)', ...cuts.map((c) => $(A[c]!.attribution.orderA.constraintOnCtrlVectors))],
      ['order A: search path at P2 (EXP @ P2 − CTRL @ P2)', ...cuts.map((c) => $(A[c]!.attribution.orderA.searchPathAtP2))],
      ['order B: search path at P0 (EXP @ P0 − CTRL @ P0)', ...cuts.map((c) => $(A[c]!.attribution.orderB.searchPathAtP0))],
      ['order B: constraint on EXP vectors (EXP @ P2 − EXP @ P0)', ...cuts.map((c) => $(A[c]!.attribution.orderB.constraintOnExpVectors))],
      ...policyKeys.map((k) => [`common population best @ ${k}`, ...cuts.map((c) => $(A[c]!.attribution.commonPopulation[k]))]),
      ...policyKeys.map((k) => [`rung-3 best feasible centre net @ ${k}: CTRL-found / EXP-found`, ...cuts.map((c) => `${$(A[c]!.attribution.rung3BestByOrigin[k].CTRL)} / ${$(A[c]!.attribution.rung3BestByOrigin[k].EXP)}`)])
    ]
  ),
  ''
);

out.push('## 15. Extended descriptive set (G1: rung-3 fits and refinement endpoints not shortlisted; CPU confirmation; never selectable)', '');
for (const c of cuts) {
  const e = A[c]!.extended;

  if (!e) {
    out.push(`- ${c}: G1 not available`);
    continue;
  }
  out.push(
    `### ${c} (${e.rows.length} configurations)`,
    '',
    table(['Policy', 'G1 qualified', 'Best G1 qualified net', 'Combined (24 + G1) qualified', 'Combined best', 'Combined top 3'], policyKeys.map((k) => { const s = e.summary[k]; return [k, n(s.qualified), $(s.qualifiedNet.max), n(s.combinedQualified), s.combinedBest ? `${$(s.combinedBest.net)} (${s.combinedBest.set})` : '—', s.combinedTop3.map((x: J) => `${$(x.net)} ${x.set}`).join('; ')]; })),
    '',
    table(['id', 'Origin', 'Net', 'DD', 'BD liq', 'Conf p90 DD / PL / BD', 'P0', 'P2', 'P3', 'P4'], [...e.rows].sort((a: J, b: J) => b.centreNet - a.centreNet).slice(0, 12).map((x: J) => [`\`${x.id}\``, x.origin, $(x.centreNet), $(x.centreDd), $(x.bdLiq), `${$(x.confP90Dd)} / ${$(x.confP90Pl)} / ${$(x.confP90Bd)}`, x.verdicts.P0, x.verdicts.P2, x.verdicts.P3, x.verdicts.P4])),
    ''
  );
}

out.push('## 16. Metric ordering, basis and boundary checks (scope)', '');
out.push(
  table(
    ['Item', ...cuts],
    [
      ['record DD stored in cents (all scope centres)', ...cuts.map((c) => String(A[c]!.centre.ordering.ddStoredInCents))],
      ['marked BD > marked DD + $0.005', ...cuts.map((c) => n(A[c]!.centre.ordering.bdMarkedAboveDd))],
      ['  of which with partial sales', ...cuts.map((c) => n(A[c]!.centre.ordering.bdMarkedAboveDdWithPartials))],
      ['marked BD = marked DD to the cent', ...cuts.map((c) => n(A[c]!.centre.ordering.bdMarkedEqualsDdToTheCent))],
      ['liquidation BD > marked DD + $0.005', ...cuts.map((c) => n(A[c]!.centre.ordering.bdLiquidationAboveDd))],
      ['PL liq > BD liq + 1e-6 (largest raw difference)', ...cuts.map((c) => `${n(A[c]!.centre.ordering.plLiquidationAboveBdLiquidation)} (${A[c]!.centre.ordering.plAboveBdMaxRawDifference.toExponential(1)})`)],
      ...Object.keys(A.C21!.centre.basisDisagreement).map((k) => [`${k}: verdict differs on the marked basis (liq fail / marked pass)`, ...cuts.map((c) => `${n(A[c]!.centre.basisDisagreement[k].centres)} (${n(A[c]!.centre.basisDisagreement[k].liquidationFailMarkedPass)})`)]),
      ['centres exactly at any policy limit', ...cuts.map((c) => n(Math.max(...policyKeys.map((k) => A[c]!.centre.boundary[k].exactlyAtALimit))))],
      ['qualification instrument disagreements (cents vs unrounded p90 DD / p10)', ...cuts.map((c) => n(A[c]!.qualification.instrumentDisagreements.length))]
    ]
  ),
  ''
);

out.push('## 16b. Policies that differ by one gate — disagreements at every level', '');
out.push(
  table(
    ['Pair', ...cuts.map((c) => `${c} centres / r1 / refine / r2 / r3 rows / members`)],
    Object.keys(A.C21!.pairDiffs).map((k) => [k, ...cuts.map((c) => { const d = A[c]!.pairDiffs[k]; return `${n(d.centres)} / ${n(d.rungRows.r1)} / ${n(d.rungRows.refine)} / ${n(d.rungRows.r2)} / ${n(d.rungRows.r3)} / ${n(d.members)}`; })])
  ),
  ''
);

out.push('## 17. Reproduction checks', '', table(['Cutoff', 'Checks', 'Passed', 'Failed'], cuts.map((c) => [c, n(A[c]!.checks.length), n(A[c]!.checks.filter((x: J) => x.pass).length), A[c]!.checks.filter((x: J) => !x.pass).map((x: J) => x.check).join('; ') || 'none'])), '');

fs.writeFileSync(path.join(resultsDir, 'TABLES.md'), `${out.join('\n')}\n`);

const g = (c: string, k: string) => A[c]!.qualification.summary[k];
const replays = Object.fromEntries(
  ['G1', 'G2'].flatMap((x) => cuts.map((c) => { const f = path.join(resultsDir, 'replays', `${x}-${c}.json.gz`); if (!fs.existsSync(f)) return [`${x}-${c}`, null]; const r = readJsonGz<J>(f); return [`${x}-${c}`, { compute: r.compute, parity: r.parity }]; }))
);
const g3 = Object.fromEntries(cuts.map((c) => { const r = readJson<J>(path.join(resultsDir, 'replays', `G3-${c}.json`)); return [c, { draws: r.draws, identical: r.identical, differences: r.differences.length, compute: r.compute }]; }));

writeJson(path.join(resultsDir, 'summary.json'), {
  kind: 'RES-A 1.0.0 summary (generated by tables.ts from analysis-C2x.json)',
  generated: utc(),
  policies: policyTable(),
  perCutoff: Object.fromEntries(
    cuts.map((c) => [
      c,
      {
        scope: A[c]!.inventory.scope,
        centrePass: Object.fromEntries(policyKeys.map((k) => [k, A[c]!.centre.groups.find((x: J) => x.group === 'all')[k].pass])),
        rung3Feasible: Object.fromEntries(policyKeys.map((k) => [k, A[c]!.rungs.summary.r3[k].feasible])),
        rung3BestNet: Object.fromEntries(policyKeys.map((k) => [k, A[c]!.rungs.summary.r3[k].bestNet])),
        qualifiedCommon: Object.fromEntries(policyKeys.map((k) => [k, g(c, k).qualified])),
        bestQualifiedCommon: Object.fromEntries(policyKeys.map((k) => [k, g(c, k).qualifiedNet.max])),
        extendedBest: A[c]!.extended ? Object.fromEntries(policyKeys.map((k) => [k, A[c]!.extended.summary[k].combinedBest])) : null,
        attribution: A[c]!.attribution,
        checks: { total: A[c]!.checks.length, failed: A[c]!.checks.filter((x: J) => !x.pass).length }
      }
    ])
  ),
  replays,
  parityG3: g3
});
console.log(`TABLES.md and summary.json written (${out.length} lines)`);
