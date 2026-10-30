// The Study 5 data doors (PROTOCOL.md §3.3). Every strategy result of the study is computed on a universe opened here,
// and every opening is appended to results/doors.jsonl. The search and validation doors load the repository's
// training partition with access 'optimization' and an end date, so no bar after the door's end is present in the
// process; the final door ('all') is refused unless FROZEN_SELECTION.json exists and its body hash verifies.
import crypto from 'node:crypto';
import fs from 'fs-extra';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import {
  type DoorKey,
  doors,
  doorsLog,
  fiveEtfUniverse,
  frozenSelectionFile,
  restrictedUniverse,
  execution
} from './context.ts';

export const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

// A sealed record: { ...body, bodyHash } where bodyHash = sha256(JSON.stringify(body)).
export const sealBody = <T extends object>(body: T) => ({ ...body, bodyHash: sha256(JSON.stringify(body)) });

export const verifySealed = (record: Record<string, unknown>) => {
  const { bodyHash, ...body } = record;

  return typeof bodyHash === 'string' && sha256(JSON.stringify(body)) === bodyHash;
};

export const readVerifiedSelection = async () => {
  if (!(await fs.pathExists(frozenSelectionFile))) {
    throw new Error(`the final door is closed: ${frozenSelectionFile} does not exist (run freeze-selection first)`);
  }

  const manifest = (await fs.readJson(frozenSelectionFile)) as Record<string, unknown>;

  if (!verifySealed(manifest)) {
    throw new Error(`the final door is closed: ${frozenSelectionFile}'s body hash does not verify`);
  }

  return manifest;
};

// The universe guard (§6.1): a restricted-pool run may hold only VGT, KRE and GDX; the five-ETF control C5 is the only
// exception and must name itself.
export const assertUniverse = (symbols: readonly string[], allowFiveEtf = false) => {
  const allowed: readonly string[] = allowFiveEtf ? fiveEtfUniverse : restrictedUniverse;
  const bad = symbols.filter((symbol) => !allowed.includes(symbol));

  if (bad.length || new Set(symbols).size !== symbols.length || symbols.length === 0) {
    throw new Error(
      `universe guard: ${symbols.join(' ')} is not a subset of ${allowed.join(' ')}${bad.length ? ` (refused: ${bad.join(' ')})` : ''}`
    );
  }
};

export interface Door {
  key: DoorKey;
  purpose: string;
  loaded: LoadedUniverse;
  members: string[];
  dates: string[];
  lastIndex: number;
  eligibilityIndex: number;
  indexOf: (date: string) => number; // first session on or after the date
  lastIndexOn: (date: string) => number; // last session on or before the date
}

export const openDoor = async (key: DoorKey, members: readonly string[], purpose: string): Promise<Door> => {
  const spec = doors[key];
  const withFive = members.some((symbol) => symbol === 'XBI' || symbol === 'XRT');

  assertUniverse(members, withFive);

  if (key === 'final') {
    await readVerifiedSelection();
  }

  if (key === 'control' && !(withFive && members.length === fiveEtfUniverse.length)) {
    throw new Error('the control door opens only for the frozen five-ETF B5 (C5) regression');
  }

  const loaded = await loadNUniverse({
    members: [...members],
    partition: spec.partition,
    access: spec.partition === 'training' ? 'optimization' : 'manual evaluation',
    warmupSessions: 0,
    ...(spec.end ? { endDate: spec.end } : {})
  });
  const { dates, eligibilityIndex } = loaded.universe;
  const last = dates[dates.length - 1]!;

  if (spec.end && last > spec.end) {
    throw new Error(`door ${key}: loaded ${last}, after its end ${spec.end}`);
  }

  if (dates[eligibilityIndex] !== execution.eligibilityDate) {
    throw new Error(`door ${key}: eligibility session ${dates[eligibilityIndex]} ≠ ${execution.eligibilityDate}`);
  }

  const entry = {
    at: new Date().toISOString(),
    door: key,
    purpose,
    partition: spec.partition,
    end: spec.end ?? null,
    members,
    firstDate: dates[0],
    lastDate: last,
    sessions: dates.length,
    dataSha256: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!.hash])),
    pid: process.pid
  };

  await fs.ensureFile(doorsLog);
  await fs.appendFile(doorsLog, `${JSON.stringify(entry)}\n`);

  const indexOf = (date: string) => {
    const index = dates.findIndex((day) => day >= date);

    return index < 0 ? dates.length : index;
  };
  const lastIndexOn = (date: string) => {
    let index = -1;

    for (let i = 0; i < dates.length && dates[i]! <= date; i++) {
      index = i;
    }

    return index;
  };

  return {
    key,
    purpose,
    loaded,
    members: [...members],
    dates,
    lastIndex: dates.length - 1,
    eligibilityIndex,
    indexOf,
    lastIndexOn
  };
};
