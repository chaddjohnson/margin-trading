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

// ----- searches and qualification per cutoff -----

for (const C of ['C19', 'C21', 'C23', 'C24']) {
  const s = read(`search/${C}.json`);
  const q = read(`qualify/${C}.json`);

  if (s) {
    const rows = s.cells.map((c: any) => {
      const pc = s.evaluations.perCell[c.spec.key] ?? {};
      const isl = c.islands.map((i: any) => `${i.generations ?? i.generation} gen / ${i.newConfigs} new (${i.stop})`).join('; ');
      const sat = c.saturation.map((x: any) => `${x.islands}: ${x.saturated ? 'saturated' : 'not saturated'}`).join('; ') || '—';

      return [
        c.spec.key,
        c.screen ? `${c.screen.n} → ${c.screen.unique} distinct, ${c.screen.plausible} plausible, ${c.screen.promoted} promoted; ${c.screen.ledgers} ledgers` : c.local ? `${c.local.seeds.length} seeds, ${c.local.unique} local designs` : '—',
        `${c.summary.rung1Centres} (${c.summary.rung1Feasible} feasible)`,
        isl || '—',
        sat,
        c.r2,
        c.r3.length,
        c.refinements.map((r: any) => (r.start === r.endpoint ? 'stay' : 'moved')).join(', ') || '—',
        c.shortlist.length,
        (pc.fresh ?? 0).toLocaleString(),
        (pc.hits ?? 0).toLocaleString()
      ];
    });

    add(
      `search-${C}.md`,
      `# Search ${C} (training door ${s.door}; ${s.started} → ${s.finished})\n\n- Evaluations: ${s.evaluations.fresh.toLocaleString()} fresh, ${s.evaluations.archiveHits.toLocaleString()} archive hits, ${s.evaluations.failures} failed; ${s.evaluations.archivePoints.toLocaleString()} distinct configurations in the job archive; ${s.evaluations.fits.toLocaleString()} fits. Peak job memory ${num(s.memory.peakCgroupCurrent / 2 ** 30, 2)} GiB.\n\n${table(['cell', 'screen / seeds', 'rung-1 centres', 'islands', 'saturation', 'rung 2', 'rung 3', 'refinement', 'shortlist', 'fresh', 'hits'], rows)}\n\n## Shortlists\n\n${table(
        ['cell', 'pick', 'id', 'switches', 'centre net', 'centre DD', 'r3 median', 'r3 p10', 'r3 p90', 'r3 ledgers'],
        s.cells.flatMap((c: any) => c.shortlist.map((f: any) => [c.spec.key, f.pick, f.id, sw(switchOf(f.config)), usd(f.centre.net), usd(f.centre.dd), usd(f.nb.medianNet), usd(f.nb.p10Net), usd(f.nb.p90Dd), f.nb.ledgers]))
      )}\n\n## Profitable centres that failed feasibility (visible)\n\n${table(['cell', 'id', 'centre net', 'centre DD', 'p90', 'p10', 'failed'], s.cells.flatMap((c: any) => c.visibleInfeasible.map((v: any) => [c.spec.key, v.id, usd(v.centreNet), usd(v.centreDd), usd(v.p90), usd(v.p10), Object.keys(v.parts).join(', ')])))}\n`
    );
  }

  if (q) {
    const rank = new Map((q.ranking as any[]).map((r) => [r.id, r.rank]));
    const prim = Object.entries<string | null>(q.primaries.primaries ?? q.primaries);

    add(
      `qualify-${C}.md`,
      `# Qualification ${C} (training door; selection 2 × 128, confirmation 3 × 128)\n\nPrimaries: ${prim.map(([k, v]) => `${k} ${v ?? 'none'}`).join('; ')}.\n\n${table(
        ['rank', 'id', 'label', 'centre net', 'centre DD', 'trades (W/L)', 'dollar losses', 'exposure', 'top episode (share)', 'net ex top episode', 'select robust', 'select p90', 'confirm median', 'confirm p10', 'confirm p90', 'breaches > $35k (worst)', 'small / broad median', '10 / 20 bps net', 'gates'],
        (q.members as any[]).map((m) => [
          rank.get(m.id) ?? '—',
          m.id,
          m.label,
          usd(m.centre.net),
          usd(m.centre.dd),
          `${m.centre.trades} (${m.centre.wins}/${m.centre.losses})`,
          usd(m.centre.lossSum),
          `${num(m.centre.exposure, 1)}%`,
          `${usd(m.centre.topMove)} (${pct(m.centre.topMoveShare, 0)})`,
          usd(m.centre.netExTopMove),
          usd(m.select.robustNet),
          usd(m.select.p90Dd),
          usd(m.confirm.medianNet),
          usd(m.confirm.p10Net),
          usd(m.confirm.p90Dd),
          `${pct(m.breaches.share)} (${usd(m.breaches.worstDd)})`,
          `${usd(m.small.medianNet)} / ${usd(m.broad.medianNet)}`,
          `${usd(m.stress['10bps'].net)} / ${usd(m.stress['20bps'].net)}`,
          m.qualified ? 'qualified' : `fail ${m.failed.join(', ')}`
        ])
      )}\n`
    );
  }
}

