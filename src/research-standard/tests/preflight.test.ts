// The optimization-standard preflight: synthetic repositories for each failure the check must catch, then the real
// repository (its registry, and every study that declares an adoption).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  type Adoption,
  checkAdoption,
  checkRegistry,
  manifestName,
  registryPath,
  requireStandardAdoption,
  standardPath
} from '../preflight.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const standardText = (version: string, extra = '') =>
  `# Optimization research standard\n\n- **Version:** ${version}\n${extra}`;

interface Fixture {
  root: string;
  study: string;
  adoption: Adoption;
  write: (a: Adoption) => void;
}

// A minimal repository: the standard at 1.0.0 (optionally 1.1.0 as current), its registry, one study with a protocol
// that records the standard, and a valid adoption manifest.
const fixture = (o: { current?: '1.0.0' | '1.1.0' } = {}): Fixture => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
  const v100 = standardText('1.0.0');
  const v110 = standardText('1.1.0', '\nA new rule.\n');
  const current = o.current === '1.1.0' ? v110 : v100;

  fs.mkdirSync(path.join(root, 'docs/research'), { recursive: true });
  fs.writeFileSync(path.join(root, standardPath), current);
  fs.writeFileSync(
    path.join(root, registryPath),
    JSON.stringify({
      standard: standardPath,
      current: o.current ?? '1.0.0',
      versions: [
        { version: '1.0.0', effective: '2026-11-08', sha256: sha(v100), summary: 'first' },
        ...(o.current === '1.1.0'
          ? [{ version: '1.1.0', effective: '2026-11-20', sha256: sha(v110), summary: 'next' }]
          : [])
      ]
    })
  );

  const study = 'research/demo';
  const protocol = `# Protocol\n\nStandard version 1.0.0, sha256 ${sha(v100)}.\n`;

  fs.mkdirSync(path.join(root, study), { recursive: true });
  fs.writeFileSync(path.join(root, study, 'PROTOCOL.md'), protocol);

  const adoption: Adoption = {
    kind: 'optimization-standard-adoption',
    schema: 1,
    study,
    scope: 'optimization',
    standard: { path: standardPath, version: '1.0.0', sha256: sha(v100) },
    readAt: '2026-11-08T10:00:00Z',
    adoptedAt: '2026-11-08T10:05:00Z',
    protocol: { path: `${study}/PROTOCOL.md`, sha256: sha(protocol) },
    dateSplit: {
      development: { from: '2016-01-04', to: '2024-12-31' },
      validation: { from: '2025-01-01', to: '2026-10-30' },
      commonCompleteEndpoint: '2026-10-30'
    },
    objective: {
      prioritizes: 'robust-profit',
      primaryRule: 'banded order on selection robust net',
      roles: ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown']
    },
    risk: { maximumMinuteDrawdown: 35000, principalBudget: 100000, denominator: 'one fixed $100,000 principal budget' },
    budget: { distinctProposals: 20000, backendEvaluations: 400000, notes: 'centres and neighbours' },
    deviations: []
  };
  const write = (a: Adoption) => fs.writeFileSync(path.join(root, study, manifestName), JSON.stringify(a, null, 1));

  write(adoption);
  return { root, study, adoption, write };
};

const now = new Date('2026-11-09T00:00:00Z');
const run = (f: Fixture) => checkAdoption(f.study, { repoRoot: f.root, now });
const clone = (a: Adoption) => JSON.parse(JSON.stringify(a)) as Adoption;
const hasError = (r: ReturnType<typeof run>, pattern: RegExp) => r.errors.some((e) => pattern.test(e));

