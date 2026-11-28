// The optimization-standard preflight (docs/research/OPTIMIZATION_STANDARD.md §7). A study declares that it read and
// adopted a version of the standard in research/<study>/STANDARD_ADOPTION.json; this module checks that declaration
// before a substantive stage runs:
//
// - the standard file matches the sha256 registered for its declared version (an edit without a new registered
//   version fails for every study);
// - the manifest exists, is complete, pins a registered version with that version's sha256, and records the current
//   protocol's sha256 (a protocol edited after adoption fails until it is re-adopted or amended);
// - the protocol itself records the standard's version and sha256;
// - the declared date split and risk budget agree with the standard, unless a departure for that section cites the
//   user's agreement; every departure cites one; from 4.0.0 the date split must lie inside the authoritative research
//   date ranges (config/research/date-ranges.json: development and validation may not end after the range's ends,
//   whatever data the canonical files hold), and a study adopting 4.0.0 or later pins its range and the byte-prefix
//   provenance of its data (each pin verified against the local canonical file when present);
// - from 2.2.0, an optimization or continuation declares the consequence of its chronological verdict (§1.8);
// - from 3.0.0, an optimization or continuation declares the GPU-required evaluation backend and is refused while no
//   ACCEPTED GPU evaluator matches the working tree; a new optimization may not pin an earlier version (§9,
//   ./gpuPolicy.ts).
//
// It verifies a declaration and its hashes. It cannot verify that an agent read or understood the standard, or that a
// study's code obeys it (§7.6).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { verifyBytePin } from '../lib/canonicalPrefix.ts';
import { type ResearchRange, readResearchRanges } from '../lib/researchRanges.ts';
import { type EvaluationBackend, checkGpuPolicy } from './gpuPolicy.ts';

export const standardPath = 'docs/research/OPTIMIZATION_STANDARD.md';
export const registryPath = 'docs/research/optimization-standard.versions.json';
export const methodRegistryPath = 'docs/research/methods/methods.versions.json'; // reference methods (§4.8, from 2.1.0)
export const manifestName = 'STANDARD_ADOPTION.json';
export const researchRangesPath = 'config/research/date-ranges.json'; // the authoritative research date ranges (§1, 4.0.0)

// `prospective` (from 5.0.0, §1.15): a pre-registered prospective (shadow) evaluation of a configuration frozen before the
// observed sessions; it never searches, so it is treated as a diagnostic for search-related fields.
export const scopes = ['optimization', 'continuation', 'diagnostic', 'prospective'] as const;
export const priorities = ['actual-profit', 'robust-profit', 'compromise', 'not-applicable'] as const;
export const requiredRoles = ['actual-profit', 'robust-profit', 'balanced'] as const;
// The first version whose §1.8 [S] requires the consequence of the chronological verdict to be declared.
export const consequenceSince = '2.2.0';
// The first version whose §1.3 requires a pinned research date range and the data's byte-prefix provenance.
export const dateRangesSince = '4.0.0';
export const prospectiveSince = '5.0.0';

// The standard's fixed values (§2.1); a different declared value needs a departure for that section. The date bounds
// (§1) are not constants here: they are the research date ranges of the repository checked (researchRangesPath).
export const rules = {
  maximumMinuteDrawdown: 35_000,
  principalBudget: 100_000
};

export interface RegistryEntry {
  version: string;
  effective: string;
  sha256: string;
  summary: string;
}

export interface Registry {
  standard: string;
  current: string;
  versions: RegistryEntry[];
}

export interface Deviation {
  id: string;
  section: string;
  kind: 'adaptation' | 'departure';
  description: string;
  justification: string;
  userAgreement: string | null;
}

