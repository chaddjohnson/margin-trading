// The data door (PROTOCOL.md §9-§10), outcome-critical: the latest UTC day a phenotype may be run through, derived from
// the sealed records only, and the run dates of `fixed` and `compare`, which refuse anything later. It lives outside
// the report-only CLI so the freeze binds it; `fixed` and `compare` run the freeze guard once the freeze exists.
import fs from 'node:fs';
import { type Chronology, dateOf, dayOfDate } from './calendar.ts';
import { files, readSealed, stageFile } from './records.ts';
import { diagnosticGrid } from './stages.ts';

interface PicksRecord {
  bodyHash: string;
  picks: { rank: number; grid: Record<string, number> }[];
}

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

// The data door, derived from the sealed records only (the phenotype JSON's door is display): a phenotype may run
// through the day before the holdout unless it is a final pick whose grid equals its sealed PICKS entry, the
// procedure gate passed and HOLDOUT.json (the single authorised evaluation) exists. An id that cannot be derived
// from the sealed records is refused.
export interface Door {
  latestPermittedDay: number;
  reason: string;
}

export const sealedDoor = (id: string, grid: Record<string, number>, chronology: Chronology): Door => {
  const sealedDay = chronology.holdout.startDay - 1;
  const sealedReason = `the holdout ${dateOf(chronology.holdout.startDay)} → ${dateOf(chronology.lastDay)} is sealed for this phenotype`;
  const same = (other: Record<string, number>) => JSON.stringify(other) === JSON.stringify(grid);

  if (id === 'diagnostic-vgt-d1') {
    if (!same(diagnosticGrid as never)) {
      throw new Error(`${id}: its parameters are not the unchanged diagnostic vector`);
    }

    return { latestPermittedDay: sealedDay, reason: sealedReason };
  }

  const match = id.match(/^(fold-a|fold-b|final)-r(\d)$/);

  if (!match) {
    throw new Error(
      `${id} is not derivable from the sealed records (diagnostic-vgt-d1, fold-a-rN, fold-b-rN, final-rN)`
    );
  }

  const stage = match[1] === 'final' ? 'final' : `folds/${match[1]}`;
  const picks = readSealed<PicksRecord>(stageFile(stage, 'PICKS.json'));
  const pick = picks.picks.find((entry) => entry.rank === Number(match[2]));

  if (!pick || !same(pick.grid)) {
    throw new Error(`${id} does not match ${stage}/PICKS.json`);
  }

  if (match[1] === 'final' && fs.existsSync(files.gate) && fs.existsSync(stageFile('final', 'HOLDOUT.json'))) {
    const gate = readSealed<{ pass: boolean }>(files.gate);
    const holdout = readSealed<{ picksBodyHash: string; evidence: { rank: number }[] }>(
      stageFile('final', 'HOLDOUT.json')
    );

    if (gate.pass && holdout.picksBodyHash === picks.bodyHash && holdout.evidence.some((e) => e.rank === pick.rank)) {
      return {
        latestPermittedDay: chronology.lastDay,
        reason: 'the single authorised holdout evaluation included this phenotype (results/final/HOLDOUT.json)'
      };
    }
  }

  return { latestPermittedDay: sealedDay, reason: sealedReason };
};

// The run: one continuous cash account arming from `armFrom`, reported on [start, end]. --dataset <window> reports
// a fold or holdout window of the same continuous run the sealed validation used (arming from 2019-02-11) unless
// --flat; --start alone starts a fresh account there.
export const resolveDates = (args: string[], chronology: Chronology, door: Door, lookback: number) => {
  const dataset = option(args, 'dataset');
  const latest = door.latestPermittedDay;
  let start = option(args, 'start') ? dayOfDate(option(args, 'start')!) : chronology.armStartDay;
  let end = option(args, 'end') ? dayOfDate(option(args, 'end')!) : latest;
  let armFrom = start;

  if (dataset === 'all') {
    end = chronology.lastDay;
  } else if (dataset === 'development') {
    end = Math.min(end, chronology.development.endDay - 1);
  } else if (dataset) {
    const window = [...chronology.folds.flatMap((fold) => [fold.selection, fold.validation]), chronology.holdout].find(
      (candidate) => candidate.label.replace(' ', '-') === dataset
    );

    if (!window) {
      throw new Error(
        `--dataset must be all, development, fold-a-selection, fold-a-validation, fold-b-selection, fold-b-validation or holdout`
      );
    }

    start = window.startDay;
    end = window.endDay - 1;
    armFrom = args.includes('--flat') ? start : chronology.armStartDay;
  }

  if (end > latest) {
    throw new Error(
      `Refused by the data door: this phenotype may be run through ${dateOf(latest)} (the latest permitted minute is ${dateOf(latest)}T23:59:00Z); ` +
        `${dateOf(end)} lies in the sealed holdout. Reason: ${door.reason}.`
    );
  }

  if (end > chronology.lastDay) {
    throw new Error(`The study snapshot ends on ${dateOf(chronology.lastDay)}`);
  }

  if (armFrom < chronology.historyStartDay + lookback) {
    throw new Error(
      `--start ${dateOf(armFrom)} leaves fewer than L = ${lookback} completed UTC days of history before it (history starts ${dateOf(chronology.historyStartDay)}); the earliest start is ${dateOf(chronology.historyStartDay + lookback)}`
    );
  }

  if (start > end) {
    throw new Error('--start is after --end');
  }

  return { armFrom, start, end };
};
