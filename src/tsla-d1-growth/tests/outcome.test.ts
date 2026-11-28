// P6-TSLA outcome join (disclosure D1, decision U6): the validation rows join the C24 finalists by their stable identity
// (arm, id), never by the label that preDetermination overwrites with a governance label; a missing, duplicate, cross-arm
// or conflicting identity fails closed instead of becoming `validation: null`, `c: false`.
//
// Synthetic fixtures cover the failure modes; the replay reads the sealed TSLA records read-only (each checked against its
// pinned sha256, never their file mode, so a fresh clone works), evaluates nothing and writes nothing.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { IdentityJoinError } from '../../research-outcome/identityJoin.ts';
import type { ArmKey } from '../context.ts';
import { type Finalist, type GovernedFinalist, type ValidationRow, governedFinalists, outcomeOf } from '../outcome.ts';
import { plain } from '../records.ts';

// ----- fixtures -----

type Proc = { population: string; verdict: string; supported: boolean };
const procs = (supported: Partial<Record<ArmKey, boolean>> = {}): Proc[] =>
  (['D', 'G', 'C', 'J', 'S'] as const).map((a) => ({
    population: a,
    verdict: supported[a] ? 'supported' : 'unsupported',
    supported: supported[a] ?? false
  }));

const fin = (arm: ArmKey, id: string, label: string, roles: string[], qualified = true): Finalist => ({
  label,
  id,
  arm,
  roles,
  qualified,
  failed: qualified ? [] : ['Q3'],
  centreNet: 1000,
  centreDd: 500,
  confirmRobust: 800,
  confirmP90Dd: 600,
  selectRobust: 700,
  signature: `sig-${id}`
});
const row = (
  arm: ArmKey,
  id: string,
  label: string,
  v: [boolean, boolean, boolean],
  kind = 'selected'
): ValidationRow => ({
  label,
  id,
  arm,
  kind,
  validation: { V1: v[0], V2: v[1], V3: v[2] }
});
const pre = (finalists: readonly Finalist[], procedures: Proc[] = procs()) => ({
  finalists: governedFinalists(finalists, procedures),
  comparisons: { note: 'synthetic' }
});

// a TSLA-shaped slate: every arm's primary plus one role holder; arm C's primary also holds three roles (one identity)
const slate = [
  fin('D', 'd-p', 'C24/D/p#1 profit', ['primary D']),
  fin('D', 'd-r', 'C24/D/r#2 robust', ['role D/robust-profit']),
  fin('G', 'g-p', 'C24/G/p#1 profit', ['primary G']),
  fin('G', 'g-r', 'C24/G/r#3 balanced', ['role G/balanced']),
  fin('C', 'c-p', 'C24/C/pair DF1×GF3', [
    'primary C',
    'role C/robust-profit',
    'role C/balanced',
    'role C/lower-drawdown'
  ]),
  fin('J', 'j-p', 'C24/J/p#1 profit', ['primary J']),
  fin('J', 'j-r', 'C24/J/r#2 robust', ['role J/robust-profit']),
  fin('S', 's-p', 'C24/S/p#1 profit', ['primary S']),
  fin('S', 's-r', 'C24/S/r#3 balanced', ['role S/balanced'])
];
const slateRows = [
  row('D', 'd-p', 'C24/D/p#1 profit', [false, true, true]),
  row('D', 'd-r', 'C24/D/r#2 robust', [false, true, true]),
  row('G', 'g-p', 'C24/G/p#1 profit', [true, true, true]),
  row('G', 'g-r', 'C24/G/r#3 balanced', [true, true, true]),
  row('C', 'c-p', 'C24/C/pair DF1×GF3', [true, true, true]),
  row('J', 'j-p', 'C24/J/p#1 profit', [false, true, true]),
  row('J', 'j-r', 'C24/J/r#2 robust', [false, true, false]),
  row('S', 's-p', 'C24/S/p#1 profit', [false, true, true]),
  row('S', 's-r', 'C24/S/r#3 balanced', [false, false, false]),
  // rows no finalist claims: a sub-population primary and an external control
  row('G', 'gu-p', 'C24/G/u#1 profit', [false, false, false]),
  row('D', 'ctl-nl0', 'control: New L0 on TSLA (arm D)', [false, false, false], 'control')
];
const classification = (o: ReturnType<typeof outcomeOf>) =>
  Object.fromEntries(
    o.finalists.map((f) => [
      `${f.arm}|${f.id}`,
      { v: f.validation, c: f.c, candidate: f.candidate, developmentOnly: f.developmentOnly, label: f.candidateLabel }
    ])
  );
