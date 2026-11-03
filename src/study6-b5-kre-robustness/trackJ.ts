// Track J (PROTOCOL.md §10.4): the limited joint search, run only if Track K's shortlist has no member that passes the
// DEV-side hard gates with R(k = 3) ≥ frozen B5's. Its books are KRE plus the most important non-KRE book by the A4
// importance on WDEV (pooled reps 1–5; the second-ranked book joins iff I_2 ≥ ½·I_1 and I_2 > 0; W23 if WDEV has
// fewer than 10 joint breaches). Search door only; J-local boxes (frozen ± 2r); 4,096 Sobol vectors; rungs 1–3; no
// refinement; shortlist ≤ 4.
import { bookOrder, partB, resultFile } from './context.ts';
import { openDoor } from './data.ts';
import { Lab } from './evaluate.ts';
import { log, nowIso, readSealed, writeCsv, writeSealed } from './records.ts';
import { candidateRow, devGate, localBoxes, robustScore, runPipeline, sobolBoxes } from './search.ts';
import { frozenB5 } from './sets.ts';
import { pipelineRecord } from './trackK.ts';

const five = [...bookOrder];

interface Decomposition {
  breaches: number;
  importance: Record<string, { importance: number; breachesRemovedByReset: number }>;
}

export const jBooksRule = async () => {
  const wdev = await readSealed<Decomposition>(resultFile('partA', 'A4-decomposition-WDEV.json'));
  const fallback = wdev.breaches < 10;
  const source = fallback ? await readSealed<Decomposition>(resultFile('partA', 'A4-decomposition-W23.json')) : wdev;
  const ranked = five
    .filter((symbol) => symbol !== 'KRE')
    .map((symbol) => ({ symbol, importance: source.importance[symbol]!.importance }))
    .sort((a, b) => b.importance - a.importance || (a.symbol < b.symbol ? -1 : 1));
  const books = ['KRE', ranked[0]!.symbol];

  if (ranked[1]!.importance > 0 && ranked[1]!.importance >= 0.5 * ranked[0]!.importance) {
    books.push(ranked[1]!.symbol);
  }

  return { window: fallback ? 'W23' : 'WDEV', breaches: source.breaches, ranked, books };
};

export const runTrackJ = async () => {
  const started = Date.now();
  const trackK = await readSealed<{
    c5: { scores: Record<string, { R: number }> };
    shortlist: { id: string; scores: Record<string, { R: number }>; devGate: { pass: boolean } }[];
  }>(resultFile('partB', 'trackK', 'trackK-main.json'));
  const c5R = trackK.c5.scores['3']!.R;
  const acceptable = trackK.shortlist.filter((candidate) => candidate.devGate.pass && candidate.scores['3']!.R >= c5R);
  const trigger = acceptable.length === 0;
  const rule = await jBooksRule();

  if (!trigger) {
    const record = await writeSealed(resultFile('partB', 'trackJ', 'trackJ.json'), {
      stage: 'trackJ',
      at: nowIso(),
      triggered: false,
      reason: `Track K has ${acceptable.length} shortlist member(s) passing the DEV-side gates with R(k=3) ≥ frozen B5's (${Math.round(c5R)})`,
      acceptable: acceptable.map((candidate) => candidate.id),
      rule
    });

    log(`Track J not triggered; ${record.file}`);
    return;
  }

  const door = await openDoor('search', five, `Track J (${rule.books.join('+')})`);
  const lab = new Lab(door);
  const base = frozenB5();
  const c5 = lab.point(base);
  const c5Scores = Object.fromEntries(
    partB.search.rungs.map((rung) => [rung.seed, robustScore(lab, base, rule.books, rung.seed, rung.n)])
  );
  const boxes = localBoxes(rule.books);
  const screen = sobolBoxes(boxes, partB.search.sobolJ, ['B', 'J', 'sobol']);
  const result = runPipeline(
    lab,
    'Track J',
    c5,
    base,
    rule.books,
    [{ origin: 'sobol:J-local', boxes, vectors: screen.vectors }],
    { refine: false, shortlist: partB.search.shortlistJ }
  );
  const dir = resultFile('partB', 'trackJ');
  const files = {
    screen: await writeCsv(`${dir}/screen.csv`, result.screened.map(candidateRow)),
    pool: await writeCsv(`${dir}/pool.csv`, result.pool.map(candidateRow))
  };
  const record = await writeSealed(resultFile('partB', 'trackJ', 'trackJ.json'), {
    stage: 'trackJ',
    at: nowIso(),
    triggered: true,
    reason: `no Track K shortlist member passes the DEV-side gates with R(k=3) ≥ frozen B5's (${Math.round(c5R)})`,
    rule,
    door: door.study6Key,
    boxes,
    sobol: { seed: screen.seed, drawn: screen.drawn, duplicates: screen.duplicates, unique: screen.vectors.length },
    c5: { centre: c5, scores: c5Scores },
    multiplicity: `effective search dimension ${8 * rule.books.length}`,
    ...pipelineRecord(result),
    devGates: result.shortlist.map((candidate) => ({ id: candidate.id, ...devGate(candidate) })),
    files,
    totalSeconds: (Date.now() - started) / 1000
  });

  log(
    `Track J: books ${rule.books.join('+')}; shortlist ${result.shortlist.map((c) => c.id).join(', ')}; ${record.file}`
  );
};
