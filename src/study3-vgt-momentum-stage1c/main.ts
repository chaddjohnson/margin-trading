// The Stage 1c CLI (research/study3-vgt-momentum-stage1c/scripts/study3-momentum-stage1c.sh):
//   status | verify | timing [cells] | stage <name> [history]
// Stages are write-once and run in the order of records.ts `stageOrder`; each verifies its predecessors and freezes.
import fs from 'fs-extra';
import { stageAnalysis } from './analysis.ts';
import { type HistoryKey, cells, files, log, resultsRoot } from './context.ts';
import { defaultOptions } from './engine.ts';
import { stageEvaluate, stageRobustness } from './evaluate.ts';
import { stageParity } from './parity.ts';
import { Pool, defaultWorkers } from './pool.ts';
import { assertFreezes, readJsonFile, recordExists, sha256, stageOrder, toJson, verifyRecord } from './records.ts';
import { CellState, Evaluator, deepPass, firstPass } from './search.ts';
import { stageAudit, stageDevelop, stageFreezeCode, stageFreezeProtocol } from './stages.ts';
import { syntheticMarket } from '../study3-vgt-momentum-stage1b/tests/synthetic.ts';

const [command, ...rest] = process.argv.slice(2);

export const verifyAll = () => {
  const problems: string[] = [];

  if (fs.existsSync(files.protocolFreeze)) {
    try {
      assertFreezes(fs.existsSync(files.codeFreeze));
    } catch (error) {
      problems.push((error as Error).message);
    }

    const frozen = readJsonFile<{ bodyHash: string } & Record<string, unknown>>(files.protocolFreeze);
    const { bodyHash, ...body } = frozen;

    if (sha256(toJson(body)) !== bodyHash) {
      problems.push('PROTOCOL_FREEZE.json body hash');
    }
  }

  const dir = `${resultsRoot}/records`;
  const stages = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.replace(/\.json$/, ''))
    : [];

  for (const stage of stages) {
    problems.push(...verifyRecord(stage).problems);
  }

  return { stages, problems };
};

// Pipeline speed on a synthetic market (no market data): the first pass of `count` cells spread over the matrix, and
// the deep pass of the first 8 of them.
const timing = async (count: number) => {
  const ds = syntheticMarket(1760, 11);
  const pool = new Pool(ds, defaultWorkers(), ds.lastDate);
  const evaluator = new Evaluator(pool, 'T', { ...defaultOptions(250, ds.sessionCount - 1), windows: [250, 500, 750] });
  const step = Math.max(1, Math.floor(cells.length / count));
  const states = cells
    .filter((_, i) => i % step === 0)
    .slice(0, count)
    .map((cell) => new CellState(cell));
  const started = Date.now();

  for (let i = 0; i < states.length; i += 24) {
    await firstPass(evaluator, states.slice(i, i + 24));
  }

  const first = { evaluations: evaluator.evaluations, seconds: (Date.now() - started) / 1000 };

  await deepPass(evaluator, states.slice(0, 8));
  await pool.close();

  return {
    workers: pool.size,
    cells: states.length,
    firstPass: first,
    deep8: {
      evaluations: evaluator.evaluations - first.evaluations,
      seconds: (Date.now() - started) / 1000 - first.seconds
    },
    msPerEvaluation: ((Date.now() - started) / evaluator.evaluations).toFixed(3),
    duplicates: evaluator.duplicates
  };
};

const main = async () => {
  switch (command) {
    case 'status':
      for (const stage of stageOrder) {
        const marker =
          stage === 'freeze-protocol' ? files.protocolFreeze : stage === 'freeze-code' ? files.codeFreeze : null;
        const state = marker
          ? fs.existsSync(marker)
            ? 'frozen'
            : 'not frozen'
          : recordExists(stage)
            ? verifyRecord(stage).problems.length
              ? 'BROKEN'
              : 'sealed, verifies'
            : 'not run';

        console.log(`${stage.padEnd(16)} ${state}`);
      }

      return;
    case 'verify': {
      const result = verifyAll();

      console.log(JSON.stringify(result, null, 1));
      process.exitCode = result.problems.length ? 1 : 0;
      return;
    }
    case 'timing':
      console.log(JSON.stringify(await timing(Number(rest[0] ?? 48)), null, 1));
      return;
    case 'stage': {
      const [name, key] = rest;

      switch (name) {
        case 'audit':
          log(`audit sealed ${(await stageAudit()).bodyHash}`);
          return;
        case 'freeze-protocol':
          log(`protocol frozen ${stageFreezeProtocol().bodyHash}`);
          return;
        case 'parity': {
          const record = await stageParity();

          log(`parity pass=${(record.summary as { pass: boolean }).pass}`);
          return;
        }
        case 'freeze-code':
          log(`code frozen ${stageFreezeCode().manifestHash}`);
          return;
        case 'develop':
          log(`develop-${key} sealed ${(await stageDevelop(key as HistoryKey)).bodyHash}`);
          return;
        case 'evaluate':
          log(`evaluate sealed ${(await stageEvaluate()).bodyHash}`);
          return;
        case 'robustness':
          log(`robustness sealed ${(await stageRobustness()).bodyHash}`);
          return;
        case 'analysis':
          log(`analysis sealed ${stageAnalysis().bodyHash}`);
          return;
        default:
          throw new Error(`unknown stage ${name}`);
      }
    }
    default:
      console.log('usage: status | verify | timing [cells] | stage <name> [history]');
  }
};

await main();
