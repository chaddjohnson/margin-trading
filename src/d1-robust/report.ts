// `npm run robust-d1 -- tables` (PROTOCOL.md §22): Markdown tables generated from the study's records, so the reports
// cannot drift from the JSON. Each writer reads only finished records; the narrative documents cite these tables.
import path from 'node:path';
import fs from 'fs-extra';
import {
  categoryOf,
  candidateUniverse,
  existingSymbols,
  researchRoot,
  readJson,
  stageDir,
  tier1Symbols,
  writeText
} from './context.ts';
import type { SymbolAudit } from './audit.ts';

const money = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `${Math.round(value) < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
const pct = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `${(100 * value).toFixed(digits).replace(/^-/, '−')}%`;

export const ingestionTable = async () => {
  const dir = stageDir('ingestion');
  const rows: string[] = [
    '| Symbol | Tier | Category | Attempts | Failures (class: last line) | Outcome | Rows | Canonical sha256 | Staging |',
    '|---|---|---|---:|---|---|---:|---|---|'
  ];

  for (const symbol of candidateUniverse) {
    const attemptsFile = path.join(dir, `${symbol}.attempts.json`);

    if (!(await fs.pathExists(attemptsFile))) {
      continue;
    }

    const log = await readJson<{
      attempts: { number: number; status: string; failureClass?: string; failure?: string }[];
    }>(attemptsFile);
    const result = (await fs.pathExists(path.join(dir, 'results', `${symbol}.json`)))
      ? await readJson<{ status: string; reason: string; staging?: { rows: number }; canonical?: { sha256: string } }>(
          path.join(dir, 'results', `${symbol}.json`)
        )
      : undefined;
    const failures = log.attempts
      .filter((attempt) => attempt.status === 'download-failed')
      .map(
        (attempt) =>
          `${attempt.number} ${attempt.failureClass}: ${(attempt.failure ?? '').split(' | ').at(-1)!.slice(0, 60)}`
      )
      .join('<br>');
    const last = log.attempts.at(-1)!;

    rows.push(
      `| ${symbol} | ${(existingSymbols as readonly string[]).includes(symbol) ? 'existing' : (tier1Symbols as readonly string[]).includes(symbol) ? '1' : '2'} | ${categoryOf[symbol]} | ${log.attempts.length} | ${failures || '—'} | ${last.status}${result ? ` (${result.status})` : ''} | ${result?.staging?.rows?.toLocaleString('en-US') ?? '—'} | ${result?.canonical?.sha256.slice(0, 16) ?? '—'}… | ${(await fs.pathExists(`data/${symbol}.csv`)) ? 'present' : 'removed'} |`
    );
  }

  return rows.join('\n');
};

export const universeTable = async () => {
  const universe = await readJson<{ symbols: Record<string, SymbolAudit>; eligible: string[] }>(
    stageDir('audit', 'universe.json')
  );
  const rows = [
    '| Symbol | Tier | Category | Cohort | D1 | D2 | D3 | D4 | D5 | First → last | Sessions | Median $ volume (training) | Minute coverage | Bars/session | Splits registered | Moves > ±15% unexplained | Reasons |',
    '|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|---|---|'
  ];

  for (const symbol of candidateUniverse) {
    const audit = universe.symbols[symbol]!;
    const mark = (pass: boolean) => (pass ? '✓' : '✗');

    rows.push(
      `| ${symbol} | ${audit.tier} | ${audit.category} | ${audit.cohort} | ${mark(audit.rules.D1)} | ${mark(audit.rules.D2)} | ${mark(audit.rules.D3)} | ${mark(audit.rules.D4)} | ${mark(audit.rules.D5)} | ${audit.firstDate} → ${audit.lastDate} | ${audit.sessions} | ${money(audit.trainingMedianDollarVolume)} | ${pct(audit.coverageMedian)} | ${Number.isFinite(audit.trainingMedianBarsPerSession) ? audit.trainingMedianBarsPerSession : '—'} | ${audit.splitsRegistered.map((split) => `${split.effectiveDate} ${split.ratio}:1`).join(', ') || '—'} | ${audit.overnightMovesBeyond15.map((gap) => `${gap.date} ×${gap.ratio.toFixed(3)}`).join(', ') || '—'} | ${audit.reasons.join('; ') || '—'} |`
    );
  }

  return rows.join('\n');
};

const num = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const pilotTables = async (window: string) => {
  const dir = stageDir('pilot', window);
  const pilot = await readJson<Record<string, any>>(path.join(dir, 'pilot.json'));
  const freeze = (await fs.pathExists(path.join(dir, 'pilot_freeze.json')))
    ? await readJson<Record<string, any>>(path.join(dir, 'pilot_freeze.json'))
    : undefined;
  const lines: string[] = [`### Window ${window}`, ''];

  lines.push(
    '| k | Configurations | Centre DD ≤ $35k | Eligible (also ≥ 4 lots) | Centre net median | P50 median | MAD median | shareAbove median | Lots median | DDmed (eligible) p25 / median / p75 | DD90 (eligible) p25 / median / p75 | A2 P50 median | N2 P50 median |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|'
  );

  for (const [stratum, row] of Object.entries(pilot.strata as Record<string, any>)) {
    lines.push(
      `| ${stratum} | ${row.configurations} | ${row.centrallyFeasible} | ${row.eligible} | ${money(row.base.median)} | ${money(row.p50.median)} | ${money(row.mad.median)} | ${num(row.shareAbove.median, 2)} | ${num(row.lots.median)} | ${money(row.ddMedianEligible.p25)} / ${money(row.ddMedianEligible.median)} / ${money(row.ddMedianEligible.p75)} | ${money(row.dd90Eligible.p25)} / ${money(row.dd90Eligible.median)} / ${money(row.dd90Eligible.p75)} | ${money(row.a2p50.median)} | ${money(row.n2p50.median)} |`
    );
  }

  const share = pilot.checks.shareAbove;

  lines.push(
    '',
    `Machinery checks: shareAbove (active controls, ties ½) ${num(share.value, 3)} over ${share.controls} — ${share.pass ? 'pass' : 'FAIL'}` +
      (share.otherPools
        ? `; all controls ${num(share.otherPools.allControls.midRank, 3)}, drawdown-feasible eligible ${num(share.otherPools.eligibleDrawdownFeasible.midRank, 3)} (n = ${share.otherPools.eligibleDrawdownFeasible.controls}), active infeasible ${num(share.otherPools.activeDrawdownInfeasible.midRank, 3)}`
        : '') +
      `; zero amplitude ${pilot.checks.zeroAmplitude.pass ? 'exact' : 'FAIL'}; replay = engine on ${pilot.checks.parity.comparisons} neighbours ${pilot.checks.parity.pass ? 'exact' : 'FAIL'}; reflection: out of box ${pilot.checks.reflection.outOfBox}, corner move frequency ${num(pilot.checks.reflection.cornerFrequency, 3)}, pilot boundary move frequency ${num(pilot.checks.reflection.pilotBoundaryFrequency, 3)} over ${pilot.checks.reflection.pilotBoundarySamples} samples.`,
    '',
    `Severity of Fable's uncalibrated hard F2 (DDmed ≤ $35k and DD90 ≤ $45k): ${pilot.severity.eligibleFailingF2} of ${pilot.severity.eligibleControls} eligible controls would fail; benchmarks: ${Object.entries(
      pilot.severity.benchmarks as Record<string, any>
    )
      .map(
        ([key, value]) =>
          `${key} ${value.failsF2 ? 'fails' : 'passes'} (DDmed ${money(value.ddMedian)}, DD90 ${money(value.dd90)})`
      )
      .join('; ')}.`,
    ''
  );

  lines.push(
    '| Benchmark | Centre net | Centre DD | P50 | Q25 | P10 | MAD | shareAbove | DDmed | DD90 | feasShare | A2 P50 | N2 P50 | N3 P50 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  );

  for (const bench of pilot.benchmarks as Record<string, any>[]) {
    lines.push(
      `| ${bench.label} | ${money(bench.centre.net)} | ${money(bench.centre.minuteDrawdown)} | ${money(bench.a1.p50)} | ${money(bench.a1.q25)} | ${money(bench.a1.p10)} | ${money(bench.a1.mad)} | ${num(bench.a1.shareAbove, 2)} | ${money(bench.a1.ddMedian)} | ${money(bench.a1.dd90)} | ${num(bench.a1.feasShare, 2)} | ${money(bench.a2.p50)} | ${money(bench.n2.p50)} | ${money(bench.n3.p50)} |`
    );
  }

  if (pilot.persistence) {
    lines.push(
      '',
      `Persistence diagnostic (final window, ${pilot.persistence.controls} eligible controls): Spearman(raw net to 2021-12-31, net 2022–2023) = ${num(pilot.persistence.raw, 3)}; Spearman(N1 P50 to 2021-12-31, net 2022–2023) = ${num(pilot.persistence.smoothed, 3)}; the smoothed statistic ${pilot.persistence.supportsSmoothed ? 'exceeds' : 'does not exceed'} the raw one by ≥ 0.10.`
    );
  }

  if (freeze) {
    lines.push(
      '',
      `Frozen constants (pilot_freeze.json, body ${String(freeze.bodyHash).slice(0, 12)}): n_D = ${freeze.discoveryDraws} (median SE by n: ${Object.entries(
        freeze.seByN as Record<string, number>
      )
        .map(([n, se]) => `${n}: ${money(se)}`)
        .join(', ')}; target ${money(freeze.seTarget)}).`,
      ''
    );
    lines.push(
      '| Stratum | R_m (DDmed reference) | flag | R_t (DD90 reference) | flag | controls | pooled strata | Q75 DDmed | Q75 DD90 |',
      '|---:|---:|---|---:|---|---:|---|---:|---:|'
    );

    for (const [stratum, reference] of Object.entries(freeze.references as Record<string, any>)) {
      lines.push(
        `| ${stratum} | ${money(reference.median)} | ${reference.flagMedian} | ${money(reference.tail)} | ${reference.flagTail} | ${reference.controls} | ${(reference.pooledStrata as number[]).join(', ')} | ${money(reference.q75Median)} | ${money(reference.q75Tail)} |`
      );
    }
  }

  return lines.join('\n');
};

