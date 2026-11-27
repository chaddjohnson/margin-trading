// Manual (non-formal) doors of Priority 3's two-symbol pool (GDX, VGT) — the data every sealed VG/L0 configuration
// (New L0, N/original, …) is replayed on — over a chosen window of the canonical files:
//
//   research  2016-01-04 → 2026-10-30: Priority 3's FULL door itself (the verified byte prefix every sealed evaluation
//             read), so the result is the sealed one;
//   all       2016-01-04 → the LATEST COMMON COMPLETE SESSION of both files (src/lib/canonicalPrefix.ts): neither symbol is
//             simulated past the other's last complete session, and a session appended only in part is never used;
//   custom    any [from, to] inside that span (`to` may not pass the common complete endpoint).
//
// A manual door is built exactly as FULL is (the same loader, split adjustment, symDoorOf and calendar checks of
// src/vg-d1-growth-joint/data.ts), but reads the whole canonical file (manual evaluation); it is never a formal stage:
// optimization and validation keep their own doors and the research date ranges (standard 4.0.0 §1.12–§1.13). Its name
// carries the window and the data versions, so no in-process cache keyed by door name can mix it with FULL or another
// window. A custom window starts flat at its first session with no state from earlier sessions (as an isolated run).
import { commonCompleteEndpoint } from '../lib/canonicalPrefix.ts';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import { isNewYorkDate } from '../lib/partitions.ts';
import { researchRange } from '../lib/researchRanges.ts';
import { type Door, type SymDoor, doorOf, openFullDoor, symDoorOf } from '../vg-d1-growth-joint/data.ts';
import { type Sym, chronology, frozenSelectionFile, repoRoot, symbols } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import path from 'node:path';

export type WindowMode = 'research' | 'all' | 'custom';
export const windowModes: readonly WindowMode[] = ['research', 'all', 'custom'];

export interface ManualWindow {
  mode: WindowMode;
  from: string; // the requested first date (inclusive New York date)
  to: string; // the requested last date
  endpoint: {
    date: string;
    limitedBy: string[];
    files: { symbol: string; lastRowUtc: string; latestCompleteSession: string | null; bytes: number }[];
  };
  researchValidationEnd: string; // the research date range's validation end (config/research/date-ranges.json)
  postValidation: boolean; // the window reaches past the validation end: a manual post-validation evaluation
}

// The window of a request, checked against the files (common complete endpoint) before any data are read.
export const resolveManualWindow = (
  o: { mode: WindowMode; from?: string; to?: string },
  dataRoot = path.join(repoRoot, 'data')
): ManualWindow => {
  if (!windowModes.includes(o.mode)) throw new Error(`unknown window '${o.mode}' (${windowModes.join(', ')})`);
  for (const d of [o.from, o.to])
    if (d !== undefined && !isNewYorkDate(d)) throw new Error(`'${d}' is not a YYYY-MM-DD date`);
  if (o.mode !== 'custom' && (o.from !== undefined || o.to !== undefined))
    throw new Error(`--from/--to need --window custom`);

  const cc = commonCompleteEndpoint(symbols, dataRoot);
  const endpoint = {
    date: cc.endpoint,
    limitedBy: cc.limitedBy,
    files: cc.files.map((f) => ({
      symbol: f.symbol,
      lastRowUtc: f.lastRowUtc,
      latestCompleteSession: f.latestCompleteSession,
      bytes: f.bytes
    }))
  };
  const validationEnd = researchRange().validation.to;
  const from = o.mode === 'custom' ? (o.from ?? chronology.firstSession) : chronology.firstSession;
  const to = o.mode === 'research' ? chronology.validationEnd : o.mode === 'all' ? cc.endpoint : (o.to ?? cc.endpoint);

  if (from < chronology.firstSession)
    throw new Error(`--from ${from} is before the first common session ${chronology.firstSession}`);
  if (to > cc.endpoint)
    throw new Error(
      `--to ${to} is after the latest common complete session of ${symbols.join(', ')} (${cc.endpoint}, limited by ${cc.limitedBy.join(', ')}): ` +
        'nothing complete after it exists locally for every symbol'
    );
  if (from > to) throw new Error(`--from ${from} is after --to ${to}`);

  return { mode: o.mode, from, to, endpoint, researchValidationEnd: validationEnd, postValidation: to > validationEnd };
};

// Opens the window's door. `research` is FULL (behind Priority 3's guard, quietly: no write into that study).
export const openManualDoor = async (w: ManualWindow, purpose: string): Promise<Door> => {
  if (w.mode === 'research')
    return openFullDoor(purpose, { file: frozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);

  const parts = {} as Record<Sym, SymDoor>;

  for (const s of symbols) {
    const loaded = await loadDatasetSessions({
      dataset: resolveDataset(s, 'all', path.join(repoRoot, 'data')),
      startDate: w.from,
      endDate: w.to,
      warmupSessions: 0,
      access: 'manual evaluation'
    });

    if (loaded.history.at(-1)!.date !== w.to) throw new Error(`${s} ends ${loaded.history.at(-1)!.date}, not ${w.to}`);
    parts[s] = symDoorOf(s, loaded.history, loaded.report!.dataSha256!);
  }

  const first = parts.VGT.history[0]!.date;
  const name =
    `fixture:manual ${first}→${w.to} GDX ${parts.GDX.dataSha256.slice(0, 12)} VGT ${parts.VGT.dataSha256.slice(0, 12)}` as const;

  return doorOf(name, parts, first, w.to); // refuses differing session calendars
};
