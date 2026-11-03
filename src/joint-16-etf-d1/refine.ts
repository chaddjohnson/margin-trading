// Stage R (PROTOCOL.md §7): up to six structurally diverse contenders chosen mechanically from the discovery archive,
// each refined by a deterministic large-neighbourhood search over membership and the parameters of several members
// jointly: a membership pass (remove, add, swap), a coordinate pass (each member's box probes) and a joint pass
// (random moves of 2–3 members at once), maximizing J = net − λ × books under the $35,000 drawdown constraint.
import { Rng } from '../optimizer/rng.ts';
import { type Archive, type Entry, booksOfEntry, feasible } from './archive.ts';
import { log, study, universe } from './context.ts';
import type { Book, JointEvaluator } from './evaluator.ts';
import { type Library, jaccardDistance } from './genome.ts';
import { type Vector, idOf, probesOf, randomProbe } from './space.ts';
import type { IntParams } from '../d1-refinement/families.ts';

export const qOf = (entry: Entry) => entry.e.net - study.complexityPenalty * entry.e.books;

const byQ = (a: Entry, b: Entry) => qOf(b) - qOf(a) || (a.key < b.key ? -1 : 1);

export interface Contender {
  slot: number;
  rule: string;
  entry: Entry;
}

export const selectContenders = (entries: readonly Entry[]): Contender[] => {
  const pool = entries.filter((entry) => entry.stage === 'D' && feasible(entry)).sort(byQ);
  const chosen: Contender[] = [];
  const { jaccardDistance: distance, compactBooks, broadBooks, contenders } = study.refinement;
  const diverse = (entry: Entry) =>
    chosen.every((other) => jaccardDistance(other.entry.e.members, entry.e.members) >= distance);
  const take = (entry: Entry | undefined, rule: string) => {
    if (entry && chosen.length < contenders) {
      chosen.push({ slot: chosen.length + 1, rule, entry });
    }
  };

  take(pool[0], 'best Q');

  if (chosen[0] && chosen[0].entry.e.books > compactBooks) {
    take(
      pool.find((entry) => entry.e.books <= compactBooks && diverse(entry)),
      `best Q with ≤ ${compactBooks} books, d ≥ ${distance}`
    );
  }

  if (!chosen.some((item) => item.entry.e.books >= broadBooks)) {
    take(
      pool.find((entry) => entry.e.books >= broadBooks && diverse(entry)),
      `best Q with ≥ ${broadBooks} books, d ≥ ${distance}`
    );
  }

  for (const entry of pool) {
    if (chosen.length >= contenders) {
      break;
    }

    if (!chosen.some((item) => item.entry.key === entry.key) && diverse(entry)) {
      take(entry, `next by Q, d ≥ ${distance}`);
    }
  }

  return chosen;
};

const jOf = (entry: Entry) => (feasible(entry) ? qOf(entry) : -Infinity);

const withVector = (books: readonly Book[], symbol: string, vector: Vector) =>
  books.map((book) => (book.symbol === symbol ? { symbol, vector } : book));

const sortedBooks = (books: readonly Book[]) => [...books].sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

export interface Move {
  cycle: number;
  pass: 'membership' | 'coordinate' | 'joint';
  operator: string;
  changed: string[]; // members added, removed or retuned
  key: string;
  net: number;
  minuteDrawdown: number;
  books: number;
  j: number;
}

