// Markdown tables generated from the study's records (outside the code manifest: it reads records only and decides
// nothing). `npm run diverse-d1 -- tables` writes results/tables/*.md; it may be extended at any time.
import path from 'node:path';
import fs from 'fs-extra';
import { log, stageDir } from './context.ts';

const fmt = (value: unknown, digits = 0) =>
  typeof value === 'number'
    ? Number.isFinite(value)
      ? digits > 0
        ? value.toFixed(digits)
        : Math.round(value).toLocaleString('en-US')
      : String(value)
    : String(value ?? '');

const pct = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? `${(100 * value).toFixed(1)}%` : '—';

export const table = (headers: string[], rows: unknown[][]) =>
  [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.map((cell) => (typeof cell === 'string' ? cell : fmt(cell))).join(' | ')} |`)
  ].join('\n');

const readIf = async <T>(file: string): Promise<T | undefined> =>
  (await fs.pathExists(file)) ? ((await fs.readJson(file)) as T) : undefined;

const windows = ['fold-a', 'fold-b', 'final'] as const;

// ----- calibration -----

const calibrationTables = async () => {
  const parts: string[] = [];

  for (const window of windows) {
    const record = await readIf<{
      eligible: number;
      eligibleByStratum: Record<string, number>;
      references: Record<
        string,
        { median: number; tail: number; flagMedian: string; controls: number; pooledStrata: number[] }
      >;
      checks: Record<string, Record<string, unknown>>;
      blocks: { count: number; markIndices: number[] };
    }>(stageDir('controls', window, 'calibration.json'));

    if (!record) {
      continue;
    }

    parts.push(
      `## ${window}\n\n${record.eligible} eligible controls of 576; K = ${record.blocks.count} blocks. Checks: shareAbove ${fmt(record.checks.shareAbove!.value, 3)} over ${fmt(record.checks.shareAbove!.activeControls)} active controls; zero amplitude ${record.checks.zeroAmplitude!.pass ? 'exact' : 'FAILED'}; replay = engine on ${fmt(record.checks.replayNeighbours!.compared)} neighbours with ${fmt(record.checks.replayNeighbours!.differences)} differences; reflection out of box ${fmt(record.checks.reflection!.outOfBox)}, boundary move frequency ${fmt(record.checks.reflection!.boundaryMoveFrequency, 3)}.\n\n` +
        table(
          ['Stratum', 'Eligible', 'R_m', 'R_t', 'Flag', 'Controls used', 'Pooled strata'],
          Object.entries(record.references).map(([stratum, ref]) => [
            stratum,
            record.eligibleByStratum[stratum] ?? 0,
            ref.median,
            ref.tail,
            ref.flagMedian,
            ref.controls,
            ref.pooledStrata.join(', ')
          ])
        )
    );
  }

  return parts.join('\n\n');
};

// ----- search coverage -----

interface ArmSearch {
  evaluations: number;
  hits: number;
  feasible: number;
  credible: number;
  coverage: {
    pass: boolean;
    failures: unknown[];
    symbols: Record<
      string,
      {
        configurations: number;
        vectors: number;
        coMembers: number;
        behaviours: number;
        topPartner: string;
        topPartnerShare: number;
      }
    >;
    protectedExamples: Record<string, number>;
  };
  funnel: Record<string, { configurations: number; feasible: number; scored: number; credible: number }>;
  pbo: Record<string, { pbo: number }>;
  summary: {
    stageA: { fresh: number };
    stageB?: { islands: { fresh: number; filled: number }[] };
    stageC?: { islands: { key: string; fresh: number; stoppedBy: string; generations: number }[] };
  };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.length === 0 ? NaN : sorted[Math.floor((sorted.length - 1) / 2)]!;
};

const coverageTables = async () => {
  const rows: unknown[][] = [];
  const perSymbol: string[] = [];

  for (const window of windows) {
    for (const arm of ['J-u', 'T-u', 'Q-u', 'J-s', 'T-s']) {
      const record = await readIf<ArmSearch>(stageDir('rounds', window, arm, 'search.json'));

      if (!record) {
        continue;
      }

      const symbols = Object.entries(record.coverage.symbols);
      const configurations = symbols.map(([, item]) => item.configurations);
      const filled = record.summary.stageB?.islands.reduce((total, island) => total + island.filled, 0) ?? 0;
      const stalled = record.summary.stageC?.islands.filter((island) => island.stoppedBy !== 'budget').length ?? 0;

      rows.push([
        window,
        arm,
        record.evaluations,
        record.hits,
        record.feasible,
        record.credible,
        Math.min(...configurations),
        median(configurations),
        Math.max(...configurations),
        Math.min(...symbols.map(([, item]) => item.vectors)),
        filled,
        stalled,
        `${fmt(record.pbo['8']?.pbo, 2)} / ${fmt(record.pbo['16']?.pbo, 2)}`,
        record.coverage.pass ? 'met' : `FAILED (${record.coverage.failures.length})`
      ]);
      perSymbol.push(
        `### ${window} ${arm}\n\n` +
          table(
            [
              'Symbol',
              'Configurations',
              'Distinct vectors',
              'Behaviours',
              'Co-members',
              'Top partner (share)',
              'Feasible',
              'Scored',
              'Credible'
            ],
            symbols.map(([symbol, item]) => [
              symbol,
              item.configurations,
              item.vectors,
              item.behaviours,
              item.coMembers,
              `${item.topPartner} (${pct(item.topPartnerShare)})`,
              record.funnel[symbol]?.feasible ?? 0,
              record.funnel[symbol]?.scored ?? 0,
              record.funnel[symbol]?.credible ?? 0
            ])
          )
      );
    }
  }

  return {
    summary: table(
      [
        'Window',
        'Arm',
        'Configurations',
        'Cache hits',
        'Centre-feasible',
        'Credible',
        'Min per symbol',
        'Median',
        'Max',
        'Min vectors',
        'Stage-B fills',
        'Stalled C islands',
        'PBO (8 / 16)',
        'Contracts'
      ],
      rows
    ),
    perSymbol: perSymbol.join('\n\n')
  };
};