const permute = <T>(xs: readonly T[], order: number[]) => order.map((i) => xs[i]!);

const joinFails = (fn: () => unknown, re: RegExp) =>
  assert.throws(fn, (e: Error) => {
    assert.ok(e instanceof IdentityJoinError, `expected an IdentityJoinError, got ${String(e)}`);
    assert.match(e.message, re);
    return true;
  });

// ----- synthetic: the join and the classification -----

describe('outcomeOf joins by (arm, id) (synthetic)', () => {
  it('a finalist whose candidate label was overwritten by its governance label still joins by identity', () => {
    const p = pre([fin('G', 'g-1', 'C24/G/refine/x#1 profit', ['primary G'])]);

    assert.equal(
      p.finalists[0]!.label,
      'development-qualified, NO chronological support: not a deployment-qualified candidate without an explicit user decision'
    );
    assert.equal(p.finalists[0]!.candidateLabel, 'C24/G/refine/x#1 profit');

    const out = outcomeOf(p, [row('G', 'g-1', 'C24/G/refine/x#1 profit', [true, true, true])]);

    assert.deepEqual(out.finalists[0]!.validation, { V1: true, V2: true, V3: true });
    assert.equal(
      out.finalists[0]!.label,
      p.finalists[0]!.label,
      'label keeps its sealed meaning (the governance label)'
    );
    assert.deepEqual(out.developmentOnly, [{ arm: 'G', label: 'C24/G/refine/x#1 profit', id: 'g-1' }]);
  });

  it('a finalist from a record sealed before the fix (no candidateLabel) takes its candidate label from the row', () => {
    const p = pre([fin('C', 'c-1', 'C24/C/pair DF1×GF3', ['primary C'])]);
    const legacy = {
      ...p,
      finalists: p.finalists.map((f) => {
        const x: GovernedFinalist = { ...f };

        delete x.candidateLabel;
        delete x.governanceLabel;
        return x;
      })
    };

    assert.ok(legacy.finalists.every((f) => !('candidateLabel' in f) && !('governanceLabel' in f)));
    const out = outcomeOf(legacy, [row('C', 'c-1', 'C24/C/pair DF1×GF3', [true, true, true])]);

    assert.equal(out.finalists[0]!.candidateLabel, 'C24/C/pair DF1×GF3');
    assert.deepEqual(out.developmentOnly, [{ arm: 'C', label: 'C24/C/pair DF1×GF3', id: 'c-1' }]);
  });

  it('every finalist receives its own V1–V3 and c', () => {
    const out = outcomeOf(pre(slate), slateRows);
    const byKey = new Map(slateRows.map((r) => [`${r.arm}|${r.id}`, r]));

    assert.equal(out.finalists.length, slate.length);
    for (const f of out.finalists) {
      const r = byKey.get(`${f.arm}|${f.id}`)!;

      assert.deepEqual(f.validation, r.validation, `${f.arm} ${f.id}`);
      assert.equal(f.c, r.validation.V1 && r.validation.V2 && r.validation.V3, `${f.arm} ${f.id}`);
      assert.equal(f.candidateLabel, r.label);
    }
  });

  it('no chronological support: G and C primaries (V1–V3 pass) are development-only; role holders and failing primaries are not', () => {
    const out = outcomeOf(pre(slate), slateRows);

    assert.deepEqual(out.candidates, []);
    assert.deepEqual(out.developmentOnly, [
      { arm: 'G', label: 'C24/G/p#1 profit', id: 'g-p' },
      { arm: 'C', label: 'C24/C/pair DF1×GF3', id: 'c-p' }
    ]);
    assert.equal(
      out.outcome,
      'NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3; development-qualified without chronological support (not deployment-qualified without an explicit user decision): G C24/G/p#1 profit; C C24/C/pair DF1×GF3'
    );

    const k = classification(out);

    assert.equal(k['G|g-r']!.c, true);
    assert.equal(k['G|g-r']!.developmentOnly, false, 'a role holder is descriptive, never development-only');
    for (const a of ['D|d-p', 'J|j-p', 'S|s-p']) {
      assert.equal(k[a]!.v!.V1, false);
      assert.equal(k[a]!.developmentOnly, false);
    }
  });

  it('a chronologically supported primary passing V1–V3 is a candidate, listed by its candidate label', () => {
    const out = outcomeOf(pre(slate, procs({ G: true })), slateRows);

    assert.deepEqual(out.candidates, [{ arm: 'G', label: 'C24/G/p#1 profit', id: 'g-p' }]);
    assert.deepEqual(out.developmentOnly, [{ arm: 'C', label: 'C24/C/pair DF1×GF3', id: 'c-p' }]);
    assert.match(out.outcome, /^TSLA RESEARCH CANDIDATE\(S\) FOR THE USER'S REVIEW: G C24\/G\/p#1 profit \(/);
  });

  it('a supported primary failing V1 is no candidate; an unqualified primary is never development-only', () => {
    const slate2 = slate.map((f) => (f.id === 'c-p' ? { ...f, qualified: false, failed: ['Q2'] } : f));
    const out = outcomeOf(pre(slate2, procs({ D: true })), slateRows);
    const k = classification(out);

    assert.equal(k['D|d-p']!.candidate, false);
    assert.equal(k['C|c-p']!.c, true);
    assert.equal(k['C|c-p']!.developmentOnly, false);
    assert.deepEqual(
      out.developmentOnly.map((f) => f.id),
      ['g-p']
    );
    assert.match(out.outcome, /^NO QUALIFYING TSLA CANDIDATE/);
  });

  it('multiple roles on one identity: one finalist, one row, one list entry', () => {
    const out = outcomeOf(pre(slate), slateRows);
    const c = out.finalists.filter((f) => f.id === 'c-p');

    assert.equal(c.length, 1);
    assert.deepEqual(c[0]!.roles, ['primary C', 'role C/robust-profit', 'role C/balanced', 'role C/lower-drawdown']);
    assert.equal(out.developmentOnly.filter((f) => f.id === 'c-p').length, 1);
  });

  it('reordering the finalists and the rows does not change the result', () => {
    const base = outcomeOf(pre(slate), slateRows);
    const orders: [number[], number[]][] = [
      [
        [8, 7, 6, 5, 4, 3, 2, 1, 0],
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
      ],
      [
        [4, 0, 7, 2, 5, 8, 1, 6, 3],
        [3, 9, 0, 6, 10, 2, 8, 4, 1, 7, 5]
      ]
    ];

    for (const [fo, ro] of orders) {
      const out = outcomeOf(pre(permute(slate, fo)), permute(slateRows, ro));

      assert.deepEqual(classification(out), classification(base));
      assert.deepEqual(out.candidates, base.candidates);
      assert.deepEqual(out.developmentOnly, base.developmentOnly);
      assert.equal(out.outcome, base.outcome);
    }
  });

  it('an external control sharing a finalist identity is never joined (kind control)', () => {
    const out = outcomeOf(pre([fin('D', 'd-p', 'C24/D/p#1 profit', ['primary D'])]), [
      row('D', 'd-p', 'control: same phenotype', [true, true, true], 'control'),
      row('D', 'd-p', 'C24/D/p#1 profit', [false, true, true])
    ]);

    assert.deepEqual(out.finalists[0]!.validation, { V1: false, V2: true, V3: true });
  });

  it('fails closed on a missing validation row', () => {
    joinFails(
      () =>
        outcomeOf(
          pre(slate),
          slateRows.filter((r) => r.id !== 'g-p')
        ),
      /missing validation row for finalist \(arm G, id g-p\)/
    );
  });

  it('fails closed on a duplicate validation identity', () => {
    joinFails(
      () => outcomeOf(pre(slate), [...slateRows, row('C', 'c-p', 'C24/C/pair DF1×GF3', [false, false, false])]),
      /duplicate validation identity \(arm C, id c-p\)/
    );
  });

  it('fails closed on a cross-arm identity', () => {
    const rows = slateRows.map((r) => (r.id === 'g-p' ? { ...r, arm: 'J' as const } : r));

    joinFails(
      () => outcomeOf(pre(slate), rows),
      /cross-arm identity: finalist \(arm G, id g-p\) has no row under arm G; its id occurs under arm J/
    );
  });

  it('fails closed on a conflicting candidate label for the same identity', () => {
    const rows = slateRows.map((r) => (r.id === 's-p' ? { ...r, label: 'C24/S/other#9 profit' } : r));

    joinFails(
      () => outcomeOf(pre(slate), rows),
      /conflict for \(arm S, id s-p\): candidate label conflict: finalist "C24\/S\/p#1 profit", validation row "C24\/S\/other#9 profit"/
    );
  });

  it('fails closed on a duplicate finalist identity', () => {
    const dup = [...slate, fin('C', 'c-p', 'C24/C/pair DF1×GF3', ['role C/balanced'])];

    joinFails(() => outcomeOf(pre(dup), slateRows), /duplicate finalist identity \(arm C, id c-p\)/);
  });

  it('fails closed on malformed V1–V3 or a row without a candidate label', () => {
    const bad = slateRows.map((r) =>
      r.id === 'j-p' ? ({ ...r, validation: { V1: false, V2: 'yes', V3: true } } as unknown as ValidationRow) : r
    );

    joinFails(() => outcomeOf(pre(slate), bad), /conflict for \(arm J, id j-p\): malformed V1–V3/);

    const noLabel = slateRows.map((r) => (r.id === 'j-p' ? { ...r, label: '' } : r));

    joinFails(() => outcomeOf(pre(slate), noLabel), /the validation row has no candidate label/);
  });
});

describe('governedFinalists (preDetermination’s finalists)', () => {
  it('label keeps its sealed meaning (governance); candidateLabel and governanceLabel are explicit; the identity is untouched', () => {
    const g = governedFinalists(slate, procs({ J: true }));
    const byId = new Map(g.map((f) => [f.id, f]));

    assert.equal(
      byId.get('d-p')!.label,
      'development-qualified, NO chronological support: not a deployment-qualified candidate without an explicit user decision'
    );
    assert.equal(byId.get('j-p')!.label, 'development-qualified and chronologically supported (validation pending)');
    assert.equal(byId.get('g-r')!.label, 'descriptive role holder (not a nominee)');
    for (const f of g) {
      const src = slate.find((x) => x.id === f.id)!;

      assert.equal(f.candidateLabel, src.label);
      assert.equal(f.governanceLabel, f.label);
      assert.equal(f.arm, src.arm);
    }
  });
});

// ----- the sealed TSLA records (read-only replay) -----

const study = path.resolve(import.meta.dirname, '../../../research/tsla-d1-growth');
const pinned = {
  frozen: ['FROZEN_SELECTION.json', '0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791'],
  validation: [
    'results/validation/validation.json',
    'b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f'
  ],
  sequential: ['results/sequential.json', '2a1079a0a9d1e6dea4cd9d809e1a0413794ccc41152a02a975105c7210f28ce8'],
  outcome: ['results/outcome.json', 'a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79'],
  join: ['reports/tables/outcome-join.json', 'df18bd93e85f145419ab83342707e9de51025f7f2c741cda186870c144ca0cb2']
} as const;
const sealedJson = <T>(which: keyof typeof pinned): T => {
  const [file, sha] = pinned[which];
  const bytes = fs.readFileSync(path.join(study, file));

  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha, `${file} differs from its sealed sha256`);
  return JSON.parse(bytes.toString('utf8')) as T;
};

