// staged-stop@1 — the S1 two-stage, profit-activated trailing stop (research/vg-l0-staged-stop/RULE_SPECIFICATION.md):
// configuration, validation, canonical form, identity, evaluation-key suffixes and the search space's repair. One unit
// for every book: integer tenths of a percentage point (A = activationTenths / 1000 of gross price appreciation over the
// raw entry fill; τ₂ = stage2Tenths / 1000 of the post-entry high). A book that is absent is OFF; a configuration with
// no book is OFF (canonical null) and leaves every existing identity, key and record unchanged, byte for byte.
//
// Validity (integer arithmetic only; c = 5 bps per side = 1/2000, the study's base entry cost):
//   V1  50 ≤ a ≤ 500, 15 ≤ t2 ≤ 145 (integers)
//   V2  t2 ≤ t1 − 5                                   τ₂ ≤ τ₁ − 0.5 point (strictly tighter)
//   V3  (2a − 1)(1000 − t1) ≥ 2000 · t1               A ≥ τ₁ ÷ (1 − τ₁) + c (decision D7: no early lock; equality valid)
//   V4  (1000 + a)(1000 − t2) > 1,000,500             (1 + A)(1 − τ₂) > 1 + c (implied by V2 ∧ V3; checked anyway)
//   V5  books ⊆ {D1:GDX, D1:VGT, G:VGT}; no unknown key; version 1
// The engine refuses a violation; only the search space's constructor repairs (repairBook).
import { createHash } from 'node:crypto';

export const STAGED_VERSION = 1 as const;
export const stagedBooks = ['D1:GDX', 'D1:VGT', 'G:VGT'] as const;
export type StagedBook = (typeof stagedBooks)[number];

export interface StagedBookConfig {
  activationTenths: number;
  stage2Tenths: number;
}

export interface StagedConfig {
  version: typeof STAGED_VERSION;
  books: Partial<Record<StagedBook, StagedBookConfig>>;
}

export const stagedLimits = {
  activation: { min: 50, max: 500 },
  stage2: { min: 15, max: 145 },
  tighterBy: 5 // tenths: τ₂ ≤ τ₁ − 0.5 point
} as const;

