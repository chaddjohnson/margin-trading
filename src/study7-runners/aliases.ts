// The alias registry of the Study 7 local runners: friendly names for EXISTING strategies only. A Study 7 alias is
// resolved from its rank in the sealed research/study7-stability-first-d1/FROZEN_SELECTION.json (never from a typed
// vector); a frozen alias names an existing configuration whose books equal the frozen registry phenotypes. Nothing
// here is optimized, re-tuned or approximated.
export const runnerPoolsRoot = 'config/research-pools/study7-local-runners';

// A user error (unknown alias, bad option): the CLI exits with status 2.
export class UsageError extends Error {}

export type AliasSource =
  | { kind: 'study7-rank'; rank: number; track: 'VG' | 'VXR' | 'G'; role: 'profit' | 'robust' | 'balanced' }
  | { kind: 'pool'; id: string; root: string } // the stock pools loader (config/pools or the runner root)
  | { kind: 'study5-research'; id: string }; // Study 5's research-pool loader (config/research-pools/study5-…)

export interface AliasSpec {
  alias: string;
  title: string;
  status: 'frozen' | 'research';
  source: AliasSource;
  sealedControl?: string; // the key of this configuration among final.json's controls (frozen aliases)
  expectedFrozen?: 'B1' | 'VG' | 'B5' | 'G-PA' | 'G-NM1'; // grids checked against Study 7's frozen constants
  optional?: boolean;
  note: string;
}

export const aliases: AliasSpec[] = [
  {
    alias: 'vg-profit',
    title: 'Study 7 rank #1 — VGT+GDX, profit role (fold L, jointly optimized)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 1, track: 'VG', role: 'profit' },
    note: 'Class L research nomination: in-sample selection on 2017–2023, block-only check on the exposed 2024–2026 window'
  },
  {
    alias: 'vg-robust',
    title: 'Study 7 rank #2 — VGT+GDX, robust role (fold L, jointly optimized)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 2, track: 'VG', role: 'robust' },
    note: 'Class L research nomination'
  },
  {
    alias: 'vg-balanced',
    title: 'Study 7 rank #5 — VGT+GDX, balanced role (fold L, jointly optimized)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 5, track: 'VG', role: 'balanced' },
    note: 'Class L research nomination'
  },
  {
    alias: 'vxr-profit',
    title: 'Study 7 rank #6 — VGT+XBI+XRT, profit role (fold L, jointly optimized)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 6, track: 'VXR', role: 'profit' },
    note: 'Class L research nomination'
  },
  {
    alias: 'vgt-primary',
    title: 'B1 — registered VGT primary alone (frozen)',
    status: 'frozen',
    source: { kind: 'pool', id: 'S7R-B1', root: runnerPoolsRoot },
    sealedControl: 'B1',
    expectedFrozen: 'B1',
    note: 'frozen control; selected by the VGT programs with 2016–2025 data (in-sample there)'
  },
  {
    alias: 'gdx-profit',
    title: 'Study 7 rank #7 — GDX standalone, profit role (fold L)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 7, track: 'G', role: 'profit' },
    note: 'Class L research nomination; one of the three NEW Study 7 GDX standalone vectors (not the B5 GDX book)'
  },
  {
    alias: 'gdx-balanced',
    title: 'Study 7 rank #10 — GDX standalone, balanced role (fold L)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 10, track: 'G', role: 'balanced' },
    note: 'Class L research nomination; NEW Study 7 GDX standalone vector (not the B5 GDX book)'
  },
  {
    alias: 'gdx-robust',
    title: 'Study 7 rank #11 — GDX standalone, robust role (fold L)',
    status: 'research',
    source: { kind: 'study7-rank', rank: 11, track: 'G', role: 'robust' },
    note: 'Class L research nomination; NEW Study 7 GDX standalone vector (not the B5 GDX book)'
  },
  {
    alias: 'vg-frozen',
    title: "VG frozen — B5's unchanged VGT primary + GDX portfolioAware books",
    status: 'frozen',
    source: { kind: 'pool', id: 'S7R-VG-frozen', root: runnerPoolsRoot },
    sealedControl: 'VG',
    expectedFrozen: 'VG',
    note: 'frozen subset control (Study 7 Phase A "VG"); no retuning'
  },
  {
    alias: 'gdx-portfolio-aware',
    title: 'GDX portfolioAware alone — the registered B5 GDX phenotype run standalone (frozen)',
    status: 'frozen',
    source: { kind: 'study5-research', id: 'S5-GDX-portfolioAware' },
    sealedControl: 'G-PA',
    expectedFrozen: 'G-PA',
    note: 'the EXISTING B5 GDX book (selected for the B5 pool, 2017–2023), not a Study 7 GDX standalone role holder'
  },
  {
    alias: 'b5-frozen',
    title: 'B5 — the unchanged five-book benchmark (config/pools/B5.json)',
    status: 'frozen',
    source: { kind: 'pool', id: 'B5', root: 'config/pools' },
    sealedControl: 'B5',
    expectedFrozen: 'B5',
    note: 'frozen benchmark'
  },
  {
    alias: 'gdx-study5-nearmiss1',
    title: 'Study 5 GDX standalone near-miss 1 (d1-ac0aaa704c) — RESEARCH ONLY, never nominated',
    status: 'research',
    source: { kind: 'study5-research', id: 'S5-GDX-NearMiss1' },
    sealedControl: 'G-NM1',
    expectedFrozen: 'G-NM1',
    optional: true,
    note: "failed Study 5 gate G2 and Study 7's neighbourhood gate (0–60% of neighbours below $35k); research only"
  }
];

export const aliasNames = aliases.map((spec) => spec.alias);

export const specOf = (alias: string) => {
  const spec = aliases.find((item) => item.alias === alias);

  if (!spec) {
    throw new UsageError(
      `unknown strategy alias "${alias}"; known: ${aliasNames.join(', ')} (see \`npm run study7-run -- list\`)`
    );
  }

  return spec;
};
