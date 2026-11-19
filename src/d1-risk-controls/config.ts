// The D1 risk-control configuration (research/vg-l0-risk-controls-foundation/SPECIFICATION.md §3): three optional
// controls per D1 book (an unconditional protective loss stop, a maximum-hold policy, a prolonged-decline entry gate),
// independently configurable on D1·GDX and D1·VGT. Absent = legacy. Growth books never carry controls.
//
// Units follow Priority 3's D1 grid: percentages in integer tenths of a percentage point (80 = 8.0%), hold lengths in
// calendar days, the gate's cooldown in trading sessions (the unit of D1's other entry parameters L and W).
//
// Identity: a configuration whose books are all default canonicalizes to legacy and keeps the frozen identity and
// evaluation key unchanged (Priority 3's quadId / evalKey). A non-legacy configuration gets a versioned identity
// ("rc1-…") over the canonical controls and the quad with its inactive D1 genes masked.
import { createHash } from 'node:crypto';
import type { BookId, D1Grid } from '../vg-d1-growth-joint/books.ts';
import { type EvalOptions, evalKey } from '../vg-d1-growth-joint/evaluate.ts';
import { type Quad, quadCanonical, quadId } from '../vg-d1-growth-joint/space.ts';

export const RC_VERSION = 1 as const;
export const d1Books = ['D1:GDX', 'D1:VGT'] as const satisfies readonly BookId[];
export type D1Book = (typeof d1Books)[number];
export const symOf = (b: D1Book) => (b === 'D1:GDX' ? 'GDX' : 'VGT') as 'GDX' | 'VGT';

export type ProtectiveStop = { mode: 'off' } | { mode: 'on'; stopDistanceTenths: number };
export type HoldPolicy =
  | { mode: 'legacy' }
  | { mode: 'disabled' }
  | { mode: 'adaptive'; extendedHoldDays: number; progressTenths: number };
export type DeclineGate =
  | { mode: 'off' }
  | { mode: 'on'; losses: number; recoveryTenths: number; maxBlockSessions: number };

export interface D1RiskControls {
  protectiveStop?: ProtectiveStop;
  hold?: HoldPolicy;
  declineGate?: DeclineGate;
}

export interface RiskConfig {
  version: typeof RC_VERSION;
  books: Partial<Record<D1Book, D1RiskControls>>;
}

// Engineering validity (a value outside is meaningless or unbounded), not research boxes (SPECIFICATION.md §3).
export const limits = {
  stopDistanceTenths: { min: 1, max: 999 },
  extendedHoldDays: { min: 1, max: 365 },
  progressTenths: { min: 1, max: 999 },
  losses: { min: 1, max: 20 },
  recoveryTenths: { min: 1, max: 1000 },
  maxBlockSessions: { min: 1, max: 1000 }
} as const;

