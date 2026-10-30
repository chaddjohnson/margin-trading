// Track K (PROTOCOL.md §10.3): KRE's eight parameters searched with VGT/XBI/XRT/GDX frozen at B5, on the search door
// only (or the WF19/WF20 search doors for the walk-forward replications of §10.7), by a scrambled-Sobol screen of
// K-local (frozen KRE ± 2r) and K-wide (the eight-ETF box), successive halving on the robust score R over the joint
// 40-parameter search neighbourhood, a bounded coordinate refinement and a distinct-region shortlist.
import { bookOrder, partB, resultFile } from './context.ts';
import { type DoorKey, openDoor } from './data.ts';
import { Lab } from './evaluate.ts';
import { ownPeriods } from './periods.ts';
import { log, nowIso, writeCsv, writeSealed } from './records.ts';
import {
  type Candidate,
  type PipelineResult,
  candidateRow,
  devGate,
  localBoxes,
  robustScore,
  runPipeline,
  sobolBoxes,
  wideBoxes
} from './search.ts';
import { frozenB5 } from './sets.ts';

const five = [...bookOrder];

export type KFold = 'main' | 'wf19' | 'wf20';

const doorOf: Record<KFold, DoorKey> = { main: 'search', wf19: 'search-wf19', wf20: 'search-wf20' };

export const summaryOf = (candidate: Candidate) => ({
  id: candidate.id,
  origin: candidate.origin,
  books: candidate.books,
  searched: candidate.searched,
  centre: candidate.centre,
  scores: candidate.scores,
  devGate: devGate(candidate)
});

export const pipelineRecord = (result: PipelineResult) => ({
  screened: result.screened.length,
  passedFilters: result.passed,
  behaviouralDuplicates: result.behaviouralDuplicates,
  rungs: result.rungs,
  refinement: result.refinement,
  shortlist: result.shortlist.map(summaryOf),
  pool: result.pool.map(summaryOf),
  runs: result.runs,
  seconds: result.seconds
});

export const runTrackK = async (fold: KFold) => {
  const started = Date.now();
  const door = await openDoor(doorOf[fold], five, `Track K ${fold}`);
  const lab = new Lab(door);
  const base = frozenB5();
  const c5 = lab.point(base);
  const c5Scores = Object.fromEntries(
    partB.search.rungs.map((rung) => [rung.seed, robustScore(lab, base, ['KRE'], rung.seed, rung.n)])
  );
  const local = localBoxes(['KRE']);
  const wide = wideBoxes(['KRE']);
  const localScreen = sobolBoxes(local, partB.search.sobolLocal, ['B', 'K', 'sobol', 'local']);
  const wideScreen = sobolBoxes(wide, partB.search.sobolWide, ['B', 'K', 'sobol', 'wide']);
  const result = runPipeline(
    lab,
    `Track K ${fold}`,
    c5,
    base,
    ['KRE'],
    [
      { origin: 'sobol:K-local', boxes: local, vectors: localScreen.vectors },
      { origin: 'sobol:K-wide', boxes: wide, vectors: wideScreen.vectors }
    ],
    { refine: true, shortlist: partB.search.shortlistK }
  );
  const dir = resultFile('partB', 'trackK', fold);
  const files = {
    screen: await writeCsv(`${dir}/screen.csv`, result.screened.map(candidateRow)),
    pool: await writeCsv(`${dir}/pool.csv`, result.pool.map(candidateRow)),
    refinement: await writeCsv(`${dir}/refinement.csv`, result.refinement)
  };
  const record = await writeSealed(resultFile('partB', 'trackK', `trackK-${fold}.json`), {
    stage: `trackK-${fold}`,
    at: nowIso(),
    door: door.study6Key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex], eligibility: door.dates[door.eligibilityIndex] },
    boxes: { local, wide },
    sobol: {
      local: {
        seed: localScreen.seed,
        drawn: localScreen.drawn,
        duplicates: localScreen.duplicates,
        unique: localScreen.vectors.length
      },
      wide: {
        seed: wideScreen.seed,
        drawn: wideScreen.drawn,
        duplicates: wideScreen.duplicates,
        unique: wideScreen.vectors.length
      }
    },
    c5: {
      centre: c5,
      scores: c5Scores,
      devGate: { centre: c5.dd < 35000, share: c5Scores[3]!.share >= 0.9, p90: c5Scores[3]!.p90dd < 35000 }
    },
    settings: partB.search,
    ...pipelineRecord(result),
    files,
    traces: lab.ev.traces,
    totalSeconds: (Date.now() - started) / 1000
  });

  log(
    `Track K ${fold}: shortlist ${result.shortlist.map((c) => c.id).join(', ')}; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};

// §10.7: each walk-forward fold's shortlist and frozen B5 on the search door's continuous run (to 2021-12-31), with the
// fold's search window and test window attributed (reporting only).
export const runWalkForwardTest = async () => {
  const { readSealed } = await import('./records.ts');
  const door = await openDoor('search', five, 'Track K walk-forward test windows (reporting)');
  const lab = new Lab(door);
  const base = frozenB5();
  const c5Run = lab.replay(base);
  const c5Periods = ownPeriods(lab, c5Run);
  const c5Dd = c5Run.minuteDrawdown.maximum;
  const rows: Record<string, unknown>[] = [];

  for (const [fold, search, test] of [
    ['wf19', 'WF19-SEARCH', 'WF19-TEST'],
    ['wf20', 'WF20-SEARCH', 'WF20-TEST']
  ] as const) {
    const record = await readSealed<{
      shortlist: { id: string; books: Record<string, never>; centre: { net: number } }[];
    }>(resultFile('partB', 'trackK', `trackK-${fold}.json`));

    for (const candidate of record.shortlist) {
      const result = lab.replay(candidate.books);
      const own = ownPeriods(lab, result);
      const point = lab.metricsOf(result);

      rows.push({
        fold,
        id: candidate.id,
        kre: candidate.books.KRE,
        searchNet: own[search],
        testNet: own[test],
        c5SearchNet: c5Periods[search],
        c5TestNet: c5Periods[test],
        testDeltaVsC5: (own[test] ?? 0) - (c5Periods[test] ?? 0),
        dd: point.minuteDrawdown
      });
    }
  }

  const out = await writeSealed(resultFile('partB', 'trackK', 'walk-forward-test.json'), {
    stage: 'trackK-walk-forward-test',
    at: nowIso(),
    note: 'reporting only; the test windows 2020 and 2021 lie inside the main development window',
    c5: { periods: c5Periods, dd: c5Dd },
    rows
  });

  log(`walk-forward test: ${rows.length} rows; ${out.file}`);
};
