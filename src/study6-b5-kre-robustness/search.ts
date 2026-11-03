// Shared Part B machinery (PROTOCOL.md §10.2–§10.4): the robust score R over the joint search neighbourhood (common
// random numbers across candidates), the activity/concentration filters relative to frozen B5 on the same door,
// scrambled-Sobol screens inside per-book boxes, successive halving, the bounded coordinate refinement and the
// distinct-region shortlist. Used by Track K (searched = KRE), its walk-forward replications and Track J.
import { Sobol } from '../optimizer/sobol.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { vectorId } from '../study5-gdx-b5-three-etf/grid.ts';
import { bookOrder, frozenGrids, partB, radius, seedOf } from './context.ts';
import { type Books, atBound, booksKey, design, normalizedDistance, specOf, uniqueMask } from './designs.ts';
import { type Lab, type PointRecord, ceiling } from './evaluate.ts';
import { log } from './records.ts';

const five = [...bookOrder];
const { search } = partB;

export interface RobustScore {
  k: number;
  n: number;
  unique: number;
  median: number;
  p10: number;
  p90dd: number;
  share: number;
  ddPenalty: number;
  bounds: number;
  raw: number;
  R: number;
}

export interface Candidate {
  id: string; // the searched books' vector ids joined
  books: Books;
  searched: string[];
  origin: string;
  centre: PointRecord;
  filter: { pass: boolean; reasons: string[] };
  scores: Record<number, RobustScore>;
}

export const candidateId = (books: Books, searched: readonly string[]) =>
  searched.map((symbol) => `${symbol}:${vectorId(books[symbol]!)}`).join('+');

export const boundsOf = (books: Books, searched: readonly string[]) =>
  searched.reduce((total, symbol) => total + atBound(books[symbol]!).length, 0);

// The joint search neighbourhood of a centre for rung k (offsets fixed by the labels: common random numbers).
export const searchNeighbourhood = (books: Books, k: number, n: number) =>
  design({ centre: books, perturb: five, n, labels: ['B', 'search', k], mode: 'clip', scale: 1 });

export const robustScore = (lab: Lab, books: Books, searched: readonly string[], k: number, n: number): RobustScore => {
  const points = searchNeighbourhood(books, k, n);
  const unique = uniqueMask(points, books);
  const records = points.filter((_point, index) => unique[index]).map((point) => lab.point(point.books));
  const net = records.map((record) => record.net);
  const dd = records.map((record) => record.dd);
  const median = quantile(net, 0.5);
  const p10 = quantile(net, 0.1);
  const p90dd = quantile(dd, 0.9);
  const ddPenalty = search.penalty.perDollar * Math.max(0, p90dd - search.penalty.ddLevel);
  const raw = 0.5 * median + 0.5 * p10 - ddPenalty;
  const bounds = boundsOf(books, searched);
  const factor = raw > 0 ? 1 - search.penalty.boundShare * bounds : 1 + search.penalty.boundShare * bounds;

  return {
    k,
    n,
    unique: records.length,
    median,
    p10,
    p90dd,
    share: dd.filter((value) => value < ceiling).length / Math.max(1, dd.length),
    ddPenalty,
    bounds,
    raw,
    R: raw * factor
  };
};

// §10.2 filters, relative to frozen B5 (C5) on the same door.
export const filterOf = (centre: PointRecord, c5: PointRecord) => {
  const { filters } = search;
  const reasons: string[] = [];

  if (!(centre.dd < ceiling)) reasons.push('centre DD ≥ $35,000');
  if (!(centre.lots >= filters.lotsShare * c5.lots)) reasons.push('lots < 75% of frozen B5');
  if (!(centre.occupancy >= filters.occupancyShare * c5.occupancy)) reasons.push('occupancy < 60% of frozen B5');
  if (!(centre.kreLots >= filters.minKreLots)) reasons.push('no funded KRE lot');
  if (!(centre.net > 0)) reasons.push('net ≤ 0');
  if (!(centre.bestLot <= filters.largestLotShare * centre.net)) reasons.push('largest lot > 25% of net');

  return { pass: reasons.length === 0, reasons };
};

// A scrambled Sobol screen of unique vectors over per-book integer boxes (each dimension lo..hi inclusive).
export const sobolBoxes = (
  boxes: { symbol: string; key: (typeof d1Keys)[number]; lo: number; hi: number }[],
  samples: number,
  labels: (string | number)[]
) => {
  const seed = deriveSeed(...seedOf(...labels));
  const sobol = new Sobol({ dimensions: boxes.length, scramble: { seed } });
  const seen = new Set<string>();
  const vectors: number[][] = [];
  let drawn = 0;

  while (vectors.length < samples && drawn < samples * 64) {
    const point = sobol.next();
    const values = boxes.map((box, dimension) =>
      Math.min(box.hi, box.lo + Math.floor(point[dimension]! * (box.hi - box.lo + 1)))
    );
    const key = values.join('/');

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      vectors.push(values);
    }
  }

  return { vectors, seed, drawn, duplicates: drawn - vectors.length };
};