export class RiskConfigError extends Error {
  constructor(readonly errors: string[]) {
    super(`invalid D1 risk-control configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const keysOnly = (where: string, v: Record<string, unknown>, allowed: readonly string[], errors: string[]) => {
  for (const k of Object.keys(v)) if (!allowed.includes(k)) errors.push(`${where}: unknown key "${k}"`);
};

const integerIn = (where: string, v: unknown, key: keyof typeof limits, errors: string[]) => {
  const { min, max } = limits[key];

  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
    errors.push(`${where}.${key} must be an integer in ${min}…${max} (got ${JSON.stringify(v)})`);
};

// One book's controls: shape, units and the stop requirement of the disabled hold (the grid-dependent check of
// extendedHoldDays is validateAgainstGrids).
export const controlErrors = (book: string, c: unknown): string[] => {
  const errors: string[] = [];
  const at = `books["${book}"]`;

  if (!isObject(c)) return [`${at} must be an object`];
  keysOnly(at, c, ['protectiveStop', 'hold', 'declineGate'], errors);

  const ps = c.protectiveStop;

  if (ps !== undefined) {
    if (!isObject(ps)) errors.push(`${at}.protectiveStop must be an object`);
    else if (ps.mode === 'off') keysOnly(`${at}.protectiveStop`, ps, ['mode'], errors);
    else if (ps.mode === 'on') {
      keysOnly(`${at}.protectiveStop`, ps, ['mode', 'stopDistanceTenths'], errors);
      integerIn(`${at}.protectiveStop`, ps.stopDistanceTenths, 'stopDistanceTenths', errors);
    } else errors.push(`${at}.protectiveStop.mode must be "off" or "on"`);
  }

  const h = c.hold;

  if (h !== undefined) {
    if (!isObject(h)) errors.push(`${at}.hold must be an object`);
    else if (h.mode === 'legacy' || h.mode === 'disabled') keysOnly(`${at}.hold`, h, ['mode'], errors);
    else if (h.mode === 'adaptive') {
      keysOnly(`${at}.hold`, h, ['mode', 'extendedHoldDays', 'progressTenths'], errors);
      integerIn(`${at}.hold`, h.extendedHoldDays, 'extendedHoldDays', errors);
      integerIn(`${at}.hold`, h.progressTenths, 'progressTenths', errors);
    } else errors.push(`${at}.hold.mode must be "legacy", "disabled" or "adaptive"`);
  }

  const g = c.declineGate;

  if (g !== undefined) {
    if (!isObject(g)) errors.push(`${at}.declineGate must be an object`);
    else if (g.mode === 'off') keysOnly(`${at}.declineGate`, g, ['mode'], errors);
    else if (g.mode === 'on') {
      keysOnly(`${at}.declineGate`, g, ['mode', 'losses', 'recoveryTenths', 'maxBlockSessions'], errors);
      integerIn(`${at}.declineGate`, g.losses, 'losses', errors);
      integerIn(`${at}.declineGate`, g.recoveryTenths, 'recoveryTenths', errors);
      integerIn(`${at}.declineGate`, g.maxBlockSessions, 'maxBlockSessions', errors);
    } else errors.push(`${at}.declineGate.mode must be "off" or "on"`);
  }

  // SPECIFICATION.md §3, §5: an unlimited hold needs the unconditional protective stop
  if (isObject(h) && h.mode === 'disabled' && !(isObject(ps) && ps.mode === 'on'))
    errors.push(`${at}: hold "disabled" requires protectiveStop "on" (an unlimited hold without a loss stop is refused)`);

  return errors;
};

export const configErrors = (cfg: unknown): string[] => {
  if (!isObject(cfg)) return ['the configuration must be an object'];

  const errors: string[] = [];

  keysOnly('config', cfg, ['version', 'books'], errors);
  if (cfg.version !== RC_VERSION) errors.push(`version must be ${RC_VERSION} (got ${JSON.stringify(cfg.version)})`);
  if (!isObject(cfg.books)) errors.push('books must be an object');
  else
    for (const [book, c] of Object.entries(cfg.books)) {
      if (!(d1Books as readonly string[]).includes(book))
        errors.push(`books["${book}"]: only D1:GDX and D1:VGT carry controls (Growth books are unchanged)`);
      else errors.push(...controlErrors(book, c));
    }

  return errors;
};

export const validateRiskConfig = (cfg: unknown): RiskConfig => {
  const errors = configErrors(cfg);

  if (errors.length) throw new RiskConfigError(errors);
  return cfg as RiskConfig;
};

// The grid-dependent rule: an adaptive hold's extended bound exceeds the book's base hold (maximumHoldDays).
export const validateAgainstGrids = (cfg: RiskConfig | null | undefined, d1: Record<'GDX' | 'VGT', D1Grid>) => {
  if (!cfg) return;

  const errors = configErrors(cfg);

  for (const b of d1Books) {
    const h = cfg.books[b]?.hold;

    if (h?.mode === 'adaptive' && !(h.extendedHoldDays > d1[symOf(b)].maximumHoldDays))
      errors.push(
        `books["${b}"].hold.extendedHoldDays ${h.extendedHoldDays} must exceed the book's maximumHoldDays ` +
          `${d1[symOf(b)].maximumHoldDays}`
      );
  }
  if (errors.length) throw new RiskConfigError(errors);
};

// ----- canonical form, identity, serialization -----

