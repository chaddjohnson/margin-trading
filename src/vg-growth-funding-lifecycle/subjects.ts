// The frozen subjects (PROTOCOL.md §4): exact configurations, enabled masks and sealed centre records read from
// Priority 3's verified records (src/vg-d1-growth-diagnostic/subjects.ts loadSubjects: its sealed C24 and Growth-pair
// qualification records, sha256-pinned) and its sealed CONTROL_MANIFEST.json — never rebuilt from prose. New
// combinations (E and the three standalone books) are built from those sealed vectors by Priority 3's own control
// convention (a disabled component carries the placeholder vector and is never run or funded).
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type GConfig, type Quad, d1Placeholder, gId, normalize, quadId } from '../vg-d1-growth-joint/space.ts';
import { loadSubjects as loadP3Subjects } from '../vg-d1-growth-diagnostic/subjects.ts';
import { readP3 } from '../vg-d1-growth-diagnostic/records.ts';

export type Group = 'core' | 'standalone' | 'mechanism' | 'finalist';

export interface Subject {
  key: string; // this study's key (the brief's labels for the core matrix)
  label: string;
  group: Group;
  p3Key: string | null; // the Priority 3 / 3A key it is identical to (null: new here)
  id: string; // quadId (sha256(16) of the four canonical vectors and the priority)
  quad: Quad;
  enabled: BookId[];
  options: EvalOptions;
  need: 'mixed' | 'G'; // Priority 3's instrument scope: joint (mixed) or Growth-only (g)
  sealedCentre: Rec | null; // Priority 3's sealed development centre (the L0 parity target)
  sealedScopes: string[]; // the scope families Priority 3 sealed for it
  evidence: unknown; // the sealed qualification evidence (null for new subjects)
  growth: Partial<Record<'GDX' | 'VGT', { id: string; name: string }>>;
}

interface ControlManifest {
  controls: { key: string; id: string; quad: Quad; enabled: Record<BookId, boolean>; first: Quad['first'] }[];
  incumbents: {
    vg2: Record<'GDX' | 'VGT', Quad['d1']['GDX']>;
    growth4: { id: string; effective: GConfig };
    growth085: { id: string; effective: GConfig };
    appendixA: { id: string; effective: GConfig };
  };
}

const optionsOf = (enabled: readonly BookId[]): EvalOptions => {
  const off = bookIds.filter((b) => !enabled.includes(b));

  return off.length ? { enabled: Object.fromEntries(off.map((b) => [b, false])) } : {};
};

export const growthNames: Record<string, string> = {
  '420cd989e4fa7749': 'VGT Growth #4',
  '08500a60ec56cfae': 'VGT Growth 08500a60',
  '07cac3329fc7a520': 'GDX Growth (Appendix A)'
};

const growthOf = (q: Quad, enabled: readonly BookId[]) => {
  const out: Subject['growth'] = {};

  for (const s of ['GDX', 'VGT'] as const)
    if (enabled.includes(`G:${s}`))
      out[s] = { id: gId(q.g[s]), name: growthNames[gId(q.g[s])] ?? `Growth ${gId(q.g[s])}` };
  return out;
};

// The core matrix (the brief §4): label → Priority 3 / 3A key (null = built here).
export const coreKeys: { key: string; p3: string | null; label: string }[] = [
  { key: 'D', p3: 'D', label: 'VG #2 VGT+GDX D1 only (D1-only control)' },
  { key: 'E', p3: null, label: 'VG #2 + existing GDX Growth (Appendix A) only' },
  { key: 'C4', p3: 'C', label: 'VG #2 + VGT Growth #4 only' },
  { key: 'C85', p3: 'O08', label: 'VG #2 + VGT Growth 08500a60 only' },
  { key: 'A', p3: 'A', label: 'VG #2 + VGT Growth #4 + existing GDX Growth' },
  { key: 'B', p3: 'B', label: 'VG #2 + VGT Growth 08500a60 + existing GDX Growth' },
  { key: 'GP4', p3: 'GP4', label: 'Growth only: VGT #4 + existing GDX Growth' },
  { key: 'GP85', p3: 'GP085', label: 'Growth only: VGT 08500a60 + existing GDX Growth' },
  { key: 'V4', p3: 'O06', label: 'Shipped VGT D1 primary + VGT Growth #4' },
  { key: 'V85', p3: 'O07', label: 'Shipped VGT D1 primary + VGT Growth 08500a60' }
];

// The labels Priority 3 gave the core subjects it already had (checked so that a key is never mis-mapped).
const p3Labels: Record<string, string> = {
  C85: 'control: VG #2 + Growth 08500a60 (VGT) — three components',
  V4: 'control: VGT only: D1 primary + Growth #4 · A (Priority 2)',
  V85: 'control: VGT only: D1 primary + Growth 08500a60 · A (Priority 2)'
};