function switchOf(c: any) {
  return {
    family: c.entryMethod === 'trend_breakout' ? 'breakout' : 'rise',
    hold: c.maximumHoldEnabled ? 'on' : 'off',
    buffer: c.intradayLossBufferEnabled ? 'on' : 'off',
    gate: c.drawdownRecoveryGateEnabled ? 'on' : 'off',
    istop: c.initialStopEnabled ? 'on' : 'off',
    retain: c.retentionEnabled ? 'on' : 'off',
    trend: c.trendFilterEnabled ? c.trendMethod : 'off',
    elig: c.eligibilityEnabled ? c.eligibilityPolicy : 'off',
    cont: c.continuationEnabled ? c.continuationMethod : 'off'
  };
}

// ----- folds and the sequential policies -----

for (const C of ['C19', 'C21', 'C23']) {
  const sel = read(`folds/${C}/FOLD_SELECTION.json`);
  const ev = read(`folds/${C}/evaluation.json`);

  if (!sel || !ev) continue;

  const m = new Map((sel.members as any[]).map((x) => [x.id, x]));
  const rank = new Map((sel.ranking as any[]).map((r) => [r.id, r.rank]));

  add(
    'folds.md',
    `## Fold ${C}: selected on 2016 → ${sel.cutoff.boundary}, evaluated ${sel.cutoff.evalFirst} → ${sel.cutoff.evalLast}\n\nPrimaries: ${Object.entries<string | null>(sel.primaries).map(([k, v]) => `${k} ${v ?? 'none'}`).join('; ')}.\n\n${table(
      ['rank', 'id', 'label', 'qualified', 'train centre net', 'slice net', 'slice DD', '10 / 20 bps slice', 'carried in', 'new trades W/L (losses $)', 'open at end', 'nb slice median / p10 (positive)'],
      (ev.rows as any[]).map((r) => {
        const x = m.get(r.id);

        return [
          rank.get(r.id) ?? '—',
          r.id,
          r.label,
          x ? (x.qualified ? 'yes' : `no (${x.failed.join(', ')})`) : 'control',
          usd(x?.centre.net),
          usd(r.sliceNet),
          dd(r.sliceDrawdown),
          `${usd(r.stress['10bps'])} / ${usd(r.stress['20bps'])}`,
          r.carriedIn.map((c: any) => `${c.entryDate}: ${usd(c.validationPart)}`).join('; ') || '—',
          `${r.newWins}/${r.newLosses} (${usd(r.newLossSum)})`,
          r.openAtEnd.map((o: any) => `${o.entry} ${usd(o.net)}`).join('; ') || '—',
          `${usd(r.neighbourhood.median)} / ${usd(r.neighbourhood.p10)} (${pct(r.neighbourhood.positiveShare, 0)})`
        ];
      })
    )}\n`
  );
}

const seq = read('folds/sequential.json');

