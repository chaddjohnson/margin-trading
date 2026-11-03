// Stages 3–4 (PROTOCOL.md §11): the sealed screens (runs ending at each cutoff only), then the signal ledgers of every
// view and data end. Every run is the frozen engine (observer = engine and gate replay = engine checked inside).
import fs from 'fs-extra';
import {
  type BaselineKey,
  type DataEnd,
  type FoldKey,
  type ViewKey,
  type WindowSpec,
  baselines,
  dataEnds,
  levelD,
  log,
  nowIso,
  resultFile,
  screen as screenRules,
  sourceFoldOf,
  study,
  vgtPrimaryGrid,
  windows
} from './context.ts';
import { loadUniverse, universeSymbols } from './doors.ts';
import { catalogOf } from './events.ts';
import { refuseOverrides, requireCodeFrozen, requireProtected } from './freeze.ts';
import { fundedGateTrades } from './ledger.ts';
import { familiesOfView, familyIndex, summarize, windowIndexOf } from './leveld.ts';
import { MinuteGrid } from './grid.ts';
import { readGz, readSealed, sha256, writeGz, writeRecord } from './records.ts';
import { type BaselineRecord, type StandaloneRecord, baselineRun, standaloneRun } from './runs.ts';
import { featuresOf, runScreen } from './screen.ts';
import { bookOf, incumbentBooks, rankingOrder, viewBooks, viewMembers } from './sources.ts';

export const screenFile = (fold: FoldKey) => resultFile('screen', `SCREEN-${fold}.json`);
export const signalsFile = (end: DataEnd) => resultFile('signals', `SIGNALS-${end}.json`);

const hashOf = (value: unknown) => sha256(JSON.stringify(value));

// The views each data end carries (PROTOCOL.md §3.2, §4).
export const viewsAt = (end: DataEnd): ViewKey[] =>
  end === '2020-06-30' ? ['U', 'P-A'] : end === '2021-12-31' ? ['U', 'P-A', 'P-B'] : ['U', 'P-B', 'P-F'];

const boundaryAt = (end: DataEnd) =>
  end === '2021-12-31' ? windows.A.boundary : end === '2023-12-29' ? windows.B.boundary : undefined;

export interface DataEndRuns {
  end: DataEnd;
  views: Partial<Record<ViewKey, StandaloneRecord[]>>;
  baselines: Record<BaselineKey, BaselineRecord>;
  calendar: { dates: string[]; sCloseTime: number[] };
  closes: Record<string, number[]>;
  catalogs: Record<string, ReturnType<typeof catalogOf>>;
}

export const runDataEnd = async (end: DataEnd, views: ViewKey[]): Promise<{ runs: DataEndRuns; door: unknown }> => {
  const symbols = await universeSymbols();
  const { loaded, door } = await loadUniverse(symbols, end, ['I', ...views]);
  const universe = loaded.universe;
  const boundary = boundaryAt(end);
  const result: DataEndRuns = {
    end,
    views: {},
    baselines: {} as Record<BaselineKey, BaselineRecord>,
    calendar: { dates: [...universe.dates], sCloseTime: [...universe.instruments.VGT!.ds.sCloseTime] },
    closes: {},
    catalogs: {}
  };

  for (const view of views) {
    const books =
      view === 'U'
        ? symbols.map((symbol) => ({ symbol, book: bookOf(symbol, 'U', { ...vgtPrimaryGrid }) }))
        : viewBooks(await viewMembers(view)).map(({ row, book }) => ({ symbol: row.symbol, book }));

    result.views[view] = books.map(({ book }) => standaloneRun(universe, book, boundary));
    log(`${end} ${view}: ${books.length} standalone runs`);
  }

  for (const id of baselines) {
    const { phenotypes } = await incumbentBooks(id);

    result.baselines[id] = baselineRun(universe, id, phenotypes, boundary).record;
  }

  for (const symbol of symbols) {
    const ds = universe.instruments[symbol]!.ds;

    result.closes[symbol] = [...ds.sClose];
    result.catalogs[symbol] = catalogOf(
      symbol,
      universe.dates,
      ds.sClose,
      universe.eligibilityIndex,
      universe.sessionCount - 1
    );
  }

  return { runs: result, door };
};

