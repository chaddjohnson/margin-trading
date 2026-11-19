// RC 2 of the D1 risk controls (research/vg-l0-risk-families/SPECIFICATION_RC2.md): RC 1 (src/d1-risk-controls/,
// unchanged and still authoritative for every RC 1 configuration) plus ONE new, optional property of the unconditional
// protective stop — its ACTIVATION:
//   'next-session' (the default; RC 1's behaviour: the stop acts only for a position open at a session's start);
//   'entry-day'    (after the entry has actually filled, the stop may also trigger later in the fill's own session, from
//                   price observations demonstrably after the fill).
// The property exists only on a book whose protective stop is ON (it is refused on a stop that is OFF, and in a
// version-1 configuration). Nothing else changes: the trailing stop, the holds, the loss buffer and the decline gate
// never act on the entry session in either mode.
//
// Identity and compatibility: a configuration whose books all use next-session activation IS an RC 1 configuration —
// canonical form version 1, RC 1's identity ("rc1-…" or the frozen Priority 3 identity when legacy) and RC 1's
// evaluation key, byte for byte. Only a configuration with at least one entry-day book has canonical version 2, an
// "rc2-…" identity and an evaluation key ending in "|rc2:<canonical JSON>".
import { createHash } from 'node:crypto';
import type { D1Grid } from '../vg-d1-growth-joint/books.ts';
import { type EvalOptions, evalKey } from '../vg-d1-growth-joint/evaluate.ts';
import { type Quad, quadCanonical } from '../vg-d1-growth-joint/space.ts';
import {
  type D1Book,
  type D1RiskControls,
  type DeclineGate,
  type HoldPolicy,
  type Resolved,
  type RiskConfig,
  RiskConfigError,
  canonicalControls as rc1CanonicalControls,
  canonicalConfig as rc1CanonicalConfig,
  controlErrors as rc1ControlErrors,
  d1Books,
  limits,
  maskInactive,
  resolve as rc1Resolve,
  riskEvalKey as rc1RiskEvalKey,
  riskId as rc1RiskId,
  symOf,
  validateAgainstGrids as rc1ValidateAgainstGrids
} from '../d1-risk-controls/config.ts';

export { d1Books, limits, maskInactive, symOf, RiskConfigError };
export type { D1Book, DeclineGate, HoldPolicy };

export const RC2_VERSION = 2 as const;
export const activations = ['next-session', 'entry-day'] as const;
export type Activation = (typeof activations)[number];

export type ProtectiveStop2 = { mode: 'off' } | { mode: 'on'; stopDistanceTenths: number; activation?: Activation };

export interface D1RiskControls2 {
  protectiveStop?: ProtectiveStop2;
  hold?: HoldPolicy;
  declineGate?: DeclineGate;
}