const membersOf = (key: string) => key.split('|').map((part) => part.split(':')[0]);

// Per round and arm (discovery.json): budget use, islands, the coverage top-up and the per-symbol coverage against the
// floor, before and after the top-up; the descriptive PBO.
export const coverageTables = async (roundDir: string, round: string, arms: string[]) => {
  const lines: string[] = [`### Round ${round}`, ''];

  for (const arm of arms) {
    const file = path.join(roundDir, arm, 'discovery.json');

    if (!(await fs.pathExists(file))) {
      continue;
    }

    const discovery = await readJson<Record<string, any>>(file);
    const islands = discovery.islands as Record<string, any>[];
    const topUp = discovery.topUp as { under: string[]; served: string[]; perSymbol: number; islands: any[] };
    const floor = discovery.floor as { configurations: number; vectors: number };
    const after = discovery.coverageAfter as Record<
      string,
      { configurations: number; vectors: number; feasible: number }
    >;
    const before = discovery.coverageBefore as Record<string, { configurations: number; vectors: number }>;
    const short = Object.entries(after).filter(
      ([, value]) => value.configurations < floor.configurations || value.vectors < floor.vectors
    );

    lines.push(
      `**Arm ${arm}** (${discovery.armLabel}): ${discovery.evaluations.toLocaleString('en-US')} of ${discovery.budget.toLocaleString('en-US')} configurations evaluated (${discovery.hits} cache hits), ${num(discovery.seconds, 0)} s; island cap ${discovery.islandCap}, reserve ${discovery.reserve}, ${discovery.migrations.length} migrations; trace cache hit rate ${pct(discovery.cache.hitRate)}. Islands: ${islands.map((island) => `${island.key} ${island.freshEvaluations} (${island.generations} gen., ${island.stoppedBy})`).join('; ')}.`,
      '',
      `Coverage floor per symbol: ≥ ${floor.configurations} configurations and ≥ ${floor.vectors} distinct vectors. Under the floor after the islands: ${topUp.under.length} (${topUp.under.join(' ') || 'none'}); top-up served ${topUp.served.length} at ${topUp.perSymbol} each (${topUp.served.join(' ') || 'none'})${topUp.under.length > topUp.served.length ? `; not served (reserve exhausted, alphabetical rule): ${topUp.under.filter((symbol) => !topUp.served.includes(symbol)).join(' ')}` : ''}. Still under the floor at the end: ${short.length} (${short.map(([symbol]) => symbol).join(' ') || 'none'}).`,
      ''
    );

    if (discovery.pbo) {
      lines.push(
        `Descriptive PBO (CSCV on quarterly attribution of the top 1,000 by the arm's ranking): ${Object.entries(
          discovery.pbo as Record<string, { pbo: number; splits: number }>
        )
          .map(([blocks, value]) => `S = ${blocks}: ${num(value.pbo, 2)} (${value.splits} splits)`)
          .join('; ')}.`,
        ''
      );
    }

    lines.push(
      '| Symbol | Category | Configurations (after islands → end) | Distinct vectors (after islands → end) | Centre-feasible configurations | Floor met |',
      '|---|---|---:|---:|---:|---|'
    );

    for (const [symbol, value] of Object.entries(after).sort(([a], [b]) => a.localeCompare(b))) {
      const prior = before[symbol];
      const met = value.configurations >= floor.configurations && value.vectors >= floor.vectors;

      lines.push(
        `| ${symbol} | ${categoryOf[symbol]} | ${prior?.configurations ?? '—'} → ${value.configurations} | ${prior?.vectors ?? '—'} → ${value.vectors} | ${value.feasible} | ${met ? '✓' : '✗'} |`
      );
    }

    lines.push('');
  }

  return lines.join('\n');
};