interface Frozen {
  finalists: Finalist[];
  preDetermination: { finalists: GovernedFinalist[]; comparisons: unknown };
}
type SealedOutcome = Omit<ReturnType<typeof outcomeOf>, 'finalists'> & {
  finalists: (GovernedFinalist & { validation: unknown; c: boolean; candidate: boolean; developmentOnly: boolean })[];
  ceiling: string;
};
interface JoinRecord {
  finalists: {
    arm: ArmKey;
    id: string;
    candidateLabel: string;
    validation: unknown;
    c: boolean;
    candidate: boolean;
    developmentOnly: boolean;
    validationPnl: number;
    validationResetDd: number;
    wholeRunDd: number;
  }[];
  candidates: unknown[];
  developmentOnly: { arm: ArmKey; label: string; id: string }[];
  determination: string;
}

// the PRE-FIX outcomeOf of commit 421e4c87, verbatim apart from types: it joins by `label` (the defect)
const labelJoinOutcome = (p: Frozen['preDetermination'], rows: readonly ValidationRow[]) => {
  const fin = p.finalists.map((f) => {
    const r = rows.find((x) => x.label === f.label && x.arm === f.arm);
    const v = r?.validation ?? null;
    const c = v ? v.V1 && v.V2 && v.V3 : false;

    return { ...f, validation: v, c, candidate: f.a && f.b && c, developmentOnly: f.a && f.primary && !f.b && c };
  });
  const candidates = fin.filter((f) => f.candidate);
  const devOnly = fin.filter((f) => f.developmentOnly);

  return {
    finalists: fin,
    candidates: candidates.map((f) => ({ arm: f.arm, label: f.label, id: f.id })),
    developmentOnly: devOnly.map((f) => ({ arm: f.arm, label: f.label, id: f.id })),
    comparisons: p.comparisons,
    outcome: candidates.length
      ? `TSLA RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW: …`
      : `NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3${devOnly.length ? `; development-qualified without chronological support (not deployment-qualified without an explicit user decision): ${devOnly.map((f) => `${f.arm} ${f.label}`).join('; ')}` : ''}`
  };
};