export class StagedConfigError extends Error {
  constructor(readonly errors: string[]) {
    super(`invalid staged-stop configuration: ${errors.join('; ')}`);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export const v2ok = (t2: number, t1: number) => t2 <= t1 - stagedLimits.tighterBy;
export const v3ok = (a: number, t1: number) => (2 * a - 1) * (1000 - t1) >= 2000 * t1;
export const v4ok = (a: number, t2: number) => (1000 + a) * (1000 - t2) > 1_000_500;

// The least activation (tenths) that satisfies V3 for a stage-1 distance t1 (never below the box minimum).
export const aMinOf = (t1: number) => {
  if (!isInt(t1) || t1 < 1 || t1 >= 1000) throw new Error(`stage-1 distance ${t1} tenths is not a valid integer`);

  let a: number = stagedLimits.activation.min;

  while (!v3ok(a, t1)) a++;
  return a;
};

// τ₁ in tenths: D1's grid value is already an integer; Growth's percent (0.5 / 0.1 grids) must be an exact tenth.
export const tau1TenthsOfD1 = (trailingStopPercentage: number) => {
  if (!isInt(trailingStopPercentage))
    throw new Error(`D1 trailing stop ${trailingStopPercentage} is not integer tenths`);
  return trailingStopPercentage;
};
export const tau1TenthsOfGrowth = (trailingStopPercent: number) => {
  const t = Math.round(10 * trailingStopPercent);

  if (!(Math.abs(10 * trailingStopPercent - t) <= 1e-9))
    throw new Error(`Growth trailing stop ${trailingStopPercent}% is not a whole number of tenths`);
  return t;
};

// τ₁ in tenths from an engine fraction (the exit params' trailingStopPercentage, e.g. 0.057): an exact tenth required.
export const tau1TenthsOfFraction = (fraction: number) => {
  const t = Math.round(1000 * fraction);

  if (!(Math.abs(1000 * fraction - t) <= 1e-6))
    throw new Error(`trailing stop fraction ${fraction} is not a whole number of tenths`);
  return t;
};

// One book's errors against its stage-1 distance t1 (tenths).
export const bookErrors = (book: string, c: unknown, t1: number): string[] => {
  const at = `staged.books["${book}"]`;

  if (!isObject(c)) return [`${at} must be an object`];

  const errors: string[] = [];

  for (const k of Object.keys(c))
    if (k !== 'activationTenths' && k !== 'stage2Tenths') errors.push(`${at}: unknown key "${k}"`);

  const a = c.activationTenths;
  const t2 = c.stage2Tenths;

  if (!isInt(a) || a < stagedLimits.activation.min || a > stagedLimits.activation.max)
    errors.push(`${at}.activationTenths must be an integer in [50, 500] (got ${JSON.stringify(a)})`);
  if (!isInt(t2) || t2 < stagedLimits.stage2.min || t2 > stagedLimits.stage2.max)
    errors.push(`${at}.stage2Tenths must be an integer in [15, 145] (got ${JSON.stringify(t2)})`);
  if (errors.length) return errors;
  if (!v2ok(t2 as number, t1))
    errors.push(`${at}: stage2Tenths ${t2} must be ≤ τ₁ − 5 = ${t1 - 5} (strictly tighter by 0.5 point)`);
  if (!v3ok(a as number, t1))
    errors.push(
      `${at}: activationTenths ${a} is below the no-early-lock minimum ${aMinOf(t1)} for τ₁ = ${t1} tenths (D7)`
    );
  if (!v4ok(a as number, t2 as number)) errors.push(`${at}: (1 + A)(1 − τ₂) must exceed 1 + c`);
  return errors;
};

// The whole configuration's errors; tau1 gives each enabled book's stage-1 distance in tenths.
export const stagedErrors = (cfg: unknown, tau1: Partial<Record<StagedBook, number>>): string[] => {
  if (cfg === null || cfg === undefined) return [];
  if (!isObject(cfg)) return ['the staged-stop configuration must be an object'];

  const errors: string[] = [];

  for (const k of Object.keys(cfg)) if (k !== 'version' && k !== 'books') errors.push(`staged: unknown key "${k}"`);
  if (cfg.version !== STAGED_VERSION)
    errors.push(`staged.version must be ${STAGED_VERSION} (got ${JSON.stringify(cfg.version)})`);
  if (!isObject(cfg.books)) return [...errors, 'staged.books must be an object'];
  for (const [book, c] of Object.entries(cfg.books)) {
    if (!(stagedBooks as readonly string[]).includes(book)) {
      errors.push(
        `staged.books["${book}"]: only D1:GDX, D1:VGT and G:VGT carry a staged stop (Growth·GDX is out of scope)`
      );
      continue;
    }
    const t1 = tau1[book as StagedBook];

    if (t1 === undefined) {
      errors.push(`staged.books["${book}"]: the book's stage-1 distance is unknown (book disabled?)`);
      continue;
    }
    errors.push(...bookErrors(book, c, t1));
  }
  return errors;
};

// Canonical form: books in the fixed order, keys in the fixed order; no book → null (OFF).
export const canonicalStaged = (cfg: StagedConfig | null | undefined): StagedConfig | null => {
  if (!cfg) return null;

  const books: StagedConfig['books'] = {};

  for (const b of stagedBooks) {
    const c = cfg.books?.[b];

    if (c) books[b] = { activationTenths: c.activationTenths, stage2Tenths: c.stage2Tenths };
  }
  return Object.keys(books).length ? { version: STAGED_VERSION, books } : null;
};

export const isStagedOn = (cfg: StagedConfig | null | undefined) => canonicalStaged(cfg) !== null;
export const stagedJson = (cfg: StagedConfig | null | undefined) => JSON.stringify(canonicalStaged(cfg));

// The identity of a configuration with its staged stop: OFF = the base identity, unchanged; ON = "st1-" + 16 hex.
export const stagedId = (baseId: string, cfg: StagedConfig | null | undefined) => {
  const c = canonicalStaged(cfg);

  return c
    ? `st${STAGED_VERSION}-${createHash('sha256')
        .update(`st${STAGED_VERSION}#${JSON.stringify(c)}#${baseId}`)
        .digest('hex')
        .slice(0, 16)}`
    : baseId;
};

// The evaluation-key suffix (OFF: empty, so the existing key is unchanged).
export const stagedKeySuffix = (cfg: StagedConfig | null | undefined) => {
  const c = canonicalStaged(cfg);

  return c ? `|st${STAGED_VERSION}:${JSON.stringify(c)}` : '';
};

// A single book's cache-key suffix (D1 and Growth book caches).
export const bookKeySuffix = (c: StagedBookConfig | null | undefined) =>
  c
    ? `|st${STAGED_VERSION}:${JSON.stringify({ activationTenths: c.activationTenths, stage2Tenths: c.stage2Tenths })}`
    : '';

// The search space's deterministic repair (never the engine's): τ₂ ≤ τ₁ − 5, then A ≥ aMin(τ₁); both in the box.
export const repairBook = (c: StagedBookConfig, t1: number): { value: StagedBookConfig; repaired: boolean } => {
  const clampA = (a: number) => Math.min(stagedLimits.activation.max, Math.max(stagedLimits.activation.min, a));
  const clampT = (t: number) => Math.min(stagedLimits.stage2.max, Math.max(stagedLimits.stage2.min, t));
  const t2 = clampT(Math.min(c.stage2Tenths, t1 - stagedLimits.tighterBy));
  const a = clampA(Math.max(c.activationTenths, aMinOf(t1)));
  const value = { activationTenths: a, stage2Tenths: t2 };
  const errors = bookErrors('repair', value, t1);

  if (errors.length) throw new Error(`staged repair failed for τ₁ = ${t1}: ${errors.join('; ')}`);
  return { value, repaired: a !== c.activationTenths || t2 !== c.stage2Tenths };
};

export const validateStaged = (cfg: unknown, tau1: Partial<Record<StagedBook, number>>): StagedConfig | null => {
  const errors = stagedErrors(cfg, tau1);

  if (errors.length) throw new StagedConfigError(errors);
  return canonicalStaged(cfg as StagedConfig | null | undefined);
};
