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
//   user's agreement; every departure cites one.
//
// It verifies a declaration and its hashes. It cannot verify that an agent read or understood the standard, or that a
// study's code obeys it (§7.6).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const standardPath = 'docs/research/OPTIMIZATION_STANDARD.md';
export const registryPath = 'docs/research/optimization-standard.versions.json';
export const methodRegistryPath = 'docs/research/methods/methods.versions.json'; // reference methods (§4.8, from 2.1.0)
export const manifestName = 'STANDARD_ADOPTION.json';

export const scopes = ['optimization', 'continuation', 'diagnostic'] as const;
export const priorities = ['actual-profit', 'robust-profit', 'compromise', 'not-applicable'] as const;
export const requiredRoles = ['actual-profit', 'robust-profit', 'balanced'] as const;

// The standard's fixed values (§1.1, §2.1); a different declared value needs a departure for that section.
export const rules = {
  developmentEndMax: '2024-12-31',
  validationStartMin: '2025-01-01',
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
    if (ds.development.to > rules.developmentEndMax)
      errors.push(`development ends ${ds.development.to}, after ${rules.developmentEndMax} (§1.1)`);
    if (ds.validation.from < rules.validationStartMin)
      errors.push(`validation starts ${ds.validation.from}, before ${rules.validationStartMin} (§1.2)`);
    if (!(ds.development.from <= ds.development.to && ds.development.to < ds.validation.from))
      errors.push('the development window must end before the validation window starts');
    if (ds.validation.to !== ds.commonCompleteEndpoint)
      errors.push('validation.to must be the common complete endpoint (§1.3)');
  } else notices.push('the date split is covered by a recorded departure for §1');

  // objective and roles (§2)
  if (!priorities.includes(a.objective?.prioritizes))
    errors.push(`objective.prioritizes must be one of ${priorities.join(', ')}`);
  if (a.objective?.prioritizes === 'not-applicable' && a.scope !== 'diagnostic')
    errors.push('only a diagnostic may declare no primary-selection priority');
  if (!text(a.objective?.primaryRule)) errors.push('objective.primaryRule is missing');
  if (a.scope !== 'diagnostic') {
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
  else if (a.scope === 'diagnostic') {
    for (const k of ['distinctProposals', 'backendEvaluations'] as const)
      if (b[k] !== null && !count(b[k])) errors.push(`budget.${k} must be a count or null`);
  } else
    for (const k of ['distinctProposals', 'backendEvaluations'] as const)
      if (!count(b[k]) || (b[k] as number) <= 0) errors.push(`budget.${k} must be declared (§4.2)`);

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