export interface Adoption {
  kind: string;
  schema: number;
  study: string;
  scope: (typeof scopes)[number];
  standard: { path: string; version: string; sha256: string };
  readAt: string;
  adoptedAt: string;
  protocol: { path: string; sha256: string };
  dateSplit: {
    development: { from: string; to: string };
    validation: { from: string; to: string };
    commonCompleteEndpoint: string;
  };
  objective: { prioritizes: (typeof priorities)[number]; primaryRule: string; roles: string[] };
  risk: { maximumMinuteDrawdown: number; principalBudget: number; denominator: string };
  budget: { distinctProposals: number | null; backendEvaluations: number | null; notes: string };
  deviations: Deviation[];
  referenceMethod?: { id: string; path: string; version: string; sha256: string }; // optional (§4.8, from 2.1.0)
  chronologicalConsequence?: string; // §1.8 [S], from 2.2.0: required for optimization and continuation scopes
  evaluationBackend?: EvaluationBackend; // §9 [M], from 3.0.0: required for optimization and continuation scopes
  // §1.3 [M], from 4.0.0: the research date range the study adopted (config/research/date-ranges.json) and the byte-prefix
  // provenance of every instrument's data through its validation end (required for studies pinning 4.0.0 or later)
  dateRanges?: { file: string; id: string };
  dataPins?: Record<string, { file: string; bytes: number; sha256: string; through: string }>;
  // §1.15 [M], from 5.0.0: required for scope `prospective` — the frozen configuration and its verifiable freeze time, the
  // pre-registered observation start (a New York session after both the freeze and the validation end), and the
  // acceptance criteria when the evaluation is decision-bearing
  prospective?: {
    configuration: { label: string; file: string; sha256: string; pointer?: string };
    frozenAt: string;
    freezeEvidence: string;
    observationFrom: string;
    decisionBearing: boolean;
    acceptanceCriteria: string | null;
    reporting: string;
  };
}

export interface MethodRegistry {
  kind: string;
  schema: number;
  methods: { id: string; path: string; current: string; versions: RegistryEntry[] }[];
}

// A declared reference-method pin (§4.8): the method is registered, the version is listed with that sha256, and the file
// at the registered path is that version (or, for an earlier version, the pin matches its registered sha256).
export const checkReferenceMethod = (repoRoot: string, m: NonNullable<Adoption['referenceMethod']>) => {
  const errors: string[] = [];
  const notices: string[] = [];
  const file = path.join(repoRoot, methodRegistryPath);

  if (!fs.existsSync(file)) return { errors: [`the reference-method registry ${methodRegistryPath} is missing`], notices };

  let reg: MethodRegistry;

  try {
    reg = JSON.parse(fs.readFileSync(file, 'utf8')) as MethodRegistry;
  } catch (error) {
    return { errors: [`${methodRegistryPath} is not valid JSON: ${(error as Error).message}`], notices };
  }

  const method = (Array.isArray(reg.methods) ? reg.methods : []).find((x) => x.id === m.id);

  if (!method) return { errors: [`reference method ${m.id} is not registered in ${methodRegistryPath}`], notices };
  if (method.path !== m.path) errors.push(`reference method ${m.id}: path ${m.path} is not the registered ${method.path}`);

  const v = method.versions.find((x) => x.version === m.version);

  if (!v) errors.push(`reference method ${m.id} version ${m.version} is not registered`);
  else if (v.sha256 !== m.sha256)
    errors.push(`mismatched reference-method hash: ${m.id} ${m.version} is ${v.sha256.slice(0, 12)}…, the pin ${String(m.sha256).slice(0, 12)}…`);

  const cur = method.versions.find((x) => x.version === method.current);
  const target = path.join(repoRoot, method.path);

  if (!cur) errors.push(`reference method ${m.id}: current ${method.current} is not listed`);
  else if (!fs.existsSync(target)) errors.push(`reference method ${m.id}: ${method.path} is missing`);
  else if (sha256File(target) !== cur.sha256)
    errors.push(`${method.path} is not the registered ${m.id} ${method.current}: edited without a new registered version`);
  if (v && cur && v.version !== cur.version)
    notices.push(`pinned to reference method ${m.id} ${v.version}; the current version is ${cur.version}`);

  return { errors, notices };
};

export interface Result {
  ok: boolean;
  errors: string[];
  notices: string[];
  study: string;
  version: string | null;
  scope: string | null;
}

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const semver = /^\d+\.\d+\.\d+$/;
const hex64 = /^[0-9a-f]{64}$/;
const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

// Semantic-version order of two x.y.z strings (negative, zero or positive).
export const compareVersions = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return 0;
};