export const loadSubjects = (): Subject[] => {
  const p3 = loadP3Subjects();
  const byKey = new Map(p3.map((s) => [s.key, s]));
  const cm = readP3<ControlManifest>('CONTROL_MANIFEST.json');
  const control = (key: string) => {
    const c = cm.controls.find((x) => x.key === key);

    if (!c) throw new Error(`control ${key} missing from Priority 3's CONTROL_MANIFEST`);
    if (quadId(normalize(c.quad)) !== c.id) throw new Error(`control ${key}: the quad does not hash to ${c.id}`);
    return c;
  };
  const out: Subject[] = [];
  const fromP3 = (key: string, p3Key: string, label: string, group: Group) => {
    const s = byKey.get(p3Key);

    if (!s) throw new Error(`${p3Key} is not a Priority 3 subject`);
    if (p3Labels[key] && s.label !== p3Labels[key]) throw new Error(`${key}: ${p3Key} is "${s.label}"`);

    const ev = s.evidence as unknown as { scopes?: Record<string, unknown> };

    out.push({
      key,
      label,
      group,
      p3Key,
      id: s.id,
      quad: s.quad,
      enabled: s.enabled,
      options: s.options,
      need: s.need,
      sealedCentre: s.evidence.centre,
      sealedScopes: Object.keys(ev.scopes ?? {}),
      evidence: s.evidence,
      growth: growthOf(s.quad, s.enabled)
    });
  };
  const built = (key: string, label: string, group: Group, quad: Quad, enabled: BookId[]) => {
    const q = normalize(quad);

    out.push({
      key,
      label,
      group,
      p3Key: null,
      id: quadId(q),
      quad: q,
      enabled,
      options: optionsOf(enabled),
      need: enabled.every((b) => b.startsWith('G:')) ? 'G' : 'mixed',
      sealedCentre: null,
      sealedScopes: [],
      evidence: null,
      growth: growthOf(q, enabled)
    });
  };

  const A = byKey.get('A')!;
  const D = byKey.get('D')!;
  const appA = control('appA');
  const vg2 = control('vg2');

  // the sealed vectors the new subjects are built from must be the incumbents themselves
  if (gId(A.quad.g.GDX) !== cm.incumbents.appendixA.id) throw new Error("A's Growth·GDX is not Appendix A");
  if (JSON.stringify(A.quad.d1) !== JSON.stringify(D.quad.d1)) throw new Error("A's D1 books are not VG #2's");

  for (const c of coreKeys) {
    if (c.p3) fromP3(c.key, c.p3, c.label, 'core');
    else
      // E: VG #2 + Appendix A, Growth·VGT disabled with Priority 3's placeholder (D's own Growth·VGT vector)
      built(c.key, c.label, 'core', { d1: vg2.quad.d1, g: { GDX: A.quad.g.GDX, VGT: D.quad.g.VGT }, first: 'D1' }, [
        'D1:GDX',
        'D1:VGT',
        'G:GDX'
      ]);
  }

  // the standalone books, each alone in the $100,000 slot (Priority 3's control `appA` and its VGT analogues)
  const placeholder = D.quad.g.GDX;

  if (gId(placeholder) !== gId(D.quad.g.VGT)) throw new Error('the two placeholders differ');
  built('SG', 'GDX Growth (Appendix A) alone', 'standalone', appA.quad, ['G:GDX']);
  if (out.at(-1)!.id !== appA.id) throw new Error('SG is not Priority 3’s appA control');
  built(
    'S4',
    'VGT Growth #4 alone',
    'standalone',
    {
      d1: { GDX: d1Placeholder, VGT: d1Placeholder },
      g: { GDX: placeholder, VGT: cm.incumbents.growth4.effective },
      first: 'D1'
    },
    ['G:VGT']
  );
  built(
    'S85',
    'VGT Growth 08500a60 alone',
    'standalone',
    {
      d1: { GDX: d1Placeholder, VGT: d1Placeholder },
      g: { GDX: placeholder, VGT: cm.incumbents.growth085.effective },
      first: 'D1'
    },
    ['G:VGT']
  );

  // Priority 3's informed, independent and staged primaries (mechanism controls)
  fromP3('IP', 'IP', 'Priority 3 informed primary (C24/informed#1 profit)', 'mechanism');
  fromP3('XP', 'XP', 'Priority 3 independent primary (C24/indep/GDX-rise_VGT-rise#1 profit)', 'mechanism');
  fromP3('SP', 'SP', 'Priority 3 staged primary (VG #2 + C24/gpair/GDX-breakout_VGT-rise#3)', 'mechanism');

  // the 12 Growth-pair finalists and the 16 independent finalists, distinct after deduplication (I01 = XP)
  const seen = new Set(out.map((s) => `${s.id}|${s.enabled.join(',')}`));

  for (const s of p3)
    if (/^[GI]\d\d$/.test(s.key)) {
      const k = `${s.id}|${s.enabled.join(',')}`;

      if (seen.has(k)) continue;
      seen.add(k);
      fromP3(s.key, s.key, s.label, 'finalist');
    }

  for (const s of out) if (quadId(s.quad) !== s.id) throw new Error(`${s.key}: identity`);
  return out;
};

// VG #2's native convention (Study 8: D1 arming 2017-06-15), the bridge to the harmonized control D (L0 only).
export const nativeOptions = (d: Subject): EvalOptions => ({ ...d.options, d1Arm: 'native' });