// One book's non-default controls in a fixed key order, or null when every control is at its default.
export const canonicalControls = (c: D1RiskControls | undefined): D1RiskControls | null => {
  if (!c) return null;

  const out: D1RiskControls = {};
  const ps = c.protectiveStop;
  const h = c.hold;
  const g = c.declineGate;

  if (ps?.mode === 'on') out.protectiveStop = { mode: 'on', stopDistanceTenths: ps.stopDistanceTenths };
  if (h?.mode === 'disabled') out.hold = { mode: 'disabled' };
  else if (h?.mode === 'adaptive')
    out.hold = { mode: 'adaptive', extendedHoldDays: h.extendedHoldDays, progressTenths: h.progressTenths };
  if (g?.mode === 'on')
    out.declineGate = {
      mode: 'on',
      losses: g.losses,
      recoveryTenths: g.recoveryTenths,
      maxBlockSessions: g.maxBlockSessions
    };

  return Object.keys(out).length ? out : null;
};

// The whole configuration's canonical form; null = legacy (no book carries a non-default control).
export const canonicalConfig = (cfg: RiskConfig | null | undefined): RiskConfig | null => {
  if (!cfg) return null;

  const books: RiskConfig['books'] = {};

  for (const b of d1Books) {
    const c = canonicalControls(cfg.books[b]);

    if (c) books[b] = c;
  }

  return Object.keys(books).length ? { version: RC_VERSION, books } : null;
};

export const isLegacy = (cfg: RiskConfig | null | undefined) => canonicalConfig(cfg) === null;
export const canonicalJson = (cfg: RiskConfig | null | undefined) => JSON.stringify(canonicalConfig(cfg));

// The quad with the genes a control makes inactive masked (NaN): under a disabled hold, the book's maximumHoldDays and
// intradayLossBuffer (the buffer only applies from the hold age) never act.
export const maskInactive = (q: Quad, cfg: RiskConfig | null | undefined): Quad => {
  const c = canonicalConfig(cfg);
  const d1 = { GDX: { ...q.d1.GDX }, VGT: { ...q.d1.VGT } };

  for (const b of d1Books)
    if (c?.books[b]?.hold?.mode === 'disabled') {
      d1[symOf(b)].maximumHoldDays = NaN;
      d1[symOf(b)].intradayLossBuffer = NaN;
    }

  return { d1, g: q.g, first: q.first };
};

// Legacy → Priority 3's quadId unchanged; otherwise "rc1-" + 16 hex.
export const riskId = (q: Quad, cfg: RiskConfig | null | undefined) =>
  isLegacy(cfg)
    ? quadId(q)
    : `rc${RC_VERSION}-${createHash('sha256')
        .update(`rc${RC_VERSION}#${canonicalJson(cfg)}#${quadCanonical(maskInactive(q, cfg))}`)
        .digest('hex')
        .slice(0, 16)}`;

// Legacy → Priority 3's evaluation key unchanged; otherwise that key (masked quad) + "|rc1:" + the canonical controls.
export const riskEvalKey = (door: string, q: Quad, o: EvalOptions, cfg: RiskConfig | null | undefined) =>
  isLegacy(cfg)
    ? evalKey(door, q, o)
    : `${evalKey(door, maskInactive(q, cfg), o)}|rc${RC_VERSION}:${canonicalJson(cfg)}`;

// Serialized in canonical form (defaults dropped); "null" is the legacy configuration.
export const serializeRiskConfig = (cfg: RiskConfig | null | undefined) => canonicalJson(cfg);

// Accepts a JSON string or an object; absent/null = legacy. Validates (unknown keys and invalid values are refused).
export const parseRiskConfig = (input: string | unknown): RiskConfig | null => {
  const value = typeof input === 'string' ? (JSON.parse(input) as unknown) : input;

  if (value === undefined || value === null) return null;
  return canonicalConfig(validateRiskConfig(value));
};

// ----- the resolved form the engine reads -----

export interface Resolved {
  stopDistanceTenths: number | null;
  hold: HoldPolicy;
  gate: { losses: number; recoveryTenths: number; maxBlockSessions: number } | null;
}

export const resolve = (c: D1RiskControls | undefined): Resolved => {
  const k = canonicalControls(c);
  const ps = k?.protectiveStop;
  const g = k?.declineGate;

  return {
    stopDistanceTenths: ps?.mode === 'on' ? ps.stopDistanceTenths : null,
    hold: k?.hold ?? { mode: 'legacy' },
    gate: g?.mode === 'on' ? { losses: g.losses, recoveryTenths: g.recoveryTenths, maxBlockSessions: g.maxBlockSessions } : null
  };
};