export const localBoxes = (symbols: readonly string[], scale = 2) =>
  symbols.flatMap((symbol) =>
    d1Keys.map((key) => {
      const spec = specOf(key);
      const centre = frozenGrids[symbol as keyof typeof frozenGrids][key];

      return {
        symbol,
        key,
        lo: Math.max(spec.min, centre - scale * radius[key]),
        hi: Math.min(spec.max, centre + scale * radius[key])
      };
    })
  );

export const wideBoxes = (symbols: readonly string[]) =>
  symbols.flatMap((symbol) =>
    d1Keys.map((key) => {
      const spec = specOf(key);

      return { symbol, key, lo: spec.min, hi: spec.max };
    })
  );

export const booksOfVector = (
  base: Books,
  boxes: { symbol: string; key: (typeof d1Keys)[number] }[],
  values: number[]
) => {
  const books: Books = Object.fromEntries(Object.entries(base).map(([symbol, grid]) => [symbol, { ...grid }]));

  boxes.forEach((box, index) => {
    books[box.symbol]![box.key] = values[index]!;
  });

  return books;
};

const byScore = (k: number) => (a: Candidate, b: Candidate) =>
  b.scores[k]!.R - a.scores[k]!.R || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export interface PipelineResult {
  screened: Candidate[];
  passed: number;
  behaviouralDuplicates: number;
  rungs: { k: number; n: number; entered: string[]; kept: string[] }[];
  refinement: Record<string, unknown>[];
  shortlist: Candidate[];
  pool: Candidate[]; // every candidate with a k = 3 score
  runs: number;
  seconds: number;
}