// ----- families, promotion, refinement and pruning, finalists -----

interface Promotion {
  credible: number;
  families: { family: number; size: number; leader: string; members: string[]; value: number; fate: string }[];
  slots: { slot: string; outcome: string; family?: number; attempts: number }[];
  promoted: {
    slot: string;
    family: number;
    familySize: number;
    representative: { members: string[]; value: number };
  }[];
}

interface Refinement {
  slot: string;
  familyIndex: number;
  start: string;
  refined: string;
  result: string;
  stoppedBy: string;
  unique: number;
  moves: { phase: string; move: string; before: number; after: number }[];
  pruneSteps: {
    phase: string;
    members: string[];
    removed?: string;
    note?: string;
    marginals: { symbol: string; marginal: number; interval?: { lower: number; upper: number } }[];
  }[];
}

interface Finalist {
  label: string;
  members: string[];
  centre: Record<string, { net: number; minuteDrawdown: number; lots: number }>;
  centreNetT: number;
  confirmA: {
    nbJ: { p50: number; q25: number; ddMedian: number; dd90: number };
    nbT: { p50: number };
    j: { s: number };
    t: { s: number };
  };
  portfolio: Record<string, { dailyPercent: number }>;
  gates: { gate: string; pass: boolean }[];
  pass: boolean;
  labels: string[];
}

const keyMembers = (key: string) =>
  key
    .split('|')
    .map((part) => part.split(':')[0])
    .join(' ');

const roundTables = async (window: (typeof windows)[number]) => {
  const parts: string[] = [];
  const arms = window === 'final' ? ['J-u', 'T-u', 'J-s', 'T-s'] : ['J-u', 'T-u', 'Q-u'];

  for (const arm of arms) {
    const dir = stageDir('rounds', window, 'select', arm);
    const promotion = await readIf<Promotion>(path.join(dir, 'promotion.json'));

    if (!promotion) {
      continue;
    }

    const sizes = promotion.families.map((family) => family.size);

    parts.push(
      `### ${window} ${arm}: families and promotion\n\n${promotion.credible} credible configurations → ${promotion.families.length} families (largest ${Math.max(0, ...sizes)}, median ${median(sizes)}).\n\n` +
        table(
          ['Slot', 'Outcome', 'Family', 'Family size', 'Representative', 'Score at promo'],
          promotion.slots.map((slot) => {
            const item = promotion.promoted.find(
              (promoted) => promoted.slot === slot.slot && promoted.family === slot.family
            );

            return [
              slot.slot,
              slot.outcome,
              slot.family ?? '—',
              item?.familySize ?? '—',
              item ? item.representative.members.join(' ') : '—',
              item?.representative.value ?? '—'
            ];
          })
        )
    );

    const refinements: unknown[][] = [];

    for (let index = 1; index <= promotion.promoted.length; index++) {
      const record = await readIf<Refinement>(path.join(dir, `refine-f${index}.json`));

      if (!record) {
        continue;
      }

      const removed = record.pruneSteps
        .filter((step) => step.removed)
        .map((step) => {
          const marginal = step.marginals.find((item) => item.symbol === step.removed);

          return `${step.removed} (${fmt(marginal?.marginal)}${marginal?.interval ? `, LB ${fmt(marginal.interval.lower)}` : ''}; ${step.phase})`;
        });

      refinements.push([
        `${arm}-f${index}`,
        record.slot,
        keyMembers(record.start),
        record.moves.length,
        keyMembers(record.refined),
        removed.join('; ') || '—',
        record.result ? keyMembers(record.result) : '—',
        record.stoppedBy || 'assessed',
        record.unique
      ]);
    }

    parts.push(
      `### ${window} ${arm}: refinement and pruning\n\n` +
        table(
          [
            'Family',
            'Slot',
            'Start',
            'Accepted moves',
            'Refined',
            'Pruned (marginal, 90% LB)',
            'Result',
            'Outcome',
            'Unique evaluations'
          ],
          refinements
        )
    );

    const assessment = await readIf<{ finalists: Finalist[] }>(path.join(dir, 'assessment.json'));

    if (assessment) {
      parts.push(
        `### ${window} ${arm}: finalists (5 bps; E0 centre, E1 confirm-A)\n\n` +
          table(
            [
              'Finalist',
              'Members',
              'Centre net (E0)',
              'Centre net_T',
              'P50 net (E1)',
              'P50 net_T',
              'S_J',
              'S_T',
              'Q25',
              'Centre DD',
              'DDmed / DD90',
              'Lots',
              'Portfolio DD',
              'Failed gates',
              'Labels'
            ],
            assessment.finalists.map((item) => [
              item.label,
              item.members.join(' '),
              item.centre['5']!.net,
              item.centreNetT,
              item.confirmA.nbJ.p50,
              item.confirmA.nbT.p50,
              item.confirmA.j.s,
              item.confirmA.t.s,
              item.confirmA.nbJ.q25,
              item.centre['5']!.minuteDrawdown,
              `${fmt(item.confirmA.nbJ.ddMedian)} / ${fmt(item.confirmA.nbJ.dd90)}`,
              item.centre['5']!.lots,
              pct(item.portfolio['5-symmetric']?.dailyPercent),
              item.gates
                .filter((gate) => !gate.pass)
                .map((gate) => gate.gate)
                .join(' ') || 'none',
              item.labels.join('; ') || '—'
            ])
          )
      );
    }
  }

  return parts.join('\n\n');
};