export interface RiskConfig2 {
  version: 1 | 2;
  books: Partial<Record<D1Book, D1RiskControls2>>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// One book's RC 1 controls (the activation dropped).
export const toRc1Controls = (c: D1RiskControls2 | undefined): D1RiskControls | undefined => {
  if (!c) return undefined;

  const ps = c.protectiveStop;
  const out: D1RiskControls = { ...(c as D1RiskControls) };

  if (ps?.mode === 'on') out.protectiveStop = { mode: 'on', stopDistanceTenths: ps.stopDistanceTenths };
  return out;
};

// One book's controls: RC 1's checks, plus the activation (only on a protective stop that is ON; a known value).
export const controlErrors2 = (book: string, c: unknown, version: 1 | 2 = 2): string[] => {
  const at = `books["${book}"]`;

  if (!isObject(c)) return [`${at} must be an object`];

  const errors: string[] = [];
  const ps = c.protectiveStop;
  let stripped: unknown = c;

  if (isObject(ps) && 'activation' in ps) {
    if (version === 1) errors.push(`${at}.protectiveStop.activation is an RC 2 property (the configuration is version 1)`);
    if (ps.mode !== 'on') errors.push(`${at}.protectiveStop.activation requires protectiveStop "on"`);
    if (!(activations as readonly unknown[]).includes(ps.activation))
      errors.push(`${at}.protectiveStop.activation must be "next-session" or "entry-day" (got ${JSON.stringify(ps.activation)})`);

    const { activation: _a, ...rest } = ps;

    stripped = { ...c, protectiveStop: rest };
  }

  return [...errors, ...rc1ControlErrors(book, stripped)];
};

export const configErrors2 = (cfg: unknown): string[] => {
  if (!isObject(cfg)) return ['the configuration must be an object'];

  const errors: string[] = [];

  for (const k of Object.keys(cfg)) if (k !== 'version' && k !== 'books') errors.push(`config: unknown key "${k}"`);
  if (cfg.version !== 1 && cfg.version !== RC2_VERSION)
    errors.push(`version must be 1 or ${RC2_VERSION} (got ${JSON.stringify(cfg.version)})`);
  if (!isObject(cfg.books)) errors.push('books must be an object');
  else
    for (const [book, c] of Object.entries(cfg.books)) {
      if (!(d1Books as readonly string[]).includes(book))
        errors.push(`books["${book}"]: only D1:GDX and D1:VGT carry controls (Growth books are unchanged)`);
      else errors.push(...controlErrors2(book, c, cfg.version === 1 ? 1 : 2));
    }

  return errors;
};

export const validateRiskConfig2 = (cfg: unknown): RiskConfig2 => {
  const errors = configErrors2(cfg);

  if (errors.length) throw new RiskConfigError(errors);
  return cfg as RiskConfig2;
};

// ----- canonical form -----

export const isEntryDay = (c: D1RiskControls2 | undefined) =>
  c?.protectiveStop?.mode === 'on' && c.protectiveStop.activation === 'entry-day';

// RC 1's canonical controls, plus `activation: 'entry-day'` on a stop that is ON (next-session is the default: dropped).
export const canonicalControls2 = (c: D1RiskControls2 | undefined): D1RiskControls2 | null => {
  const k = rc1CanonicalControls(toRc1Controls(c)) as D1RiskControls2 | null;

  if (k?.protectiveStop?.mode === 'on' && isEntryDay(c))
    k.protectiveStop = { mode: 'on', stopDistanceTenths: k.protectiveStop.stopDistanceTenths, activation: 'entry-day' };
  return k;
};

export const usesEntryDay = (cfg: RiskConfig2 | RiskConfig | null | undefined) =>
  Boolean(cfg && d1Books.some((b) => isEntryDay(cfg.books[b] as D1RiskControls2 | undefined)));

// The RC 1 configuration (every activation dropped).
export const toRc1 = (cfg: RiskConfig2 | RiskConfig | null | undefined): RiskConfig | null => {
  if (!cfg) return null;

  const books: RiskConfig['books'] = {};

  for (const b of d1Books) {
    const c = toRc1Controls(cfg.books[b] as D1RiskControls2 | undefined);

    if (c) books[b] = c;
  }
  return { version: 1, books };
};

// The whole configuration's canonical form; null = legacy. Version 2 iff some book uses entry-day activation, so that
// an RC 1-expressible configuration canonicalizes exactly as RC 1 does.
export const canonicalConfig2 = (cfg: RiskConfig2 | RiskConfig | null | undefined): RiskConfig2 | null => {
  if (!cfg) return null;
  if (!usesEntryDay(cfg)) return rc1CanonicalConfig(toRc1(cfg)) as RiskConfig2 | null;

  const books: RiskConfig2['books'] = {};

  for (const b of d1Books) {
    const c = canonicalControls2(cfg.books[b] as D1RiskControls2 | undefined);

    if (c) books[b] = c;
  }
  return { version: RC2_VERSION, books };
};

export const isLegacy2 = (cfg: RiskConfig2 | RiskConfig | null | undefined) => canonicalConfig2(cfg) === null;
export const canonicalJson2 = (cfg: RiskConfig2 | RiskConfig | null | undefined) => JSON.stringify(canonicalConfig2(cfg));

// Identity: RC 1's (legacy → Priority 3's quadId; otherwise "rc1-…") unless entry-day is used; then "rc2-" + 16 hex of
// sha256("rc2#" + canonical JSON + "#" + the canonical quad with RC 1's inactive genes masked).
export const riskId2 = (q: Quad, cfg: RiskConfig2 | RiskConfig | null | undefined) =>
  !usesEntryDay(cfg)
    ? rc1RiskId(q, toRc1(cfg))
    : `rc${RC2_VERSION}-${createHash('sha256')
        .update(`rc${RC2_VERSION}#${canonicalJson2(cfg)}#${quadCanonical(maskInactive(q, toRc1(cfg)))}`)
        .digest('hex')
        .slice(0, 16)}`;

// Evaluation key: RC 1's unless entry-day is used; then Priority 3's key of the masked quad + "|rc2:" + canonical JSON.
export const riskEvalKey2 = (door: string, q: Quad, o: EvalOptions, cfg: RiskConfig2 | RiskConfig | null | undefined) =>
  !usesEntryDay(cfg)
    ? rc1RiskEvalKey(door, q, o, toRc1(cfg))
    : `${evalKey(door, maskInactive(q, toRc1(cfg)), o)}|rc${RC2_VERSION}:${canonicalJson2(cfg)}`;

export const serializeRiskConfig2 = (cfg: RiskConfig2 | RiskConfig | null | undefined) => canonicalJson2(cfg);

// Accepts a JSON string or an object; absent/null = legacy. Validates (unknown keys and invalid values are refused).
export const parseRiskConfig2 = (input: string | unknown): RiskConfig2 | null => {
  const value = typeof input === 'string' ? (JSON.parse(input) as unknown) : input;

  if (value === undefined || value === null) return null;
  return canonicalConfig2(validateRiskConfig2(value));
};

export const validateAgainstGrids2 = (
  cfg: RiskConfig2 | RiskConfig | null | undefined,
  d1: Record<'GDX' | 'VGT', D1Grid>
) => {
  if (!cfg) return;

  const errors = configErrors2(cfg);

  if (errors.length) throw new RiskConfigError(errors);
  rc1ValidateAgainstGrids(toRc1(cfg), d1);
};

export type Resolved2 = Resolved & { entryDay: boolean };

export const resolve2 = (c: D1RiskControls2 | undefined): Resolved2 => ({
  ...rc1Resolve(toRc1Controls(c)),
  entryDay: isEntryDay(c)
});
