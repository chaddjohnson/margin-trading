// The alias registry of the Study 9 Phase B local runner: friendly names for EXISTING sealed configurations only.
// Phase B aliases resolve against the sealed Phase B records (FROZEN_SELECTION.json: the training-only F24 ranking,
// roles and shortlists; the one-time F24 test record), never against typed vectors. Study 8 aliases (s8-…, the frozen
// subsets) and the Study 7 runner aliases (frozen B1, B5, …) are delegated, unchanged, to the Study 8 runner.
// Nothing here is optimized, re-tuned or approximated.
import { UsageError, parseAlias as parseStudy8Alias } from '../study8-runners/aliases.ts';

export { UsageError };

export const trackOf = {
  'g4-ilf': 'G4-ILF',
  'g4-eww': 'G4-EWW',
  'n3-edv': 'N3-EDV',
  'n2-smh': 'N2-SMH',
  'v3-iwm': 'V3-IWM',
  'n2-edv': 'N2-EDV',
  'vg3-iwm': 'VG3-IWM'
} as const;
export type TrackSlug = keyof typeof trackOf;
export const trackSlugs = Object.keys(trackOf) as TrackSlug[];
export const roleNames = ['profit', 'robust', 'balanced', 'extra1', 'extra2'] as const;
export type RoleName = (typeof roleNames)[number];

export type PhaseBAlias =
  | { kind: 'role'; alias: string; track: string; role: RoleName } // a sealed F24 role holder
  | { kind: 'best'; alias: string; track: string } // the track's top non-failed F24 holder (else its top holder)
  | { kind: 'member'; alias: string; track: string; order: number } // F24 shortlist member n of the track
  | { kind: 'rank'; alias: string; rank: number } // the sealed F24 training rank n
  | { kind: 'nominee'; alias: string } // the mechanical primary nominee (the top non-failed F24 holder)
  | { kind: 'study8'; alias: string }; // delegated to the Study 8 runner (s8-…, frozen subsets, Study 7 aliases)

// The default comparison (`compare --all`): every track's best F24 candidate against VG #2 balanced (the user's
// preferred Study 8 candidate and the primary comparator), VG #1 profit, B1 and B5. A track whose F24 holders all
// failed has no best candidate and is skipped at run time (resolve.ts compareAllAliases).
export const compareAll = [
  ...trackSlugs.map((slug) => `s9b-${slug}-best`),
  's8-vg-balanced',
  's8-vg-profit',
  'vgt-primary',
  'b5-frozen'
];

export const parseAlias = (alias: string): PhaseBAlias => {
  if (alias === 's9b-nominee') return { kind: 'nominee', alias };

  const rank = /^s9b-rank-([1-9]\d?)$/.exec(alias);

  if (rank) return { kind: 'rank', alias, rank: Number(rank[1]) };

  const match = /^s9b-(g4-ilf|g4-eww|n3-edv|n2-smh|v3-iwm|n2-edv|vg3-iwm)-(.+)$/.exec(alias);

  if (match) {
    const track = trackOf[match[1] as TrackSlug];
    const rest = match[2]!;

    if (rest === 'best') return { kind: 'best', alias, track };
    if ((roleNames as readonly string[]).includes(rest)) return { kind: 'role', alias, track, role: rest as RoleName };
    if (/^[1-6]$/.test(rest)) return { kind: 'member', alias, track, order: Number(rest) };
  }

  if (alias.startsWith('s9b-'))
    throw new UsageError(
      `unknown Phase B alias "${alias}"; use s9b-<track>-<profit|robust|balanced|extra1|extra2|best|1…6>, s9b-rank-<n> or s9b-nominee, track ${trackSlugs.join('|')}; see \`npm run study9b-run -- list\``
    );

  parseStudy8Alias(alias); // throws a UsageError for an unknown name

  return { kind: 'study8', alias };
};
