// The immutable comparators (PROTOCOL.md §9): never modified, never seeds. Frozen B1 (VGT primary), B5 (five books) and
// the frozen VG / VXR / VXRG subsets are Study 7's frozen grids (via Study 8's context); G-PA is Study 8's GDX control.
// The Study 8 F24 role holders (VG #2 balanced = rank 2 = S8-VG-F24-3, the primary economic comparator; VG #1 profit;
// and, on the F24 test door only, the other track bests as context) are read by rank from Study 8's sealed
// FROZEN_SELECTION.json, whose body hash must verify.
import fs from 'fs-extra';
import { verifySealed } from '../study5-gdx-b5-three-etf/data.ts';
import { frozenGrids, frozenPools, gdxControls, study8Holders, study8SelectionFile } from './context.ts';
import { type Books, configId } from './engine.ts';

const pick = (symbols: readonly string[]): Books =>
  Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s as keyof typeof frozenGrids] }]));

let study8Cache: { rank: number; track: string; role: string; id: string; books: Books }[] | undefined;
let study8BodyHash: string | undefined;

export const study8Ranked = async () => {
  if (!study8Cache) {
    const selection = (await fs.readJson(study8SelectionFile)) as {
      primaryRanked: { rank: number; track: string; role: string; id: string; books: Books }[];
      bodyHash: string;
    };

    if (!verifySealed(selection as never)) throw new Error(`${study8SelectionFile}: the body hash does not verify`);

    study8Cache = selection.primaryRanked;
    study8BodyHash = selection.bodyHash;
  }

  return { ranked: study8Cache, bodyHash: study8BodyHash! };
};

export const controlBooks = async (key: string): Promise<Books> => {
  if (key in frozenPools) return pick(frozenPools[key as keyof typeof frozenPools]);
  if (key === 'G-PA') return { GDX: { ...gdxControls['G-PA']!.grid } };

  const holder = study8Holders[key as keyof typeof study8Holders];

  if (!holder) throw new Error(`unknown control ${key}`);

  const { ranked } = await study8Ranked();
  const entry = ranked.find((r) => r.rank === holder.rank);

  if (!entry) throw new Error(`Study 8 rank ${holder.rank} is missing from its sealed selection`);
  // review m3: the rank must hold exactly the expected holder (track, role and configuration id)
  if (
    entry.track !== holder.track ||
    entry.role !== holder.role ||
    entry.id !== holder.id ||
    configId(entry.books) !== holder.id
  )
    throw new Error(
      `Study 8 rank ${holder.rank} is ${entry.track} ${entry.role} ${entry.id}, not the expected ${holder.id}`
    );

  return Object.fromEntries(Object.entries(entry.books).map(([s, g]) => [s, { ...g }]));
};

export const controlsOf = async (keys: readonly string[]) => {
  const out: Record<string, Books> = {};

  for (const key of keys) out[key] = await controlBooks(key);

  return out;
};

export const symbolsOf = (books: Record<string, Books>) => [
  ...new Set(Object.values(books).flatMap((b) => Object.keys(b)))
];