// ----- the screen of one fold (PROTOCOL.md §7.1) -----

export const screenFold = (
  runs: DataEndRuns,
  fold: FoldKey,
  sourceOrders: Record<'U' | 'P', string[]>,
  spec: WindowSpec = windows[fold === 'A' ? 'preA' : 'preB']
) => {
  const grid = new MinuteGrid({
    sCloseTime: Float64Array.from(runs.calendar.sCloseTime),
    sessionCount: runs.calendar.dates.length,
    dates: runs.calendar.dates
  });
  const w = windowIndexOf(runs.calendar.dates, grid, spec);
  const results = [];

  for (const view of ['U', 'P'] as const) {
    const key: ViewKey = view === 'U' ? 'U' : fold === 'A' ? 'P-A' : 'P-B';
    const records = runs.views[key]!;
    const families = familiesOfView(
      records.flatMap((record) => record.trades),
      w,
      levelD.familyWindow
    );
    const index = familyIndex(families);
    const anchors = new Map(families.map((family) => [family.id, family.anchorSession]));

    for (const baseline of baselines) {
      const funded = fundedGateTrades(runs.baselines[baseline].records);
      const features = records.map((record) => {
        const summary = summarize(
          record.symbol,
          true,
          record.trades,
          record.setups,
          funded,
          index,
          runs.calendar.dates,
          w
        );
        const nets = new Map(record.trades.map((trade) => [`${trade.symbol}@${trade.decisionTime}`, trade.net]));

        return featuresOf(
          summary,
          { net: record.summary.net, minuteDrawdown: record.summary.minuteDrawdown },
          anchors,
          nets
        );
      });

      results.push(runScreen(baseline, view, fold, features, sourceOrders[view]));
    }
  }

  return results;
};

const sourceOrderOf = async (fold: FoldKey) => {
  const nominees = new Set(
    (await viewMembers(fold === 'A' ? 'P-A' : 'P-B')).filter((row) => row.grid).map((row) => row.symbol)
  );
  const profiles = await Promise.all(
    (await rankingOrder(sourceFoldOf(fold), 'R2')).map(async (entry) => {
      const profile = (await fs.readJson(
        `research/d1-ranked-preemption/standalone/${sourceFoldOf(fold)}/${entry.symbol}.json`
      )) as {
        sample: string;
      };

      return { ...entry, sample: profile.sample };
    })
  );

  // SRC's robustness filter (PROTOCOL.md §7.1): fold nominee, source sample `adequate`, not F7-flagged.
  return profiles
    .filter((entry) => nominees.has(entry.symbol) && entry.sample === 'adequate' && !study.f7.includes(entry.symbol))
    .map((entry) => entry.symbol);
};

