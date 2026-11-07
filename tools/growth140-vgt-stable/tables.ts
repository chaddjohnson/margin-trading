/* eslint-disable @typescript-eslint/no-explicit-any */
// Report tables for growth140-vgt-stable (post-freeze helper; reads the sealed records only and writes
// research/growth140-vgt-stable/results/tables/*.md). Dollars with commas and two decimals.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/growth140-vgt-stable/tables.ts
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const res = path.join(root, 'research', 'growth140-vgt-stable', 'results');
const outDir = path.join(res, 'tables');
const read = (rel: string) => (fs.existsSync(path.join(res, rel)) ? JSON.parse(fs.readFileSync(path.join(res, rel), 'utf8')) : null);

export const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`);
const num = (x: number | null | undefined, d = 0) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d));
const table = (head: string[], rows: (string | number)[][], align?: string[]) =>
  [
    `| ${head.join(' | ')} |`,
    `|${head.map((_h, i) => (align?.[i] === 'r' ? '---:' : '---')).join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
const sw = (s: any) =>
  s ? `hold ${s.hold}${s.hold === 'on' ? ` (buffer ${s.buffer})` : ''}, gate ${s.gate}, stop ${s.istop}, retain ${s.retain}, trend ${s.trend}${s.family === 'rise' ? `, elig ${s.elig}` : ''}, cont ${s.cont}` : '—';
export const dd = (v: any) => (v ? `${usd(v.maximumUsd)} (${num(v.percentOfNotional, 2)}%)` : '—');
const settings = (c: Record<string, unknown>) =>
  Object.entries(c)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

const sections: Record<string, string[]> = {};
const add = (file: string, text: string) => (sections[file] ??= []).push(text);

// ----- the audit -----

const audit = read('audit/audit.json');
const reeval = read('audit/reeval.json');

if (audit) {
  add('audit.md', `# Archive audit — growth140-vgt-s8m development archive (read only)\n`);
  add(
    'audit.md',
    `## Inventory\n\n- Manifest ${audit.manifest.passed ? 'verified' : 'FAILED'} (${audit.manifest.checks.length} files, MANIFEST sha256 \`${audit.manifest.manifestSha256.slice(0, 12)}…\`).\n- ${audit.inventory.points.toLocaleString()} evaluated configurations; ${audit.inventory.centres.toLocaleString()} centres (configurations fitted with a neighbourhood); ${audit.inventory.neighbourOnlyPoints.toLocaleString()} neighbour-only points.\n- Fits by rung: ${Object.entries(audit.inventory.fitsByRung).map(([k, v]) => `${k} ${(v as number).toLocaleString()}`).join(', ')}. Fidelities: ${Object.entries(audit.inventory.fidelities).map(([k, v]) => `${k} = ${v}`).join('; ')}.\n- Screen: ${audit.inventory.screenVectors.toLocaleString()} vectors → ${audit.inventory.screenDistinct.toLocaleString()} distinct configurations. Island offspring duplicates (proposed again, not re-evaluated): ${audit.inventory.islandDuplicates.toLocaleString()}.\n`
  );

  for (const fam of ['rise', 'breakout']) {
    const f = audit.funnel[fam];

    add(
      'audit.md',
      `## Exclusion funnel — ${fam}\n\n${table(['Step', 'Remaining', 'Excluded here'], f.sequential.map((s: any) => [s.step, s.n.toLocaleString(), s.excluded === undefined ? '' : s.excluded.toLocaleString()]), ['', 'r', 'r'])}\n\nUnder the new rules (net > 0, DD ≤ $35,000, p90 ≤ $35,000, p10 > 0) ${f.newRules.rung1Feasible.toLocaleString()} of ${f.newRules.rung1Centres.toLocaleString()} rung-1 centres are feasible (16-draw screening estimate).\n`
    );

    const o = audit.overlap[fam];
    const groups = ['drawdown', 'stability', 'activity', 'neighbourhoodProfit', 'capitalEfficiency', 'concentration'];

    add(
      'audit.md',
      `### Rung-1 reasons — ${fam} (${o.centres.toLocaleString()} centres)\n\n${table(['Reason group', 'Failing (overlapping)', 'Only reason', 'First reason (sequential)'], groups.map((g) => [g, (o.anyReason[g] ?? 0).toLocaleString(), (o.onlyReason[g] ?? 0).toLocaleString(), (o.firstReason[g] ?? 0).toLocaleString()]), ['', 'r', 'r', 'r'])}\n\nNew-feasible but excluded by the old rules: ${audit.rescued[fam].newFeasibleOldInfeasible.toLocaleString()} (by old reason: ${Object.entries(audit.rescued[fam].byOldReason).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}). New-feasible centres selected for rung 2: ${audit.rescued[fam].newFeasibleSelectedForR2}; not selected (promotion cap or crowding): ${audit.rescued[fam].newFeasibleNotSelectedForR2.toLocaleString()}.\n`
    );
  }

  const cells = Object.keys(audit.crowding.rung1).sort();

  add(
    'audit.md',
    `## Structural composition per stage (crowding)\n\n${table(['Cell', 'Rung 1', 'Rung 1 new-feasible', 'Rung 2', 'Rung 3', 'Shortlist'], cells.map((c) => [c, audit.crowding.rung1[c] ?? 0, audit.crowding.rung1NewFeasible[c] ?? 0, audit.crowding.rung2[c] ?? 0, audit.crowding.rung3[c] ?? 0, audit.crowding.shortlist[c] ?? 0]), ['', 'r', 'r', 'r', 'r', 'r'])}\n`
  );

  const bd = Object.entries<any>(audit.breakdown).sort(([a], [b]) => (a < b ? -1 : 1));

  add(
    'audit.md',
    `## Breakdown by family × maximum hold × gate × continuation (best available fidelity)\n\n${table(['Structure', 'Centres', 'Old-feasible (r1)', 'New-feasible', 'Best centre net (DD ≤ $35k)', 'Best robust (new-feasible)', 'Median robust'], bd.map(([k, e]) => [k, e.centres, e.oldFeasible, e.newFeasible, usd(Number.isFinite(e.bestCentreNet) ? e.bestCentreNet : NaN), usd(Number.isFinite(e.bestRobust) ? e.bestRobust : NaN), usd(e.medianRobust)]), ['', 'r', 'r', 'r', 'r', 'r', 'r'])}\n`
  );

  for (const fam of ['rise', 'breakout']) {
    const fr = audit.frontiers[fam];
    const row = (x: any) => [x.id, x.fidelity, usd(x.centreNet), usd(x.centreDd), usd(x.nbMedian), usd(x.nbP10), usd(x.nbP90Dd), `${x.trades} (${x.wins}/${x.losses})`, pct(x.exposure / 100), x.oldGroups.join(', ') || '—', x.reachedR2 ? (x.reachedR3 ? (x.shortlisted ? 'shortlist' : 'r3') : 'r2') : 'r1'];

    add(
      'audit.md',
      `## Frontier — ${fam}: centre net vs centre drawdown (centres with DD ≤ $35,000)\n\n${table(['id', 'fidelity', 'centre net', 'centre DD', 'nb median', 'nb p10', 'nb p90 DD', 'trades (W/L)', 'exposure', 'old reasons', 'reached'], fr.centre.map(row), ['', '', 'r', 'r', 'r', 'r', 'r', 'r', 'r', '', ''])}\n\n### Frontier — ${fam}: robust net vs p90 drawdown (new-feasible centres)\n\n${table(['id', 'fidelity', 'centre net', 'centre DD', 'nb median', 'nb p10', 'nb p90 DD', 'trades (W/L)', 'exposure', 'old reasons', 'reached'], fr.robust.map(row), ['', '', 'r', 'r', 'r', 'r', 'r', 'r', 'r', '', ''])}\n`
    );
  }

  const rr = (x: any) => [x.id, x.fidelity, sw(x.switches), usd(x.centreNet), usd(x.centreDd), usd(x.nbMedian), usd(x.nbP10), usd(x.nbP90Dd), `${x.trades} (${x.wins}/${x.losses})`, num(x.top1Share, 2), x.oldGroups.join(', ') || '—', x.reachedR2 ? 'yes' : 'no'];
  const rh = ['id', 'fidelity', 'switches', 'centre net', 'centre DD', 'nb median', 'nb p10', 'nb p90', 'trades (W/L)', 'top trade share', 'old reasons', 'reached r2'];

  add('audit.md', `## Promising Rise configurations the completed study rejected\n\n### By robust net (new-feasible)\n\n${table(rh, audit.riseRejected.byRobust.map(rr))}\n\n### By centre net (DD ≤ $35,000)\n\n${table(rh, audit.riseRejected.byCentreNet.map(rr))}\n\nExact settings:\n\n${[...audit.riseRejected.byRobust, ...audit.riseRejected.byCentreNet].filter((x: any, i: number, a: any[]) => a.findIndex((y) => y.id === x.id) === i).map((x: any) => `- \`${x.id}\`: ${settings(x.config)}`).join('\n')}\n`);
}

if (audit && reeval) {
  const ms = reeval.members as any[];
  const rank = new Map((reeval.ranking as any[]).map((r) => [r.id, r.rank]));
  const four = ms.find((m) => m.label === '#4');

  add(
    'audit.md',
    `## Audit re-evaluation (D24, common draws \`audit\`: selection 2 × 128, confirmation 3 × 128)\n\n${table(
      ['rank', 'id', 'label / cell', 'prior estimate (fidelity: median / p10 / p90)', 'centre net', 'centre DD', 'select robust', 'confirm median', 'confirm p10', 'confirm p90 DD', 'breaches > $35k (worst)', 'trades (W/L)', 'top episode share', 'gates'],
      ms.map((m) => [
        rank.get(m.id) ?? '—',
        m.id,
        m.label,
        m.prior ? `${m.prior.fidelity}: ${usd(m.prior.nbMedian)} / ${usd(m.prior.nbP10)} / ${usd(m.prior.nbP90Dd)}` : '—',
        usd(m.centre.net),
        usd(m.centre.dd),
        usd(m.select.robustNet),
        usd(m.confirm.medianNet),
        usd(m.confirm.p10Net),
        usd(m.confirm.p90Dd),
        `${pct(m.breaches.share)} (${usd(m.breaches.worstDd)})`,
        `${m.centre.trades} (${m.centre.wins}/${m.centre.losses})`,
        num(m.centre.topMoveShare, 2),
        m.qualified ? 'qualified' : `fail ${m.failed.join(', ')}`
      ])
    )}\n\n#4 under the same draws: confirmation median ${usd(four?.confirm.medianNet)}, p10 ${usd(four?.confirm.p10Net)}, p90 ${usd(four?.confirm.p90Dd)}.\n`
  );
}

