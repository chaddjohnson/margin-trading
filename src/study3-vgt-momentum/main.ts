// npm run study3-momentum -- <command>
//
//   status                      every stage record and whether it verifies (read-only)
//   verify                      freezes, records and payload hashes (read-only)
//   timing                      engine speed on a synthetic 2,012 × 390 path (no market data)
//   stage audit | freeze-protocol | parity | freeze-code | develop <A|B|C|D|H> | evaluate <A|B|C|D> |
//         diagnostics | robustness | analysis      the write-once stages, in PROTOCOL.md §6's order
import { type FoldKey, type HistoryKey, log } from './context.ts';
import { Engine } from './engine.ts';
import { recordExists, stageOrder, verifyRecord } from './records.ts';
import { familyIds } from './signals.ts';
import { panelSpec } from './specs.ts';
import {
  stageAnalysis,
  stageAudit,
  stageDevelop,
  stageDiagnostics,
  stageEvaluate,
  stageFreezeCode,
  stageFreezeProtocol,
  stageParity,
  stageRobustness,
  verifyAll
} from './stages.ts';
import { datasetOf, options, randomWalk } from './tests/fixtures.ts';

const [command, ...rest] = process.argv.slice(2);

const timing = () => {
  const ds = datasetOf(randomWalk(77, 2012, { bars: 390, vol: 0.015 }));
  const engine = new Engine(ds);
  const o = options(ds, { firstDecisionIndex: 252 });
  const rows: { family: string; ms: number }[] = [];

  for (const family of familyIds) {
    const spec = panelSpec(family, 'TPL');

    engine.run(spec, o); // warm the signal cache and the JIT

    const start = performance.now();

    for (let i = 0; i < 5; i++) {
      engine.run({ ...spec, params: { ...spec.params } }, o);
    }

    rows.push({ family, ms: (performance.now() - start) / 5 });
  }

  return { sessions: ds.sessionCount, bars: ds.barCount, rows };
};

const main = async () => {
  switch (command) {
    case 'status':
      for (const stage of stageOrder) {
        const exists = stage.startsWith('freeze') ? null : recordExists(stage);

        console.log(
          `${stage.padEnd(16)} ${exists === null ? '(freeze file)' : exists ? (verifyRecord(stage).problems.length ? 'BROKEN' : 'sealed, verifies') : 'not run'}`
        );
      }

      return;
    case 'verify': {
      const result = verifyAll();

      console.log(JSON.stringify(result, null, 1));
      process.exitCode = result.problems.length ? 1 : 0;
      return;
    }
    case 'timing':
      console.log(JSON.stringify(timing(), null, 1));
      return;
    case 'stage': {
      const [name, key] = rest;

      switch (name) {
        case 'audit':
          log(`audit ${JSON.stringify((await stageAudit()).payloads)}`);
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
          await stageDevelop(key as HistoryKey);
          log(`develop-${key} sealed`);
          return;
        case 'evaluate':
          await stageEvaluate(key as FoldKey);
          log(`evaluate-${key} sealed`);
          return;
        case 'diagnostics':
          await stageDiagnostics();
          log('diagnostics sealed');
          return;
        case 'robustness':
          await stageRobustness();
          log('robustness sealed');
          return;
        case 'analysis':
          await stageAnalysis();
          log('analysis sealed');
          return;
        default:
          throw new Error(`unknown stage ${name}`);
      }
    }
    default:
      console.log('usage: status | verify | timing | stage <name> [key]');
  }
};

await main();