// Screen → filter → behavioural dedupe → rungs 1–3 → optional refinement → shortlist (PROTOCOL.md §10.3/§10.4).
export const runPipeline = (
  lab: Lab,
  label: string,
  c5: PointRecord,
  base: Books,
  searched: string[],
  screens: { origin: string; boxes: ReturnType<typeof localBoxes>; vectors: number[][] }[],
  options: { refine: boolean; shortlist: number }
): PipelineResult => {
  const started = Date.now();
  const seen = new Set<string>([booksKey(base)]);
  const screened: Candidate[] = [];

  for (const screen of screens) {
    for (const values of screen.vectors) {
      const books = booksOfVector(base, screen.boxes, values);
      const key = booksKey(books);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      const centre = lab.point(books);

      screened.push({
        id: candidateId(books, searched),
        books,
        searched,
        origin: screen.origin,
        centre,
        filter: filterOf(centre, c5),
        scores: {}
      });
    }
  }

  log(`${label}: screened ${screened.length} centres (${lab.runs} runs)`);

  // Filter, then one candidate per funded ledger (the lowest id).
  const passing = screened.filter((candidate) => candidate.filter.pass).sort((a, b) => (a.id < b.id ? -1 : 1));
  const bySignature = new Map<string, Candidate>();

  for (const candidate of passing) {
    if (!bySignature.has(candidate.centre.signature)) {
      bySignature.set(candidate.centre.signature, candidate);
    }
  }

  const distinct = [...bySignature.values()].sort((a, b) => b.centre.net - a.centre.net || (a.id < b.id ? -1 : 1));
  const rungs: PipelineResult['rungs'] = [];
  let entering = distinct.slice(0, search.rungs[0]!.keep);

  for (const rung of search.rungs) {
    entering = entering.slice(0, rung.keep);

    for (const candidate of entering) {
      candidate.scores[rung.seed] ??= robustScore(lab, candidate.books, searched, rung.seed, rung.n);
    }

    const ranked = [...entering].sort(byScore(rung.seed));

    rungs.push({
      k: rung.seed,
      n: rung.n,
      entered: entering.map((c) => c.id),
      kept: ranked.slice(0, rung.survivors).map((c) => c.id)
    });
    log(
      `${label}: rung k=${rung.seed} n=${rung.n}: ${entering.length} → ${rung.survivors}; best R ${Math.round(ranked[0]?.scores[rung.seed]?.R ?? NaN)} (${lab.runs} runs)`
    );
    entering = ranked.slice(0, rung.survivors);
  }

  const survivors = entering;
  const refinement: Record<string, unknown>[] = [];
  const refined: Candidate[] = [];

  if (options.refine) {
    const { refine } = search;

    for (const start of survivors.slice(0, refine.starts)) {
      let current = start;

      current.scores[refine.seed] ??= robustScore(lab, current.books, searched, refine.seed, refine.n);

      for (let pass = 1; pass <= refine.passes; pass++) {
        let best: Candidate | undefined;

        for (const symbol of searched) {
          for (const key of d1Keys) {
            for (const offset of specOf(key).probes) {
              const value = current.books[symbol]![key] + offset;
              const spec = specOf(key);

              if (value < spec.min || value > spec.max) {
                continue;
              }

              const books: Books = { ...current.books, [symbol]: { ...current.books[symbol]!, [key]: value } };

              if (booksKey(books) === booksKey(base)) {
                continue; // the frozen configuration is the control C5, never a candidate
              }

              const centre = lab.point(books);
              const candidate: Candidate = {
                id: candidateId(books, searched),
                books,
                searched,
                origin: `refine:${start.id}:pass${pass}:${symbol}.${key}${offset > 0 ? '+' : ''}${offset}`,
                centre,
                filter: filterOf(centre, c5),
                scores: {}
              };

              if (!candidate.filter.pass) {
                continue;
              }

              candidate.scores[refine.seed] = robustScore(lab, books, searched, refine.seed, refine.n);

              if (!best || byScore(refine.seed)(candidate, best) < 0) {
                best = candidate;
              }
            }
          }
        }

        const gain = best ? best.scores[refine.seed]!.R - current.scores[refine.seed]!.R : -Infinity;

        refinement.push({
          start: start.id,
          pass,
          from: current.id,
          best: best?.id ?? null,
          bestOrigin: best?.origin ?? null,
          gain,
          accepted: gain >= refine.minGain
        });

        if (!(best && gain >= refine.minGain)) {
          break;
        }

        current = best;
      }

      current.scores[3] ??= robustScore(lab, current.books, searched, 3, search.rungs[2]!.n);
      refined.push(current);
      log(`${label}: refinement from ${start.id} → ${current.id} (${lab.runs} runs)`);
    }
  }

  // Shortlist: survivors ∪ refined endpoints, behavioural dedupe, by R(k = 3), distinct region.
  const pool = [...survivors, ...refined];
  const unique = new Map<string, Candidate>();

  for (const candidate of [...pool].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (![...unique.values()].some((other) => other.centre.signature === candidate.centre.signature)) {
      unique.set(candidate.id, candidate);
    }
  }

  const ranked = [...unique.values()].sort(byScore(3));
  const shortlist: Candidate[] = [];

  for (const candidate of ranked) {
    if (shortlist.length >= options.shortlist) {
      break;
    }

    if (shortlist.every((other) => normalizedDistance(candidate.books, other.books, searched) >= search.distinct)) {
      shortlist.push(candidate);
    }
  }

  return {
    screened,
    passed: passing.length,
    behaviouralDuplicates: passing.length - bySignature.size,
    rungs,
    refinement,
    shortlist,
    pool: ranked,
    runs: lab.runs,
    seconds: (Date.now() - started) / 1000
  };
};

export const devGate = (candidate: Candidate) => {
  const score = candidate.scores[3];

  return {
    centre: candidate.centre.dd < ceiling,
    share: (score?.share ?? 0) >= 0.9,
    p90: (score?.p90dd ?? Infinity) < ceiling,
    pass: candidate.centre.dd < ceiling && (score?.share ?? 0) >= 0.9 && (score?.p90dd ?? Infinity) < ceiling
  };
};

export const candidateRow = (candidate: Candidate) => ({
  id: candidate.id,
  origin: candidate.origin,
  params: candidate.searched
    .map((symbol) => `${symbol}:${d1Keys.map((key) => candidate.books[symbol]![key]).join('/')}`)
    .join('|'),
  net: candidate.centre.net,
  dd: candidate.centre.dd,
  lots: candidate.centre.lots,
  kreLots: candidate.centre.kreLots,
  occupancy: candidate.centre.occupancy,
  bestLot: candidate.centre.bestLot,
  filter: candidate.filter.pass ? 'pass' : candidate.filter.reasons.join('; '),
  signature: candidate.centre.signature,
  ...Object.fromEntries(
    Object.entries(candidate.scores).flatMap(([k, score]) => [
      [`R${k}`, Math.round(score.R)],
      [`median${k}`, Math.round(score.median)],
      [`p10_${k}`, Math.round(score.p10)],
      [`p90dd${k}`, Math.round(score.p90dd)],
      [`share${k}`, Math.round(score.share * 1e4) / 1e4]
    ])
  )
});
