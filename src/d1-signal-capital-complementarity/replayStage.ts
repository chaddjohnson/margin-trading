// Stage 5 Level C (PROTOCOL.md §7.2): the predeclared replay menu, built only from the sealed screens — the
// selected (baseline, view, fold, role, candidate) cells — plus the incumbent diagnostic B4 → B5 and the in-sample View
// U replays. Anything else is refused by construction.
import fs from 'fs-extra';
import {
  type BaselineKey,
  type FoldKey,
  type ViewKey,
  caps,
  levelCExcluded,
  log,
  members,
  nowIso,
  resultFile,
  vgtPrimaryGrid,
  windows
} from './context.ts';
import { loadUniverse } from './doors.ts';
import { refuseOverrides, requireCodeFrozen, requireProtected } from './freeze.ts';
import { leveldFile } from './leveldStage.ts';
import { screenFile } from './pipeline.ts';
import { readSealed, writeGz, writeRecord } from './records.ts';
import { type Scenario, baselineRuns, runCore, scenarioRecord } from './replay.ts';
import type { ScreenResult } from './screen.ts';
import { bookOf, incumbentBooks, viewMembers } from './sources.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';

export const replaysFile = resultFile('replays', 'REPLAYS.json');

interface MenuItem extends Scenario {
  kind: 'fold' | 'incumbent-diagnostic' | 'in-sample';
  dataEnd: string;
  provenance: ViewKey | 'I';
}

export const buildMenu = async () => {
  const items: MenuItem[] = [];
  const uUnion: Record<BaselineKey, Set<string>> = { B4: new Set(), B5: new Set() };

  for (const fold of ['A', 'B'] as FoldKey[]) {
    const sealed = await readSealed<{ screens: ScreenResult[] } & { bodyHash: string }>(screenFile(fold));
    const window = windows[fold];
    const dataEnd = window.dataEnd;

    for (const screen of sealed.screens) {
      for (const role of screen.roles) {
        if (!role.symbol) {
          continue;
        }

        if (members[screen.baseline].includes(role.symbol) || levelCExcluded.includes(role.symbol)) {
          throw new Error(`refused: ${role.symbol} cannot be a candidate for ${screen.baseline}`);
        }

        const view: ViewKey = screen.view === 'U' ? 'U' : fold === 'A' ? 'P-A' : 'P-B';

        if (dataEnd > caps[view]) {
          throw new Error(`refused: ${view} past its cap`);
        }

        items.push({
          id: `${screen.baseline}+${view}:${role.symbol}@${fold}(${role.role})`,
          baseline: screen.baseline,
          view,
          fold,
          role: role.role,
          candidate: role.symbol,
          window: fold,
          boundary: window.boundary,
          firstDecisionIndex: -1,
          kind: 'fold',
          dataEnd,
          provenance: view
        });

        if (view === 'U') {
          uUnion[screen.baseline].add(role.symbol);
        }
      }
    }
  }

  for (const baseline of ['B4', 'B5'] as BaselineKey[]) {
    const distinct = (view: string) =>
      new Set(
        items.filter((item) => item.baseline === baseline && item.view.startsWith(view)).map((item) => item.candidate)
      );

    if (distinct('U').size > 6 || distinct('P').size > 6) {
      throw new Error(`refused: more than six distinct candidates for ${baseline} in one view`);
    }

    for (const candidate of [...uUnion[baseline]].sort()) {
      items.push({
        id: `${baseline}+U:${candidate}@T(in-sample)`,
        baseline,
        view: 'U',
        fold: 'T',
        role: 'in-sample',
        candidate,
        window: 'T',
        firstDecisionIndex: -1,
        kind: 'in-sample',
        dataEnd: windows.T.dataEnd,
        provenance: 'U'
      });
    }
  }

  for (const window of ['T', 'A', 'B'] as const) {
    items.push({
      id: `B4+B5:GDX@${window}(incumbent diagnostic)`,
      baseline: 'B4',
      view: 'I',
      fold: window,
      role: 'incumbent-diagnostic',
      candidate: 'GDX',
      window,
      boundary: windows[window].boundary,
      firstDecisionIndex: -1,
      kind: 'incumbent-diagnostic',
      dataEnd: windows[window].dataEnd,
      provenance: 'I'
    });
  }

  return items;
};