describe('optimization-standard preflight', () => {
  it('passes a complete, consistent adoption', () => {
    const r = run(fixture());

    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
    assert.equal(r.version, '1.0.0');
  });

  it('fails when the adoption manifest is missing', () => {
    const f = fixture();

    fs.rmSync(path.join(f.root, f.study, manifestName));

    const r = run(f);

    assert.equal(r.ok, false);
    assert.ok(hasError(r, /missing adoption manifest/));
    assert.throws(() => requireStandardAdoption(f.study, { repoRoot: f.root, now }), /preflight failed/);
  });

  it('fails a manifest pinning a hash that is not the registered one', () => {
    const f = fixture();
    const a = clone(f.adoption);

    a.standard.sha256 = 'f'.repeat(64);
    f.write(a);
    assert.ok(hasError(run(f), /mismatched standard hash/));
  });

  it('fails an unregistered version', () => {
    const f = fixture();
    const a = clone(f.adoption);

    a.standard.version = '9.9.9';
    f.write(a);
    assert.ok(hasError(run(f), /not registered/));
  });

  it('fails every study when the standard is edited without registering a new version', () => {
    const f = fixture();

    fs.appendFileSync(path.join(f.root, standardPath), '\nAn unregistered edit.\n');

    const r = run(f);

    assert.ok(hasError(r, /edited without registering a new version/));
    assert.ok(checkRegistry(f.root).errors.length > 0);
  });

  it('fails when the protocol changed after adoption', () => {
    const f = fixture();

    fs.appendFileSync(path.join(f.root, f.study, 'PROTOCOL.md'), '\nAn edit after adoption.\n');
    assert.ok(hasError(run(f), /mismatched protocol hash/));
  });

  it('fails a protocol that does not record the adopted standard', () => {
    const f = fixture();
    const body = '# Protocol\n\nNo standard here.\n';
    const a = clone(f.adoption);

    fs.writeFileSync(path.join(f.root, f.study, 'PROTOCOL.md'), body);
    a.protocol.sha256 = sha(body);
    f.write(a);
    assert.ok(hasError(run(f), /does not record the adopted standard/));
  });

  it('refuses a development window reaching into validation unless a departure cites the user', () => {
    const f = fixture();
    const a = clone(f.adoption);

    a.dateSplit.development.to = '2025-06-30';
    a.dateSplit.validation.from = '2025-07-01';
    f.write(a);
    assert.ok(hasError(run(f), /development ends 2025-06-30/));

    a.deviations = [
      {
        id: 'AD1',
        section: '§1.1',
        kind: 'departure',
        description: 'development extended to mid-2025',
        justification: 'requested',
        userAgreement: null
      }
    ];
    f.write(a);
    assert.ok(hasError(run(f), /departure without the user's agreement/));

    a.deviations[0]!.userAgreement = 'brief line 12';
    f.write(a);
    assert.equal(run(f).ok, true);
  });

  it('refuses a risk budget on another denominator or ceiling', () => {
    const f = fixture();
    const a = clone(f.adoption);

    a.risk.denominator = '35% of peak account equity';
    f.write(a);
    assert.ok(hasError(run(f), /denominator/));

    a.risk.denominator = 'one fixed $100,000 principal budget';
    a.risk.maximumMinuteDrawdown = 50000;
    f.write(a);
    assert.ok(hasError(run(f), /maximumMinuteDrawdown/));
  });

  it('requires an optimization to declare its budget and roles', () => {
    const f = fixture();
    const a = clone(f.adoption);

    a.budget.distinctProposals = null;
    a.objective.roles = ['actual-profit'];
    f.write(a);

    const r = run(f);

    assert.ok(hasError(r, /budget.distinctProposals must be declared/));
    assert.ok(hasError(r, /lacks robust-profit, balanced/));
  });

  it('allows a diagnostic without a search budget or primary rule priority', () => {
    const f = fixture();
    const a = clone(f.adoption);

    a.scope = 'diagnostic';
    a.objective.prioritizes = 'not-applicable';
    a.objective.roles = [];
    a.budget = { distinctProposals: 0, backendEvaluations: null, notes: 'no search' };
    f.write(a);
    assert.deepEqual(run(f).errors, []);
  });

  it('passes a study pinned to an older registered version, with a notice', () => {
    const f = fixture({ current: '1.1.0' });
    const r = run(f);

    assert.equal(r.ok, true);
    assert.ok(r.notices.some((n) => /pinned to standard 1.0.0/.test(n)));
  });
});

describe('the repository', () => {
  const repoRoot = path.resolve(import.meta.dirname, '../../..');

  it('has a registry that matches the standard file', () => {
    assert.deepEqual(checkRegistry(repoRoot).errors, []);
  });

  it('every study that declares an adoption passes the preflight', () => {
    const studies = fs
      .readdirSync(path.join(repoRoot, 'research'))
      .filter((d) => fs.existsSync(path.join(repoRoot, 'research', d, manifestName)));

    for (const d of studies) assert.deepEqual(checkAdoption(path.join('research', d), { repoRoot }).errors, [], d);
  });
});