export const stageScreen = async (fold: FoldKey) => {
  refuseOverrides();

  const { protocol, code } = await requireCodeFrozen();

  await requireProtected();

  if (await fs.pathExists(screenFile(fold))) {
    throw new Error(`${screenFile(fold)} exists`);
  }

  if (fold === 'B' && !(await fs.pathExists(screenFile('A')))) {
    throw new Error('screen B runs only after screen A is sealed');
  }

  if (fold === 'A') {
    for (const end of dataEnds) {
      if (await fs.pathExists(signalsFile(end))) {
        throw new Error(`refused: ${signalsFile(end)} exists before the screens`);
      }
    }
  } else {
    await readSealed(screenFile('A'));
  }

  const startedAt = nowIso();
  const end: DataEnd = fold === 'A' ? '2020-06-30' : '2021-12-31';

  if (end !== screenRules.folds[fold].cutoff) {
    throw new Error('screen cutoff mismatch');
  }

  const views: ViewKey[] = ['U', fold === 'A' ? 'P-A' : 'P-B'];
  const { runs, door } = await runDataEnd(end, views);
  const sourceOrders = { U: [], P: await sourceOrderOf(fold) };
  const screens = screenFold(runs, fold, sourceOrders);
  const ledgerHashes = Object.fromEntries(
    views.map((view) => [view, Object.fromEntries(runs.views[view]!.map((record) => [record.symbol, hashOf(record)]))])
  );
  const baselineHashes = Object.fromEntries(baselines.map((id) => [id, hashOf(runs.baselines[id])]));
  const ledgers = await writeGz(resultFile('screen', `screen-${fold}-ledgers.json.gz`), {
    views: Object.fromEntries(views.map((view) => [view, runs.views[view]])),
    baselines: runs.baselines
  });

  return writeRecord(screenFile(fold), {
    stage: `screen-${fold}`,
    startedAt,
    finishedAt: nowIso(),
    guard: { protocolFreeze: protocol.bodyHash, codeFreeze: code.bodyHash },
    door,
    cutoff: end,
    sourceOrderR2Filtered: sourceOrders.P,
    screens,
    ledgerHashes,
    baselineHashes,
    ledgers
  });
};

// ----- the signal ledgers of every data end (after both screens) -----

export const stageSignals = async (end: DataEnd) => {
  refuseOverrides();

  const { protocol, code } = await requireCodeFrozen();

  await requireProtected();

  for (const fold of ['A', 'B'] as const) {
    await readSealed(screenFile(fold));
  }

  if (await fs.pathExists(signalsFile(end))) {
    throw new Error(`${signalsFile(end)} exists`);
  }

  const startedAt = nowIso();
  const views = viewsAt(end);
  const { runs, door } = await runDataEnd(end, views);

  // Determinism against the screens: the ledgers ending at a cutoff must hash equal to the screen's.
  const determinism: { fold: FoldKey; view: string; symbols: number; equal: boolean }[] = [];

  for (const fold of ['A', 'B'] as const) {
    if (screenRules.folds[fold].cutoff !== end) {
      continue;
    }

    const sealed = await readSealed<
      { ledgerHashes: Record<string, Record<string, string>>; baselineHashes: Record<string, string> } & {
        bodyHash: string;
      }
    >(screenFile(fold));

    for (const [view, hashes] of Object.entries(sealed.ledgerHashes)) {
      const equal = runs.views[view as ViewKey]!.every((record) => hashes[record.symbol] === hashOf(record));

      determinism.push({ fold, view, symbols: Object.keys(hashes).length, equal });
    }

    for (const id of baselines) {
      determinism.push({ fold, view: id, symbols: 1, equal: sealed.baselineHashes[id] === hashOf(runs.baselines[id]) });
    }
  }

  if (determinism.some((item) => !item.equal)) {
    throw new Error(`determinism failure against the sealed screens: ${JSON.stringify(determinism)}`);
  }

  const payload = await writeGz(resultFile('signals', `signals-${end}.json.gz`), runs);

  return writeRecord(signalsFile(end), {
    stage: `signals-${end}`,
    startedAt,
    finishedAt: nowIso(),
    guard: { protocolFreeze: protocol.bodyHash, codeFreeze: code.bodyHash },
    door,
    views,
    counts: Object.fromEntries(views.map((view) => [view, runs.views[view]!.length])),
    standaloneSummaries: Object.fromEntries(
      views.map((view) => [
        view,
        Object.fromEntries(runs.views[view]!.map((record) => [record.symbol, record.summary]))
      ])
    ),
    baselineSummaries: Object.fromEntries(baselines.map((id) => [id, runs.baselines[id].summary])),
    determinism,
    payload
  });
};

export const readSignals = async (end: DataEnd) => {
  const sealed = await readSealed<{ payload: { file: string; sha256: string } } & { bodyHash: string }>(
    signalsFile(end)
  );

  return readGz<DataEndRuns>(sealed.payload.file, sealed.payload.sha256);
};
