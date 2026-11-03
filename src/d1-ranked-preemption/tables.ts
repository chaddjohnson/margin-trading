// `npm run ranked-preemption -- tables`: Markdown tables rendered from the sealed records only (read-only; nothing is
// recomputed), written to results/tables/ for the reports.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type FoldKey,
  type RankingKey,
  type WindowKey,
  foldKeys,
  formatDollars,
  frozenSelectionFile,
  rankingKeys,
  stageDir,
  study,
  windowKeys,
  writeText
} from './context.ts';
import { controlsFile, readControls } from './controls.ts';
import { diagnosticFile } from './diagnostic.ts';
import type { PoolMetrics } from './evaluate.ts';
import { readSealed } from './freeze.ts';
import { jointFile } from './joint.ts';
import { rankingFile, readRanking } from './ranking.ts';
import { stageAFile } from './standalone.ts';
import { procedureGateFile, validationFile } from './walkforward.ts';

const money = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : formatDollars(value);
const num = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toFixed(digits);
const pct = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : `${(value * 100).toFixed(2)}%`;
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (headers: string[], rows: (string | number)[][]) =>
  [row(headers), row(headers.map(() => '---')), ...rows.map(row)].join('\n');

const spearman = (a: readonly string[], b: readonly string[]) => {
  const common = a.filter((symbol) => b.includes(symbol));
  const ra = new Map(common.map((symbol, i) => [symbol, i]));
  const rbOrder = b.filter((symbol) => common.includes(symbol));
  const rb = new Map(rbOrder.map((symbol, i) => [symbol, i]));
  const n = common.length;
  const d2 = common.reduce((total, symbol) => total + (ra.get(symbol)! - rb.get(symbol)!) ** 2, 0);

  return n > 1 ? 1 - (6 * d2) / (n * (n * n - 1)) : NaN;
};

