// The multi-ETF D1 allocator program (research/multi-etf-allocator): the fixed settings of PROTOCOL.md, the
// regression references, the phenotype combinations, the result paths and the small helpers every command shares.
// Every constant the protocol names is declared here or in config/allocator/multi-etf-allocator.json, so the code and
// the protocol can be compared line by line.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';

export const symbols = ['VGT', 'XBI', 'XRT', 'KRE'] as const;
export type Sym = (typeof symbols)[number];
export const coreEtfs = ['VOOG', 'VGT'] as const;
export type CoreEtf = (typeof coreEtfs)[number];
// Every security the portfolio can hold.
export const securities = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] as const;
export type Security = (typeof securities)[number];

export const researchRoot = 'research/multi-etf-allocator';
export const resultsRoot = path.join(researchRoot, 'results');
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = path.join(resultsRoot, 'protocol_freeze.json');
export const configFile = 'config/allocator/multi-etf-allocator.json';
export const manifestFile = 'research/multi-etf-d1/FROZEN_CANDIDATES.json';
export const d1Source = 'src/app/allIn-trailingBuy-postExitContinuation.ts';
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);

export const files = {
  minute: (symbol: string) => `data/${symbol}/${symbol}-2016-2025-1-minute.csv`,
  distributions: 'research/risk-management/vgt-portfolio-margin/data/distributions.csv',
  // Audited for existence and coverage only (PROTOCOL.md §1): no strategy is evaluated on them.
  laterDaily: ['data/VGT/VGT-2026.csv', 'data/VGT/VGT-2016-2026.csv', 'data/VOOG/VOOG-2016-2026.csv']
} as const;

export const expectedHashes: Record<Security | 'distributions' | 'd1Source', string> = {
  VGT: '600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f',
  XBI: 'ad5521e33b53fa1590c07de5a4f5f6ca6738b06aae8bcb6224606901a5a56f7b',
  XRT: 'c7c591557cc58576eb16da29ef5278643da0b0c23c183fe24cfb1c8f4bf79dc8',
  KRE: '5f8b2a284a862fdc15c1ba82649fbb749ce3dbbd66046c0f4c4c0f3f4c9e7e0b',
  VOOG: 'f4ad4d72f39b157fce64e023f644c4648db840be39ce6979ff42a5818d278cc2',
  distributions: '30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923',
  d1Source: 'a520cfcfd52782498da861c33d01d17b36865a83be945278629b83d9302a63ef'
};

export const manifestBodyHash = 'd3645e1e8b8dafbdbf5ca6b7ef3b78745a3389b7730b19f68df0647377f4ca7e';

export const protocol = {
  version: 'multi-etf-allocator-protocol-v1',
  start: '2016-01-04',
  eligibilityDate: '2017-06-15',
  commonEnd: '2025-10-13',
  sectorReferenceEnd: '2025-10-16',
  fixedPrincipal: 100000,
  splitPrincipal: 50000,
  rate: 0.11,
  notional: 100000, // the virtual book's position size; D1's decisions do not depend on it
  initial: { voog: 180000, vgt: 120000 },
  fraction: 0.2,
  regT: 0.5,
  minimumEquity: 2000,
  maintenanceCeiling: 0.6,
  baseRequirement: 0.35,
  liquidationBuffer: 0.05,
  warningRatio: 1.25,
  criticalRatio: 1.1
} as const;

// Fixed-$100,000 standalone references (PROTOCOL.md §11.1), each from its research artifact.
export interface Reference {
  symbol: Sym;
  phenotype: 'primary' | 'lowDd';
  end: string;
  net: number;
  minuteDrawdown: number;
  dailyDrawdown?: number;
  entries: number;
  source: string;
}

export const references: Reference[] = [
  {
    symbol: 'VGT',
    phenotype: 'primary',
    end: '2025-10-13',
    net: 183043.82,
    minuteDrawdown: 19330.69,
    entries: 20,
    source: 'research/vgt-d1-refinement/results/baseline/baseline.json (label D1)'
  },
  {
    symbol: 'XBI',
    phenotype: 'primary',
    end: '2025-10-16',
    net: 206045.81,
    minuteDrawdown: 27885.29,
    dailyDrawdown: 25741.5,
    entries: 25,
    source: 'research/multi-etf-d1/results/holdout/XBI/primary/summary.json'
  },
  {
    symbol: 'XBI',
    phenotype: 'lowDd',
    end: '2025-10-16',
    net: 118055.36,
    minuteDrawdown: 12836.6,
    dailyDrawdown: 10948.05,
    entries: 29,
    source: 'research/multi-etf-d1/results/holdout/XBI/alternate-lowDd/summary.json'
  },
  {
    symbol: 'XRT',
    phenotype: 'primary',
    end: '2025-10-16',
    net: 165729.49,
    minuteDrawdown: 23383.16,
    dailyDrawdown: 20450.72,
    entries: 26,
    source: 'research/multi-etf-d1/results/holdout/XRT/primary/summary.json'
  },
  {
    symbol: 'XRT',
    phenotype: 'lowDd',
    end: '2025-10-16',
    net: 148435.71,
    minuteDrawdown: 19965.68,
    dailyDrawdown: 17944.82,
    entries: 19,
    source: 'research/multi-etf-d1/results/holdout/XRT/alternate-lowDd/summary.json'
  },
  {
    symbol: 'KRE',
    phenotype: 'primary',
    end: '2025-10-16',
    net: 195047.71,
    minuteDrawdown: 26271.47,
    dailyDrawdown: 25332.69,
    entries: 75,
    source: 'research/multi-etf-d1/results/holdout/KRE/primary/summary.json'
  },
  {
    symbol: 'KRE',
    phenotype: 'lowDd',
    end: '2025-10-16',
    net: 174147.76,
    minuteDrawdown: 22724.74,
    dailyDrawdown: 20903.17,
    entries: 77,
    source: 'research/multi-etf-d1/results/holdout/KRE/alternate-lowDd/summary.json'
  }
];

