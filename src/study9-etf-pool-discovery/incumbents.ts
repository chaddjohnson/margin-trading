// The immutable comparators (PROTOCOL.md §2.4): read from sealed records only, never typed, never seeds.
//   - Study 8 F24 holders from research/study8-expanded-regime-d1/FROZEN_SELECTION.json (its body hash verified):
//     #1 VG profit, #2 VG balanced (the user's preferred candidate), #3 VXRG profit, #8 VXRKG profit, #12 G profit,
//     #15 VXR profit, #23 V profit;
//   - the frozen B1 (VGT primary), B5 (five books) and the frozen VG / VXR / VXRG subsets of B5's books, and the GDX
//     control G-PA, from Study 8's context (Study 7's frozen grids, verified against the registry by Studies 7 and 8).
// Their sealed training-door (2016-01-04 → 2024-12-31) figures, read from Study 8's F24 qualification records, are the
// parity targets of gate P3. No post-2024 figure of any of them is computed by this study.
import fs from 'fs-extra';
import { verifySealed } from '../study5-gdx-b5-three-etf/data.ts';
import { frozenGrids, gdxControls } from '../study8-expanded-regime-d1/context.ts';
import type { Books } from './engine.ts';

export const frozenSelectionFile = 'research/study8-expanded-regime-d1/FROZEN_SELECTION.json';
export const qualificationFile = (track: string) =>
  `research/study8-expanded-regime-d1/results/qualify/${track}/F24/qualification.json`;

export const s8Ranks: Record<number, string> = {
  1: 's8-vg-profit (#1 VG profit)',
  2: 's8-vg-balanced (#2 VG balanced; the user-preferred candidate)',
  3: 's8-vxrg-profit (#3 VXRG profit)',
  8: 's8-vxrkg-profit (#8 VXRKG profit)',
  12: 's8-g-profit (#12 G profit)',
  15: 's8-vxr-profit (#15 VXR profit)',
  23: 's8-v-profit (#23 V profit)'
};

const pick = (symbols: string[]): Books =>
  Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s as keyof typeof frozenGrids] }]));

export interface Incumbent {
  key: string;
  books: Books;
  note: string;
  track?: string;
  study8Id?: string;
}

export const incumbents = async (): Promise<Incumbent[]> => {
  const selection = (await fs.readJson(frozenSelectionFile)) as {
    primaryRanked: { rank: number; track: string; role: string; id: string; books: Books }[];
  };

  if (!verifySealed(selection as never)) throw new Error(`${frozenSelectionFile}: body hash does not verify`);

  const ranked = Object.entries(s8Ranks).map(([rank, note]) => {
    const entry = selection.primaryRanked.find((e) => e.rank === Number(rank))!;

    return { key: `S8-${rank}`, books: entry.books, note, track: entry.track, study8Id: entry.id };
  });

  return [
    ...ranked,
    { key: 'B1', books: pick(['VGT']), note: 'frozen B1, VGT primary' },
    { key: 'B5', books: pick(['VGT', 'XBI', 'XRT', 'KRE', 'GDX']), note: 'frozen B5, five books' },
    { key: 'VG-frozen', books: pick(['VGT', 'GDX']), note: 'frozen VG subset of B5' },
    { key: 'VXR-frozen', books: pick(['VGT', 'XBI', 'XRT']), note: 'frozen VXR subset of B5' },
    { key: 'VXRG-frozen', books: pick(['VGT', 'XBI', 'XRT', 'GDX']), note: 'frozen VXRG subset of B5' },
    {
      key: 'G-PA',
      books: { GDX: { ...gdxControls['G-PA']!.grid } },
      note: 'GDX portfolioAware (B5 GDX book) standalone'
    }
  ];
};

const pickCentre = (c: { net: number; dd: number; ddDaily: number; lots: number; episodes: number }) => ({
  net: c.net,
  dd: c.dd,
  ddDaily: c.ddDaily,
  lots: c.lots,
  episodes: c.episodes
});

// Every sealed F24 training-door centre (candidates and controls of all six tracks): the parity targets.
export const sealedTrainingCentres = async () => {
  const out: {
    track: string;
    kind: string;
    id: string;
    books: Books;
    net: number;
    dd: number;
    ddDaily: number;
    lots: number;
    episodes: number;
  }[] = [];

  for (const track of ['G', 'V', 'VG', 'VXR', 'VXRG', 'VXRKG']) {
    const q = (await fs.readJson(qualificationFile(track))) as {
      candidates: {
        id: string;
        books: Books;
        evidence: { centre: { net: number; dd: number; ddDaily: number; lots: number; episodes: number } };
      }[];
      controls: Record<
        string,
        {
          evidence: {
            books: Books;
            centre: { net: number; dd: number; ddDaily: number; lots: number; episodes: number };
          };
        }
      >;
    };

    if (!verifySealed(q as never)) throw new Error(`${qualificationFile(track)}: body hash does not verify`);

    for (const c of q.candidates)
      out.push({ track, kind: 'candidate', id: c.id, books: c.books, ...pickCentre(c.evidence.centre) });
    for (const [key, c] of Object.entries(q.controls))
      out.push({ track, kind: 'control', id: key, books: c.evidence.books, ...pickCentre(c.evidence.centre) });
  }

  return out;
};