export const renderTables = async () => {
  const out = stageDir('tables');
  const written: string[] = [];
  const emit = async (name: string, text: string) => {
    const file = path.join(out, name);

    await writeText(file, text);
    written.push(file);
  };

  for (const window of windowKeys) {
    if (!(await fs.pathExists(stageAFile(window)))) {
      continue;
    }

    const stageA = await readSealed<{
      bodyHash: string;
      counts: Record<string, number>;
      minTrades: number;
      evaluations: number;
      symbols: Record<
        string,
        {
          status: string;
          uncertain: boolean;
          sample: string;
          idleShare: number;
          reasons: string[];
          library: unknown[];
          representative: {
            credible: boolean;
            candidateId: string;
            metrics: Record<string, number>;
            neighbourhoodMedian: number | null;
          } | null;
        }
      >;
    }>(stageAFile(window));
    const rows = Object.entries(stageA.symbols).map(([symbol, record]) => {
      const m = record.representative?.metrics;

      return [
        symbol,
        record.status + (record.uncertain ? ' (uncertain)' : ''),
        record.sample,
        m ? m.trades! : 0,
        money(m?.net),
        money(m?.meanNet),
        num(m?.netPerDay),
        money(m?.minuteDrawdown),
        money(m?.bestTrade),
        money(m?.score),
        money(record.representative?.neighbourhoodMedian ?? null),
        record.representative
          ? record.representative.credible
            ? record.representative.candidateId
            : `${record.representative.candidateId} (non-credible)`
          : 'none',
        record.library.length,
        Number.isFinite(record.idleShare) ? pct(record.idleShare) : '',
        record.reasons.join('; ')
      ];
    });

    await emit(
      `standalone-${window}.md`,
      [
        `# Stage A — ${window} (search end ${study.windows[window].searchEnd}; credible ≥ ${stageA.minTrades} trades; ${stageA.evaluations} evaluations; record ${stageA.bodyHash.slice(0, 12)})`,
        '',
        `Counts: ${Object.entries(stageA.counts)
          .map(([key, value]) => `${key} ${value}`)
          .join(', ')}`,
        '',
        table(
          [
            'symbol',
            'status',
            'sample',
            'trades',
            'net',
            'R1 mean/trade',
            'R2 net/day',
            'minute DD',
            'best trade',
            'J_s',
            'J_nb',
            'representative',
            'library',
            'idle share',
            'reasons'
          ],
          rows
        )
      ].join('\n')
    );

    if (await fs.pathExists(rankingFile(window, 'R1'))) {
      const r1 = await readRanking(window, 'R1');
      const r2 = await readRanking(window, 'R2');
      const lines = r1.entries.map((entry, i) => {
        const other = r2.entries[i]!;

        return [
          entry.position,
          `${entry.symbol} ${entry.score === null ? 'unrankable' : money(entry.score)} (${entry.trades}, ${entry.sample}, ${entry.status})`,
          `${other.symbol} ${other.score === null ? 'unrankable' : num(other.score)} (${other.trades}, ${other.status})`
        ];
      });

      await emit(
        `rankings-${window}.md`,
        [
          `# Rankings — ${window} (R1 ${r1.bodyHash.slice(0, 12)}, R2 ${r2.bodyHash.slice(0, 12)}; Spearman R1 vs R2 ${num(spearman(r1.order, r2.order), 3)})`,
          '',
          table(
            [
              'position',
              'R1: symbol mean net per trade (trades, sample, status)',
              'R2: symbol net per occupied day (trades, status)'
            ],
            lines
          )
        ].join('\n')
      );
    }

    if (await fs.pathExists(diagnosticFile(window))) {
      const diagnostic = await readSealed<{
        bodyHash: string;
        materiality: {
          ranking: RankingKey;
          counts: Record<string, number>;
          threshold: number;
          material: boolean;
          budgetShare: number;
        }[];
        pools: Record<
          string,
          {
            members: string[];
            decisions: number;
            refused: number;
            lots: number;
            heldSessions: number;
            overlaps: unknown[];
            actionable: Record<string, number>;
            higher: Record<string, number>;
            estimateNonNegative: Record<string, number>;
            collisions: Record<string, Record<string, number>>;
            ties: number;
            regimes: Record<string, number>;
          }
        >;
      }>(diagnosticFile(window));
      const poolRows = Object.entries(diagnostic.pools).flatMap(([name, pool]) =>
        Object.keys(pool.actionable).map((id) => [
          name,
          pool.members.join(' '),
          pool.decisions,
          pool.refused,
          pool.lots,
          pool.overlaps.length,
          id,
          pool.higher[id]!,
          pool.estimateNonNegative[id]!,
          pool.actionable[id]!,
          pool.ties
        ])
      );

      await emit(
        `diagnostic-${window}.md`,
        [
          `# Overlap diagnostic — ${window} (record ${diagnostic.bodyHash.slice(0, 12)}; P0 runs; hindsight fields are in the record, never used)`,
          '',
          table(
            [
              'pool',
              'members',
              'decisions',
              'refused',
              'funded lots',
              'refused while a lot held',
              'ranking',
              'higher-priority',
              '… with estimate ≥ $0',
              'actionable',
              'same-minute ties'
            ],
            poolRows
          ),
          '',
          table(
            ['ranking', 'counts (actionable)', 'threshold', 'material', 'Stage D budget share'],
            diagnostic.materiality.map((m) => [
              m.ranking,
              JSON.stringify(m.counts),
              m.threshold,
              m.material ? 'yes' : 'no',
              pct(m.budgetShare)
            ])
          ),
          '',
          ...Object.entries(diagnostic.pools).map(
            ([name, pool]) =>
              `- ${name} collisions (decider → holder: count): ${
                Object.entries(pool.collisions)
                  .map(
                    ([d, holders]) =>
                      `${d}→${Object.entries(holders)
                        .map(([h, n]) => `${h} ${n}`)
                        .join('/')}`
                  )
                  .join(', ') || 'none'
              }`
          )
        ].join('\n')
      );
    }

    for (const ranking of rankingKeys) {
      if (!(await fs.pathExists(jointFile(window, ranking)))) {
        continue;
      }

      const joint = await readSealed<{
        bodyHash: string;
        budgetShare: number;
        universe: string[];
        arms: {
          arm: string;
          nominable: boolean;
          budget: number;
          evaluations: number;
          generations: number;
          feasible: number;
          coverage: { symbols: Record<string, number>; sizes: Record<string, number> };
          promoted: { key: string; score: number; net: number; promotion: { medianScore: number } }[];
          assessed: {
            centre: {
              key: string;
              score: number;
              net: number;
              minuteDrawdown: number;
              lots: number;
              preemptions: PoolMetrics['preemptions'];
            };
            refinedBy: number;
            promotion: { medianScore: number };
            assessment: {
              medianScore: number;
              shareDrawdownOk: number;
              netP10: number;
              netP25: number;
              netP50: number;
              drawdownP90: number;
            };
            amplitude2: { medianScore: number; shareDrawdownOk: number };
          }[];
          finalist: { key: string } | null;
        }[];
        pick: { arm: string; key: string; metrics: PoolMetrics; assessment: { medianScore: number } } | null;
      }>(jointFile(window, ranking));
      const armRows = joint.arms.map((arm) => [
        arm.arm + (arm.nominable ? '' : ' (exploratory)'),
        arm.budget,
        arm.evaluations,
        arm.generations,
        arm.feasible,
        Object.keys(arm.coverage.symbols).length,
        JSON.stringify(arm.coverage.sizes)
      ]);
      const assessedRows = joint.arms.flatMap((arm) =>
        arm.assessed.map((entry) => [
          arm.arm,
          entry.centre.key
            .split('|')
            .map((part) => part.split(':')[0])
            .join(' '),
          money(entry.centre.score),
          money(entry.centre.net),
          money(entry.centre.minuteDrawdown),
          entry.centre.lots,
          `${entry.centre.preemptions.executed}/${entry.centre.preemptions.aborted}/${entry.centre.preemptions.declined}`,
          money(entry.refinedBy),
          money(entry.promotion.medianScore),
          money(entry.assessment.medianScore),
          pct(entry.assessment.shareDrawdownOk),
          money(entry.assessment.netP10),
          money(entry.assessment.netP50),
          money(entry.assessment.drawdownP90),
          money(entry.amplitude2.medianScore),
          arm.finalist?.key === entry.centre.key ? 'finalist' : ''
        ])
      );

      await emit(
        `joint-${window}-${ranking}.md`,
        [
          `# Stage D — ${window} ${ranking} (record ${joint.bodyHash.slice(0, 12)}; budget share ${pct(joint.budgetShare)}; universe ${joint.universe.length}: ${joint.universe.join(' ')})`,
          '',
          table(
            ['arm', 'budget', 'evaluations', 'generations', 'feasible', 'symbols tried', 'pool sizes (count)'],
            armRows
          ),
          '',
          table(
            [
              'arm',
              'members',
              'J_pool',
              'net',
              'minute DD',
              'lots',
              'preempt ex/ab/dec',
              'refined by',
              'J_nb A',
              'J_nb B',
              'share DD ≤ $35k',
              'net p10',
              'net p50',
              'DD p90',
              'J_nb A2',
              ''
            ],
            assessedRows
          ),
          '',
          `Pick: ${joint.pick ? `${joint.pick.arm} ${joint.pick.key}` : 'none'}`
        ].join('\n')
      );
    }

    if (await fs.pathExists(controlsFile(window))) {
      const controls = await readControls(window);
      const rows = controls.configurations.map((c) => {
        const f = controls.fixed[c.id]!;
        const m = f['5']!;
        const pf = controls.portfolio[c.id];

        return [
          c.id,
          c.policy,
          c.books.map((book) => book.symbol).join(' '),
          money(m.net),
          money(m.minuteDrawdown),
          m.lots,
          money(m.bestLot),
          `${m.preemptions.executed}/${m.preemptions.superseded}/${m.preemptions.aborted}/${m.preemptions.declined}`,
          money(m.preemptedNet),
          money(m.replacementNet),
          money(m.hindsightContinuation),
          money(f['0']?.net),
          money(f['2']?.net),
          money(f['10']?.net),
          pf ? money(pf.endEquity) : '',
          pf ? pct(pf.dailyPercentDrawdown) : '',
          pf ? num(pf.productivity, 0) : ''
        ];
      });

      await emit(
        `controls-${window}.md`,
        [
          `# Controls — ${window} training (record ${controls.bodyHash.slice(0, 12)}; fixed $100k at 5 bps unless noted; portfolio 20% frozen dividends)`,
          '',
          table(
            [
              'id',
              'policy',
              'members',
              'net',
              'minute DD',
              'lots',
              'best lot',
              'preempt ex/sup/ab/dec',
              'preempted lots net',
              'replacement lots net',
              'hindsight continuation (not used)',
              'net 0 bps',
              'net 2 bps',
              'net 10 bps',
              'portfolio end equity',
              'portfolio daily DD',
              'productivity $/1M dollar-days'
            ],
            rows
          ),
          '',
          Object.keys(controls.neighbourhoods).length > 0
            ? `B neighbourhoods (N3): ${JSON.stringify(controls.neighbourhoods)}`
            : ''
        ].join('\n')
      );
    }

    if (window !== 'final' && (await fs.pathExists(validationFile(window as FoldKey)))) {
      const validation = await readSealed<{
        bodyHash: string;
        boundary: { date: string };
        validationEnd: string;
        fixed: Record<
          string,
          Record<
            string,
            PoolMetrics & { validation: { net: number; minuteDrawdown: number; dailyDrawdown: number; lots: number } }
          >
        >;
        portfolio: Record<
          string,
          {
            validation: {
              strategyNet: number;
              dailyPercentDrawdown: number;
              productivity: number;
              equityReturn: number;
            };
          }
        >;
        gates: {
          procedure: string;
          available: boolean;
          validationNet: number;
          incumbentNet: number;
          minuteDrawdown: number;
          lots: number;
          F1: boolean;
          F2: boolean;
          F3: boolean;
          success: boolean;
        }[];
      }>(validationFile(window as FoldKey));
      const rows = Object.entries(validation.fixed).map(([id, byCost]) => {
        const v = byCost['5']!.validation;
        const pf = validation.portfolio[id]?.validation;

        return [
          id,
          money(v.net),
          money(v.minuteDrawdown),
          money(v.dailyDrawdown),
          v.lots,
          money(byCost['10']?.validation.net),
          pf ? money(pf.strategyNet) : '',
          pf ? pct(pf.dailyPercentDrawdown) : '',
          pf ? num(pf.productivity, 0) : ''
        ];
      });

      await emit(
        `validation-${window}.md`,
        [
          `# Validation — ${window} (${validation.boundary.date} close → ${validation.validationEnd}; record ${validation.bodyHash.slice(0, 12)}; E2: inspected years)`,
          '',
          table(
            [
              'id',
              'V net (5 bps)',
              'V minute DD',
              'V daily DD',
              'V lots',
              'V net 10 bps',
              'portfolio V strategy net',
              'portfolio V daily DD',
              'portfolio V productivity'
            ],
            rows
          ),
          '',
          table(
            [
              'procedure',
              'available',
              'V net',
              'better incumbent V net (max B5, B4)',
              'V minute DD',
              'V lots',
              'F1',
              'F2',
              'F3',
              'fold success'
            ],
            validation.gates.map((g) => [
              g.procedure,
              g.available ? 'yes' : 'no',
              money(g.validationNet),
              money(g.incumbentNet),
              money(g.minuteDrawdown),
              g.lots,
              String(g.F1),
              String(g.F2),
              String(g.F3),
              g.success ? 'SUCCESS' : 'fail'
            ])
          )
        ].join('\n')
      );
    }
  }

  if (await fs.pathExists(procedureGateFile)) {
    const gate = await readSealed<{
      bodyHash: string;
      result: { procedure: string; folds: Record<string, boolean>; pass: boolean }[];
    }>(procedureGateFile);

    await emit(
      'procedure-gate.md',
      [
        `# Procedure gate (${gate.bodyHash.slice(0, 12)})`,
        '',
        table(
          ['procedure', ...foldKeys, 'GP'],
          gate.result.map((r) => [r.procedure, ...foldKeys.map((f) => String(r.folds[f])), r.pass ? 'PASS' : 'fail'])
        )
      ].join('\n')
    );
  }

  if (await fs.pathExists(frozenSelectionFile)) {
    const selection = await readSealed<{
      bodyHash: string;
      decision: string;
      gates: {
        procedure: string;
        gp: boolean;
        N1: boolean;
        N2: boolean;
        N3: boolean;
        N4: boolean;
        N5: boolean;
        N6: boolean;
        nominable: boolean;
        figures: Record<string, number>;
      }[];
    }>(frozenSelectionFile);

    await emit(
      'selection.md',
      [
        `# Final selection (${selection.bodyHash.slice(0, 12)}): ${selection.decision}`,
        '',
        table(
          [
            'procedure',
            'GP',
            'N1',
            'N2',
            'N3',
            'N4',
            'N5',
            'N6',
            'nominable',
            'net 5',
            'better incumbent net 5',
            'net 10',
            'minute DD',
            'best lot',
            'top-2',
            'lots',
            'years',
            'nbhd median net',
            'nbhd share DD ok',
            'portfolio daily DD',
            'productivity',
            'better incumbent productivity'
          ],
          selection.gates.map((g) => [
            g.procedure,
            String(g.gp),
            String(g.N1),
            String(g.N2),
            String(g.N3),
            String(g.N4),
            String(g.N5),
            String(g.N6),
            g.nominable ? 'YES' : 'no',
            money(g.figures.net5),
            money(g.figures.incumbentNet5),
            money(g.figures.net10),
            money(g.figures.minuteDrawdown5),
            money(g.figures.bestLot),
            money(g.figures.top2),
            g.figures.lots ?? '',
            g.figures.lotYears ?? '',
            money(g.figures.neighbourhoodMedianNet),
            pct(g.figures.neighbourhoodShareDrawdownOk),
            pct(g.figures.portfolioDailyDrawdown),
            num(g.figures.portfolioProductivity, 0),
            num(g.figures.incumbentPortfolioProductivity, 0)
          ])
        )
      ].join('\n')
    );
  }

  return written;
};

export type { WindowKey };