// The version the standard's own header declares ("- **Version:** x.y.z").
export const declaredVersion = (standardText: string) => /\*\*Version:\*\*\s*(\d+\.\d+\.\d+)/.exec(standardText)?.[1];

// The registry and the standard file: the file's sha256 must be the one registered for the version it declares.
export const checkRegistry = (repoRoot: string): { errors: string[]; registry: Registry | null } => {
  const errors: string[] = [];
  const file = path.join(repoRoot, registryPath);

  if (!fs.existsSync(file)) return { errors: [`the version registry ${registryPath} is missing`], registry: null };

  let registry: Registry;

  try {
    registry = JSON.parse(fs.readFileSync(file, 'utf8')) as Registry;
  } catch (error) {
    return { errors: [`${registryPath} is not valid JSON: ${(error as Error).message}`], registry: null };
  }

  if (registry.standard !== standardPath) errors.push(`${registryPath}: standard must be ${standardPath}`);
  if (!Array.isArray(registry.versions) || registry.versions.length === 0)
    return { errors: [...errors, `${registryPath}: no versions`], registry: null };

  const seen = new Set<string>();

  for (const v of registry.versions) {
    if (!semver.test(v.version)) errors.push(`${registryPath}: version "${v.version}" is not x.y.z`);
    if (seen.has(v.version)) errors.push(`${registryPath}: version ${v.version} is listed twice`);
    seen.add(v.version);
    if (!hex64.test(v.sha256)) errors.push(`${registryPath}: version ${v.version} has no 64-hex sha256`);
    if (!isoDate.test(v.effective)) errors.push(`${registryPath}: version ${v.version} has no effective date`);
  }

  const current = registry.versions.find((v) => v.version === registry.current);

  if (!current) return { errors: [...errors, `${registryPath}: current ${registry.current} is not listed`], registry };

  const standardFile = path.join(repoRoot, standardPath);

  if (!fs.existsSync(standardFile)) return { errors: [...errors, `${standardPath} is missing`], registry };

  const header = declaredVersion(fs.readFileSync(standardFile, 'utf8'));
  const sha = sha256File(standardFile);

  if (header !== registry.current)
    errors.push(
      `${standardPath} declares version ${header ?? '(none)'} but the registry's current is ${registry.current}`
    );
  if (sha !== current.sha256)
    errors.push(
      `${standardPath} (sha256 ${sha.slice(0, 12)}…) is not the registered ${registry.current} (${current.sha256.slice(0, 12)}…): ` +
        'the standard was edited without registering a new version (§7.4)'
    );

  return { errors, registry };
};

const deviationFor = (a: Adoption, prefix: string) =>
  (Array.isArray(a.deviations) ? a.deviations : []).some(
    (d) =>
      d.kind === 'departure' && typeof d.section === 'string' && d.section.startsWith(prefix) && text(d.userAgreement)
  );