if (seq)
  add(
    'folds.md',
    `## Sequential policies (2020–2021 | 2022–2023 | 2024; switches charged 5 bps per implied side)\n\n${table(
      ['policy', 'C19 → 2020–21', 'C21 → 2022–23', 'C23 → 2024', 'net', 'before switch charges', 'switches', 'sequential DD', 'within $35k'],
      Object.entries<any>(seq.policies).map(([k, p]) => [k, ...p.slices.map((s: any) => (s.id ? `${s.id} ${usd(s.sliceNet)}` : 'flat')), usd(p.net), usd(p.grossOfSwitches), p.switches, usd(p.drawdown), p.withinCeiling ? 'yes' : 'no'])
    )}\n\nDecision (PROTOCOL.md §7.5): eligible ${seq.decision.eligible.join(', ') || 'none'}; chosen **${seq.decision.chosen ?? 'none (chronologically unsupported)'}**.\n`
  );

// ----- the final comparison -----

const fin = read('final/final.json');

if (fin) {
  const all = [{ ...fin.four, role: 'control' }, ...fin.finalists, ...fin.prior];
  const line = (m: any) => [
    m.label,
    m.id,
    usd(m.development.net),
    dd(m.development.drawdown),
    usd(m.validation.net),
    dd(m.validation.drawdown),
    `${m.validation.wins}/${m.validation.losses} (${usd(m.validation.lossSum)})`,
    pct(m.validation.exposureSessions),
    m.validation.openAtEnd.map((o: any) => usd(o.net)).join('; ') || '0',
    usd(m.full.net),
    dd(m.full.drawdown),
    `${m.full.trades.wins}/${m.full.trades.losses}/${m.full.trades.breakeven}`,
    `${num(m.full.occupancy.sessionsInvestedPercent, 1)}%`,
    `${usd(m.stress['10bps'].validationNet)} / ${usd(m.stress['20bps'].validationNet)}`,
    `${usd(m.neighbourhood.validationMedian)} / ${usd(m.neighbourhood.validationP10)}; p90 ${usd(m.neighbourhood.p90RunDd)}`,
    m.status === 'pass' ? 'pass' : `fail ${m.failed.join(', ')}`
  ];

  add(
    'final.md',
    `# Final comparison (FULL door, opened once; ${fin.at})\n\n- #4 parity: ${fin.parity4?.passed ? '**exact**' : '**FAILED**'} — ${Object.entries<any>(fin.parity4?.observed ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')}.\n- Continuity: development span digest equal ${fin.continuity.developmentSpanDigestEqual}; validation sessions ${fin.continuity.validationSessions} (yVal ${fin.yVal}).\n- Configurations evaluated on this window: ${fin.configurationsEvaluated.toLocaleString()} (${fin.evaluations.fresh.toLocaleString()} fresh).\n\n${table(
      ['configuration', 'id', 'dev net', 'dev DD', 'val net', 'val DD (from 2024 close)', 'val W/L (losses $)', 'val exposure', 'open at end', 'full net', 'full DD', 'full W/L/B', 'full exposure', 'val 10 / 20 bps', 'val nb median / p10; nb p90 run DD', 'V-gates'],
      all.map(line)
    )}\n\n## Versus #4 (same dates)\n\n${table(
      ['configuration', 'Δ val net', 'Δ val DD', 'Δ full net', 'Δ full DD', 'higher val net with ≤ DD', '#4 val winners retained / retimed / lost', 'new val winning moves', 'full-run #4 winners lost'],
      [...fin.finalists, ...fin.prior].map((m: any) => [
        m.label,
        usd(m.versus4.validationNetDelta),
        usd(m.versus4.validationDrawdownDelta),
        usd(m.versus4.fullNetDelta),
        usd(m.versus4.fullDrawdownDelta),
        m.versus4.higherNetEqualOrLowerDd ? 'yes' : 'no',
        `${m.versus4.winnersValidation.retained} / ${m.versus4.winnersValidation.retimed} / ${m.versus4.winnersValidation.lostControlWinners.length}${m.versus4.winnersValidation.sparse ? ' (sparse)' : ''}`,
        m.versus4.winnersValidation.newWinningMoves,
        m.versus4.winnersFull.lostControlWinners.map((l: any) => `${l.entryDate} ${usd(l.net)}`).join('; ') || '—'
      ])
    )}\n`
  );
}

// ----- write -----

fs.mkdirSync(outDir, { recursive: true });
for (const [file, parts] of Object.entries(sections)) fs.writeFileSync(path.join(outDir, file), `${parts.join('\n')}\n`);
console.log(`tables: ${Object.keys(sections).join(', ') || 'none (no sealed record yet)'}`);