// ----- walk-forward -----

const walkForwardTables = async () => {
  const parts: string[] = [];

  for (const fold of ['fold-a', 'fold-b'] as const) {
    const validation = await readIf<{
      controls: { eligible: number; p25: number; p50: number; p75: number };
      rows: {
        label: string;
        kind: string;
        validation: Record<string, number>;
        minuteDrawdownValidation?: number;
        lotsValidation?: number;
        controlPercentile?: number;
        activityMatched?: { percentile: number; controls: number };
      }[];
      isolated: Record<string, { net: number; minuteDrawdown: number; lots: number }>;
      persistence: {
        controls: number;
        centreNet: number;
        j0: number;
        t0: number;
        finalistsByArm: Record<string, { n: number; spearman: number }>;
      };
    }>(stageDir('walkforward', fold, 'validation.json'));

    if (!validation) {
      continue;
    }

    parts.push(
      `## ${fold}\n\nEligible controls ${validation.controls.eligible}: ctl_0.25 ${fmt(validation.controls.p25)}, ctl_0.50 ${fmt(validation.controls.p50)}, ctl_0.75 ${fmt(validation.controls.p75)}. Persistence among eligible controls (Spearman with V): centre net ${fmt(validation.persistence.centreNet, 3)}, J0 ${fmt(validation.persistence.j0, 3)}, T0 ${fmt(validation.persistence.t0, 3)}; finalists' score rank with V: ${Object.entries(
        validation.persistence.finalistsByArm
      )
        .map(([arm, item]) => `${arm} ${fmt(item.spearman, 2)} (n = ${item.n})`)
        .join(', ')}.\n\n` +
        table(
          [
            'Row',
            'V @0',
            'V @2',
            'V @5',
            'V @10',
            'Percentile',
            'Activity-matched pct (controls)',
            'Validation minute DD',
            'Validation lots',
            'Flat-start net'
          ],
          validation.rows
            .filter((row) => row.kind !== 'control')
            .map((row) => [
              row.label,
              row.validation['0'],
              row.validation['2'],
              row.validation['5'],
              row.validation['10'],
              pct(row.controlPercentile),
              row.activityMatched ? `${pct(row.activityMatched.percentile)} (${row.activityMatched.controls})` : '—',
              row.minuteDrawdownValidation ?? '—',
              row.lotsValidation ?? '—',
              validation.isolated[row.label]?.net ?? '—'
            ])
        )
    );
  }

  return parts.join('\n\n');
};

export const writeTables = async () => {
  const dir = stageDir('tables');
  const written: string[] = [];
  const write = async (name: string, title: string, body: string) => {
    if (body.trim()) {
      await fs.outputFile(
        path.join(dir, name),
        `# ${title}\n\nGenerated from the records by \`npm run diverse-d1 -- tables\`.\n\n${body}\n`
      );
      written.push(name);
    }
  };

  await write('calibration.md', 'Reference controls and calibration', await calibrationTables());

  const coverage = await coverageTables();

  await write('coverage.md', 'Search coverage', coverage.summary);
  await write('coverage-by-symbol.md', 'Search coverage by symbol', coverage.perSymbol);

  for (const window of windows) {
    await write(
      `round-${window}.md`,
      `Round ${window}: families, refinement, pruning and finalists`,
      await roundTables(window)
    );
  }

  await write(
    'walkforward.md',
    'Walk-forward validation (E2: reused historical diagnostics)',
    await walkForwardTables()
  );
  log(`tables: ${written.join(', ') || 'nothing to write yet'}`);
};