// Per fold: the finalists of each arm (training window, confirm-A for arm J), then the validation table of picks,
// benchmarks and the eligible controls' quantiles, and the picks' validation-window neighbourhoods.
export const walkforwardTables = async (fold: string) => {
  const dir = stageDir('walkforward', fold);
  const validation = await readJson<Record<string, any>>(path.join(dir, 'validation.json'));
  const picks = await readJson<Record<string, any>>(path.join(dir, 'PICKS.json'));
  const lines: string[] = [
    `### Fold ${fold} (search ≤ ${validation.searchEnd}; validation → ${validation.validationEnd})`,
    ''
  ];

  for (const arm of ['J', 'Q']) {
    const assessment = await readJson<Record<string, any>>(path.join(dir, arm, 'assessment.json'));
    const roles = new Map<string, string>(
      (assessment.nominees as { role: string; key: string }[]).map((nominee) => [nominee.key, nominee.role])
    );

    lines.push(
      `Arm ${arm} finalists (${arm === 'J' ? 'ranked by S_A, ties within $12,500 → smaller k → key' : 'ranked by centre net − λk, ties by centre DD → key'}):`,
      '',
      '| Rank | Role | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | DDmed_A | DD90_A | S_A | Lots | Training portfolio daily % DD | Gates failed | Labels |',
      '|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|'
    );

    // Passing finalists in rank order, then the others (rank '—'), so a fold without a pick still shows its finalists.
    const ranked = assessment.order as string[];
    const keys = [
      ...ranked,
      ...(assessment.finalists as { key: string }[]).map((item) => item.key).filter((key) => !ranked.includes(key))
    ];

    keys.forEach((key, index) => {
      const finalist = (assessment.finalists as Record<string, any>[]).find((item) => item.key === key)!;
      const centre = finalist.centre['5'];
      const a = finalist.confirmA;
      const failed = (finalist.gates as { gate: string; pass: boolean; detail: string }[])
        .filter((gate) => !gate.pass)
        .map((gate) => `${gate.gate} (${gate.detail})`);

      lines.push(
        `| ${index < ranked.length ? index + 1 : '—'} | ${roles.get(key) ?? '—'} | ${membersOf(key).join(' ')} | ${money(centre.net)} | ${money(centre.minuteDrawdown)} | ${a ? `${money(a.p50)} [${money(finalist.intervals.p50.lower)}, ${money(finalist.intervals.p50.upper)}]` : '—'} | ${money(a?.q25)} | ${money(a?.ddMedian)} | ${money(a?.dd90)} | ${money(finalist.scoreA?.s)} | ${centre.lots} | ${pct(finalist.portfolio['5-symmetric']?.dailyPercent, 2)} | ${failed.join(', ') || 'none'} | ${(finalist.labels as string[]).join('; ') || '—'} |`
      );
    });
    lines.push('');
  }

  lines.push(
    `Validation (PICKS.json body ${String(picks.bodyHash).slice(0, 12)} frozen ${picks.frozenAt}; validation.json body ${String(validation.bodyHash).slice(0, 12)}; ${validation.selfChecks.compared} windowed-drawdown self-checks ${validation.selfChecks.equal ? 'all equal' : 'NOT ALL EQUAL'}). Fixed pool, one continuous run; V = mark at the validation end − mark at the search end:`,
    '',
    '| | Members | Search-end mark | V @0 | V @2 | V @5 | V @10 | Percentile among eligible controls (@5) | Validation minute DD | Lots in validation | Isolated flat-start V @5 | Portfolio validation return (symmetric) | Portfolio max daily % DD to validation end |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  );

  for (const row of (validation.rows as Record<string, any>[]).filter((item) => item.kind !== 'control')) {
    const portfolio = validation.portfolio[row.label]?.symmetric;
    const isolated = validation.isolated[row.label];

    lines.push(
      `| ${row.label} | ${membersOf(row.key).join(' ')} | ${money(row.searchMark)} | ${money(row.validation['0'])} | ${money(row.validation['2'])} | **${money(row.validation['5'])}** | ${money(row.validation['10'])} | ${num(row.controlPercentile, 3)} | ${money(row.minuteDrawdownValidation)} | ${row.lotsValidation} | ${money(isolated?.net)} | ${pct(portfolio?.validationReturn)} | ${pct(portfolio?.dailyPercent, 2)} |`
    );
  }

  const controls = validation.controls;

  lines.push(
    '',
    `Eligible pilot controls of this fold (centre DD@5 ≤ $35k and ≥ 4 funded lots in the search window): ${controls.eligible}; V @5 quantiles ctl_0.25 = ${money(controls.p25)}, ctl_0.50 = ${money(controls.p50)}, ctl_0.75 = ${money(controls.p75)}.`,
    '',
    'Validation-window N1 neighbourhoods of the picks (n = 64, label `validation`, descriptive):',
    '',
    '| Pick | V @5 (centre) | P50 | Q25 | P10 | MAD | shareAbove | DDmed | DD90 | feasShare |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  );

  for (const [label, summary] of Object.entries(validation.neighbourhoods as Record<string, any>)) {
    lines.push(
      `| ${label} | ${money(summary.base)} | ${money(summary.p50)} | ${money(summary.q25)} | ${money(summary.p10)} | ${money(summary.mad)} | ${num(summary.shareAbove, 2)} | ${money(summary.ddMedian)} | ${money(summary.dd90)} | ${num(summary.feasShare, 2)} |`
    );
  }

  return lines.join('\n');
};

// The final round (§9–§14): promotion and refinement, every finalist and benchmark under the confirm-A batch (E0
// beside E1, the sensitivity classes, the portfolio), the gates, the paired comparisons, the members, and the
// confirm-B reporting batch when it exists.
export const finalTables = async () => {
  const dir = stageDir('final');
  const assessment = await readJson<Record<string, any>>(path.join(dir, 'pooled', 'assessment.json'));
  const bench = await readJson<Record<string, any>>(path.join(dir, 'benchmarks.json'));
  const promotion = await readJson<Record<string, any>>(path.join(dir, 'pooled', 'promotion.json'));
  const candidates = await readJson<Record<string, any>>(path.join(dir, 'selection-candidates.json'));
  const finalists = assessment.finalists as Record<string, any>[];
  const rows = [
    ...finalists.map((item) => ({ ...item, name: `${item.label} (${item.provenance})` })),
    ...(['B1', 'B4', 'B5'] as const).map((key) => ({ ...bench.benchmarks[key], name: key }))
  ];
  const lines: string[] = [
    `G-WF ${candidates.gwf.passed ? 'passed' : 'FAILED'} (GWF.json ${String(candidates.gwf.bodyHash).slice(0, 12)}); passing finalists ${candidates.passing.length}; nominees ${candidates.nominees.length === 0 ? 'none' : candidates.nominees.map((nominee: { role: string }) => nominee.role).join(', ')}${candidates.gwf.passed ? '' : ` (G-WF failed; the G1–G8 ranking alone would have nominated: ${(candidates.nomineesIfGwfIgnored as { role: string; key: string }[]).map((nominee) => `${nominee.role} ${membersOf(nominee.key).join(' ')}`).join('; ') || 'none'})`}. Evaluations: ${Object.entries(
      candidates.evaluations as Record<string, number>
    )
      .map(([arm, count]) => `${arm} ${count.toLocaleString('en-US')}`)
      .join(', ')}; ${num(candidates.seconds, 0)} s.`,
    '',
    `Promotion (pooled top ${promotion.candidates} by S at n = 12, re-evaluated at n = 96): ${promotion.feasible} feasible, ${(promotion.infeasible as unknown[]).length} infeasible; ${(promotion.families as unknown[]).length} families (sizes ${(promotion.families as { size: number }[]).map((family) => family.size).join(', ')}); refined: ${(
      promotion.families as { refined: boolean; representative: string; required: string }[]
    )
      .filter((family) => family.refined)
      .map(
        (family) =>
          `${membersOf(family.representative).join(' ')}${family.required ? ` (required: ${family.required})` : ''}`
      )
      .join('; ')}. Notes: ${(promotion.notes as string[]).join('; ') || '—'}.`,
    ''
  ];

  for (const file of (await fs.readdir(path.join(dir, 'pooled'))).filter((name) => name.startsWith('refine-')).sort()) {
    const refine = await readJson<Record<string, any>>(path.join(dir, 'pooled', file));

    lines.push(
      `Refinement ${file.replace('.json', '')}: ${membersOf(refine.start).join(' ')} → ${membersOf(refine.result).join(' ')}; ${refine.unique} unique evaluations over ${(refine.cycles as unknown[]).length} cycle(s); accepted: ${(refine.moves as { pass: string; move: string }[]).map((move) => `${move.pass}: ${move.move}`).join('; ') || 'none'}; S ${money(refine.startState.score.s)} → ${money(refine.resultState.score.s)} (n = 48)${refine.walkedBack ? '; walked back for F-P' : ''}.`
    );
  }

  lines.push(
    '',
    '| Configuration | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | MAD | shareAbove | DDmed | DD90 | feasShare | S_A | P50_A @10 | A2 P50 | N2 P50 | Lots | Portfolio end equity (sym., 5 bps) | Portfolio daily % DD | Labels |',
    '|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'
  );

  for (const row of rows) {
    const centre = row.centre['5'];
    const a = row.confirmA;
    const portfolio = row.portfolio['5-symmetric'];

    lines.push(
      `| ${row.name} | ${row.members.join(' ')} | ${money(centre.net)} | ${money(centre.minuteDrawdown)} | ${money(a.p50)} [${money(row.intervals.p50.lower)}, ${money(row.intervals.p50.upper)}] | ${money(a.q25)} | ${money(a.mad)} | ${num(a.shareAbove, 2)} | ${money(a.ddMedian)} | ${money(a.dd90)} | ${num(a.feasShare, 2)} | ${money(row.scoreA.s)} | ${money(row.confirmA10.p50)} | ${money(row.a2.p50)} | ${money(row.n2.p50)} | ${centre.lots} | ${money(portfolio.endEquity)} | ${pct(portfolio.dailyPercent, 2)} | ${(row.labels as string[]).join('; ') || '—'} |`
    );
  }

  for (const finalist of finalists) {
    lines.push(
      '',
      `**${finalist.label}** (${finalist.members.join(' ')}, ${finalist.provenance} arm) — gates:`,
      '',
      '| Gate | Pass | Detail |',
      '|---|---|---|',
      ...(finalist.gates as { gate: string; pass: boolean; detail: string }[]).map(
        (gate) => `| ${gate.gate} | ${gate.pass ? '✓' : '✗'} | ${gate.detail} |`
      ),
      '',
      'Members (smoothed leave-one-out marginal on the confirm-A draws; capacity on the decision minutes):',
      '',
      '| Member | Virtual trades | Funded lots | Regimes | Centre net | Marginal S_A(C) − S_A(C∖i) | Net without | DD without | Grade | partLot | partPortfolio | Delayed fills | N3 P50 (this member moved) |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|',
      ...(finalist.members_ as Record<string, any>[]).map(
        (member) =>
          `| ${member.symbol} | ${member.virtualTrades} | ${member.fundedLots} | ${member.regimes} | ${money(member.netCentre)} | ${money(member.marginal)} | ${money(member.withoutNet)} | ${money(member.withoutDrawdown)} | ${member.grade} | ${pct(member.capacity.partLot, 2)} | ${pct(member.capacity.partPortfolio, 2)} | ${pct(member.capacity.delayedShare, 1)} | ${money(finalist.n3[member.symbol]?.p50)} |`
      ),
      '',
      `Tie orders: ${(finalist.ties as { label: string; net: number }[]).map((tie) => `${tie.label} ${money(tie.net)}`).join('; ')} (largest change ${money(finalist.maxTieChange)}); boundary coordinates ${finalist.boundary} of ${8 * finalist.members.length}; N0 probes ${finalist.n0.count} (feasible ${pct(finalist.n0.feasibleShare)}, median ${money(finalist.n0.median)}); 16 portfolio neighbours: median daily % DD ${pct(finalist.portfolioNeighbours.dailyPercentMedian, 2)}, max ${pct(finalist.portfolioNeighbours.dailyPercentMax, 2)}; C0 on the finalist's drawdown dates ${pct(finalist.c0.drawdownOnCandidateDates, 2)} (C0's own maximum ${pct(finalist.c0.dailyPercent, 2)}); B5 ladder at matched borrowing ${money(finalist.ladder.matchedEndEquity)}${finalist.ladder.extrapolated ? ' (extrapolated)' : ''}.`,
      '',
      `Paired confirm-A differences (finalist − benchmark, ${finalist.confirmANets.length} common draws): ${(
        ['B4', 'B5'] as const
      )
        .map(
          (key) =>
            `${key} ΔP50 ${money(finalist.versus[key].estimate)} [${money(finalist.versus[key].lower)}, ${money(finalist.versus[key].upper)}], ΔS ${money(finalist.versus[key].scoreDifference)}, Spearman ${num(finalist.versus[key].spearman, 2)}, variance reduction ×${num(finalist.versus[key].varianceReduction, 1)}`
        )
        .join('; ')}.`
    );
  }

  const confirmFile = stageDir('confirmB', 'confirmB.json');

  if (await fs.pathExists(confirmFile)) {
    const confirm = await readJson<Record<string, any>>(confirmFile);

    lines.push(
      '',
      `confirm-B reporting batch (n = ${confirm.draws}, drawn after FROZEN_SELECTION.json; reported only):`,
      '',
      '| Configuration | Kind | Centre net | P50_B [90% interval] | Q25_B [90% interval] | DDmed_B | DD90_B | S_B | P50_A | B − A | Within 2 pooled SE | ΔP50_B vs B4 [90%] | ΔP50_B vs B5 [90%] |',
      '|---|---|---:|---|---|---:|---:|---:|---:|---:|---|---|---|'
    );

    for (const row of confirm.rows as Record<string, any>[]) {
      lines.push(
        `| ${row.label} | ${row.kind} | ${money(row.centreNet)} | ${money(row.confirmB.p50)} [${money(row.intervals?.p50.lower)}, ${money(row.intervals?.p50.upper)}] | ${money(row.confirmB.q25)} [${money(row.intervals?.q25.lower)}, ${money(row.intervals?.q25.upper)}] | ${money(row.confirmB.ddMedian)} | ${money(row.confirmB.dd90)} | ${money(row.scoreB.s)} | ${money(row.confirmAP50)} | ${money(row.disagreement)} | ${row.withinTwoSe ? 'yes' : 'NO'} | ${money(row.versusB4.estimate)} [${money(row.versusB4.lower)}, ${money(row.versusB4.upper)}] | ${money(row.versusB5.estimate)} [${money(row.versusB5.lower)}, ${money(row.versusB5.upper)}] |`
      );
    }
  }

  return lines.join('\n');
};

export const writeTables = async () => {
  const out = path.join(researchRoot, 'results', 'tables');

  if (await fs.pathExists(stageDir('ingestion'))) {
    await writeText(path.join(out, 'ingestion.md'), `${await ingestionTable()}\n`);
  }

  if (await fs.pathExists(stageDir('audit', 'universe.json'))) {
    await writeText(path.join(out, 'universe.md'), `${await universeTable()}\n`);
  }

  const pilots: string[] = [];

  for (const window of ['fold-a', 'fold-b', 'final']) {
    if (await fs.pathExists(stageDir('pilot', window, 'pilot.json'))) {
      pilots.push(await pilotTables(window));
    }
  }

  if (pilots.length > 0) {
    await writeText(path.join(out, 'pilot.md'), `${pilots.join('\n\n')}\n`);
  }

  const folds: string[] = [];

  for (const fold of ['fold-a', 'fold-b']) {
    if (await fs.pathExists(stageDir('walkforward', fold, 'validation.json'))) {
      folds.push(await walkforwardTables(fold));
    }
  }

  if (folds.length > 0) {
    await writeText(path.join(out, 'walkforward.md'), `${folds.join('\n\n')}\n`);
  }

  const coverage: string[] = [];

  for (const fold of ['fold-a', 'fold-b']) {
    if (await fs.pathExists(stageDir('walkforward', fold, 'round.json'))) {
      coverage.push(await coverageTables(stageDir('walkforward', fold), fold, ['J', 'Q']));
    }
  }

  if (await fs.pathExists(stageDir('final', 'round.json'))) {
    coverage.push(await coverageTables(stageDir('final'), 'final', ['unseeded', 'seeded']));
  }

  if (coverage.length > 0) {
    await writeText(path.join(out, 'coverage.md'), `${coverage.join('\n\n')}\n`);
  }

  if (await fs.pathExists(stageDir('final', 'selection-candidates.json'))) {
    await writeText(path.join(out, 'final.md'), `${await finalTables()}\n`);
  }
};