export const stageReplays = async () => {
  refuseOverrides();

  const { protocol, code } = await requireCodeFrozen();

  await requireProtected();
  await readSealed(leveldFile);

  if (await fs.pathExists(replaysFile)) {
    throw new Error(`${replaysFile} exists`);
  }

  const startedAt = nowIso();
  const menu = await buildMenu();
  const b5 = await incumbentBooks('B5');
  const books: Record<BaselineKey, Record<string, BookPhenotype>> = {
    B4: (await incumbentBooks('B4')).phenotypes,
    B5: b5.phenotypes
  };
  const pBooks: Record<string, Record<string, BookPhenotype>> = {};

  for (const view of ['P-A', 'P-B'] as const) {
    pBooks[view] = Object.fromEntries(
      (await viewMembers(view))
        .filter((row) => row.grid)
        .map((row) => [row.symbol, bookOf(row.symbol, `${view}:${row.gridKey}`, row.grid!)])
    );
  }

  const candidateBook = (item: MenuItem): BookPhenotype => {
    if (item.kind === 'incumbent-diagnostic') {
      return b5.phenotypes.GDX!;
    }

    if (item.view === 'U') {
      return bookOf(item.candidate, 'U', { ...vgtPrimaryGrid });
    }

    const book = pBooks[item.view]![item.candidate];

    if (!book) {
      throw new Error(`refused: ${item.candidate} has no ${item.view} nominee`);
    }

    return book;
  };

  const results: { item: MenuItem; payload: { file: string; sha256: string; bytes: number }; summary: unknown }[] = [];

  for (const dataEnd of [...new Set(menu.map((item) => item.dataEnd))].sort()) {
    const atEnd = menu.filter((item) => item.dataEnd === dataEnd);
    const symbols = [...new Set(['VOOG', 'VGT', ...members.B5, ...atEnd.map((item) => item.candidate)])].sort();
    const provenances = [...new Set(['I' as const, ...atEnd.map((item) => item.provenance)])];
    const { loaded } = await loadUniverse(symbols, dataEnd, provenances);
    const universe = loaded.universe;
    const core = runCore(universe, `C0@${dataEnd}`);
    const bases = new Map<BaselineKey, ReturnType<typeof baselineRuns>>();

    for (const baseline of [...new Set(atEnd.map((item) => item.baseline))].sort() as BaselineKey[]) {
      bases.set(baseline, baselineRuns(universe, books[baseline], `${baseline}@${dataEnd}`));
    }

    for (const item of atEnd) {
      const b = item.boundary ? universe.dates.indexOf(item.boundary) : -1;
      const scenario: Scenario = { ...item, firstDecisionIndex: b + 1 };
      const record = scenarioRecord(
        scenario,
        universe,
        books[item.baseline as BaselineKey],
        candidateBook(item),
        bases.get(item.baseline as BaselineKey)!,
        core
      );
      const payload = await writeGz(
        resultFile('replays', `${item.id.replace(/[^A-Za-z0-9@+.-]+/g, '_')}.json.gz`),
        record
      );

      results.push({
        item,
        payload,
        summary: {
          costs: record.costs.map((cost) => ({
            cost: cost.cost,
            baseline: cost.baseline.increment,
            scenario: cost.scenario.increment,
            delta: cost.delta
          })),
          attribution: { ...record.attribution },
          attribution10: {
            delta: record.attribution10.delta,
            parts: record.attribution10.parts,
            complementShare: record.attribution10.complementShare
          },
          risk: {
            baselineMinuteDD: record.risk.baseline.minuteDrawdown.maximum,
            scenarioMinuteDD: record.risk.scenario.minuteDrawdown.maximum,
            baselineDailyDD: record.risk.baseline.dailyDrawdown.maximum,
            scenarioDailyDD: record.risk.scenario.dailyDrawdown.maximum,
            baselineWorst: record.risk.baseline.worstClosed,
            scenarioWorst: record.risk.scenario.worstClosed,
            scenarioWorstMae: record.risk.scenario.worstMaeDollars,
            scenarioFallingKnives: record.risk.scenario.fallingKnifeEpisodes,
            baselineFallingKnives: record.risk.baseline.fallingKnifeEpisodes,
            scenarioTimeInMarket: record.risk.scenario.timeInMarket,
            baselineTimeInMarket: record.risk.baseline.timeInMarket
          },
          portfolio: record.portfolio
        }
      });
      log(`replay ${item.id}: ΔV@5 ${record.costs.find((cost) => cost.cost === '5')!.delta.toFixed(2)}`);
    }
  }

  return writeRecord(replaysFile, {
    stage: 'replays',
    startedAt,
    finishedAt: nowIso(),
    guard: { protocolFreeze: protocol.bodyHash, codeFreeze: code.bodyHash },
    menu,
    results
  });
};