// ----- #4 sensitivity -----

const sens = read('sensitivity/sensitivity.json');

if (sens) {
  const b = sens.base;

  add(
    'sensitivity.md',
    `# #4 sensitivity (development, D24)\n\n- Reproduction: net ${usd(sens.reproduction.observed.net)} (expected ${usd(sens.reproduction.expected.net)}), maximum minute drawdown ${usd(sens.reproduction.observed.dd)} (expected ${usd(sens.reproduction.expected.dd)}): ${sens.reproduction.matches ? '**exact**' : '**DIFFERS**'}. ${b.trades} trades, ${b.wins} wins, ${b.losses} losses; exposure ${num(b.exposure, 1)}%; dollar losses ${usd(b.lossSum)}; largest winning episode ${usd(b.topMove)} (${pct(b.topMoveShare)} of net); net without it ${usd(b.netExTopMove)} (arithmetic).\n\n## #4's development trades\n\n${table(['#', 'entry', 'exit', 'reason', 'days', 'net'], sens.baseTrades.map((t: any) => [t.n, t.entryDate, t.exitDate ?? 'open', t.exitReason ?? '—', num(t.calendarDaysHeld, 1), usd(t.net)]), ['r', '', '', '', 'r', 'r'])}\n\n## One input at a time (fine: centre ± R at the schema step; wide: the box)\n\n${table(
      ['input', 'centre', 'unit', 'R', 'step', 'fine points moving net > $10k', 'mean |Δnet| (fine)', 'same ledger (fine)', 'fine net range', 'nearest big change below / above'],
      sens.sensitiveOrder.map((k: string) => {
        const o = sens.oat[k];

        return [k, o.centre, o.unit, num(o.radius, 2), o.step, pct(o.fineShareBig, 0), usd(o.fineMeanAbs), pct(o.fineSameLedger, 0), `${usd(o.fineMin)} … ${usd(o.fineMax)}`, `${o.nearestBigBelow ?? '—'} / ${o.nearestBigAbove ?? '—'}`];
      }),
      ['', 'r', '', 'r', 'r', 'r', 'r', 'r', '', '']
    )}\n\n## Each enabled rule OFF\n\n${table(['rule OFF', 'net', 'Δ net', 'DD', 'Δ DD', 'trades (W/L)'], sens.switches.map((s: any) => [s.off, usd(s.net), usd(s.dNet), usd(s.dd), usd(s.dDd), `${s.trades} (${s.wins}/${s.losses})`]), ['', 'r', 'r', 'r', 'r', 'r'])}\n\n## Pairwise interactions (six most sensitive inputs; interaction = Δ(a,b) − Δ(a) − Δ(b))\n\n${table(['a', 'b', 'mean |interaction|', 'max |interaction|', 'cells with |interaction| > $10k'], sens.pairs.map((p: any) => [p.a, p.b, usd(p.meanAbsInteraction), usd(p.maxAbsInteraction), pct(p.shareBigInteraction, 0)]), ['', '', 'r', 'r', 'r'])}\n\n## Joint perturbations (256 draws each)\n\n${table(['family', 'n', 'ledgers', 'same ledger as #4', 'median net', 'p10 net', 'p90 net', 'robust', 'p90 DD', 'worst DD', 'share ≤ $35k', 'profitable'], Object.entries<any>(sens.joint).map(([k, j]) => [k, j.n, j.ledgers, pct(j.sameLedgerShare, 0), usd(j.medianNet), usd(j.p10Net), usd(j.p90Net), usd(j.robustNet), usd(j.p90Dd), usd(j.worstDd), pct(j.share, 1), pct(j.profitable, 0)]), ['', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'])}\n\nThe completed study's figures for #4 on its grid-step instrument: median $44,531.83, p10 $11,982.96.\n\n## Ledger diagnosis of the decisive points (against #4's development ledger)\n\n${table(['point', 'net', 'DD', 'major #4 winner lost', 'lost #4 winners', 'extra loss', 'losses (sum) vs #4', 'extended losing hold', 'changed decision dates'], sens.ledgers.map((l: any) => [l.why, usd(l.net), usd(l.dd), l.dropsMajorWinner.map((w: any) => `${w.entryDate} ${usd(w.net)}`).join('; ') || '—', l.lostWinners.length, l.extraLoss ? 'yes' : 'no', `${l.losses.candidate} (${usd(l.losses.candidateSum)}) vs ${l.losses.control} (${usd(l.losses.controlSum)})`, l.extendedLosingHold ? `yes (${num(l.losingHoldDays.candidate, 1)} d)` : 'no', `${l.eventChanges}: ${l.eventDatesChanged.slice(0, 6).join(', ')}`]))}\n\n## Regional scan (64-draw \`region\` neighbourhoods)\n\n${table(['centre', 'id', 'centre net', 'centre DD', 'nb median', 'nb p10', 'robust', 'nb p90 DD', 'feasible'], sens.region.centres.map((r: any) => [r.why, r.id, usd(r.centre.net), usd(r.centre.dd), usd(r.nb.medianNet), usd(r.nb.p10Net), usd(r.nb.robustNet), usd(r.nb.p90Dd), r.feasible ? 'yes' : `no (${Object.keys(r.parts).join(', ')})`]))}\n\nBest feasible regional centre (banded order): ${sens.region.best ? `\`${sens.region.best.id}\` robust ${usd(sens.region.best.robust)}, p90 ${usd(sens.region.best.p90)}` : 'none'}.\n`
  );
}

// ----- write -----

fs.mkdirSync(outDir, { recursive: true });
for (const [file, parts] of Object.entries(sections)) fs.writeFileSync(path.join(outDir, file), `${parts.join('\n')}\n`);
console.log(`tables: ${Object.keys(sections).join(', ') || 'none (no sealed record yet)'}`);