// The research directory of a phenotype's reference run.
export const referenceDir = (symbol: Sym, phenotype: 'primary' | 'lowDd') =>
  symbol === 'VGT'
    ? 'research/vgt-d1-refinement/results/baseline'
    : `research/multi-etf-d1/results/holdout/${symbol}/${phenotype === 'primary' ? 'primary' : 'alternate-lowDd'}`;

// ----- phenotype combinations (PROTOCOL.md §5) -----

export type PhenotypeName = 'primary' | 'lowDd';
export type Combination = Record<Sym, PhenotypeName>;

export const combinationKey = (combination: Combination) =>
  `xbi${combination.XBI === 'primary' ? 'P' : 'L'}-xrt${combination.XRT === 'primary' ? 'P' : 'L'}-kre${combination.KRE === 'primary' ? 'P' : 'L'}`;

export const combinations: Combination[] = (['primary', 'lowDd'] as const).flatMap((xbi) =>
  (['primary', 'lowDd'] as const).flatMap((xrt) =>
    (['primary', 'lowDd'] as const).map((kre): Combination => ({ VGT: 'primary', XBI: xbi, XRT: xrt, KRE: kre }))
  )
);

export const combinationAliases: Record<string, string> = {
  'all-primary': 'xbiP-xrtP-kreP',
  'all-lowDd': 'xbiL-xrtL-kreL'
};

export const combinationOf = (key: string): Combination => {
  const resolved = combinationAliases[key] ?? key;
  const found = combinations.find((combination) => combinationKey(combination) === resolved);

  if (!found) {
    throw new Error(
      `Unknown configuration ${key}; use all-primary, all-lowDd or one of ${combinations.map(combinationKey).join(', ')}`
    );
  }

  return found;
};

export const combinationLabel = (key: string) =>
  Object.entries(combinationAliases).find(([, value]) => value === key)?.[0] ?? key;

// ----- policies (PROTOCOL.md §4) -----

export type Policy = 'shadow' | 'priority' | 'split' | 'cancel' | 'hold';
export const policies: Policy[] = ['shadow', 'priority', 'split', 'cancel', 'hold'];
export type Semantics = 'shadow' | 'cancel' | 'hold';

export const policySemantics: Record<Policy, Semantics> = {
  shadow: 'shadow',
  priority: 'shadow',
  split: 'shadow',
  cancel: 'cancel',
  hold: 'hold'
};

export const tieOrders: Record<'alphabetical' | 'priority', Sym[]> = {
  alphabetical: ['KRE', 'VGT', 'XBI', 'XRT'],
  priority: ['VGT', 'XBI', 'XRT', 'KRE']
};

export const tieOrderOf = (policy: Policy) => (policy === 'priority' ? tieOrders.priority : tieOrders.alphabetical);

export const policyLabels: Record<Policy, string> = {
  shadow: 'shadow / first executable signal wins (primary)',
  priority: 'fixed symbol priority VGT > XBI > XRT > KRE on same-minute ties',
  split: 'dedicated split, two slots of 50%',
  cancel: 'first signal wins, refused setups cancelled (control)',
  hold: 'first signal wins, refused setups held (diagnostic only)'
};

// ----- helpers -----

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const hasFlag = (args: string[], name: string) => args.includes(`--${name}`);

export const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const sha256File = async (file: string) => sha256(await fs.readFile(file));

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, null, 1)}\n`);

export const writeText = async (file: string, text: string) =>
  fs.outputFile(file, text.endsWith('\n') ? text : `${text}\n`);

export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;

export const formatDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const formatCents = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';

export const formatSigned = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const pct = (fraction: number, digits = 1) =>
  Number.isFinite(fraction) ? `${(fraction * 100).toFixed(digits)}%` : 'n/a';

export const formatDate = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString().slice(0, 10) : '';

export const formatTime = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : '';

export const log = (line: string) => console.info(`[multi-etf-allocator] ${line}`);
