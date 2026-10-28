// Regression anchors (PROTOCOL.md §4.3), before any candidate is evaluated: the unchanged incumbents only.
//
//   1. same-window controls: VGT primary alone (B1), B5 (A) and B4 on each fold's training window (2016-01-04 →
//      cutoff) at 0/2/5/10 bps, fixed slot, against the source's sealed CONTROLS.json — on the fast path and on the
//      full engine;
//   2. the source's sealed validation increments of the same three over each fold's evaluation window (one continuous
//      run, V = liquidation-equivalent mark at the end − the same at the cutoff close) at 0/2/5/10 bps, both paths;
//   3. the brief's full-history anchors (2016-01-04 → 2026-10-13, 5 bps): VGT primary $176,260.47, B4 $284,244.74,
//      B5 $486,207.77 (context regression values only).
//
// Doors: the source study's own inspection door for the incumbents' symbols (fold windows), the standalone audit's
// full-history door (unchanged incumbents only). Any mismatch fails the stage after writing its record.
import fs from 'fs-extra';
import { inspectionUniverse } from '../d1-ranked-preemption/data.ts';
import { fullHistoryUniverse } from '../d1-standalone-opportunity-audit/data.ts';
import { loadPoolBooks } from '../d1-standalone-opportunity-audit/parity.ts';
import { windowedOf } from '../d1-standalone-opportunity-audit/run.ts';
import { executeSpec } from '../d1-standalone-opportunity-audit/run.ts';
import { fullHistoryAnchors, log, nowIso, readJson, resultFile, source, study, vgtPrimary } from './context.ts';
import { engineSpec } from './engine.ts';
import { Fast, type Grid } from './fast.ts';
import { refuseOverrides } from './freeze.ts';
import { writeRecord } from './records.ts';

export const anchorsFile = resultFile('parity', 'ANCHORS.json');

interface Check {
  group: string;
  name: string;
  pass: boolean;
  detail: string;
}

