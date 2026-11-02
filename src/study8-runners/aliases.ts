// The alias registry of the Study 8 local runner: friendly names for EXISTING strategies only. Study 8 aliases resolve
// against the sealed Study 8 records (FROZEN_SELECTION.json: the training-only F24 ranking and shortlists; the one-time
// F24 test record), never against typed vectors. Frozen controls and Study 7's research candidates keep the Study 7
// runner's own aliases (src/study7-runners/aliases.ts, unchanged), resolved and reconciled by that runner's code.
// Nothing here is optimized, re-tuned or approximated.
import { UsageError, aliases as study7Aliases } from '../study7-runners/aliases.ts';

export { UsageError };

export const runnerPoolsRoot = 'config/research-pools/study8-local-runners';

export const trackOf = { g: 'G', v: 'V', vg: 'VG', vxr: 'VXR', vxrg: 'VXRG', vxrkg: 'VXRKG' } as const;
export type TrackSlug = keyof typeof trackOf;
export const trackSlugs = Object.keys(trackOf) as TrackSlug[];
export const roleNames = ['profit', 'robust', 'balanced', 'extra1', 'extra2'] as const;
export type RoleName = (typeof roleNames)[number];

export type Study8Alias =
  | { kind: 'role'; alias: string; track: string; role: RoleName } // a sealed F24 role holder
  | { kind: 'best'; alias: string; track: string } // the track's top F24 role holder, else its shortlist member 1
  | { kind: 'member'; alias: string; track: string; order: number } // F24 shortlist member n of the track
  | { kind: 'frozen-subset'; alias: string; key: 'VXR' | 'VXRG'; id: string } // B5's books, unchanged
  | { kind: 'study7'; alias: string }; // a Study 7 runner alias (frozen controls, Study 7 references)

export const frozenSubsets = {
  'vxr-frozen': { key: 'VXR', id: 'S8R-VXR-frozen' },
  'vxrg-frozen': { key: 'VXRG', id: 'S8R-VXRG-frozen' }
} as const;

export const study7AliasNames = study7Aliases.map((spec) => spec.alias);

// The default comparison (`compare --all`): the best F24 candidate of each of the six tracks against B1 and B5.
export const compareAll = [...trackSlugs.map((slug) => `s8-${slug}-best`), 'vgt-primary', 'b5-frozen'];

export const parseAlias = (alias: string): Study8Alias => {
  const match = /^s8-(g|v|vg|vxr|vxrg|vxrkg)-(.+)$/.exec(alias);

  if (match) {
    const track = trackOf[match[1] as TrackSlug];
    const rest = match[2]!;

    if (rest === 'best') return { kind: 'best', alias, track };
    if ((roleNames as readonly string[]).includes(rest)) return { kind: 'role', alias, track, role: rest as RoleName };
    if (/^[1-9]\d?$/.test(rest)) return { kind: 'member', alias, track, order: Number(rest) };
  }

  if (alias in frozenSubsets) {
    const subset = frozenSubsets[alias as keyof typeof frozenSubsets];

    return { kind: 'frozen-subset', alias, key: subset.key, id: subset.id };
  }

  if (study7AliasNames.includes(alias)) return { kind: 'study7', alias };

  throw new UsageError(
    `unknown strategy alias "${alias}"; Study 8 aliases are s8-<track>-<profit|robust|balanced|extra1|extra2|best|N> with track ${trackSlugs.join('|')}, plus ${Object.keys(frozenSubsets).join(', ')} and the Study 7 runner aliases (${study7AliasNames.join(', ')}); see \`npm run study8-run -- list\``
  );
};
