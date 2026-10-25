// Post hoc, NON-DECISIONAL diagnostics of the training search (run after Stage S, training data only): they explain
// the gate outcomes and select, rank or change nothing. `npm run joint-16-etf-d1 -- diagnostics` writes
// results/diagnostics/diagnostics.json.
//
// 1. The joint-perturbation machinery on configurations nobody optimized (random subsets of random library vectors):
//    a symmetric neighbourhood should centre on the base net; the optimized configurations' neighbourhoods do not.
// 2. A zero perturbation reproduces the base exactly; perturbed configurations agree between the replay and the full
//    engine.
// 3. For the best-scoring shortlisted configurations and the benchmarks: which parameter, and which member, carries the
//    neighbourhood loss (each parameter moved alone on every member; each member's whole vector moved alone).
import { Rng } from '../optimizer/rng.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { searchBenchmarkBooks } from './benchmarks.ts';
import { log, readJson, stageDir, study, universe, writeJson } from './context.ts';
import { trainingUniverse } from './data.ts';
import { type Book, JointEvaluator, canonicalBooks } from './evaluator.ts';
import { requireProtocolFrozen } from './freeze.ts';
import type { Battery } from './robust.ts';
import { type Grid, box, idOf, jointPerturbation, sobolLibrary } from './space.ts';
import type { IntParams } from '../d1-refinement/families.ts';

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const vectorOfGrid = (grid: Grid, origin: string) => ({ id: idOf(grid as IntParams), grid, origin });

const neighbourhood = (evaluator: JointEvaluator, books: Book[], seed: string, samples = 48) => {
  const rng = Rng.from(study.seedLabel, 'diagnostic-perturbation', seed);
  const base = evaluator.evaluate(books).evaluation.net;
  const nets: number[] = [];

  for (let sample = 0; sample < samples; sample++) {
    const perturbed = books.map((book) => ({
      symbol: book.symbol,
      vector: vectorOfGrid(jointPerturbation(book.vector.grid, rng), 'diagnostic')
    }));

    nets.push(evaluator.evaluate(perturbed).evaluation.net);
  }

  return {
    base,
    p50Share: base !== 0 ? median(nets) / base : NaN,
    shareAboveBase: nets.filter((net) => net > base).length / nets.length,
    medianMinusBase: median(nets) - base
  };
};

// Each parameter moved alone (−m or +m, the joint magnitudes) on every member at once, and each member's whole vector
// perturbed alone (the joint rule, 24 samples): the median net ÷ base.
const attribution = (evaluator: JointEvaluator, books: Book[], seed: string) => {
  const base = evaluator.evaluate(books).evaluation.net;
  const byParameter = box.map((spec) => {
    const magnitude = study.robustness.jointMagnitudes[spec.key]!;
    const nets = [-magnitude, magnitude].map((offset) => {
      const moved = books.map((book) => {
        const grid = { ...book.vector.grid };

        grid[spec.key as keyof Grid] = Math.min(spec.max, Math.max(spec.min, grid[spec.key as keyof Grid] + offset));

        return { symbol: book.symbol, vector: vectorOfGrid(grid, 'diagnostic') };
      });

      return evaluator.evaluate(moved).evaluation.net;
    });

    return { parameter: spec.key, minus: nets[0]! / base, plus: nets[1]! / base };
  });
  const byMember = books.map((book) => {
    const rng = Rng.from(study.seedLabel, 'diagnostic-member', seed, book.symbol);
    const nets: number[] = [];

    for (let sample = 0; sample < 24; sample++) {
      const grid = jointPerturbation(book.vector.grid, rng);

      nets.push(
        evaluator.evaluate(
          books.map((item) =>
            item === book ? { symbol: item.symbol, vector: vectorOfGrid(grid, 'diagnostic') } : item
          )
        ).evaluation.net
      );
    }

    return {
      symbol: book.symbol,
      p50Share: median(nets) / base,
      shareAboveBase: nets.filter((net) => net > base).length / 24
    };
  });

  return { base, byParameter, byMember };
};

