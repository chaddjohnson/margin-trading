// The parity stage (PROTOCOL.md §11 P0–P2) on the training universe: refused unless the protocol is frozen; fails the
// study (and blocks the search) on any difference.
import { log, study } from './context.ts';
import { searchBenchmarkBooks } from './benchmarks.ts';
import { trainingUniverse } from './data.ts';
import { JointEvaluator } from './evaluator.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { type ParityRecord, parityCases, runP0, runP1, runP2, writeParity } from './parity.ts';
import { controlVectors, sobolLibrary } from './space.ts';

export const runParityStage = async () => {
  await requireProtocolFrozen();

  const started = Date.now();
  const loaded = await trainingUniverse();
  const evaluator = new JointEvaluator(loaded);
  const controls = await controlVectors();
  const sobol = sobolLibrary().vectors;
  const library = [...controls, ...sobol];
  const d1 = controls.find((control) => control.origin.startsWith('control:D1 shipped constants'))!;
  const records: ParityRecord[] = [];

  await runP0(loaded, records);

  const cases = await parityCases(library, sobol, d1);

  runP1(evaluator, cases, records);

  const benchmarks = await searchBenchmarkBooks();
  const portfolio = runP2(evaluator, d1, benchmarks.B5, records);
  const failures = await writeParity(records, {
    seconds: (Date.now() - started) / 1000,
    costs: study.costsBps,
    cases: cases.map((item) => ({
      label: item.label,
      books: item.books.map((book) => `${book.symbol}:${book.vector.id}`)
    })),
    portfolio
  });

  log(`parity: ${records.length} comparisons, ${failures.length} with differences`);

  if (failures.length > 0) {
    throw new Error(`Parity failed in ${failures.length} comparisons; the replay may not select anything`);
  }
};
