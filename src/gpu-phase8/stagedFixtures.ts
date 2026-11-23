// gpu-phase8 adversarial set T (staged-stop@1 exactness on the device): synthetic two-symbol doors in which the D1·VGT
// book's dip-buy fills at 90 (raw; RC 1's crash scenario, src/d1-risk-controls/tests/scenarios.ts) and the path is built to
// reach each edge of the rule (RULE_SPECIFICATION.md §1, §4) — the exact counterparts of the CPU unit tests
// (src/d1-risk-controls-rc3/tests/book.test.ts): a session high EXACTLY at 90 × (1 + 100/1000) (arms), one ulp below (does
// not arm), arming on the entry session, a placement exit at the next open, a staged level made ineligible by interest,
// a later gap through an armed level. GDX trades a flat path (no D1·GDX entry). The tasks run D1 only (Growth disabled),
// with the scenarios' grid (X 10 %, Y 1 %, τ₁ 5 %, hold 5 days, L 3, buffer 2 %, P 5 %, W 5). No market data is read.
import type { MarketSession } from '#types';
import { type Door, fixtureDoorOf } from '../vg-d1-growth-joint/data.ts';
import { type Bar, sessionOf, weekdays } from '../d1-risk-controls/tests/fixtures.ts';
import { grid } from '../d1-risk-controls/tests/scenarios.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { StagedConfig } from '../staged-stop/config.ts';
import { gdxPlaceholder } from '../vg-l0-full-joint/nl0.ts';

const flat3 = (p: number): Bar[] => [
  { o: p, c: p },
  { o: p, c: p },
  { o: p, c: p }
];
const sessions = (spec: Bar[][]): MarketSession[] => {
  const dates = weekdays(spec.length);

  return spec.map((x, i) => sessionOf(dates[i]!, x));
};
export const ACT = 90 * (1 + 100 / 1000);
const below = (() => {
  const f = new Float64Array([ACT]);
  const v = new DataView(f.buffer);

  v.setBigUint64(0, v.getBigUint64(0, true) - 1n, true);
  return f[0]!;
})();
const entry: Bar[] = [
  { o: 95, c: 95 },
  { o: 95, c: 89.5 },
  { o: 89.5, c: 89 },
  { o: 89, c: 90 },
  { o: 90, c: 90.5 }
];
const pre = [flat3(100), flat3(100), flat3(100), flat3(100)];
const up = [
  { o: 90.5, c: 92 },
  { o: 92, c: 95 },
  { o: 95, c: 97 }
];
const tail = [flat3(97), flat3(96), flat3(97)];

export const stagedScenarios: Record<string, Bar[][]> = {
  'T-threshold-at': [
    ...pre,
    entry,
    up,
    [{ o: 97, c: 97.5, h: ACT }],
    [
      { o: 97.5, c: 97 },
      { o: 97, c: 96.9 }
    ],
    ...tail
  ],
  'T-threshold-below': [
    ...pre,
    entry,
    up,
    [{ o: 97, c: 97.5, h: below }],
    [
      { o: 97.5, c: 97 },
      { o: 97, c: 96.9 }
    ],
    ...tail
  ],
  'T-entry-session': [
    ...pre,
    [...entry.slice(0, 4), { o: 90, c: 99, h: 99.5 }, { o: 99, c: 95 }],
    [{ o: 96, c: 96 }],
    ...tail
  ],
  'T-placement': [
    ...pre,
    entry,
    up,
    [
      { o: 97, c: 98 },
      { o: 98, c: 101 },
      { o: 101, c: 97 }
    ],
    [
      { o: 97.5, c: 98 },
      { o: 98, c: 99 }
    ],
    ...tail
  ],
  'T-gap-later': [
    ...pre,
    entry,
    up,
    [
      { o: 97, c: 98 },
      { o: 98, c: 101 }
    ],
    [
      { o: 100.5, c: 100 },
      { o: 100, c: 99.5 }
    ],
    [{ o: 103, c: 110 }],
    [
      { o: 110, c: 104 },
      { o: 104, c: 103 }
    ],
    ...tail
  ],
  'T-interest-lapse': [
    ...pre,
    entry,
    [
      { o: 90.5, c: 95 },
      { o: 95, c: 94 }
    ],
    ...Array.from({ length: 112 }, () => [{ o: 94, c: 94 }]),
    [
      { o: 94, c: 93 },
      { o: 93, c: 94 }
    ],
    ...Array.from({ length: 5 }, () => [{ o: 94, c: 94 }])
  ]
};

export const stagedFixtureDoor = (name: string): Door => {
  const spec = stagedScenarios[name];

  if (!spec) throw new Error(`unknown staged fixture ${name}`);

  const vgt = sessions(spec);
  const gdx = sessions(spec.map((s) => s.map(() => ({ o: 40, c: 40 }))));

  return fixtureDoorOf(`gpup8-staged-${name}`, { GDX: gdx, VGT: vgt });
};

// the fixed tasks of a staged fixture: every stage setting of the CPU tests, OFF, and stresses
export const stagedFixtureTasks = (
  name: string
): { key: string; quad: Quad; options: EvalOptions; staged?: StagedConfig }[] => {
  const g = grid();
  const quad = {
    d1: { GDX: g, VGT: g },
    g: { GDX: gdxPlaceholder(), VGT: gdxPlaceholder() },
    first: 'D1'
  } as unknown as Quad;
  const d1only: EvalOptions = { enabled: { 'G:GDX': false, 'G:VGT': false } };
  const st = (a: number, t2: number): StagedConfig => ({
    version: 1,
    books: { 'D1:VGT': { activationTenths: a, stage2Tenths: t2 } }
  });
  const out: { key: string; quad: Quad; options: EvalOptions; staged?: StagedConfig }[] = [];

  for (const [label, o] of [
    ['base', d1only],
    ['nextopen', { ...d1only, friction: { stopFill: 'next-open' as const } }],
    ['slip25', { ...d1only, friction: { stopSlippageBps: 25 } }],
    ['rate14', { ...d1only, friction: { rate: 0.14 } }]
  ] as const) {
    out.push({ key: `${name}:${label}:off`, quad, options: o });
    for (const [a, t2] of [
      [100, 20],
      [54, 15],
      [500, 45],
      [101, 44]
    ] as const)
      out.push({ key: `${name}:${label}:a${a}t${t2}`, quad, options: o, staged: st(a, t2) });
  }
  return out;
};