const cent = 0.01;
const close = (a: number, b: number, tolerance = cent) =>
  (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= tolerance;

export const runAnchors = async (options: { workers?: number } = {}) => {
  refuseOverrides();

  if (await fs.pathExists(anchorsFile)) {
    throw new Error(`${anchorsFile} exists: the anchors are written once`);
  }

  const startedAt = nowIso();
  const checks: Check[] = [];
  const add = (group: string, name: string, ours: number, theirs: number, tolerance = cent) =>
    checks.push({
      group,
      name,
      pass: close(ours, theirs, tolerance),
      detail: `${ours.toFixed(4)} vs ${theirs.toFixed(4)}`
    });
  const pools = await loadPoolBooks();
  const books: Record<'B1' | 'A' | 'B4', { symbol: string; grid: Grid; phenotype?: string }[]> = {
    B1: [{ symbol: 'VGT', grid: { ...vgtPrimary.grid } as unknown as Grid, phenotype: vgtPrimary.id }],
    A: pools.B5.map((book) => ({ symbol: book.symbol, grid: book.grid as unknown as Grid, phenotype: book.phenotype })),
    B4: pools.B4.map((book) => ({ symbol: book.symbol, grid: book.grid as unknown as Grid, phenotype: book.phenotype }))
  };
  const members = [...new Set(Object.values(books).flatMap((list) => list.map((book) => book.symbol)))].sort();
  const doors: Record<string, unknown> = {};

  for (const window of ['fold-a', 'fold-b'] as const) {
    const controls = await readJson<{ fixed: Record<string, Record<string, Record<string, number>>> }>(
      source.controls(window)
    );
    const validation = await readJson<{
      boundary: { index: number; date: string };
      validationEnd: string;
      fixed: Record<
        string,
        Record<string, { windowed: { net: number; minuteDrawdown: number; dailyDrawdown: number; lots: number }[] }>
      >;
    }>(source.validation(window));
    const cutoff = validation.boundary.date;

    // 1. the training window
    const training = await inspectionUniverse(window, members, cutoff);
    const fastTraining = await Fast.create(training, options.workers);

    for (const id of ['B1', 'A', 'B4'] as const) {
      for (const costBps of study.costGrid) {
        const stored = controls.fixed[id]![String(costBps)]!;
        const fast = await fastTraining.pool(books[id], [], costBps);
        const run = executeSpec(
          training.universe,
          engineSpec({ key: `anchor:${window}:${id}`, subject: id, books: books[id], costBps })
        );
        const label = `${window} training ${id} ${costBps} bps`;
        const heldDays = run.lots.reduce((total, lot) => total + lot.heldDays, 0);

        add('controls', `${label} fast net`, fast.net, stored.net!);
        add('controls', `${label} fast engine net`, fast.engineNet, stored.engineNet!);
        add('controls', `${label} fast lots`, fast.lots, stored.lots!, 0);
        add('controls', `${label} fast minute DD`, fast.minuteDrawdown, stored.minuteDrawdown!);
        add('controls', `${label} fast daily DD`, fast.dailyDrawdown, stored.dailyDrawdown!);
        add('controls', `${label} fast interest`, fast.interest, stored.interest!);
        add('controls', `${label} fast friction`, fast.costs, stored.costs!);
        add('controls', `${label} engine net (liquidation-equivalent)`, run.view.net, stored.net!);
        add('controls', `${label} engine net (engine convention)`, run.metrics.net, stored.engineNet!);
        add('controls', `${label} engine lots`, run.view.trades, stored.lots!, 0);
        add('controls', `${label} engine minute DD`, run.view.minuteDrawdown, stored.minuteDrawdown!);
        add('controls', `${label} engine daily DD`, run.view.dailyDrawdown, stored.dailyDrawdown!);
        add('controls', `${label} engine interest`, run.view.interest, stored.interest!);
        add('controls', `${label} engine friction (engine convention)`, run.metrics.friction, stored.costs!);
        // the liquidation view adds exactly the exit friction of a lot open at the cutoff close
        const openExit = run.lots
          .filter((lot) => lot.exitIndex < 0)
          .reduce((total, lot) => total + lot.shares * lot.exitRawPrice * (costBps / 10000), 0);

        add(
          'controls',
          `${label} liquidation friction − engine friction = open lots' exit friction`,
          run.view.friction - run.metrics.friction,
          openExit
        );
        add('controls', `${label} engine held calendar days`, heldDays, stored.heldDays!, 1e-6);
      }
    }

    await fastTraining.close();

    // 2. the evaluation window (continuous run, increment after the cutoff close)
    const evaluation = await inspectionUniverse(window, members, validation.validationEnd);
    const boundary = evaluation.universe.dates.indexOf(cutoff);
    const fastEvaluation = await Fast.create(evaluation, options.workers);

    if (boundary !== validation.boundary.index) {
      throw new Error(
        `${window}: the boundary session index ${boundary} differs from the sealed ${validation.boundary.index}`
      );
    }

    for (const id of ['B1', 'A', 'B4'] as const) {
      for (const costBps of study.costGrid) {
        const stored = validation.fixed[id]![String(costBps)]!.windowed[0]!;
        const fast = await fastEvaluation.pool(books[id], [boundary], costBps);
        const spec = engineSpec({
          key: `anchor:${window}:${id}:validation`,
          subject: id,
          books: books[id],
          costBps,
          boundaryDate: cutoff,
          keepDaily: true
        });
        const run = executeSpec(evaluation.universe, spec);
        const windowed = run.windowed!;
        const label = `${window} evaluation ${id} ${costBps} bps`;

        add('validation', `${label} fast V`, fast.windowed[0]!.net, stored.net);
        add('validation', `${label} fast windowed minute DD`, fast.windowed[0]!.minuteDrawdown, stored.minuteDrawdown);
        add('validation', `${label} fast windowed daily DD`, fast.windowed[0]!.dailyDrawdown, stored.dailyDrawdown);
        add('validation', `${label} fast lots after the cutoff`, fast.windowed[0]!.lots, stored.lots, 0);
        add('validation', `${label} engine V`, windowed.increment, stored.net);
        // the stored convention: the engine's daily strategy marks (no exit friction), peak reset at the cutoff close
        let peak = NaN;
        let rawDrawdown = 0;

        for (const row of run.daily!) {
          if (row.index === boundary) {
            peak = row.strategyMark;
          } else if (row.index > boundary) {
            peak = Math.max(peak, row.strategyMark);
            rawDrawdown = Math.max(rawDrawdown, peak - row.strategyMark);
          }
        }

        add('validation', `${label} engine windowed daily DD (engine daily marks)`, rawDrawdown, stored.dailyDrawdown);
        checks.push({
          group: 'information',
          name: `${label} engine windowed daily DD (liquidation marks, exit friction deducted daily)`,
          pass: true,
          detail: `${windowed.dailyDrawdown.toFixed(4)} (stored convention ${stored.dailyDrawdown.toFixed(4)})`
        });
        add('validation', `${label} engine lots after the cutoff`, windowed.lotsEntered, stored.lots, 0);
      }
    }

    await fastEvaluation.close();
    doors[window] = { cutoff, validationEnd: validation.validationEnd, members, boundary };
  }

  // 3. full-history anchors (context regression values only)
  const full = await fullHistoryUniverse();
  const fullBooks = { S: books.B1, B4: books.B4, B5: books.A };

  for (const id of ['S', 'B4', 'B5'] as const) {
    const run = executeSpec(full.universe, engineSpec({ key: `anchor:full:${id}`, subject: id, books: fullBooks[id] }));

    checks.push({
      group: 'full-history',
      name: `${id} 2016-01-04 → 2026-10-13 fixed net at 5 bps`,
      pass: Math.round(run.metrics.net * 100) / 100 === fullHistoryAnchors[id],
      detail: `${(Math.round(run.metrics.net * 100) / 100).toFixed(2)} vs ${fullHistoryAnchors[id].toFixed(2)}`
    });
  }

  void windowedOf;

  const failed = checks.filter((check) => !check.pass);
  const record = await writeRecord(anchorsFile, {
    stage: 'anchors',
    startedAt,
    finishedAt: nowIso(),
    doors,
    fullHistoryDoor: full.door,
    checks,
    passed: checks.length - failed.length,
    failed: failed.length
  });

  for (const check of failed) {
    log(`FAIL [${check.group}] ${check.name}: ${check.detail}`);
  }

  log(`anchors: ${checks.length - failed.length}/${checks.length} passed → ${anchorsFile}`);

  if (failed.length > 0) {
    throw new Error(`${failed.length} anchor check(s) failed: the affected evaluations stop here (fail closed)`);
  }

  return record;
};
