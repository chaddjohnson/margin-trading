// The separate single-session later slice (PROTOCOL.md §8.6): the 2026-10-30 session, evaluated only after the F24 test
// and its confirmation are sealed, on one continuous run from 2016-01-04 through 2026-10-30 (no reset). Report-only: it
// is never a gate, never amends the selection and is not a statistical holdout (one session). For every sealed F24 role
// holder and every F24 control: the session's marked P&L (mark at the 2026-10-30 close − mark at the 2026-10-29 close),
// lots entered, exited or open on the session, the session's own minute drawdown, and whether the whole-run minute DD
// changed. The run to 2026-10-29 on the same door must reproduce the sealed F24 test centres (a consistency check).
// Sessions after 2026-10-30, if a later refresh adds them, are recorded and never used here.
import fs from 'fs-extra';
import { allSymbols, evaluationEnd, frozenSelectionFile, resultFile, sliceDate } from './context.ts';
import { controlsOf, symbolsOf } from './controls.ts';
import { openDoor } from './door.ts';
import { type Books, Lab, P9Evaluator, PointCache, baseSettings } from './engine.ts';
import { requireIntegrity } from './integrity.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { minuteSeries, newYork, seriesLabOf } from './series.ts';
import { testFile } from './test.ts';
import { testControlKeysF24 } from './context.ts';

export const sliceFile = () => resultFile('slice', 'slice-2026-10-30.json');

export const runSlice = async () => {
  const out = sliceFile();

  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed)`);

  const integrity = await requireIntegrity('slice', { canonical: true });
  const frozen = await readSealed<{
    rankedByFold: Record<string, { rank: number; track: string; role: string; id: string; books: Books }[]>;
  }>(frozenSelectionFile);
  const test = await readSealed<{
    holders: {
      rank: number;
      id: string;
      track: string;
      evidence: { centre: { net: number; dd: number; lots: number } };
      gates: { status: string };
    }[];
    controls: Record<string, { evidence: { centre: { net: number; dd: number; lots: number } } }>;
  }>(testFile('F24'));
  const controls = await controlsOf([...testControlKeysF24]);
  const door = await openDoor(
    'slice',
    [...new Set([...allSymbols, ...symbolsOf(controls)])],
    'the 2026-10-30 single-session slice (report-only)'
  );
  const ev = new P9Evaluator(door);
  const lab = new Lab(ev, PointCache.memory(door, 'slice'));
  const last = door.lastIndex;
  const previous = door.lastIndexOn(evaluationEnd);

  if (door.dates[last] !== sliceDate || door.dates[previous] !== evaluationEnd || previous !== last - 1)
    throw new Error(`slice: the door's last two sessions are ${door.dates[previous]} and ${door.dates[last]}`);

  const rowOf = (who: string, books: Books, sealed?: { net: number; dd: number; lots: number }) => {
    const result = ev.replay(books, baseSettings, true);
    const series = minuteSeries(seriesLabOf(lab), result, books, baseSettings);
    const slicePoints = series.points.filter((p) => p.session === last);
    let peak = series.points.filter((p) => p.session < last).at(-1)?.value ?? 0;
    let sessionDd = 0;

    for (const point of slicePoints) {
      peak = Math.max(peak, point.value);
      sessionDd = Math.max(sessionDd, peak - point.value);
    }

    const through29 = series.points.filter((p) => p.session <= previous);
    let runPeak = 0;
    let ddThrough29 = 0;

    for (const point of through29) {
      runPeak = Math.max(runPeak, point.value);
      ddThrough29 = Math.max(ddThrough29, runPeak - point.value);
    }

    const lotsThrough29 = result.lots.filter((l) => l.entryIndex <= previous).length;

    return {
      who,
      books,
      sliceNet: Math.round((result.marks[last]! - result.marks[previous]!) * 100) / 100,
      markAt29: Math.round(result.marks[previous]! * 100) / 100,
      markAt30: Math.round(result.marks[last]! * 100) / 100,
      entered: result.lots
        .filter((l) => l.entryIndex === last)
        .map((l) => ({ symbol: l.symbol, entry: newYork(l.entryTime) })),
      exited: result.lots
        .filter((l) => l.exitIndex === last)
        .map((l) => ({ symbol: l.symbol, exit: newYork(l.exitTime), net: l.net })),
      openAtClose: result.lots
        .filter((l) => l.open)
        .map((l) => ({ symbol: l.symbol, entry: newYork(l.entryTime), net: l.net })),
      sessionMinuteDd: Math.round(sessionDd * 100) / 100,
      runMinuteDdThrough30: result.minuteDrawdown.maximum,
      runMinuteDdThrough29: ddThrough29,
      consistency: sealed
        ? {
            sealedNet: sealed.net,
            markAt29: result.marks[previous],
            sealedDd: sealed.dd,
            ddThrough29,
            sealedLots: sealed.lots,
            lotsThrough29,
            equal: Math.abs(sealed.net - result.marks[previous]!) < 0.005 && Math.abs(sealed.dd - ddThrough29) < 0.005
          }
        : null
    };
  };

  const holders = (frozen.rankedByFold.F24 ?? []).map((h) => {
    const sealed = test.holders.find((t) => t.rank === h.rank);

    return {
      rank: h.rank,
      track: h.track,
      role: h.role,
      id: h.id,
      status: sealed?.gates.status,
      ...rowOf(`${h.track}/${h.id}`, h.books, sealed?.evidence.centre)
    };
  });
  const controlRows = Object.entries(controls).map(([key, books]) =>
    rowOf(`control:${key}`, books, test.controls[key]?.evidence.centre)
  );
  const consistent = [...holders, ...controlRows].every((r) => !r.consistency || r.consistency.equal);

  if (!consistent) throw new Error('slice: the run through 2026-10-29 does not reproduce the sealed F24 centres');

  const record = await writeSealed(out, {
    stage: 'SLICE_2026_10_30',
    at: nowIso(),
    note: 'one elapsed session, reported apart; not a gate, not a holdout, never used to amend the selection',
    door: { id: door.id, last: door.dates[last], sessions: door.dates.length },
    laterBytesBeyond20261030: integrity?.laterBytes ?? {},
    holders,
    controls: controlRows
  });

  log(`slice sealed ${record.file} ${record.bodyHash.slice(0, 12)}`);
};