const validationDependent = ['validation', 'c', 'candidate', 'developmentOnly', 'candidateLabel'];
const without = (o: object, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

describe('replay of the sealed TSLA outcome (report-only, read-only)', () => {
  const fz = sealedJson<Frozen>('frozen');
  const v = sealedJson<{ rows: ValidationRow[] }>('validation');
  const seq = sealedJson<{ procedures: Proc[] }>('sequential');
  const sealed = sealedJson<SealedOutcome>('outcome');
  const join = sealedJson<JoinRecord>('join');
  const fixed = plain(outcomeOf(fz.preDetermination, v.rows));

  it('the chronology gate failed for all five architectures, so (b) is false for every finalist', () => {
    assert.deepEqual(
      seq.procedures
        .filter((p) => ['D', 'G', 'C', 'J', 'S'].includes(p.population))
        .map((p) => [p.population, p.supported]),
      [
        ['D', false],
        ['G', false],
        ['C', false],
        ['J', false],
        ['S', false]
      ]
    );
    assert.ok(fz.preDetermination.finalists.every((f) => f.b === false));
  });

  it('the label join (the code that sealed the outcome) reproduces results/outcome.json exactly: validation null, no development-only list', () => {
    const old = plain(labelJoinOutcome(fz.preDetermination, v.rows));

    assert.deepEqual(old.finalists, sealed.finalists);
    assert.deepEqual(old.candidates, sealed.candidates);
    assert.deepEqual(old.developmentOnly, sealed.developmentOnly);
    assert.deepEqual(old.comparisons, sealed.comparisons);
    assert.equal(old.outcome, sealed.outcome);
    assert.ok(sealed.finalists.every((f) => f.validation === null && f.c === false));
    assert.equal(sealed.finalists.length, 17);
  });

  it('the identity join gives every one of the 17 finalists exactly its own validation row', () => {
    const rowOf = new Map(v.rows.filter((r) => r.kind === 'selected').map((r) => [`${r.arm}|${r.id}`, r]));

    assert.equal(fixed.finalists.length, 17);
    assert.equal(new Set(fixed.finalists.map((f) => `${f.arm}|${f.id}`)).size, 17);
    for (const f of fixed.finalists) {
      const r = rowOf.get(`${f.arm}|${f.id}`)!;

      assert.deepEqual(f.validation, r.validation);
      assert.equal(f.candidateLabel, r.label);
      assert.equal(
        f.candidateLabel,
        fz.finalists.find((x) => x.id === f.id && x.arm === f.arm)!.label,
        'the frozen finalist list carries the same candidate label'
      );
    }
  });

  it('reproduces the report-only D1 reconstruction (reports/tables/outcome-join.json) for every finalist', () => {
    assert.equal(fixed.finalists.length, join.finalists.length);
    fixed.finalists.forEach((f, i) => {
      const j = join.finalists[i]!;

      assert.deepEqual([f.arm, f.id, f.candidateLabel], [j.arm, j.id, j.candidateLabel]);
      assert.deepEqual(f.validation, j.validation);
      assert.deepEqual([f.c, f.candidate, f.developmentOnly], [j.c, j.candidate, j.developmentOnly]);
    });
    assert.deepEqual(fixed.candidates, join.candidates);
    assert.deepEqual(fixed.developmentOnly, join.developmentOnly);
    assert.equal(fixed.outcome, join.determination);
  });

  it('G and C C24 primaries are development-only (V1–V3 pass); D, J and S primaries fail V1', () => {
    assert.deepEqual(fixed.developmentOnly, [
      { arm: 'G', label: 'C24/G/refine/G.h2.s1/R101#1 profit', id: 'd375f8105c15ad72' },
      { arm: 'C', label: 'C24/C/pair DF1×GF3', id: 'rc1-99c7a25e9144531e' }
    ]);

    const prim = (a: ArmKey) => fixed.finalists.find((f) => f.arm === a && f.primary)!;

    for (const a of ['G', 'C'] as const) assert.deepEqual(prim(a).validation, { V1: true, V2: true, V3: true });
    for (const a of ['D', 'J', 'S'] as const) {
      assert.equal(prim(a).validation.V1, false, `${a} primary V1`);
      assert.equal(prim(a).developmentOnly, false);
    }

    // the D1 figures (AMENDMENTS.md D1) from the sealed validation rows
    const figures = (a: ArmKey) => {
      const j = join.finalists.find((x) => x.arm === a && x.id === prim(a).id)!;

      return [j.validationPnl, j.validationResetDd, Math.round(j.wholeRunDd * 100) / 100];
    };

    assert.deepEqual(figures('G'), [10702.95, 18255, 28655.41]);
    assert.deepEqual(figures('C'), [71.05, 25953.17, 26287.97]);
  });

  it('the verdict stays NO QUALIFYING TSLA CANDIDATE: the candidate list is unchanged (empty)', () => {
    assert.deepEqual(fixed.candidates, []);
    assert.deepEqual(sealed.candidates, []);
    assert.ok(fixed.outcome.startsWith(sealed.outcome), 'the sealed verdict text is the prefix of the corrected one');
    assert.equal(
      fixed.outcome,
      'NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3; development-qualified without chronological support (not deployment-qualified without an explicit user decision): G C24/G/refine/G.h2.s1/R101#1 profit; C C24/C/pair DF1×GF3'
    );
  });

  it('only validation-dependent fields differ from the sealed outcome; the comparisons are identical', () => {
    fixed.finalists.forEach((f, i) =>
      assert.deepEqual(without(f, validationDependent), without(sealed.finalists[i]!, validationDependent))
    );
    assert.deepEqual(fixed.comparisons, sealed.comparisons);
  });

  it('preDetermination’s finalists recomputed from the frozen finalists equal the sealed ones field for field (plus the two new labels)', () => {
    const g = plain(governedFinalists(fz.finalists, seq.procedures));

    assert.deepEqual(
      g.map((f) => without(f, ['candidateLabel', 'governanceLabel'])),
      fz.preDetermination.finalists
    );
    assert.deepEqual(
      g.map((f) => f.candidateLabel),
      fz.finalists.map((f) => f.label)
    );
  });

  it('reordering the sealed finalists and rows changes nothing', () => {
    const r = plain(
      outcomeOf(
        { ...fz.preDetermination, finalists: [...fz.preDetermination.finalists].reverse() },
        [...v.rows].reverse()
      )
    );

    assert.deepEqual(classification(r as never), classification(fixed as never));
    assert.deepEqual(r.candidates, fixed.candidates);
    assert.deepEqual(r.developmentOnly, fixed.developmentOnly);
    assert.equal(r.outcome, fixed.outcome);
  });
});