export const refineContender = (
  ctx: { archive: Archive; library: Library; limits?: { contenderEvaluations?: number } },
  contender: Contender
) => {
  const rng = Rng.from(study.seedLabel, 'refine', contender.slot);
  const source = `refine:c${contender.slot}`;
  const cap = ctx.limits?.contenderEvaluations ?? study.refinement.evaluationsPerContender;
  const budgetLeft = () => cap - ctx.archive.newCount(source);
  let current = { books: sortedBooks(booksOfEntry(contender.entry)), entry: contender.entry };
  const moves: Move[] = [];
  const passes = { membership: 0, coordinate: 0, joint: 0, evaluated: 0 };
  let cycle = 0;
  let stoppedBy = '';

  const tryMoves = (
    candidates: { books: Book[]; operator: string; changed: string[] }[],
    pass: Move['pass']
  ): boolean => {
    let best: { books: Book[]; entry: Entry; operator: string; changed: string[] } | undefined;

    for (const candidate of candidates) {
      if (budgetLeft() <= 0) {
        break;
      }

      const { entry } = ctx.archive.evaluate(candidate.books, {
        stage: 'R',
        source,
        generation: cycle,
        operator: `${pass}:${candidate.operator}`
      });

      passes.evaluated++;

      if (!best || jOf(entry) > jOf(best.entry) || (jOf(entry) === jOf(best.entry) && entry.key < best.entry.key)) {
        best = { ...candidate, entry };
      }
    }

    if (best && jOf(best.entry) > jOf(current.entry) + study.refinement.improvement) {
      current = { books: sortedBooks(best.books), entry: best.entry };
      passes[pass]++;
      moves.push({
        cycle,
        pass,
        operator: best.operator,
        changed: best.changed,
        key: best.entry.key,
        net: best.entry.e.net,
        minuteDrawdown: best.entry.e.minuteDrawdown,
        books: best.entry.e.books,
        j: jOf(best.entry)
      });

      return true;
    }

    return false;
  };

  for (cycle = 1; ; cycle++) {
    let accepted = false;

    // 1. membership: remove each member, add each inactive ETF (3 library vectors), swap each member for each
    //    inactive ETF (1 library vector)
    {
      const members = current.books.map((book) => book.symbol);
      const inactive = universe.filter((symbol) => !members.includes(symbol));
      const candidates: { books: Book[]; operator: string; changed: string[] }[] = [];

      if (members.length >= 2) {
        for (const symbol of members) {
          candidates.push({
            books: current.books.filter((book) => book.symbol !== symbol),
            operator: `remove ${symbol}`,
            changed: [symbol]
          });
        }
      }

      for (const symbol of inactive) {
        for (const vector of ctx.library.drawDistinct(rng, study.refinement.addVectors)) {
          candidates.push({
            books: [...current.books, { symbol, vector }],
            operator: `add ${symbol}`,
            changed: [symbol]
          });
        }
      }

      for (const out of members) {
        for (const symbol of inactive) {
          candidates.push({
            books: [...current.books.filter((book) => book.symbol !== out), { symbol, vector: ctx.library.draw(rng) }],
            operator: `swap ${out}→${symbol}`,
            changed: [out, symbol]
          });
        }
      }

      accepted = tryMoves(candidates, 'membership') || accepted;
    }

    // 2. coordinate: each member's in-box probes, the best improving probe accepted before the next member
    for (const symbol of current.books.map((book) => book.symbol)) {
      const book = current.books.find((item) => item.symbol === symbol);

      if (!book || budgetLeft() <= 0) {
        continue;
      }

      const candidates = probesOf(book.vector.grid).map((probe) => ({
        books: withVector(current.books, symbol, {
          id: idOf(probe.grid as IntParams),
          grid: probe.grid,
          origin: `probe ${probe.key} ${probe.offset > 0 ? '+' : ''}${probe.offset}`
        }),
        operator: `${symbol} ${probe.key} ${probe.offset > 0 ? '+' : ''}${probe.offset}`,
        changed: [symbol]
      }));

      accepted = tryMoves(candidates, 'coordinate') || accepted;
    }

    // 3. joint: random moves of 2–3 members at once, each with 1–3 parameters moved by a box probe offset
    if (current.books.length >= 2 && budgetLeft() > 0) {
      const candidates: { books: Book[]; operator: string; changed: string[] }[] = [];

      for (let move = 0; move < study.refinement.jointMoves; move++) {
        const members = current.books.map((book) => book.symbol);
        const k = Math.min(members.length, 2 + rng.int(2));
        const pool = [...members];
        const chosen: string[] = [];

        while (chosen.length < k) {
          chosen.push(pool.splice(rng.int(pool.length), 1)[0]!);
        }

        let books = current.books;

        for (const symbol of chosen.sort()) {
          let grid = books.find((book) => book.symbol === symbol)!.vector.grid;
          const steps = 1 + rng.int(3);

          for (let step = 0; step < steps; step++) {
            grid = randomProbe(grid, rng);
          }

          books = withVector(books, symbol, { id: idOf(grid as IntParams), grid, origin: 'joint move' });
        }

        candidates.push({ books, operator: `joint ${chosen.join('+')}`, changed: chosen });
      }

      accepted = tryMoves(candidates, 'joint') || accepted;
    }

    if (budgetLeft() <= 0) {
      stoppedBy = 'budget';
      break;
    }

    if (!accepted) {
      stoppedBy = 'a full cycle accepted no move';
      break;
    }
  }

  ctx.archive.flush();
  log(
    `refine c${contender.slot}: ${moves.length} accepted moves in ${cycle} cycles, ${ctx.archive.newCount(source)} new evaluations (${stoppedBy})`
  );

  return {
    slot: contender.slot,
    rule: contender.rule,
    start: contender.entry.key,
    result: current.entry.key,
    cycles: cycle,
    stoppedBy,
    freshEvaluations: ctx.archive.newCount(source),
    moves,
    passes,
    multiMemberMoves: moves.filter((move) => move.changed.length > 1).length,
    membersRetuned: [...new Set(moves.filter((move) => move.pass !== 'membership').flatMap((move) => move.changed))]
  };
};

// Funded lots of two configurations compared by (symbol, decision time): what refinement changed in the pool.
export const lotChanges = (evaluator: JointEvaluator, before: readonly Book[], after: readonly Book[]) => {
  const lotsOf = (books: readonly Book[]) =>
    new Map(
      evaluator
        .replay(books, study.principalCostBps)
        .lots.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot] as const)
    );
  const a = lotsOf(before);
  const b = lotsOf(after);
  const lost = [...a.entries()].filter(([key]) => !b.has(key)).map(([, lot]) => lot);
  const gained = [...b.entries()].filter(([key]) => !a.has(key)).map(([, lot]) => lot);
  const kept = [...b.entries()].filter(([key]) => a.has(key));
  const sum = (lots: readonly { net: number }[]) => lots.reduce((total, lot) => total + lot.net, 0);

  return {
    before: a.size,
    after: b.size,
    kept: kept.length,
    keptNetChange: kept.reduce((total, [key, lot]) => total + lot.net - a.get(key)!.net, 0),
    lost: lost.length,
    lostNet: sum(lost),
    gained: gained.length,
    gainedNet: sum(gained),
    gainedBySymbol: Object.fromEntries(
      [...new Set(gained.map((lot) => lot.symbol))].map((symbol) => [
        symbol,
        gained.filter((lot) => lot.symbol === symbol).length
      ])
    ),
    lostBySymbol: Object.fromEntries(
      [...new Set(lost.map((lot) => lot.symbol))].map((symbol) => [
        symbol,
        lost.filter((lot) => lot.symbol === symbol).length
      ])
    )
  };
};