// Checks one study's adoption manifest. `studyDir` is absolute or relative to `repoRoot`.
export const checkAdoption = (studyDir: string, o: { repoRoot: string; now?: Date }): Result => {
  const repoRoot = path.resolve(o.repoRoot);
  const dir = path.resolve(repoRoot, studyDir);
  const study = path.relative(repoRoot, dir);
  const errors: string[] = [];
  const notices: string[] = [];
  const done = (a: Partial<Adoption> | null): Result => ({
    ok: errors.length === 0,
    errors,
    notices,
    study,
    version: a?.standard?.version ?? null,
    scope: a?.scope ?? null
  });
  const reg = checkRegistry(repoRoot);

  errors.push(...reg.errors);

  const file = path.join(dir, manifestName);

  if (!fs.existsSync(file)) {
    errors.push(
      `missing adoption manifest ${path.join(study, manifestName)} (§7.1): read the standard, then record it`
    );
    return done(null);
  }

  let a: Adoption;

  try {
    a = JSON.parse(fs.readFileSync(file, 'utf8')) as Adoption;
  } catch (error) {
    errors.push(`${manifestName} is not valid JSON: ${(error as Error).message}`);
    return done(null);
  }

  if (a.kind !== 'optimization-standard-adoption') errors.push('kind must be "optimization-standard-adoption"');
  if (a.schema !== 1) errors.push('schema must be 1');
  if (a.study !== study) errors.push(`study is "${a.study}", expected "${study}"`);
  if (!scopes.includes(a.scope)) errors.push(`scope must be one of ${scopes.join(', ')}`);

  // the pinned standard
  if (a.standard?.path !== standardPath) errors.push(`standard.path must be ${standardPath}`);

  const pinned = reg.registry?.versions.find((v) => v.version === a.standard?.version);

  if (!a.standard || !semver.test(a.standard.version ?? '')) errors.push('standard.version must be x.y.z');
  else if (reg.registry && !pinned) errors.push(`standard version ${a.standard.version} is not registered`);
  else if (pinned && a.standard.sha256 !== pinned.sha256)
    errors.push(
      `mismatched standard hash: the manifest pins ${String(a.standard.sha256).slice(0, 12)}…, version ${pinned.version} is ${pinned.sha256.slice(0, 12)}…`
    );
  if (pinned && reg.registry && pinned.version !== reg.registry.current)
    notices.push(
      `pinned to standard ${pinned.version}; the current version is ${reg.registry.current}. A frozen study keeps its pin ` +
        '(record "retained pinned standard" in its checkpoint) or migrates by an explicit amendment (§7.5)'
    );

  // timestamps
  const now = o.now ?? new Date();

  if (!isoUtc.test(a.readAt ?? '')) errors.push('readAt must be an ISO UTC time (…Z)');
  if (!isoUtc.test(a.adoptedAt ?? '')) errors.push('adoptedAt must be an ISO UTC time (…Z)');
  if (isoUtc.test(a.readAt ?? '') && isoUtc.test(a.adoptedAt ?? '')) {
    if (Date.parse(a.readAt) > Date.parse(a.adoptedAt)) errors.push('readAt is after adoptedAt');
    if (Date.parse(a.adoptedAt) > now.getTime() + 5 * 60_000) errors.push('adoptedAt is in the future');
    if (pinned && a.adoptedAt.slice(0, 10) < pinned.effective)
      errors.push(`adoptedAt precedes version ${pinned.version}'s effective date ${pinned.effective}`);
  }

  // the protocol: unchanged since adoption, and it records the adopted standard
  if (!a.protocol || !text(a.protocol.path)) errors.push('protocol.path is missing');
  else {
    const p = path.resolve(repoRoot, a.protocol.path);

    if (path.relative(dir, p).startsWith('..')) errors.push(`protocol ${a.protocol.path} is outside ${study}`);
    if (!fs.existsSync(p)) errors.push(`protocol ${a.protocol.path} does not exist`);
    else {
      const sha = sha256File(p);

      if (sha !== a.protocol.sha256)
        errors.push(
          `mismatched protocol hash: ${a.protocol.path} is ${sha.slice(0, 12)}…, the manifest records ${String(a.protocol.sha256).slice(0, 12)}… ` +
            '(re-adopt, or record an amendment)'
        );

      const body = fs.readFileSync(p, 'utf8');

      if (a.standard && (!body.includes(a.standard.version) || !body.includes(String(a.standard.sha256).slice(0, 12))))
        errors.push(`${a.protocol.path} does not record the adopted standard's version and sha256 (§7.2)`);
    }
  }

  // the research date range (§1, from 4.0.0): the repository's authoritative ranges, and the study's pinned one
  let range: ResearchRange | null = null;
  const rangesFile = path.join(repoRoot, researchRangesPath);

  if (!fs.existsSync(rangesFile)) errors.push(`the research date ranges ${researchRangesPath} are missing (§1)`);
  else {
    try {
      const all = readResearchRanges(rangesFile);
      const id = a.dateRanges?.id ?? all.current;

      range = all.ranges.find((r) => r.id === id) ?? null;
      if (a.dateRanges !== undefined && a.dateRanges?.file !== researchRangesPath)
        errors.push(`dateRanges.file must be ${researchRangesPath}`);
      if (!range) errors.push(`dateRanges.id ${id} is not a range of ${researchRangesPath}`);
      else if (range.id !== all.current)
        notices.push(`pinned to research date range ${range.id}; the current range is ${all.current} (a frozen study keeps its range)`);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  // the date split (§1)
  const ds = a.dateSplit;
  const dates = [
    ds?.development?.from,
    ds?.development?.to,
    ds?.validation?.from,
    ds?.validation?.to,
    ds?.commonCompleteEndpoint
  ];

  if (!dates.every((d) => isoDate.test(d ?? '')))
    errors.push('dateSplit needs YYYY-MM-DD development, validation and endpoint dates');
  else if (!deviationFor(a, '§1')) {
    if (range) {
      if (ds.development.to > range.development.to)
        errors.push(`development ends ${ds.development.to}, after ${range.development.to} (§1.1; research date range ${range.id})`);
      if (ds.validation.from < range.validation.from)
        errors.push(`validation starts ${ds.validation.from}, before ${range.validation.from} (§1.2; research date range ${range.id})`);
      if (ds.validation.to > range.validation.to)
        errors.push(
          `validation ends ${ds.validation.to}, after the authorized validation end ${range.validation.to} (§1.3; research date range ` +
            `${range.id}, ${researchRangesPath}): newer data are for manual evaluation only, and a later formal end needs a new range authorized by the user`
        );
    }
    if (!(ds.development.from <= ds.development.to && ds.development.to < ds.validation.from))
      errors.push('the development window must end before the validation window starts');
    if (ds.validation.to !== ds.commonCompleteEndpoint)
      errors.push('validation.to must be the common complete endpoint (§1.3)');
  } else notices.push('the date split is covered by a recorded departure for §1');

  // no evasion of §1.3 by pinning an earlier standard once 4.0.0 is in force (as §9.11 for 3.0.0)
  const v4 = reg.registry?.versions.find((x) => x.version === dateRangesSince);

  if (
    (a.scope === 'optimization' || a.scope === 'continuation') &&
    v4 &&
    pinned &&
    compareVersions(pinned.version, dateRangesSince) < 0 &&
    typeof a.adoptedAt === 'string' &&
    a.adoptedAt.slice(0, 10) >= v4.effective
  )
    errors.push(
      `a ${a.scope} adopted on ${a.adoptedAt.slice(0, 10)} pins standard ${pinned.version}: from ${v4.effective} new optimization ` +
        `and continuation manifests adopt ${dateRangesSince} or later (explicit research date ranges and data provenance, §1.3)`
    );

  // the pinned range and the data's byte-prefix provenance (§1.3, from 4.0.0); pins are verified when the data exist
  if (pinned && compareVersions(pinned.version, dateRangesSince) >= 0) {
    if (a.dateRanges === undefined) errors.push(`dateRanges is missing: standard ${pinned.version} §1.3 requires the study's research date range`);
    if (a.scope !== 'diagnostic' && (!a.dataPins || Object.keys(a.dataPins).length === 0))
      errors.push(`dataPins is missing: standard ${pinned.version} §1.3 requires each instrument's byte-prefix provenance`);
  }

  for (const [symbol, p] of Object.entries(a.dataPins ?? {})) {
    const where = `dataPins.${symbol}`;

    if (!p || !text(p.file) || !Number.isSafeInteger(p.bytes) || p.bytes < 1 || !hex64.test(p.sha256 ?? '') || !isoDate.test(p.through ?? ''))
      errors.push(`${where} needs file, bytes, sha256 (64 hex) and through (YYYY-MM-DD)`);
    else if (isoDate.test(ds?.validation?.to ?? '') && p.through > ds.validation.to)
      errors.push(`${where} reaches ${p.through}, after the validation end ${ds.validation.to}`);
    else if (!fs.existsSync(path.join(repoRoot, p.file))) notices.push(`${where}: ${p.file} is not present here; the pin is not verified`);
    else {
      try {
        verifyBytePin(path.join(repoRoot, p.file), p, `${where} (${p.file})`);
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
  }

  // objective and roles (§2)
  if (!priorities.includes(a.objective?.prioritizes))
    errors.push(`objective.prioritizes must be one of ${priorities.join(', ')}`);
  const searches = a.scope === 'optimization' || a.scope === 'continuation';

  if (a.objective?.prioritizes === 'not-applicable' && searches)
    errors.push('only a diagnostic or prospective evaluation may declare no primary-selection priority');
  if (!text(a.objective?.primaryRule)) errors.push('objective.primaryRule is missing');
  if (searches) {
    const roles = Array.isArray(a.objective?.roles) ? a.objective.roles : [];
    const missing = requiredRoles.filter((r) => !roles.includes(r));

    if (missing.length && !deviationFor(a, '§2.3')) errors.push(`objective.roles lacks ${missing.join(', ')} (§2.3)`);
    if (!roles.includes('lower-drawdown')) notices.push('no lower-drawdown role declared (§2.3: "where useful")');
  }

  // the risk budget (§2.1)
  if (!a.risk || !text(a.risk.denominator)) errors.push('risk.denominator is missing');
  else if (!deviationFor(a, '§2')) {
    if (a.risk.maximumMinuteDrawdown !== rules.maximumMinuteDrawdown)
      errors.push(`risk.maximumMinuteDrawdown ${a.risk.maximumMinuteDrawdown} ≠ ${rules.maximumMinuteDrawdown} (§2.1)`);
    if (a.risk.principalBudget !== rules.principalBudget)
      errors.push(`risk.principalBudget ${a.risk.principalBudget} ≠ ${rules.principalBudget} (§2.1)`);
    if (!/fixed/i.test(a.risk.denominator) || !/principal|budget/i.test(a.risk.denominator))
      errors.push('risk.denominator must name the fixed principal budget, not peak equity (§2.1)');
  }

  // the budget (§4.2)
  const b = a.budget;
  const count = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

  if (!b) errors.push('budget is missing');
  else if (!searches) {
    for (const k of ['distinctProposals', 'backendEvaluations'] as const)
      if (b[k] !== null && !count(b[k])) errors.push(`budget.${k} must be a count or null`);
  } else
    for (const k of ['distinctProposals', 'backendEvaluations'] as const)
      if (!count(b[k]) || (b[k] as number) <= 0) errors.push(`budget.${k} must be declared (§4.2)`);

  // the consequence of the chronological verdict (§1.8 [S], from 2.2.0): declared before searching
  if (pinned && compareVersions(pinned.version, consequenceSince) >= 0 && searches) {
    if (!text(a.chronologicalConsequence))
      errors.push(
        `chronologicalConsequence is missing: standard ${pinned.version} §1.8 requires the protocol to state, before ` +
          'searching, what a failed independent chronological verdict means for the final selection'
      );
  } else if (a.chronologicalConsequence !== undefined && !text(a.chronologicalConsequence))
    errors.push('chronologicalConsequence must be a non-empty statement when given');

  // a controlled prospective (shadow) evaluation (§1.15, from 5.0.0): pre-registered before its first observed session
  if (a.scope === 'prospective' || a.prospective !== undefined) {
    const pr = a.prospective;
    // the earliest regular-session open of a New York date (09:30 EDT = 13:30 UTC): conservative for EST dates
    const openOf = (d: string) => Date.parse(`${d}T13:30:00Z`);

    if (a.scope !== 'prospective') errors.push('a prospective block needs scope "prospective" (§1.15)');
    if (!pinned || compareVersions(pinned.version, prospectiveSince) < 0)
      errors.push(`scope prospective needs standard ${prospectiveSince} or later (§1.15); ${pinned?.version ?? 'no version'} is pinned`);
    if (!pr) errors.push('prospective is missing: §1.15 requires the frozen configuration, its freeze time and the observation start');
    else {
      const c = pr.configuration;

      if (!c || !text(c.label) || !text(c.file) || !hex64.test(c.sha256 ?? ''))
        errors.push('prospective.configuration needs label, file and sha256 (64 hex) of the sealed configuration record');
      else if (!fs.existsSync(path.resolve(repoRoot, c.file))) errors.push(`prospective.configuration ${c.file} does not exist`);
      else if (sha256File(path.resolve(repoRoot, c.file)) !== c.sha256)
        errors.push(`prospective.configuration ${c.file} does not match its sha256: the frozen configuration changed (§1.15: a change is a new version)`);
      if (!isoUtc.test(pr.frozenAt ?? '')) errors.push('prospective.frozenAt must be an ISO UTC time (…Z): the verifiable freeze time');
      if (!text(pr.freezeEvidence)) errors.push('prospective.freezeEvidence must name the commit or sealed record that proves the freeze time');
      if (!isoDate.test(pr.observationFrom ?? '')) errors.push('prospective.observationFrom must be the first observed New York session (YYYY-MM-DD)');
      if (typeof pr.decisionBearing !== 'boolean') errors.push('prospective.decisionBearing must be true or false');
      if (pr.decisionBearing === true && !text(pr.acceptanceCriteria))
        errors.push('prospective.acceptanceCriteria are required for a decision-bearing evaluation, fixed before the first observed session (§1.15)');
      if (!text(pr.reporting)) errors.push('prospective.reporting must state that every observed session is reported (no selective reporting, §1.15)');
      if (isoUtc.test(pr.frozenAt ?? '') && isoDate.test(pr.observationFrom ?? '')) {
        if (Date.parse(pr.frozenAt) >= openOf(pr.observationFrom))
          errors.push(
            `the configuration was frozen ${pr.frozenAt}, not before the first observed session ${pr.observationFrom} opened: ` +
              'sessions that opened before the freeze are never prospective for it (§1.15)'
          );
        if (isoUtc.test(a.adoptedAt ?? '') && Date.parse(a.adoptedAt) >= openOf(pr.observationFrom))
          errors.push(`the evaluation was pre-registered (adoptedAt ${a.adoptedAt}) only after the first observed session ${pr.observationFrom} opened (§1.15: no retroactive classification)`);
      }
      if (range && isoDate.test(pr.observationFrom ?? '') && pr.observationFrom <= range.validation.to)
        errors.push(`prospective observations start ${pr.observationFrom}, inside the formal validation window of ${range.id} (ends ${range.validation.to}): they are reported apart from it (§1.15, §1.16)`);
    }
  }

  // the reference method, if the study declares one (§4.8)
  if (a.referenceMethod !== undefined) {
    const m = a.referenceMethod;

    if (!m || !text(m.id) || !text(m.path) || !semver.test(m.version ?? '') || !hex64.test(m.sha256 ?? ''))
      errors.push('referenceMethod needs id, path, version x.y.z and a 64-hex sha256');
    else {
      const r = checkReferenceMethod(repoRoot, m);

      errors.push(...r.errors);
      notices.push(...r.notices);
    }
  }

  // the GPU-required evaluation backend (§9, from 3.0.0) and the no-evasion rule
  {
    const g = checkGpuPolicy(a, pinned?.version ?? null, reg.registry);

    errors.push(...g.errors);
    notices.push(...g.notices);
  }

  // deviations (§7.3)
  if (!Array.isArray(a.deviations)) errors.push('deviations must be a list (empty when there are none)');
  else {
    const ids = new Set<string>();

    for (const d of a.deviations) {
      const id = text(d.id) ? d.id : '(no id)';

      if (ids.has(id)) errors.push(`deviation ${id} is listed twice`);
      ids.add(id);
      if (!text(d.section) || !d.section.startsWith('§')) errors.push(`deviation ${id}: section must cite "§…"`);
      if (d.kind !== 'adaptation' && d.kind !== 'departure')
        errors.push(`deviation ${id}: kind must be adaptation or departure`);
      if (!text(d.description) || !text(d.justification))
        errors.push(`deviation ${id}: description and justification are required`);
      if (d.kind === 'departure' && !text(d.userAgreement))
        errors.push(`deviation ${id} is a departure without the user's agreement (§7.3)`);
    }
  }

  return done(a);
};

// For runners: throws (listing every failure) unless the study's adoption passes; returns the result (with notices).
export const requireStandardAdoption = (studyDir: string, o: { repoRoot: string; now?: Date }) => {
  const r = checkAdoption(studyDir, o);

  if (!r.ok)
    throw new Error(
      `optimization-standard preflight failed for ${r.study}:\n${r.errors.map((e) => `  - ${e}`).join('\n')}\n` +
        `read ${standardPath}, then fix ${path.join(r.study, manifestName)} (npm run research-preflight -- --study ${r.study})`
    );
  return r;
};
