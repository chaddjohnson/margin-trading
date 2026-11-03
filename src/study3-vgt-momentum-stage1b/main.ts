// The Stage 1b CLI (research/study3-vgt-momentum-stage1b/scripts/study3-momentum-stage1b.sh):
//   status | verify | timing | stage <name> [history]
// Stages are write-once and run in the order of records.ts `stageOrder`; each verifies its predecessors and freezes.
import fs from 'fs-extra';
import { stageAnalysis } from './analysis.ts';
import { type HistoryKey, files, log, resultsRoot, search } from './context.ts';
import { defaultOptions } from './engine.ts';
import { assertFreezes, readJsonFile, recordExists, sha256, stageOrder, toJson, verifyRecord } from './records.ts';
import { Evaluator, searchCell } from './search.ts';
import { stageAudit, stageDevelop, stageFreezeCode, stageFreezeProtocol, stageParity } from './stages.ts';
import { stageEvaluate, stageRepair, stageRobustness } from './stages2.ts';
import { syntheticMarket } from './tests/synthetic.ts';
import { Pool } from './pool.ts';
import { entryDims } from './catalog.ts';

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
  const stages = fs.existsSync(dir) ? fs.readdirSync(dir).map((name) => name.replace(/\.json$/, '')) : [];

  for (const stage of stages) {
    problems.push(...verifyRecord(stage).problems);
  }

  return { stages, problems };
};

// Engine speed on a synthetic market (no market data).
const timing = async () => {
  const ds = syntheticMarket(1760, 11);
  const pool = new Pool(ds);
  const evaluator = new Evaluator(pool, 'T', defaultOptions(250, ds.sessionCount - 1));
  const started = Date.now();
  const result = await searchCell(
    evaluator,
    {
      key: 'T|E06|XV',
      entry: 'E06',
      entryDims: entryDims('E06'),
      entryFixed: {},
      exit: 'XV',
      reentry: 'R3F',
      sizing: { kind: 'Z0' }
    },
    search.pairing
  );

  await pool.close();
  return { evaluations: result.evaluated, seconds: (Date.now() - started) / 1000, workers: pool.size };
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
      console.log(JSON.stringify(await timing(), null, 1));
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
        case 'repair':
          log(`repair sealed ${(await stageRepair()).bodyHash}`);
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
      console.log('usage: status | verify | timing | stage <name> [history]');
  }
};

await main();
