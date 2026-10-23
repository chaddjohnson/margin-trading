// Amendment A1 of PROTOCOL.md §14, added after the 672 predeclared full-path replays produced no call: a small
// beyond-grid illustration of what a call does to the real ledger. NOT predeclared, NOT part of any decision rule,
// and no statement about likelihood. At the session after each run's closest approach under U60 (the same rule date as
// §9.3), every holding gaps 50% or 60% at the open (ρ = 1) and the requirement is left at 35% or raised to 50% or 60%;
// a path that breaches is replayed under every broker model.
import fs from 'fs-extra';
import { formatDate, formatTime, log, stageDir, writeJson } from './context.ts';
import type { Universe } from './data.ts';
import { runAllocator, sessionIndexOf } from './engine.ts';
import type { ScheduleKey } from './margin.ts';
import { toCsv } from './metrics.ts';
import { scenarioBConfig } from './parity.ts';
import { combinationOf } from './context.ts';
import { allocatorConfig } from './scenarios.ts';
import { type PathRun, alternativeLiquidations, pathRun, primaryLiquidation } from './stress.ts';

export const runIllustration = async (universe: Universe) => {
  const bases = [
    { key: 'B', config: await scenarioBConfig() },
    { key: 'C-all-primary-shadow', config: await allocatorConfig('portfolio', combinationOf('all-primary'), 'shadow') }
  ];
  const rows: PathRun[] = [];
  const liquidations: Record<string, unknown>[] = [];

  for (const base of bases) {
    const result = runAllocator(universe, base.config);
    const index = Math.min(sessionIndexOf(universe, formatDate(result.minimum.U60!.time)) + 1, result.endIndex);

    for (const gap of [0.5, 0.6]) {
      for (const requirement of ['U35', 'U50', 'U60'] as ScheduleKey[]) {
        const models = [
          { label: 'intraday-immediate', liquidation: primaryLiquidation },
          ...alternativeLiquidations(50)
        ];

        for (const [position, model] of models.entries()) {
          const { row, result: replay } = pathRun(
            base.key,
            universe,
            base.config,
            result,
            index,
            gap,
            1,
            requirement,
            model.liquidation,
            model.label
          );

          rows.push(row);

          for (const sale of replay.forcedLiquidations) {
            liquidations.push({
              base: base.key,
              shock_date: row.date,
              gap,
              requirement,
              model: model.label,
              ...sale,
              time: formatTime(sale.time)
            });
          }

          // Only a path that breaches under the primary model is worth replaying under the others.
          if (position === 0 && row.calls === 0) {
            break;
          }
        }
      }
    }
  }

  await fs.outputFile(stageDir('stress', 'illustration_a1.csv'), toCsv(rows as unknown as Record<string, unknown>[]));
  await fs.outputFile(stageDir('stress', 'illustration_a1_liquidations.csv'), toCsv(liquidations));
  await writeJson(stageDir('stress', 'illustration_a1.json'), {
    amendment: 'A1 (post hoc, beyond the predeclared grid; illustration only)',
    runs: rows.length,
    runsWithCalls: rows.filter((row) => row.calls > 0).length
  });
  log(`illustration A1: ${rows.length} replays, ${rows.filter((row) => row.calls > 0).length} with a call`);
};