export const runDiagnostics = async () => {
  await requireProtocolFrozen();

  const loaded = await trainingUniverse();
  const evaluator = new JointEvaluator(loaded);
  const library = sobolLibrary().vectors;

  // 1. Unoptimized configurations: 12 random subsets (sizes 1, 4, 8 and 16 × 3) of random library vectors.
  const random = [];

  for (const size of [1, 4, 8, 16]) {
    for (let n = 0; n < 3; n++) {
      const rng = Rng.from(study.seedLabel, 'diagnostic-random', size, n);
      const pool: string[] = [...universe];
      const books: Book[] = [];

      while (books.length < size) {
        books.push({ symbol: pool.splice(rng.int(pool.length), 1)[0]!, vector: library[rng.int(library.length)]! });
      }

      random.push({ size, n, ...neighbourhood(evaluator, books, `random-${size}-${n}`) });
    }
  }

  log(`unoptimized neighbourhoods: ${random.map((row) => row.p50Share.toFixed(2)).join(' ')}`);

  // 2. Zero perturbation and replay = full engine on perturbed configurations (R1 of the shortlist).
  const robust = await readJson<{ gated: { battery: Battery; outcome: { score: number } }[] }>(
    stageDir('robust', 'robust.json')
  );
  const booksOf = (battery: Battery): Book[] =>
    battery.books.map((book) => ({
      symbol: book.symbol,
      vector: { id: book.id, grid: book.grid, origin: 'shortlist' }
    }));
  const ranked = robust.gated
    .filter((item) => item.battery.kind !== 'benchmark')
    .sort((a, b) => b.outcome.score - a.outcome.score);
  const top = ranked[0]!.battery;
  const topBooks = booksOf(top);
  const zero = evaluator.evaluate(
    topBooks.map((book) => ({ symbol: book.symbol, vector: vectorOfGrid({ ...book.vector.grid }, 'zero') }))
  ).evaluation.net;
  const parityRng = Rng.from(study.seedLabel, 'diagnostic-parity');
  const perturbedParity = [];

  for (let sample = 0; sample < 4; sample++) {
    const perturbed = canonicalBooks(topBooks).map((book) => ({
      symbol: book.symbol,
      vector: vectorOfGrid(jointPerturbation(book.vector.grid, parityRng), 'diagnostic')
    }));
    const outcome = replayAgainstFull(
      loaded,
      perturbed.map((book) => book.symbol),
      Object.fromEntries(perturbed.map((book) => [book.symbol, evaluator.phenotype(book)])),
      study.principalCostBps
    );

    perturbedParity.push({
      differences: outcome.differences.length,
      net: evaluator.evaluate(perturbed).evaluation.net
    });
  }

  // 3. Attribution of the neighbourhood loss for the top three shortlisted configurations by score and the benchmarks.
  const benchmarks = await searchBenchmarkBooks();
  const attributed = [];

  for (const item of ranked.slice(0, 3)) {
    attributed.push({ label: item.battery.label, ...attribution(evaluator, booksOf(item.battery), item.battery.key) });
  }

  for (const key of ['B1', 'B4', 'B5'] as const) {
    attributed.push({ label: key, ...attribution(evaluator, benchmarks[key], key) });
  }

  const record = {
    generatedAt: new Date().toISOString(),
    nature: 'post hoc and non-decisional; training only; nothing here changes a gate, a rank or a selection',
    unoptimized: random,
    zeroPerturbation: {
      label: top.label,
      base: top.costs[study.principalCostBps]!.net,
      zero,
      equal: zero === top.costs[study.principalCostBps]!.net
    },
    perturbedParity,
    attribution: attributed
  };

  await writeJson(stageDir('diagnostics', 'diagnostics.json'), record);
  log('diagnostics written');
};
